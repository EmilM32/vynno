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
	ProjectListOptions,
	RequestEmailChangeInput,
	SessionFilters,
	SessionPage,
	StartSessionInput,
	TimeSession,
	UpdateActivityTypeInput,
	UpdatePrefsInput,
	UpdateProfileInput,
	UpdateProjectInput,
	UpdateSessionInput,
	UserPrefs,
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

	getPrefs(): Promise<UserPrefs>;
	updatePrefs(input: UpdatePrefsInput): Promise<UserPrefs>;

	/** Keeps this session and signs out the others. Wrong current password: `invalid_credentials`. */
	changePassword(input: ChangePasswordInput): Promise<void>;
	/** Mails a code to the new address. The email does not change yet. */
	requestEmailChange(input: RequestEmailChangeInput): Promise<void>;
	changeEmail(input: ChangeEmailInput): Promise<UserProfile>;

	/** Sessions newest-first. One page; follow nextCursor for more. */
	listSessions(filters?: SessionFilters): Promise<SessionPage>;
	getSession(id: string): Promise<TimeSession | undefined>;
	/** Active session, if any. */
	getActiveSession(): Promise<TimeSession | null>;

	/**
	 * Start a new session. Fails if one is already active
	 * (product default: require explicit stop).
	 */
	startSession(input: StartSessionInput): Promise<TimeSession>;
	stopSession(id: string): Promise<TimeSession>;
	updateSession(id: string, input: UpdateSessionInput): Promise<TimeSession>;
	deleteSession(id: string): Promise<void>;
	createManualSession(input: CreateManualSessionInput): Promise<TimeSession>;

	/** Stopped-session totals per local date, project and activity type. */
	listDayTotals(range: DayTotalsRange): Promise<DayTotal[]>;
}
