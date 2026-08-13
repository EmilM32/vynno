import type {
	CreateProjectInput,
	Project,
	ProjectListOptions,
	SessionFilters,
	StartSessionInput,
	TimeSession,
	UpdateProjectInput,
	UserProfile
} from '$lib/types/domain';

/**
 * Frontend data access boundary (async).
 * Memory impl for mock writes; HTTP impl for the live API (ADR-0004 / ADR-0010).
 */
export interface TimeTrackingRepository {
	listProjects(options?: ProjectListOptions): Promise<Project[]>;
	getProject(id: string): Promise<Project | undefined>;
	createProject(input: CreateProjectInput): Promise<Project>;
	updateProject(id: string, input: UpdateProjectInput): Promise<Project>;
	archiveProject(id: string): Promise<Project>;
	restoreProject(id: string): Promise<Project>;
	/** Permanent remove. Throws if sessions reference id or last active. */
	deleteProject(id: string): Promise<void>;
	countSessionsForProject(projectId: string): Promise<number>;

	getProfile(): Promise<UserProfile>;

	/** Sessions newest-first. */
	listSessions(filters?: SessionFilters): Promise<TimeSession[]>;
	getSession(id: string): Promise<TimeSession | undefined>;
	/** Active or paused session, if any. */
	getActiveSession(): Promise<TimeSession | null>;

	/**
	 * Start a new session. Fails if one is already active/paused
	 * (product default: require explicit stop).
	 */
	startSession(input: StartSessionInput): Promise<TimeSession>;
	pauseSession(id: string): Promise<TimeSession>;
	resumeSession(id: string): Promise<TimeSession>;
	stopSession(id: string): Promise<TimeSession>;
}
