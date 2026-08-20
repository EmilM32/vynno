import { browser } from '$app/environment';
import { announce } from '$lib/a11y/announce';
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
	CreateProjectInput,
	Project,
	StartSessionInput,
	TimeSession,
	UpdateProfileInput,
	UpdateProjectInput
} from '$lib/types/domain';
import { createContext } from 'svelte';
import { SvelteDate, SvelteSet } from 'svelte/reactivity';

export type HydrateOptions = {
	nowMs?: number;
	timeZone?: string;
};

/**
 * Session lifecycle + projection of repository data for the UI.
 * Created per server request; cached as a client singleton after hydrate
 * so in-app navigation does not reset the timer (ADR-0004 / ADR-0011).
 */
export class SessionStore {
	#repo: TimeTrackingRepository | null = null;
	#hydrated = false;
	#prefs: PrefsStore;

	/** Wall-clock used for live elapsed (updated on an interval while browser). */
	nowMs = $state(0);

	/** IANA zone for first-paint day keys and local times. */
	timeZone = $state(DEFAULT_TIME_ZONE);

	/** Full session list mirror (newest-first after refresh). */
	sessions = $state.raw<TimeSession[]>([]);

	/** Active (non-archived) projects for pickers. */
	projects = $state.raw<Project[]>([]);

	/** All projects including archived (management UI). */
	allProjects = $state.raw<Project[]>([]);

	/** Draft fields for the Timer form (idle / pre-start). */
	draftNote = $state('');
	draftProjectId = $state('');
	/** Empty string = unset; posted as null. */
	draftActivityType = $state<ActivityType | ''>('');

	error = $state<string | null>(null);

	/** In-flight mutation; blocks double-submit. */
	pendingAction = $state<'start' | 'pause' | 'resume' | 'stop' | 'project' | 'profile' | null>(
		null
	);

	busy = $derived(this.pendingAction != null);

	#tickId: ReturnType<typeof setInterval> | null = null;

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
		this.sessions = seed.sessions;

		const live = this.sessions.find((s) => s.status === 'active' || s.status === 'paused');
		if (live) {
			this.#applyDraftFromSession(live);
		} else {
			this.draftProjectId = this.#prefs.defaultProjectId || this.projects[0]?.id || '';
			const recent = this.sessions.find((s) => s.status === 'stopped');
			if (recent) {
				this.draftNote = recent.note;
				this.draftActivityType = recent.activityType ?? '';
			}
		}
		this.#normalizeProjectSelection();

		if (browser) {
			this.#repo = createRepository();
			this.#startClock();
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
		return sessionElapsedMs(s, this.nowMs);
	});

	elapsedLabel = $derived(formatClock(this.elapsedMs));

	todayTotalMs = $derived.by(() =>
		todayTotalMs(this.sessions, new SvelteDate(this.nowMs), this.timeZone)
	);

	todayDeltaMs = $derived.by(() =>
		todayDeltaMs(this.sessions, new SvelteDate(this.nowMs), this.timeZone)
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

	activeProject = $derived.by(() => {
		const s = this.activeSession;
		if (!s) return undefined;
		return this.getProject(s.projectId);
	});

	countSessionsForProject = (projectId: string): number => {
		return this.sessions.filter((s) => s.projectId === projectId).length;
	};

	/** Active projects remaining after a hypothetical archive of `id`. */
	canArchiveOrDeleteActive = (id: string): boolean => {
		const active = this.projects;
		if (active.length <= 1 && active.some((p) => p.id === id)) return false;
		return true;
	};

	refresh = async (): Promise<void> => {
		const repo = this.#requireRepo();
		this.sessions = await repo.listSessions();
		this.projects = await repo.listProjects();
		this.allProjects = await repo.listProjects({ includeArchived: true });
		this.#normalizeProjectSelection();
	};

	createProject = async (input: CreateProjectInput): Promise<Project | null> => {
		if (!this.#begin('project')) return null;
		this.error = null;
		try {
			const project = await this.#requireRepo().createProject(input);
			await this.refresh();
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
			await this.refresh();
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
			await this.#requireRepo().archiveProject(id);
			await this.refresh();
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
			await this.#requireRepo().restoreProject(id);
			await this.refresh();
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
			await this.refresh();
			return true;
		} catch (e) {
			this.error = userMessageForError(e, m.error_failed_delete_project);
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
			const activityType =
				input && 'activityType' in input ? input.activityType : this.draftActivityType || undefined;
			this.draftProjectId = projectId;
			this.draftNote = note;
			this.draftActivityType = activityType ?? '';
			await this.#requireRepo().startSession({
				projectId,
				note,
				ticketId: input?.ticketId,
				activityType,
				tags: input?.tags
			});
			await this.refresh();
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
			activityType: s.activityType,
			tags: s.tags
		});
	};

	pause = async (): Promise<void> => {
		const s = this.activeSession;
		if (!s || s.status !== 'active') return;
		if (!this.#begin('pause')) return;
		this.error = null;
		try {
			await this.#requireRepo().pauseSession(s.id);
			await this.refresh();
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
			await this.#requireRepo().resumeSession(s.id);
			await this.refresh();
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
			await this.refresh();
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

	#begin = (action: 'start' | 'pause' | 'resume' | 'stop' | 'project' | 'profile'): boolean => {
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
		this.draftActivityType = session.activityType ?? '';
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

	#startClock = (): void => {
		if (this.#tickId != null) return;
		this.#tickId = setInterval(() => {
			this.nowMs = Date.now();
		}, 250);
	};

	reset = (): void => {
		if (this.#tickId != null) {
			clearInterval(this.#tickId);
			this.#tickId = null;
		}
		this.#repo = null;
		this.#hydrated = false;
		this.nowMs = 0;
		this.timeZone = DEFAULT_TIME_ZONE;
		this.sessions = [];
		this.projects = [];
		this.allProjects = [];
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
