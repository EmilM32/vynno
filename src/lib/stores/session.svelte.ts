import { browser } from '$app/environment';
import { MockTimeTrackingRepository } from '$lib/data/mock-repository';
import type { TimeTrackingRepository } from '$lib/data/repository';
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
	#repo: TimeTrackingRepository;

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

	#tickId: ReturnType<typeof setInterval> | null = null;

	constructor(repo: TimeTrackingRepository = new MockTimeTrackingRepository()) {
		this.#repo = repo;
		this.projects = repo.listProjects();
		this.allProjects = repo.listProjects({ includeArchived: true });
		this.sessions = repo.listSessions();
		this.draftProjectId = prefsStore.defaultProjectId || this.projects[0]?.id || '';

		// Prefill note from most recent stopped session; keep default project unless unknown
		const recent = this.sessions.find((s) => s.status === 'stopped');
		if (recent) {
			this.draftNote = recent.note;
		}
		this.#normalizeProjectSelection();

		if (browser) {
			this.#startClock();
		}
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

	refresh = (): void => {
		this.sessions = this.#repo.listSessions();
		this.projects = this.#repo.listProjects();
		this.allProjects = this.#repo.listProjects({ includeArchived: true });
		this.#normalizeProjectSelection();
	};

	createProject = (input: CreateProjectInput): Project | null => {
		this.error = null;
		try {
			const project = this.#repo.createProject(input);
			this.refresh();
			return project;
		} catch (e) {
			this.error = e instanceof Error ? e.message : 'Failed to create project';
			return null;
		}
	};

	updateProject = (id: string, input: UpdateProjectInput): Project | null => {
		this.error = null;
		try {
			const project = this.#repo.updateProject(id, input);
			this.refresh();
			return project;
		} catch (e) {
			this.error = e instanceof Error ? e.message : 'Failed to update project';
			return null;
		}
	};

	archiveProject = (id: string): boolean => {
		this.error = null;
		try {
			this.#repo.archiveProject(id);
			this.refresh();
			return true;
		} catch (e) {
			this.error = e instanceof Error ? e.message : 'Failed to archive project';
			return false;
		}
	};

	restoreProject = (id: string): boolean => {
		this.error = null;
		try {
			this.#repo.restoreProject(id);
			this.refresh();
			return true;
		} catch (e) {
			this.error = e instanceof Error ? e.message : 'Failed to restore project';
			return false;
		}
	};

	deleteProject = (id: string): boolean => {
		this.error = null;
		try {
			this.#repo.deleteProject(id);
			this.refresh();
			return true;
		} catch (e) {
			this.error = e instanceof Error ? e.message : 'Failed to delete project';
			return false;
		}
	};

	start = (input?: Partial<StartSessionInput>): void => {
		this.error = null;
		try {
			const projectId = input?.projectId ?? this.draftProjectId;
			const note = input?.note ?? this.draftNote;
			this.#repo.startSession({
				projectId,
				note,
				ticketId: input?.ticketId,
				activityType: input?.activityType,
				tags: input?.tags
			});
			this.refresh();
		} catch (e) {
			this.error = e instanceof Error ? e.message : 'Failed to start session';
		}
	};

	/**
	 * Start a new session from a recent task/log (Flow D).
	 * Blocks if another session is already active or paused.
	 */
	restartFromTask = (input: StartSessionInput): boolean => {
		if (this.activeSession) {
			this.error = 'Stop the current session before starting a new one.';
			return false;
		}
		this.start(input);
		return this.error == null;
	};

	/** Restart using a historical session id. */
	restartFromSession = (sessionId: string): boolean => {
		const s = this.sessions.find((x) => x.id === sessionId);
		if (!s) {
			this.error = 'Session not found.';
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

	pause = (): void => {
		const s = this.activeSession;
		if (!s || s.status !== 'active') return;
		this.error = null;
		try {
			this.#repo.pauseSession(s.id);
			this.refresh();
		} catch (e) {
			this.error = e instanceof Error ? e.message : 'Failed to pause';
		}
	};

	resume = (): void => {
		const s = this.activeSession;
		if (!s || s.status !== 'paused') return;
		this.error = null;
		try {
			this.#repo.resumeSession(s.id);
			this.refresh();
		} catch (e) {
			this.error = e instanceof Error ? e.message : 'Failed to resume';
		}
	};

	stop = (): void => {
		const s = this.activeSession;
		if (!s) return;
		this.error = null;
		try {
			const stopped = this.#repo.stopSession(s.id);
			// Keep draft prefilled with what just finished
			this.draftNote = stopped.note;
			this.draftProjectId = stopped.projectId;
			this.refresh();
		} catch (e) {
			this.error = e instanceof Error ? e.message : 'Failed to stop';
		}
	};

	clearError = (): void => {
		this.error = null;
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
