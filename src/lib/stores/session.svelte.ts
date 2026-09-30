import { browser } from '$app/environment';
import { announce } from '$lib/a11y/announce';
import { ApiError } from '$lib/api/errors';
import { SESSION_BULK_PAGE_SIZE, SESSION_PAGE_SIZE } from '$lib/api/pagination';
import type { AppSeed } from '$lib/api/types';
import { userMessageForError } from '$lib/api/user-message';
import { createRepository } from '$lib/data/create-repository';
import { DomainError } from '$lib/data/errors';
import type { TimeTrackingRepository } from '$lib/data/repository';
import { m } from '$lib/paraglide/messages.js';
import { type PrefsStore } from '$lib/stores/prefs.svelte';
import {
	createBroadcastPeer,
	type PeerChange,
	type PeerMessage,
	type SessionPeer
} from '$lib/stores/session-sync';
import {
	projectWeekSummaries,
	recentStoppedSessions,
	recentTasks,
	todayDeltaMs,
	todayTotalMs,
	weeklyDayTotals
} from '$lib/time/aggregates';
import { formatClock, sessionElapsedMs } from '$lib/time/duration';
import { DEFAULT_TIME_ZONE } from '$lib/time/timezone';
import type {
	ActivityType,
	ChangeEmailInput,
	ChangePasswordInput,
	CreateActivityTypeInput,
	CreateManualSessionInput,
	CreateProjectInput,
	DayTotal,
	DayTotalsRange,
	Project,
	RequestEmailChangeInput,
	SessionPage,
	StartSessionInput,
	TimeSession,
	UpdateActivityTypeInput,
	UpdatePrefsInput,
	UpdateProfileInput,
	UpdateProjectInput,
	UpdateSessionInput
} from '$lib/types/domain';
import { createContext } from 'svelte';
import { createSubscriber, SvelteDate, SvelteMap, SvelteSet } from 'svelte/reactivity';

/** Pages held back before `sessions` is replaced during a bulk drain. */
const DRAIN_BATCH_PAGES = 5;

/**
 * Sub-second stops are accidental taps; they are deleted instead of stored.
 * Both the server duration and the local press-to-press time must be under it,
 * so a skewed client clock can never discard real time (EMI-74).
 */
const DISCARD_UNDER_MS = 1000;

/** A tab regaining focus re-reads the live session at most this often. */
const RECONCILE_MIN_GAP_MS = 5000;

/** Monotonic ms; immune to wall-clock skew and adjustments. */
function monotonicMs(): number {
	return performance.now();
}

type DrainRun = { gen: number; target: number | null; promise: Promise<void> };

function isSessionAlreadyActive(e: unknown): boolean {
	return (e instanceof ApiError || e instanceof DomainError) && e.code === 'session_already_active';
}

/** Stop lost a race with another tab or device that already stopped or deleted the row. */
function isEndedElsewhere(e: unknown): boolean {
	return (
		(e instanceof ApiError || e instanceof DomainError) &&
		(e.code === 'invalid_transition' || e.code === 'not_found')
	);
}

function sameSession(a: TimeSession, b: TimeSession | null): boolean {
	return (
		b != null &&
		a.id === b.id &&
		a.status === b.status &&
		a.projectId === b.projectId &&
		a.note === b.note &&
		a.ticketId === b.ticketId &&
		a.activityTypeId === b.activityTypeId &&
		a.startedAt === b.startedAt &&
		a.endedAt === b.endedAt &&
		a.targetDurationMs === b.targetDurationMs
	);
}

export type HydrateOptions = {
	nowMs?: number;
	timeZone?: string;
	repo?: TimeTrackingRepository;
	/** Sibling-tab channel. Defaults to a BroadcastChannel in the browser. */
	peer?: SessionPeer | null;
};

/** Session counts live in a `$state.raw` map, so drop a key by rebuilding it. */
function withoutKey(counts: Record<string, number>, id: string): Record<string, number> {
	return Object.fromEntries(Object.entries(counts).filter(([key]) => key !== id));
}

/** On a signed-in credential change, `invalid_credentials` means the current password. */
function accountErrorMessage(e: unknown, fallback: () => string): string {
	const code = e instanceof ApiError || e instanceof DomainError ? e.code : null;
	if (code === 'invalid_credentials') return m.security_wrong_password();
	return userMessageForError(e, fallback);
}

/**
 * Session lifecycle + projection of repository data for the UI.
 * Created per server request; cached as a client singleton after hydrate
 * so in-app navigation does not reset the timer (ADR-0004 / ADR-0011).
 */
export class SessionStore {
	#repo: TimeTrackingRepository | null = null;
	#hydrated = false;
	#prefs: PrefsStore;

	/**
	 * Snapshot wall-clock for day keys.
	 * Live ticking does not write this — see `#liveNowMs`.
	 */
	nowMs = $state(0);

	/** IANA zone for first-paint day keys and local times. */
	timeZone = $state(DEFAULT_TIME_ZONE);

	/** Loaded session window (newest-first). Not necessarily the full history. */
	sessions = $state.raw<TimeSession[]>([]);
	nextCursor = $state<string | null>(null);
	loadingMore = $state(false);
	projectSessionCounts = $state.raw<Record<string, number>>({});
	activityTypeSessionCounts = $state.raw<Record<string, number>>({});

	/**
	 * Live session from `GET /sessions/active` when it is not in the loaded window.
	 * `activeSession` prefers the window copy of this id.
	 */
	#active = $state.raw<TimeSession | null>(null);
	/** Ids already in `sessions`, including rows merged from outside the page. */
	#loadedSessionIds = new SvelteSet<string>();
	/**
	 * Active row older than the contiguous page. It must not move the cursor
	 * bound (`sessions` stays newest-first, so this id sits at the tail).
	 */
	#extraSessionIds = new SvelteSet<string>();
	#drainGen = 0;
	#drainLoading = false;
	/** The drain in flight; its `target` can widen while it runs. */
	#drainRun: DrainRun | null = null;
	/** Server clock minus client clock, estimated from start/stop responses. */
	#clockOffsetMs = $state(0);
	/** Session started from this tab and the monotonic time of that Start. */
	#localStart: { id: string; atMs: number } | null = null;
	#pageLoading = false;
	/** Bumped by every local write so a background reconcile can tell it went stale. */
	#writes = 0;
	#lastReconcileAt = -Infinity;
	#peer: SessionPeer | null = null;
	#countInflight = new SvelteMap<string, Promise<number | undefined>>();

	/** Active (non-archived) projects for pickers. */
	projects = $state.raw<Project[]>([]);

	/** All projects including archived (management UI). */
	allProjects = $state.raw<Project[]>([]);

	/** User-owned activity type dictionary. */
	activityTypes = $state.raw<ActivityType[]>([]);

	/** Draft fields for the Timer form (idle / pre-start). */
	draftNote = $state('');
	draftProjectId = $state('');
	/** Empty string = unset; posted as null. */
	draftActivityType = $state('');
	draftTicket = $state('');
	/** Session target in ms; `null` = no target. */
	draftTargetMs = $state<number | null>(null);

	error = $state<string | null>(null);

	/** In-flight mutation; blocks double-submit. */
	pendingAction = $state<'start' | 'stop' | 'project' | 'profile' | 'activity' | 'session' | null>(
		null
	);

	busy = $derived(this.pendingAction != null);

	#visibilityBound = false;

	/** Interval only while an effect reads `#liveNowMs` (active elapsed / live KPIs). */
	#clockSubscribe = createSubscriber((update) => {
		const id = setInterval(update, 250);
		return () => clearInterval(id);
	});

	constructor(prefs: PrefsStore) {
		this.#prefs = prefs;
	}

	/**
	 * Apply a domain seed once. Subsequent load runs (and retries after success)
	 * must not rebuild the repo or the live timer resets.
	 */
	hydrate = (seed: AppSeed, opts: HydrateOptions = {}): void => {
		if (this.#hydrated) {
			this.#adoptLiveFromSeed(seed);
			return;
		}
		this.#hydrated = true;
		this.nowMs = opts.nowMs ?? Date.now();
		this.timeZone = opts.timeZone ?? DEFAULT_TIME_ZONE;
		this.projects = seed.projects.filter((p) => !p.isArchived);
		this.allProjects = seed.projects;
		this.activityTypes = seed.activityTypes ?? [];
		this.sessions = seed.sessions;
		this.nextCursor = seed.nextCursor ?? null;
		this.#rebuildLoadedIds();
		this.#extraSessionIds.clear();
		this.#active = null;
		const seededLive = this.#liveFromSeed(seed);
		if (seededLive) this.#mergeActive(seededLive);

		const live = this.activeSession;
		if (live) {
			this.#applyDraftFromSession(live);
		} else {
			this.draftProjectId = this.#prefs.defaultProjectId || this.projects[0]?.id || '';
			const recent = this.sessions.find((s) => s.status === 'stopped');
			if (recent) {
				this.draftNote = recent.note;
				this.draftActivityType = recent.activityTypeId ?? '';
				this.draftTicket = recent.ticketId ?? '';
				this.draftTargetMs = recent.targetDurationMs ?? null;
			}
		}
		this.#normalizeProjectSelection();

		if (opts.repo) {
			this.#repo = opts.repo;
		}
		if (opts.peer !== undefined) this.#bindPeer(opts.peer);
		if (browser) {
			this.#repo ??= createRepository();
			this.#bindVisibility();
		}
	};

	get ready(): boolean {
		return this.#hydrated;
	}

	activeSession = $derived.by(() => {
		const dedicated = this.#active;
		if (dedicated) {
			const inWindow = this.sessions.find((s) => s.id === dedicated.id);
			if (inWindow) return inWindow.status === 'active' ? inWindow : null;
			return dedicated.status === 'active' ? dedicated : null;
		}
		return this.sessions.find((s) => s.status === 'active') ?? null;
	});

	elapsedMs = $derived.by(() => {
		const s = this.activeSession;
		if (!s) return 0;
		return sessionElapsedMs(s, this.#liveNowMs());
	});

	elapsedLabel = $derived(formatClock(this.elapsedMs));

	todayTotalMs = $derived.by(() =>
		todayTotalMs(this.sessions, new SvelteDate(this.#asOfMs()), this.timeZone)
	);

	todayDeltaMs = $derived.by(() =>
		todayDeltaMs(this.sessions, new SvelteDate(this.#asOfMs()), this.timeZone)
	);

	recentLogs = $derived.by(() => recentStoppedSessions(this.sessions, 8));

	recentTaskItems = $derived.by(() => recentTasks(this.sessions, 5));

	weekDayTotals = $derived.by(() =>
		weeklyDayTotals(this.sessions, new SvelteDate(this.nowMs), this.timeZone)
	);

	projectWeekSummaries = $derived.by(() =>
		projectWeekSummaries(this.sessions, this.projects, new SvelteDate(this.nowMs), this.timeZone)
	);

	getProject = (id: string): Project | undefined => {
		return this.allProjects.find((p) => p.id === id) ?? this.projects.find((p) => p.id === id);
	};

	getActivityType = (id: string): ActivityType | undefined => {
		return this.activityTypes.find((a) => a.id === id);
	};

	countSessionsForActivityType = (activityTypeId: string): number | undefined => {
		return this.activityTypeSessionCounts[activityTypeId];
	};

	activeProject = $derived.by(() => {
		const s = this.activeSession;
		if (!s) return undefined;
		return this.getProject(s.projectId);
	});

	countSessionsForProject = (projectId: string): number | undefined => {
		return this.projectSessionCounts[projectId];
	};

	/** Active projects remaining after a hypothetical archive of `id`. */
	canArchiveOrDeleteActive = (id: string): boolean => {
		const active = this.projects;
		if (active.length <= 1 && active.some((p) => p.id === id)) return false;
		return true;
	};

	refresh = async (): Promise<void> => {
		this.cancelDrain();
		const repo = this.#requireRepo();
		const previousActiveId = this.#active?.id;
		const [page, allProjects, activityTypes, active] = await Promise.all([
			repo.listSessions({ limit: SESSION_PAGE_SIZE }),
			repo.listProjects({ includeArchived: true }),
			repo.listActivityTypes(),
			repo.getActiveSession()
		]);
		this.#extraSessionIds.clear();
		this.sessions = page.items;
		this.#rebuildLoadedIds();
		this.nextCursor = page.nextCursor;
		this.#active = null;
		if (active) {
			this.#mergeActive(active);
			if (active.id !== previousActiveId) this.#applyDraftFromSession(active);
		}
		this.#setProjects(allProjects);
		this.#setActivityTypes(activityTypes);
		this.#syncClock();
	};

	loadMore = async (): Promise<boolean> => {
		if (!this.nextCursor || this.loadingMore) return false;
		this.#pageLoading = true;
		this.#syncLoadingMore();
		try {
			const page = await this.#loadSessionPage(SESSION_PAGE_SIZE, this.nextCursor);
			const { fresh, reached } = this.#unseen(page.items, new SvelteSet());
			this.#releaseExtras(reached);
			this.#commitSessions(fresh);
			this.nextCursor = page.nextCursor;
			return fresh.length > 0;
		} catch (e) {
			this.error = userMessageForError(e, m.error_invalid_response);
			return false;
		} finally {
			this.#pageLoading = false;
			this.#syncLoadingMore();
		}
	};

	/**
	 * Fetch further pages until the oldest loaded session is at or before `startedAtMs`,
	 * or the list ends. `null` drains all remaining pages.
	 * Uses the bulk page size and commits every few pages. Idempotent while a drain runs:
	 * the same target shares it and a wider one extends it in place, so a caller that
	 * re-runs on every batch commit never re-requests a cursor (EMI-81). A narrower
	 * target, or {@link cancelDrain}, stops the loop without an abort signal.
	 */
	ensureThrough = (startedAtMs: number | null): Promise<void> => {
		const running = this.#drainRun;
		if (running && running.gen === this.#drainGen) {
			if (running.target === startedAtMs) return running.promise;
			if (startedAtMs === null || (running.target !== null && startedAtMs < running.target)) {
				running.target = startedAtMs;
				return running.promise;
			}
		}
		const gen = this.#bumpDrain();
		const run: DrainRun = { gen, target: startedAtMs, promise: Promise.resolve() };
		run.promise = this.#drain(run).finally(() => {
			if (this.#drainRun === run) this.#drainRun = null;
		});
		this.#drainRun = run;
		return run.promise;
	};

	#drain = async (run: DrainRun): Promise<void> => {
		const { gen } = run;
		if (this.#coveredThrough(run.target, null)) {
			this.#drainLoading = false;
			this.#syncLoadingMore();
			return;
		}
		this.#drainLoading = true;
		this.#syncLoadingMore();
		const pending: TimeSession[] = [];
		const pendingIds = new SvelteSet<string>();
		const reached: string[] = [];
		let pagesInBatch = 0;
		let cursor = this.nextCursor;
		const flush = (next: string | null) => {
			this.#releaseExtras(reached);
			reached.length = 0;
			this.#commitSessions(pending);
			pending.length = 0;
			pendingIds.clear();
			pagesInBatch = 0;
			this.nextCursor = next;
		};
		try {
			while (cursor) {
				if (gen !== this.#drainGen) return;
				if (this.#coveredThrough(run.target, pending)) {
					flush(cursor);
					return;
				}
				let page: SessionPage;
				try {
					page = await this.#loadSessionPage(SESSION_BULK_PAGE_SIZE, cursor);
				} catch (e) {
					if (gen !== this.#drainGen) return;
					flush(cursor);
					this.error = userMessageForError(e, m.error_invalid_response);
					return;
				}
				if (gen !== this.#drainGen) return;
				if (page.nextCursor === cursor) {
					flush(cursor);
					return;
				}
				const unseen = this.#unseen(page.items, pendingIds);
				for (const s of unseen.fresh) {
					pending.push(s);
					pendingIds.add(s.id);
				}
				reached.push(...unseen.reached);
				pagesInBatch += 1;
				cursor = page.nextCursor;
				const covered = cursor == null || this.#coveredThrough(run.target, pending);
				if (pagesInBatch >= DRAIN_BATCH_PAGES || covered) {
					flush(cursor);
					if (covered) return;
				}
			}
		} finally {
			if (gen === this.#drainGen) {
				this.#drainLoading = false;
				this.#syncLoadingMore();
			}
		}
	};

	/** Stop an in-flight {@link ensureThrough} before its next `listSessions` call. */
	cancelDrain = (): void => {
		this.#bumpDrain();
		this.#drainLoading = false;
		this.#syncLoadingMore();
	};

	loadSessionCounts = async (): Promise<void> => {
		const repo = this.#requireRepo();
		const projectEntries = await Promise.all(
			this.allProjects.map(async (p) => [p.id, await repo.countSessionsForProject(p.id)] as const)
		);
		const activityEntries = await Promise.all(
			this.activityTypes.map(
				async (a) => [a.id, await repo.countSessionsForActivityType(a.id)] as const
			)
		);
		// Merge rather than replace: the entries were built from the entity lists as
		// they were at call time, so a create that lands mid-flight keeps its seeded 0.
		this.projectSessionCounts = {
			...this.projectSessionCounts,
			...Object.fromEntries(projectEntries)
		};
		this.activityTypeSessionCounts = {
			...this.activityTypeSessionCounts,
			...Object.fromEntries(activityEntries)
		};
	};

	/**
	 * One session-count for a delete guard. Cached; concurrent callers share the request.
	 * `undefined` means the count is still unknown (delete stays blocked).
	 */
	ensureSessionCount = async (
		kind: 'project' | 'activity',
		id: string
	): Promise<number | undefined> => {
		const cached = this.#cachedCount(kind, id);
		if (cached != null) return cached;
		const key = `${kind}:${id}`;
		const inflight = this.#countInflight.get(key);
		if (inflight) return inflight;
		const pending = this.#loadOneSessionCount(kind, id);
		this.#countInflight.set(key, pending);
		try {
			return await pending;
		} finally {
			if (this.#countInflight.get(key) === pending) this.#countInflight.delete(key);
		}
	};

	createProject = async (input: CreateProjectInput): Promise<Project | null> => {
		if (!this.#begin('project')) return null;
		this.error = null;
		try {
			const project = await this.#requireRepo().createProject(input);
			this.#upsertProject(project);
			this.#share({ type: 'project', project });
			// Known-unused without a round-trip; otherwise the delete guard reads
			// the missing entry as "unknown" and stays blocked until a reload.
			this.projectSessionCounts = { ...this.projectSessionCounts, [project.id]: 0 };
			return project;
		} catch (e) {
			this.error = userMessageForError(e, m.error_failed_create_project);
			return null;
		} finally {
			this.#end();
		}
	};

	updateProject = async (id: string, input: UpdateProjectInput): Promise<Project | null> => {
		if (!this.#begin('project')) return null;
		this.error = null;
		try {
			const project = await this.#requireRepo().updateProject(id, input);
			this.#upsertProject(project);
			this.#share({ type: 'project', project });
			return project;
		} catch (e) {
			this.error = userMessageForError(e, m.error_failed_update_project);
			return null;
		} finally {
			this.#end();
		}
	};

	archiveProject = async (id: string): Promise<boolean> => {
		if (!this.#begin('project')) return false;
		this.error = null;
		try {
			const project = await this.#requireRepo().archiveProject(id);
			this.#upsertProject(project);
			this.#share({ type: 'project', project });
			return true;
		} catch (e) {
			this.error = userMessageForError(e, m.error_failed_archive_project);
			return false;
		} finally {
			this.#end();
		}
	};

	restoreProject = async (id: string): Promise<boolean> => {
		if (!this.#begin('project')) return false;
		this.error = null;
		try {
			const project = await this.#requireRepo().restoreProject(id);
			this.#upsertProject(project);
			this.#share({ type: 'project', project });
			return true;
		} catch (e) {
			this.error = userMessageForError(e, m.error_failed_restore_project);
			return false;
		} finally {
			this.#end();
		}
	};

	deleteProject = async (id: string): Promise<boolean> => {
		if (!this.#begin('project')) return false;
		this.error = null;
		try {
			await this.#requireRepo().deleteProject(id);
			this.#removeProject(id);
			this.projectSessionCounts = withoutKey(this.projectSessionCounts, id);
			this.#share({ type: 'project-removed', id });
			return true;
		} catch (e) {
			this.error = userMessageForError(e, m.error_failed_delete_project);
			return false;
		} finally {
			this.#end();
		}
	};

	createActivityType = async (input: CreateActivityTypeInput): Promise<ActivityType | null> => {
		if (!this.#begin('activity')) return null;
		this.error = null;
		try {
			const created = await this.#requireRepo().createActivityType(input);
			this.#upsertActivityType(created);
			this.#share({ type: 'activity-type', activityType: created });
			this.activityTypeSessionCounts = { ...this.activityTypeSessionCounts, [created.id]: 0 };
			return created;
		} catch (e) {
			this.error = userMessageForError(e, m.error_failed_create_activity_type);
			return null;
		} finally {
			this.#end();
		}
	};

	updateActivityType = async (
		id: string,
		input: UpdateActivityTypeInput
	): Promise<ActivityType | null> => {
		if (!this.#begin('activity')) return null;
		this.error = null;
		try {
			const updated = await this.#requireRepo().updateActivityType(id, input);
			this.#upsertActivityType(updated);
			this.#share({ type: 'activity-type', activityType: updated });
			return updated;
		} catch (e) {
			this.error = userMessageForError(e, m.error_failed_update_activity_type);
			return null;
		} finally {
			this.#end();
		}
	};

	deleteActivityType = async (id: string): Promise<boolean> => {
		if (!this.#begin('activity')) return false;
		this.error = null;
		try {
			await this.#requireRepo().deleteActivityType(id);
			this.#removeActivityType(id);
			this.activityTypeSessionCounts = withoutKey(this.activityTypeSessionCounts, id);
			this.#share({ type: 'activity-type-removed', id });
			return true;
		} catch (e) {
			this.error = userMessageForError(e, m.error_failed_delete_activity_type);
			return false;
		} finally {
			this.#end();
		}
	};

	start = async (input?: Partial<StartSessionInput>): Promise<void> => {
		if (!this.#begin('start')) return;
		this.error = null;
		try {
			const projectId = input?.projectId ?? this.draftProjectId;
			const note = input?.note ?? this.draftNote;
			const activityTypeId =
				input && 'activityTypeId' in input
					? input.activityTypeId
					: this.draftActivityType || undefined;
			const ticketId =
				input && 'ticketId' in input ? input.ticketId : this.draftTicket.trim() || undefined;
			const targetDurationMs =
				input && 'targetDurationMs' in input
					? input.targetDurationMs
					: (this.draftTargetMs ?? undefined);
			this.draftProjectId = projectId;
			this.draftNote = note;
			this.draftActivityType = activityTypeId ?? '';
			this.draftTicket = ticketId ?? '';
			this.draftTargetMs = targetDurationMs ?? null;
			const sentAt = Date.now();
			const pressedAt = monotonicMs();
			const started = await this.#requireRepo().startSession({
				projectId,
				note,
				ticketId,
				activityTypeId,
				targetDurationMs
			});
			this.#syncServerClock(started.startedAt, sentAt);
			this.#localStart = { id: started.id, atMs: pressedAt };
			this.#upsertSession(started);
			this.#adjustSessionCount(started.projectId, started.activityTypeId, 1);
			this.#share({ type: 'session', session: started, created: true });
			announce(m.announce_session_started());
		} catch (e) {
			if (isSessionAlreadyActive(e)) {
				try {
					const active = await this.#requireRepo().getActiveSession();
					if (active) {
						this.#mergeActive(active);
						this.#applyDraftFromSession(active);
					}
				} catch (inner) {
					this.error = userMessageForError(inner, m.error_failed_start_session);
				}
			} else {
				this.error = userMessageForError(e, m.error_failed_start_session);
			}
		} finally {
			this.#end();
		}
	};

	/**
	 * Start a new session from a recent task/log (Flow D).
	 * Blocks if another session is already active.
	 */
	restartFromTask = async (input: StartSessionInput): Promise<boolean> => {
		if (this.activeSession) {
			this.error = m.error_stop_before_start();
			return false;
		}
		if (this.pendingAction) return false;
		await this.start(input);
		return this.error == null;
	};

	/** Restart using a historical session id. */
	restartFromSession = async (sessionId: string): Promise<boolean> => {
		const s = this.sessions.find((x) => x.id === sessionId);
		if (!s) {
			this.error = m.error_session_not_found();
			return false;
		}
		return this.restartFromTask({
			projectId: s.projectId,
			note: s.note,
			ticketId: s.ticketId,
			activityTypeId: s.activityTypeId
		});
	};

	updateSession = async (id: string, input: UpdateSessionInput): Promise<TimeSession | null> => {
		if (!this.#begin('session')) return null;
		this.error = null;
		try {
			const updated = await this.#requireRepo().updateSession(id, input);
			this.#upsertSession(updated);
			this.#share({ type: 'session', session: updated, created: false });
			if (updated.status === 'active') {
				this.#applyDraftFromSession(updated);
			}
			announce(m.announce_session_updated());
			return updated;
		} catch (e) {
			this.error = userMessageForError(e, m.error_failed_update_session);
			return null;
		} finally {
			this.#end();
		}
	};

	deleteSession = async (id: string): Promise<boolean> => {
		if (!this.#begin('session')) return false;
		this.error = null;
		try {
			const existing = this.sessions.find((s) => s.id === id);
			await this.#requireRepo().deleteSession(id);
			this.#removeSession(id);
			if (existing) {
				this.#adjustSessionCount(existing.projectId, existing.activityTypeId, -1);
			}
			this.#share({
				type: 'session-removed',
				id,
				projectId: existing?.projectId,
				activityTypeId: existing?.activityTypeId
			});
			announce(m.announce_session_deleted());
			return true;
		} catch (e) {
			this.error = userMessageForError(e, m.error_failed_delete_session);
			return false;
		} finally {
			this.#end();
		}
	};

	createManualSession = async (input: CreateManualSessionInput): Promise<TimeSession | null> => {
		if (!this.#begin('session')) return null;
		this.error = null;
		try {
			const created = await this.#requireRepo().createManualSession(input);
			this.#upsertSession(created);
			this.#adjustSessionCount(created.projectId, created.activityTypeId, 1);
			this.#share({ type: 'session', session: created, created: true });
			announce(m.announce_session_created());
			return created;
		} catch (e) {
			this.error = userMessageForError(e, m.error_failed_create_session);
			return null;
		} finally {
			this.#end();
		}
	};

	stop = async (): Promise<void> => {
		const s = this.activeSession;
		if (!s) return;
		if (!this.#begin('stop')) return;
		this.error = null;
		const local = this.#localStart?.id === s.id ? this.#localStart : null;
		const localMs = local ? monotonicMs() - local.atMs : null;
		let endedElsewhere = false;
		try {
			const sentAt = Date.now();
			const stopped = await this.#requireRepo().stopSession(s.id);
			if (stopped.endedAt) this.#syncServerClock(stopped.endedAt, sentAt);
			this.#localStart = null;
			// Server timestamps only: never compare the client clock with `startedAt`.
			if (
				localMs != null &&
				localMs < DISCARD_UNDER_MS &&
				sessionElapsedMs(stopped) < DISCARD_UNDER_MS
			) {
				await this.#requireRepo().deleteSession(s.id);
				this.#removeSession(s.id);
				this.#adjustSessionCount(s.projectId, s.activityTypeId, -1);
				this.#share({
					type: 'session-removed',
					id: s.id,
					projectId: s.projectId,
					activityTypeId: s.activityTypeId
				});
				return;
			}
			this.#applyDraftFromSession(stopped);
			this.#upsertSession(stopped);
			this.#share({ type: 'session', session: stopped, created: false });
			announce(m.announce_session_stopped());
		} catch (e) {
			if (isEndedElsewhere(e)) endedElsewhere = true;
			else this.error = userMessageForError(e, m.error_failed_stop);
		} finally {
			this.#end();
		}
		if (!endedElsewhere) return;
		// The user wanted it stopped and it is: show the server's version, not an error.
		if (!(await this.reconcileActive())) this.error = m.error_failed_stop();
		else if (!this.activeSession) announce(m.announce_session_stopped());
	};

	/**
	 * Stop the live session, then move its end back to `endedAt` (a forgotten timer).
	 * The API only accepts a stop time on a stopped row, hence two writes.
	 */
	stopAt = async (endedAt: string): Promise<boolean> => {
		const live = this.activeSession;
		if (!live) return false;
		await this.stop();
		if (this.error || this.activeSession?.id === live.id) return false;
		return (await this.updateSession(live.id, { endedAt })) != null;
	};

	/**
	 * Fold the server's live session into this tab. Another tab or device may have
	 * started, stopped, edited or deleted it since this tab last looked.
	 * Background work: a local write in flight wins, and the result is `false`
	 * only when the server could not be read.
	 */
	reconcileActive = async (): Promise<boolean> => {
		const repo = this.#repo;
		if (!repo || this.pendingAction) return true;
		const writes = this.#writes;
		const stale = () =>
			this.#repo !== repo || this.#writes !== writes || this.pendingAction != null;
		const local = this.activeSession;
		try {
			const server = await repo.getActiveSession();
			if (stale()) return true;
			if (local && local.id !== server?.id) {
				const ended = await repo.getSession(local.id);
				if (stale()) return true;
				if (this.#localStart?.id === local.id) this.#localStart = null;
				if (ended) {
					this.#upsertSession(ended);
					if (!server) this.#applyDraftFromSession(ended);
				} else {
					this.#removeSession(local.id);
					this.#adjustSessionCount(local.projectId, local.activityTypeId, -1);
				}
			}
			if (server && !sameSession(server, local)) {
				const known = this.#loadedSessionIds.has(server.id);
				this.#mergeActive(server);
				this.#applyDraftFromSession(server);
				if (!known) this.#adjustSessionCount(server.projectId, server.activityTypeId, 1);
			}
			this.#syncClock();
			return true;
		} catch {
			return false;
		}
	};

	clearError = (): void => {
		this.error = null;
	};

	/**
	 * The saved default project while it is still active, else the first active one.
	 * The fallback is not written back: the account keeps what the user chose.
	 */
	get defaultProjectId(): string {
		const saved = this.#prefs.defaultProjectId;
		return this.projects.some((p) => p.id === saved) ? saved : (this.projects[0]?.id ?? '');
	}

	/**
	 * Save account prefs. The change shows at once and rolls back if the server
	 * refuses it. Overlapping saves apply in the order they were made. `silent`
	 * skips the error banner (the one-time copy of the old device cookie).
	 */
	savePrefs = async (
		input: UpdatePrefsInput,
		opts: { silent?: boolean } = {}
	): Promise<boolean> => {
		const before = this.#prefs.snapshot();
		const seq = ++this.#prefsSeq;
		this.#prefs.applyPatch(input);
		try {
			const saved = await this.#requireRepo().updatePrefs(input);
			if (seq === this.#prefsSeq) this.#prefs.applyPrefs(saved);
			this.#share({ type: 'prefs', prefs: saved });
			return true;
		} catch (e) {
			if (seq === this.#prefsSeq) this.#prefs.applyPrefs(before);
			if (!opts.silent) this.error = userMessageForError(e, m.error_failed_save_prefs);
			return false;
		}
	};

	/** `null` on success, else the message to show next to the form. */
	changePassword = async (input: ChangePasswordInput): Promise<string | null> => {
		try {
			await this.#requireRepo().changePassword(input);
			return null;
		} catch (e) {
			return accountErrorMessage(e, m.error_failed_change_password);
		}
	};

	/** Sends a code to the new address. `null` on success, else the message to show. */
	requestEmailChange = async (input: RequestEmailChangeInput): Promise<string | null> => {
		try {
			await this.#requireRepo().requestEmailChange(input);
			return null;
		} catch (e) {
			return accountErrorMessage(e, m.error_failed_change_email);
		}
	};

	/**
	 * Confirms the code and switches the sign-in email. Sibling tabs hear about it
	 * under the old email, since they still filter peer messages by it.
	 */
	changeEmail = async (input: ChangeEmailInput): Promise<string | null> => {
		try {
			const profile = await this.#requireRepo().changeEmail(input);
			this.#share({ type: 'profile', profile });
			this.#prefs.hydrateProfile(profile);
			return null;
		} catch (e) {
			return accountErrorMessage(e, m.error_failed_change_email);
		}
	};

	/** Server day totals (stopped sessions only; see `withLiveSession`). */
	listDayTotals = (range: DayTotalsRange): Promise<DayTotal[]> =>
		this.#requireRepo().listDayTotals(range);

	updateProfile = async (input: UpdateProfileInput): Promise<boolean> => {
		if (!this.#begin('profile')) return false;
		this.error = null;
		try {
			const profile = await this.#requireRepo().updateProfile(input);
			this.#prefs.hydrateProfile(profile);
			return true;
		} catch (e) {
			this.error = userMessageForError(e, m.error_failed_update_profile);
			return false;
		} finally {
			this.#end();
		}
	};

	uploadAvatar = async (file: Blob): Promise<boolean> => {
		if (!this.#begin('profile')) return false;
		this.error = null;
		try {
			const profile = await this.#requireRepo().uploadAvatar(file);
			this.#prefs.hydrateProfile(profile);
			return true;
		} catch (e) {
			this.error = userMessageForError(e, m.error_failed_avatar);
			return false;
		} finally {
			this.#end();
		}
	};

	deleteAvatar = async (): Promise<boolean> => {
		if (!this.#begin('profile')) return false;
		this.error = null;
		try {
			const profile = await this.#requireRepo().deleteAvatar();
			this.#prefs.hydrateProfile(profile);
			return true;
		} catch (e) {
			this.error = userMessageForError(e, m.error_failed_avatar);
			return false;
		} finally {
			this.#end();
		}
	};

	#begin = (action: 'start' | 'stop' | 'project' | 'profile' | 'activity' | 'session'): boolean => {
		if (this.pendingAction) return false;
		this.pendingAction = action;
		this.#writes += 1;
		return true;
	};

	#end = (): void => {
		this.pendingAction = null;
	};

	#prefsSeq = 0;

	#requireRepo = (): TimeTrackingRepository => {
		if (!this.#repo) {
			throw new Error('Session store has not been hydrated');
		}
		return this.#repo;
	};

	#applyDraftFromSession = (session: TimeSession): void => {
		this.draftNote = session.note;
		this.draftProjectId = session.projectId;
		this.draftActivityType = session.activityTypeId ?? '';
		this.draftTicket = session.ticketId ?? '';
		this.draftTargetMs = session.targetDurationMs ?? null;
	};

	/**
	 * Later layout loads must not rebuild the store, but a full navigation can
	 * drop the live timer while the seed still has it. Restore that one row.
	 */
	#adoptLiveFromSeed = (seed: AppSeed): void => {
		if (this.activeSession) return;
		const live = this.#liveFromSeed(seed);
		if (!live) return;
		const local = this.sessions.find((s) => s.id === live.id);
		if (local?.status === 'stopped') return;
		this.#mergeActive(live);
		this.#applyDraftFromSession(live);
	};

	/** `active: null` is an explicit idle. Omitted falls back to the loaded window. */
	#liveFromSeed = (seed: AppSeed): TimeSession | null => {
		if (seed.active) return seed.active.status === 'active' ? seed.active : null;
		if (seed.active === null) return null;
		return seed.sessions.find((s) => s.status === 'active') ?? null;
	};

	#normalizeProjectSelection = (): void => {
		if (!this.projects.some((p) => p.id === this.draftProjectId)) {
			this.draftProjectId = this.projects[0]?.id ?? '';
		}
	};

	#normalizeActivitySelection = (): void => {
		if (!this.draftActivityType) return;
		if (!this.activityTypes.some((a) => a.id === this.draftActivityType)) {
			this.draftActivityType = '';
		}
	};

	#syncClock = (): void => {
		this.nowMs = this.#serverNowMs();
	};

	/** Client clock corrected to the server clock that stamps `startedAt` / `endedAt`. */
	#serverNowMs = (): number => Date.now() + this.#clockOffsetMs;

	/** Server-corrected now for one-off checks such as form bounds. Does not tick. */
	serverNowMs = (): number => this.#serverNowMs();

	/**
	 * `stamp` is server "now" during a request sent at `sentAt` (client clock).
	 * Offsets inside the round trip are latency, not skew, and are ignored.
	 */
	#syncServerClock = (stamp: string, sentAt: number): void => {
		const server = Date.parse(stamp);
		if (Number.isNaN(server)) return;
		const receivedAt = Date.now();
		if (server >= sentAt && server <= receivedAt) {
			this.#clockOffsetMs = 0;
			return;
		}
		this.#clockOffsetMs = server - (sentAt + receivedAt) / 2;
	};

	/** Tick only while a reader is subscribed (active elapsed / live today KPIs). */
	#liveNowMs = (): number => {
		this.#clockSubscribe();
		return this.#serverNowMs();
	};

	#asOfMs = (): number => {
		if (this.activeSession?.status === 'active') return this.#liveNowMs();
		return this.nowMs;
	};

	#bindVisibility = (): void => {
		if (this.#visibilityBound || typeof document === 'undefined') return;
		this.#visibilityBound = true;
		document.addEventListener('visibilitychange', this.#onVisible);
		if (!this.#peer) this.#bindPeer(createBroadcastPeer());
	};

	/** Coming back to the tab: fix the clock, then catch up with other devices. */
	#onVisible = (): void => {
		if (document.visibilityState !== 'visible') return;
		this.#syncClock();
		const now = monotonicMs();
		if (now - this.#lastReconcileAt < RECONCILE_MIN_GAP_MS) return;
		this.#lastReconcileAt = now;
		void this.reconcileActive();
	};

	#bindPeer = (peer: SessionPeer | null): void => {
		this.#peer?.close();
		this.#peer = peer;
		peer?.listen(this.#onPeer);
	};

	#share = (change: PeerChange): void => {
		this.#peer?.post({ ...change, owner: this.#prefs.email });
	};

	/** Replay a sibling tab's write. Mirrors what the local write path does. */
	#onPeer = (message: PeerMessage): void => {
		if (!this.#hydrated || message.owner !== this.#prefs.email) return;
		switch (message.type) {
			case 'session':
				this.#applyPeerSession(message.session, message.created);
				return;
			case 'session-removed': {
				const existing = this.sessions.find((s) => s.id === message.id);
				const projectId = message.projectId ?? existing?.projectId;
				if (this.#localStart?.id === message.id) this.#localStart = null;
				this.#removeSession(message.id);
				if (projectId) {
					this.#adjustSessionCount(
						projectId,
						message.activityTypeId ?? existing?.activityTypeId,
						-1
					);
				}
				return;
			}
			case 'project':
				this.#upsertProject(message.project);
				return;
			case 'project-removed':
				this.#removeProject(message.id);
				this.projectSessionCounts = withoutKey(this.projectSessionCounts, message.id);
				return;
			case 'activity-type':
				this.#upsertActivityType(message.activityType);
				return;
			case 'activity-type-removed':
				this.#removeActivityType(message.id);
				this.activityTypeSessionCounts = withoutKey(this.activityTypeSessionCounts, message.id);
				return;
			case 'prefs':
				this.#prefs.applyPrefs(message.prefs);
				return;
			case 'profile':
				this.#prefs.hydrateProfile(message.profile);
				return;
		}
	};

	#applyPeerSession = (session: TimeSession, created: boolean): void => {
		const wasActive = this.activeSession;
		const known = this.#loadedSessionIds.has(session.id);
		if (this.#localStart?.id === session.id && session.status !== 'active') {
			this.#localStart = null;
		}
		this.#upsertSession(session);
		if (created && !known) {
			this.#adjustSessionCount(session.projectId, session.activityTypeId, 1);
		}
		// Same draft rules as a local start, edit or stop of the live row.
		if (session.status === 'active' || wasActive?.id === session.id) {
			this.#applyDraftFromSession(session);
		}
	};

	#upsertById = <T extends { id: string }>(list: T[], item: T): T[] => {
		const i = list.findIndex((x) => x.id === item.id);
		if (i === -1) return [item, ...list];
		return list.map((x, idx) => (idx === i ? item : x));
	};

	#setProjects = (all: Project[]): void => {
		this.allProjects = all;
		this.projects = all.filter((p) => !p.isArchived);
		this.#normalizeProjectSelection();
	};

	#upsertProject = (project: Project): void => {
		this.#setProjects(this.#upsertById(this.allProjects, project));
	};

	#removeProject = (id: string): void => {
		this.#setProjects(this.allProjects.filter((p) => p.id !== id));
	};

	#setActivityTypes = (types: ActivityType[]): void => {
		this.activityTypes = types;
		this.#normalizeActivitySelection();
	};

	#upsertActivityType = (type: ActivityType): void => {
		this.#setActivityTypes(this.#upsertById(this.activityTypes, type));
	};

	#removeActivityType = (id: string): void => {
		this.#setActivityTypes(this.activityTypes.filter((a) => a.id !== id));
		if (this.draftActivityType === id) this.draftActivityType = '';
	};

	#upsertSession = (session: TimeSession): void => {
		const idx = this.sessions.findIndex((s) => s.id === session.id);
		if (idx === -1) {
			this.#loadedSessionIds.add(session.id);
			this.sessions = [session, ...this.sessions];
		} else {
			this.sessions = this.sessions.map((s, i) => (i === idx ? session : s));
		}
		if (session.status === 'active') this.#active = session;
		else if (this.#active?.id === session.id) this.#active = null;
		this.#syncClock();
	};

	#removeSession = (id: string): void => {
		this.sessions = this.sessions.filter((s) => s.id !== id);
		this.#loadedSessionIds.delete(id);
		this.#extraSessionIds.delete(id);
		if (this.#active?.id === id) this.#active = null;
		this.#syncClock();
	};

	/** Counts are loaded lazily; only bump keys that already exist. */
	#adjustSessionCount = (
		projectId: string,
		activityTypeId: string | undefined,
		delta: number
	): void => {
		if (this.projectSessionCounts[projectId] != null) {
			this.projectSessionCounts = {
				...this.projectSessionCounts,
				[projectId]: Math.max(0, this.projectSessionCounts[projectId] + delta)
			};
		}
		if (activityTypeId && this.activityTypeSessionCounts[activityTypeId] != null) {
			this.activityTypeSessionCounts = {
				...this.activityTypeSessionCounts,
				[activityTypeId]: Math.max(0, this.activityTypeSessionCounts[activityTypeId] + delta)
			};
		}
	};

	#cachedCount = (kind: 'project' | 'activity', id: string): number | undefined => {
		const map = kind === 'project' ? this.projectSessionCounts : this.activityTypeSessionCounts;
		return map[id];
	};

	#loadOneSessionCount = async (
		kind: 'project' | 'activity',
		id: string
	): Promise<number | undefined> => {
		try {
			const repo = this.#requireRepo();
			const count =
				kind === 'project'
					? await repo.countSessionsForProject(id)
					: await repo.countSessionsForActivityType(id);
			if (kind === 'project') {
				this.projectSessionCounts = { ...this.projectSessionCounts, [id]: count };
			} else {
				this.activityTypeSessionCounts = { ...this.activityTypeSessionCounts, [id]: count };
			}
			return count;
		} catch (e) {
			this.error = userMessageForError(e, m.error_invalid_response);
			return undefined;
		}
	};

	#bumpDrain = (): number => {
		this.#drainGen += 1;
		return this.#drainGen;
	};

	#syncLoadingMore = (): void => {
		this.loadingMore = this.#drainLoading || this.#pageLoading;
	};

	#rebuildLoadedIds = (): void => {
		this.#loadedSessionIds = new SvelteSet(this.sessions.map((s) => s.id));
	};

	/** Oldest startedAt that came from a page, ignoring the out-of-window active row. */
	#oldestPagedStartedAt = (): number | null => {
		for (let i = this.sessions.length - 1; i >= 0; i--) {
			const s = this.sessions[i]!;
			if (this.#extraSessionIds.has(s.id)) continue;
			const t = Date.parse(s.startedAt);
			return Number.isNaN(t) ? null : t;
		}
		return null;
	};

	#coveredThrough = (startedAtMs: number | null, pending: TimeSession[] | null): boolean => {
		if (!this.nextCursor && (pending == null || pending.length === 0)) return true;
		if (startedAtMs == null) return false;
		let oldest = this.#oldestPagedStartedAt();
		if (pending) {
			for (const s of pending) {
				const t = Date.parse(s.startedAt);
				if (!Number.isNaN(t) && (oldest == null || t < oldest)) oldest = t;
			}
		}
		return oldest != null && oldest <= startedAtMs;
	};

	#loadSessionPage = (limit: number, cursor: string | null): Promise<SessionPage> => {
		return this.#requireRepo().listSessions({
			limit,
			...(cursor ? { cursor } : {})
		});
	};

	/**
	 * New rows from one page. Repeats (in the page, in `skip`, or already loaded) are dropped.
	 * Extras that this page has now reached are listed but not unmarked until commit.
	 */
	#unseen = (
		items: TimeSession[],
		skip: Set<string>
	): { fresh: TimeSession[]; reached: string[] } => {
		const fresh: TimeSession[] = [];
		const reached: string[] = [];
		const seen = new SvelteSet<string>();
		for (const s of items) {
			if (seen.has(s.id) || skip.has(s.id)) continue;
			seen.add(s.id);
			if (this.#loadedSessionIds.has(s.id)) {
				if (this.#extraSessionIds.has(s.id)) reached.push(s.id);
				continue;
			}
			fresh.push(s);
		}
		return { fresh, reached };
	};

	#releaseExtras = (ids: string[]): void => {
		for (const id of ids) this.#extraSessionIds.delete(id);
	};

	#commitSessions = (items: TimeSession[]): void => {
		if (items.length === 0) return;
		const fresh: TimeSession[] = [];
		for (const s of items) {
			if (this.#loadedSessionIds.has(s.id)) continue;
			this.#loadedSessionIds.add(s.id);
			fresh.push(s);
		}
		if (fresh.length === 0) return;
		if (this.#extraSessionIds.size === 0) {
			this.sessions = [...this.sessions, ...fresh];
			return;
		}
		const base: TimeSession[] = [];
		const extras: TimeSession[] = [];
		for (const s of this.sessions) {
			if (this.#extraSessionIds.has(s.id)) extras.push(s);
			else base.push(s);
		}
		this.sessions = [...base, ...fresh, ...extras];
	};

	#mergeActive = (session: TimeSession): void => {
		this.#active = session.status === 'active' ? session : null;
		const idx = this.sessions.findIndex((s) => s.id === session.id);
		if (idx !== -1) {
			this.#extraSessionIds.delete(session.id);
			this.sessions = this.sessions.map((s, i) => (i === idx ? session : s));
			this.#loadedSessionIds.add(session.id);
			return;
		}
		const oldest = this.#oldestPagedStartedAt();
		const started = Date.parse(session.startedAt);
		if (this.nextCursor != null && oldest != null && !Number.isNaN(started) && started < oldest) {
			this.#extraSessionIds.add(session.id);
		}
		this.#insertNewestFirst(session);
		this.#loadedSessionIds.add(session.id);
	};

	#insertNewestFirst = (session: TimeSession): void => {
		const started = Date.parse(session.startedAt);
		const idx = this.sessions.findIndex((s) => Date.parse(s.startedAt) < started);
		if (idx === -1) this.sessions = [...this.sessions, session];
		else this.sessions = [...this.sessions.slice(0, idx), session, ...this.sessions.slice(idx)];
	};

	reset = (): void => {
		if (this.#visibilityBound && typeof document !== 'undefined') {
			document.removeEventListener('visibilitychange', this.#onVisible);
			this.#visibilityBound = false;
		}
		this.#bindPeer(null);
		this.#lastReconcileAt = -Infinity;
		this.#repo = null;
		this.#hydrated = false;
		this.nowMs = 0;
		this.timeZone = DEFAULT_TIME_ZONE;
		this.#bumpDrain();
		this.#drainLoading = false;
		this.#drainRun = null;
		this.#pageLoading = false;
		this.#clockOffsetMs = 0;
		this.#localStart = null;
		this.#active = null;
		this.#loadedSessionIds = new SvelteSet();
		this.#extraSessionIds = new SvelteSet();
		this.#countInflight.clear();
		this.sessions = [];
		this.nextCursor = null;
		this.loadingMore = false;
		this.projectSessionCounts = {};
		this.activityTypeSessionCounts = {};
		this.projects = [];
		this.allProjects = [];
		this.activityTypes = [];
		this.draftNote = '';
		this.draftProjectId = '';
		this.draftActivityType = '';
		this.draftTicket = '';
		this.draftTargetMs = null;
		this.error = null;
		this.pendingAction = null;
	};
}

let clientSession: SessionStore | undefined;

export function createSessionStore(prefs: PrefsStore): SessionStore {
	if (browser) {
		clientSession ??= new SessionStore(prefs);
		return clientSession;
	}
	return new SessionStore(prefs);
}

export function resetClientSessionStore(): void {
	clientSession?.reset();
}

export const [useSession, setSession] = createContext<SessionStore>();
