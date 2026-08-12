import type {
	Project,
	SessionFilters,
	StartSessionInput,
	TimeSession,
	UserProfile
} from '$lib/types/domain';
import { buildMockSessions, MOCK_PROFILE, MOCK_PROJECTS } from './fixtures';
import type { TimeTrackingRepository } from './repository';

function newId(prefix: string): string {
	return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

/**
 * In-memory repository seeded with fixtures.
 * Mutations are session-scoped (lost on full page reload).
 */
export class MockTimeTrackingRepository implements TimeTrackingRepository {
	#projects: Project[];
	#sessions: TimeSession[];
	#profile: UserProfile;

	constructor(now = new Date()) {
		this.#projects = structuredClone(MOCK_PROJECTS);
		this.#sessions = buildMockSessions(now);
		this.#profile = { ...MOCK_PROFILE };
	}

	listProjects(): Project[] {
		return this.#projects.filter((p) => !p.isArchived);
	}

	getProject(id: string): Project | undefined {
		return this.#projects.find((p) => p.id === id);
	}

	getProfile(): UserProfile {
		return this.#profile;
	}

	listSessions(filters: SessionFilters = {}): TimeSession[] {
		let list = [...this.#sessions];

		if (filters.status?.length) {
			const set = new Set(filters.status);
			list = list.filter((s) => set.has(s.status));
		}

		list.sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));

		if (filters.limit != null) {
			list = list.slice(0, filters.limit);
		}

		return list.map(cloneSession);
	}

	getSession(id: string): TimeSession | undefined {
		const s = this.#sessions.find((x) => x.id === id);
		return s ? cloneSession(s) : undefined;
	}

	getActiveSession(): TimeSession | null {
		const s = this.#sessions.find((x) => x.status === 'active' || x.status === 'paused');
		return s ? cloneSession(s) : null;
	}

	startSession(input: StartSessionInput): TimeSession {
		if (this.getActiveSession()) {
			throw new Error('An active session already exists. Stop it before starting a new one.');
		}

		const project = this.getProject(input.projectId);
		if (!project) {
			throw new Error(`Unknown project: ${input.projectId}`);
		}

		const session: TimeSession = {
			id: newId('sess'),
			projectId: input.projectId,
			note: input.note.trim() || 'Untitled session',
			ticketId: input.ticketId,
			activityType: input.activityType,
			tags: input.tags,
			status: 'active',
			startedAt: new Date().toISOString(),
			pausedMs: 0,
			targetDurationMs: input.targetDurationMs
		};

		this.#sessions.unshift(session);
		return cloneSession(session);
	}

	pauseSession(id: string): TimeSession {
		const session = this.#require(id);
		if (session.status !== 'active') {
			throw new Error(`Cannot pause session in status "${session.status}"`);
		}
		session.status = 'paused';
		session.pausedAt = new Date().toISOString();
		return cloneSession(session);
	}

	resumeSession(id: string): TimeSession {
		const session = this.#require(id);
		if (session.status !== 'paused') {
			throw new Error(`Cannot resume session in status "${session.status}"`);
		}
		if (session.pausedAt) {
			const pausedFor = Date.now() - Date.parse(session.pausedAt);
			if (pausedFor > 0) session.pausedMs += pausedFor;
		}
		session.status = 'active';
		delete session.pausedAt;
		return cloneSession(session);
	}

	stopSession(id: string): TimeSession {
		const session = this.#require(id);
		if (session.status === 'stopped') {
			throw new Error('Session is already stopped');
		}
		const now = new Date();
		if (session.status === 'paused' && session.pausedAt) {
			const pausedFor = now.getTime() - Date.parse(session.pausedAt);
			if (pausedFor > 0) session.pausedMs += pausedFor;
			delete session.pausedAt;
		}
		session.status = 'stopped';
		session.endedAt = now.toISOString();
		return cloneSession(session);
	}

	#require(id: string): TimeSession {
		const session = this.#sessions.find((s) => s.id === id);
		if (!session) throw new Error(`Session not found: ${id}`);
		return session;
	}
}

function cloneSession(s: TimeSession): TimeSession {
	return {
		...s,
		tags: s.tags ? [...s.tags] : undefined
	};
}
