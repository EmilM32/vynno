import type {
	Project,
	SessionFilters,
	StartSessionInput,
	TimeSession,
	UserProfile
} from '$lib/types/domain';

/**
 * Frontend data access boundary.
 * Mock impl for Phase 2; HTTP impl later (Phase 5 / ADR-0004).
 */
export interface TimeTrackingRepository {
	listProjects(): Project[];
	getProject(id: string): Project | undefined;
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
