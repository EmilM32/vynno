import type {
	ActivityType,
	CreateActivityTypeInput,
	CreateManualSessionInput,
	CreateProjectInput,
	Project,
	ProjectListOptions,
	SessionFilters,
	SessionPage,
	StartSessionInput,
	TimeSession,
	UpdateActivityTypeInput,
	UpdateProfileInput,
	UpdateProjectInput,
	UpdateSessionInput,
	UserProfile
} from '$lib/types/domain';

/**
 * Frontend data access boundary (async).
 * HTTP impl is what the SPA uses; memory impl is tests + the mock `+server.ts` engine.
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

	listActivityTypes(): Promise<ActivityType[]>;
	getActivityType(id: string): Promise<ActivityType | undefined>;
	createActivityType(input: CreateActivityTypeInput): Promise<ActivityType>;
	updateActivityType(id: string, input: UpdateActivityTypeInput): Promise<ActivityType>;
	deleteActivityType(id: string): Promise<void>;
	countSessionsForActivityType(activityTypeId: string): Promise<number>;

	getProfile(): Promise<UserProfile>;
	updateProfile(input: UpdateProfileInput): Promise<UserProfile>;
	uploadAvatar(file: Blob): Promise<UserProfile>;
	deleteAvatar(): Promise<UserProfile>;

	/** Sessions newest-first. One page; follow nextCursor for more. */
	listSessions(filters?: SessionFilters): Promise<SessionPage>;
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
	updateSession(id: string, input: UpdateSessionInput): Promise<TimeSession>;
	deleteSession(id: string): Promise<void>;
	createManualSession(input: CreateManualSessionInput): Promise<TimeSession>;
}
