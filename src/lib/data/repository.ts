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
 * Frontend data access boundary.
 * Mock impl for Phase 2; HTTP impl later (Phase 5 / ADR-0004).
 */
export interface TimeTrackingRepository {
	listProjects(options?: ProjectListOptions): Project[];
	getProject(id: string): Project | undefined;
	createProject(input: CreateProjectInput): Project;
	updateProject(id: string, input: UpdateProjectInput): Project;
	archiveProject(id: string): Project;
	restoreProject(id: string): Project;
	/** Permanent remove. Throws if sessions reference id or last active. */
	deleteProject(id: string): void;
	countSessionsForProject(projectId: string): number;

	getProfile(): UserProfile;

	/** Sessions newest-first. */
	listSessions(filters?: SessionFilters): TimeSession[];
	getSession(id: string): TimeSession | undefined;
	/** Active or paused session, if any. */
	getActiveSession(): TimeSession | null;

	/**
	 * Start a new session. Fails if one is already active/paused
	 * (product default: require explicit stop).
	 */
	startSession(input: StartSessionInput): TimeSession;
	pauseSession(id: string): TimeSession;
	resumeSession(id: string): TimeSession;
	stopSession(id: string): TimeSession;
}
