import { browser } from '$app/environment';
import { announce } from '$lib/a11y/announce';
import { SESSION_PAGE_SIZE } from '$lib/api/pagination';
import type { AppSeed } from '$lib/api/types';
import { userMessageForError } from '$lib/api/user-message';
import { createRepository } from '$lib/data/create-repository';
import type { TimeTrackingRepository } from '$lib/data/repository';
import { m } from '$lib/paraglide/messages.js';
import { type PrefsStore } from '$lib/stores/prefs.svelte';
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
	CreateActivityTypeInput,
	CreateManualSessionInput,
	CreateProjectInput,
	Project,
	StartSessionInput,
	TimeSession,
	UpdateActivityTypeInput,
	UpdateProfileInput,
	UpdateProjectInput,
	UpdateSessionInput
} from '$lib/types/domain';
import { createContext } from 'svelte';
import { createSubscriber, SvelteDate, SvelteSet } from 'svelte/reactivity';

export type HydrateOptions = {
	nowMs?: number;
	timeZone?: string;
	repo?: TimeTrackingRepository;
};

/** Session counts live in a `$state.raw` map, so drop a key by rebuilding it. */
function withoutKey(counts: Record<string, number>, id: string): Record<string, number> {
	return Object.fromEntries(Object.entries(counts).filter(([key]) => key !== id));
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
	 * Snapshot wall-clock for day keys and paused elapsed.
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

	error = $state<string | null>(null);

	/** In-flight mutation; blocks double-submit. */
	pendingAction = $state<
		'start' | 'pause' | 'resume' | 'stop' | 'project' | 'profile' | 'activity' | 'session' | null
	>(null);

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
		if (this.#hydrated) return;
		this.#hydrated = true;
		this.nowMs = opts.nowMs ?? Date.now();
		this.timeZone = opts.timeZone ?? DEFAULT_TIME_ZONE;
		this.projects = seed.projects.filter((p) => !p.isArchived);
		this.allProjects = seed.projects;
		this.activityTypes = seed.activityTypes ?? [];
		this.sessions = seed.sessions;
		this.nextCursor = seed.nextCursor ?? null;

		const live = this.sessions.find((s) => s.status === 'active' || s.status === 'paused');
		if (live) {
			this.#applyDraftFromSession(live);
		} else {
			this.draftProjectId = this.#prefs.defaultProjectId || this.projects[0]?.id || '';
			const recent = this.sessions.find((s) => s.status === 'stopped');
			if (recent) {
				this.draftNote = recent.note;
				this.draftActivityType = recent.activityTypeId ?? '';
			}
		}
		this.#normalizeProjectSelection();

		if (opts.repo) {
			this.#repo = opts.repo;
		}
		if (browser) {
			this.#repo ??= createRepository();
			this.#bindVisibility();
		}
	};

	get ready(): boolean {
		return this.#hydrated;
	}

	activeSession = $derived.by(() => {
		return this.sessions.find((s) => s.status === 'active' || s.status === 'paused') ?? null;
	});

	elapsedMs = $derived.by(() => {
		const s = this.activeSession;
		if (!s) return 0;
		if (s.status === 'active') return sessionElapsedMs(s, this.#liveNowMs());
		return sessionElapsedMs(s, this.nowMs);
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
		const repo = this.#requireRepo();
		const [page, allProjects, activityTypes] = await Promise.all([
			repo.listSessions({ limit: SESSION_PAGE_SIZE }),
			repo.listProjects({ includeArchived: true }),
			repo.listActivityTypes()
		]);
		this.sessions = page.items;
		this.nextCursor = page.nextCursor;
		this.#setProjects(allProjects);
		this.#setActivityTypes(activityTypes);
		this.#syncClock();
	};

	loadMore = async (): Promise<boolean> => {
		if (!this.nextCursor || this.loadingMore) return false;
		const repo = this.#requireRepo();
		this.loadingMore = true;
		try {
			const page = await repo.listSessions({
				limit: SESSION_PAGE_SIZE,
				cursor: this.nextCursor
			});
			const have = new SvelteSet(this.sessions.map((s) => s.id));
			const extra = page.items.filter((s) => !have.has(s.id));
			this.sessions = [...this.sessions, ...extra];
			this.nextCursor = page.nextCursor;
			return extra.length > 0;
		} catch (e) {
			this.error = userMessageForError(e, m.error_invalid_response);
			return false;
		} finally {
			this.loadingMore = false;
		}
	};

	/** Fetch further pages until the oldest loaded session is at or before `startedAtMs`, or the list ends. `null` drains all remaining pages. */
	ensureThrough = async (startedAtMs: number | null): Promise<void> => {
		while (this.nextCursor) {
			const oldest = this.sessions.at(-1);
			if (startedAtMs != null && oldest != null && Date.parse(oldest.startedAt) <= startedAtMs) {
				return;
			}
			const more = await this.loadMore();
			if (!more) return;
		}
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

	createProject = async (input: CreateProjectInput): Promise<Project | null> => {
		if (!this.#begin('project')) return null;
		this.error = null;
		try {
			const project = await this.#requireRepo().createProject(input);
			this.#upsertProject(project);
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
			this.draftProjectId = projectId;
			this.draftNote = note;
			this.draftActivityType = activityTypeId ?? '';
			const started = await this.#requireRepo().startSession({
				projectId,
				note,
				ticketId: input?.ticketId,
				activityTypeId,
				tags: input?.tags
			});
			this.#upsertSession(started);
			this.#adjustSessionCount(started.projectId, started.activityTypeId, 1);
			announce(m.announce_session_started());
		} catch (e) {
			this.error = userMessageForError(e, m.error_failed_start_session);
		} finally {
			this.#end();
		}
	};

	/**
	 * Start a new session from a recent task/log (Flow D).
	 * Blocks if another session is already active or paused.
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
			activityTypeId: s.activityTypeId,
			tags: s.tags
		});
	};

	updateSession = async (id: string, input: UpdateSessionInput): Promise<TimeSession | null> => {
		if (!this.#begin('session')) return null;
		this.error = null;
		try {
			const updated = await this.#requireRepo().updateSession(id, input);
			this.#upsertSession(updated);
			if (updated.status === 'active' || updated.status === 'paused') {
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
			announce(m.announce_session_created());
			return created;
		} catch (e) {
			this.error = userMessageForError(e, m.error_failed_create_session);
			return null;
		} finally {
			this.#end();
		}
	};

	pause = async (): Promise<void> => {
		const s = this.activeSession;
		if (!s || s.status !== 'active') return;
		if (!this.#begin('pause')) return;
		this.error = null;
		try {
			const paused = await this.#requireRepo().pauseSession(s.id);
			this.#upsertSession(paused);
			announce(m.announce_session_paused());
		} catch (e) {
			this.error = userMessageForError(e, m.error_failed_pause);
		} finally {
			this.#end();
		}
	};

	resume = async (): Promise<void> => {
		const s = this.activeSession;
		if (!s || s.status !== 'paused') return;
		if (!this.#begin('resume')) return;
		this.error = null;
		try {
			const resumed = await this.#requireRepo().resumeSession(s.id);
			this.#upsertSession(resumed);
			announce(m.announce_session_resumed());
		} catch (e) {
			this.error = userMessageForError(e, m.error_failed_resume);
		} finally {
			this.#end();
		}
	};

	stop = async (): Promise<void> => {
		const s = this.activeSession;
		if (!s) return;
		if (!this.#begin('stop')) return;
		this.error = null;
		try {
			const stopped = await this.#requireRepo().stopSession(s.id);
			this.#applyDraftFromSession(stopped);
			this.#upsertSession(stopped);
			announce(m.announce_session_stopped());
		} catch (e) {
			this.error = userMessageForError(e, m.error_failed_stop);
		} finally {
			this.#end();
		}
	};

	clearError = (): void => {
		this.error = null;
	};

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

	#begin = (
		action: 'start' | 'pause' | 'resume' | 'stop' | 'project' | 'profile' | 'activity' | 'session'
	): boolean => {
		if (this.pendingAction) return false;
		this.pendingAction = action;
		return true;
	};

	#end = (): void => {
		this.pendingAction = null;
	};

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
	};

	#normalizeProjectSelection = (): void => {
		const activeIds = new SvelteSet(this.projects.map((p) => p.id));
		const fallback = this.projects[0]?.id ?? '';

		if (!activeIds.has(this.draftProjectId)) {
			this.draftProjectId = fallback;
		}
		if (!activeIds.has(this.#prefs.defaultProjectId)) {
			if (fallback) this.#prefs.setDefaultProjectId(fallback);
		}
	};

	#normalizeActivitySelection = (): void => {
		if (!this.draftActivityType) return;
		if (!this.activityTypes.some((a) => a.id === this.draftActivityType)) {
			this.draftActivityType = '';
		}
	};

	#syncClock = (): void => {
		this.nowMs = Date.now();
	};

	/** Tick only while a reader is subscribed (active elapsed / live today KPIs). */
	#liveNowMs = (): number => {
		this.#clockSubscribe();
		return Date.now();
	};

	#asOfMs = (): number => {
		if (this.activeSession?.status === 'active') return this.#liveNowMs();
		return this.nowMs;
	};

	#bindVisibility = (): void => {
		if (this.#visibilityBound || typeof document === 'undefined') return;
		this.#visibilityBound = true;
		document.addEventListener('visibilitychange', this.#onVisible);
	};

	#onVisible = (): void => {
		if (document.visibilityState === 'visible') this.#syncClock();
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
		this.sessions = this.#upsertById(this.sessions, session);
		this.#syncClock();
	};

	#removeSession = (id: string): void => {
		this.sessions = this.sessions.filter((s) => s.id !== id);
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

	reset = (): void => {
		if (this.#visibilityBound && typeof document !== 'undefined') {
			document.removeEventListener('visibilitychange', this.#onVisible);
			this.#visibilityBound = false;
		}
		this.#repo = null;
		this.#hydrated = false;
		this.nowMs = 0;
		this.timeZone = DEFAULT_TIME_ZONE;
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
