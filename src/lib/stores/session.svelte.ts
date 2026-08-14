import { browser } from '$app/environment';
import { announce } from '$lib/a11y/announce';
import type { AppSeed } from '$lib/api/types';
import { userMessageForError } from '$lib/api/user-message';
import { createRepository } from '$lib/data/create-repository';
import type { TimeTrackingRepository } from '$lib/data/repository';
import { m } from '$lib/paraglide/messages.js';
import { prefsStore } from '$lib/stores/prefs.svelte';
import {
	projectWeekSummaries,
	recentStoppedSessions,
	recentTasks,
	todayDeltaMs,
	todayTotalMs,
	weeklyDayTotals
} from '$lib/time/aggregates';
import { formatClock, sessionElapsedMs } from '$lib/time/duration';
import type {
	CreateProjectInput,
	Project,
	StartSessionInput,
	TimeSession,
	UpdateProjectInput
} from '$lib/types/domain';

/**
 * Client session lifecycle + projection of repository data for the UI.
 * Uses a class with $state fields so navigation does not reset the timer (ADR-0004).
 */
class SessionStore {
	#repo: TimeTrackingRepository | null = null;

	/** Wall-clock used for live elapsed (updated on an interval while browser). */
	nowMs = $state(Date.now());

	/** Full session list mirror (newest-first after refresh). */
	sessions = $state.raw<TimeSession[]>([]);

	/** Active (non-archived) projects for pickers. */
	projects = $state.raw<Project[]>([]);

	/** All projects including archived (management UI). */
	allProjects = $state.raw<Project[]>([]);

	/** Draft fields for the Timer form (idle / pre-start). */
	draftNote = $state('Refactoring Auth Service');
	draftProjectId = $state('');

	error = $state<string | null>(null);

	/** In-flight mutation; blocks double-submit. */
	pendingAction = $state<'start' | 'pause' | 'resume' | 'stop' | 'project' | null>(null);

	busy = $derived(this.pendingAction != null);

	#tickId: ReturnType<typeof setInterval> | null = null;

	/**
	 * Apply a domain seed once. Subsequent load runs (and retries after success)
	 * must not rebuild the repo or the live timer resets.
	 */
	hydrate = (seed: AppSeed): void => {
		if (this.#repo) return;
		this.#repo = createRepository();
		this.projects = seed.projects.filter((p) => !p.isArchived);
		this.allProjects = seed.projects;
		this.sessions = seed.sessions;

		this.draftProjectId = prefsStore.defaultProjectId || this.projects[0]?.id || '';
		const recent = this.sessions.find((s) => s.status === 'stopped');
		if (recent) {
			this.draftNote = recent.note;
		}
		this.#normalizeProjectSelection();

		if (browser) {
			this.#startClock();
		}
	};

	get ready(): boolean {
		return this.#repo != null;
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

	todayTotalMs = $derived.by(() => todayTotalMs(this.sessions, new Date(this.nowMs)));

	todayDeltaMs = $derived.by(() => todayDeltaMs(this.sessions, new Date(this.nowMs)));

	recentLogs = $derived.by(() => recentStoppedSessions(this.sessions, 8));

	recentTaskItems = $derived.by(() => recentTasks(this.sessions, 5));

	weekDayTotals = $derived.by(() => weeklyDayTotals(this.sessions, new Date(this.nowMs)));

	projectWeekSummaries = $derived.by(() =>
		projectWeekSummaries(this.sessions, this.projects, new Date(this.nowMs))
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
			await this.#requireRepo().startSession({
				projectId,
				note,
				ticketId: input?.ticketId,
				activityType: input?.activityType,
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
			this.draftNote = stopped.note;
			this.draftProjectId = stopped.projectId;
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

	#begin = (action: 'start' | 'pause' | 'resume' | 'stop' | 'project'): boolean => {
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

	#normalizeProjectSelection = (): void => {
		const activeIds = new Set(this.projects.map((p) => p.id));
		const fallback = this.projects[0]?.id ?? '';

		if (!activeIds.has(this.draftProjectId)) {
			this.draftProjectId = fallback;
		}
		if (!activeIds.has(prefsStore.defaultProjectId)) {
			if (fallback) prefsStore.setDefaultProjectId(fallback);
		}
	};

	#startClock = (): void => {
		if (this.#tickId != null) return;
		this.#tickId = setInterval(() => {
			this.nowMs = Date.now();
		}, 250);
	};
}

/** App-wide singleton — safe for SPA mock data; reset on full reload. */
export const sessionStore = new SessionStore();
