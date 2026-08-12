import {
	normalizeCode,
	normalizeProjectFields,
	validateProjectFields
} from '$lib/projects/validate';
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
import { buildMockSessions, MOCK_PROFILE, MOCK_PROJECTS } from './fixtures';
import type { TimeTrackingRepository } from './repository';

function newId(prefix: string): string {
	return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

function cloneProject(p: Project): Project {
	return { ...p };
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

	listProjects(options: ProjectListOptions = {}): Project[] {
		const list = options.includeArchived
			? this.#projects
			: this.#projects.filter((p) => !p.isArchived);
		return list.map(cloneProject);
	}

	getProject(id: string): Project | undefined {
		const p = this.#projects.find((x) => x.id === id);
		return p ? cloneProject(p) : undefined;
	}

	createProject(input: CreateProjectInput): Project {
		const fields = normalizeProjectFields({
			name: input.name,
			color: input.color,
			code: input.code ?? ''
		});
		const err = validateProjectFields({
			name: fields.name,
			color: fields.color,
			code: fields.code ?? ''
		});
		if (err) throw new Error(err);
		this.#assertCodeUnique(fields.code);

		const project: Project = {
			id: newId('proj'),
			name: fields.name,
			color: fields.color,
			...(fields.code ? { code: fields.code } : {}),
			isArchived: false
		};
		this.#projects.push(project);
		return cloneProject(project);
	}

	updateProject(id: string, input: UpdateProjectInput): Project {
		const project = this.#requireProject(id);

		const nextName = input.name !== undefined ? input.name.trim() : project.name;
		const nextColor = input.color !== undefined ? input.color : project.color;
		let nextCode: string | undefined = project.code;
		if (input.code !== undefined) {
			nextCode = input.code === null ? undefined : normalizeCode(input.code);
		}

		const err = validateProjectFields({
			name: nextName,
			color: nextColor,
			code: nextCode ?? ''
		});
		if (err) throw new Error(err);
		this.#assertCodeUnique(nextCode, id);

		project.name = nextName;
		project.color = nextColor;
		if (nextCode) project.code = nextCode;
		else delete project.code;

		return cloneProject(project);
	}

	archiveProject(id: string): Project {
		const project = this.#requireProject(id);
		if (project.isArchived) {
			throw new Error('Project is already archived.');
		}
		this.#assertNotLastActive(id);
		project.isArchived = true;
		return cloneProject(project);
	}

	restoreProject(id: string): Project {
		const project = this.#requireProject(id);
		if (!project.isArchived) {
			throw new Error('Project is not archived.');
		}
		project.isArchived = false;
		return cloneProject(project);
	}

	deleteProject(id: string): void {
		const project = this.#requireProject(id);
		const sessions = this.countSessionsForProject(id);
		if (sessions > 0) {
			throw new Error('This project has logged sessions. Archive it instead.');
		}
		if (!project.isArchived) {
			this.#assertNotLastActive(id);
		} else {
			// archived: only block if no other active projects exist (edge case)
			const activeCount = this.#projects.filter((p) => !p.isArchived).length;
			if (activeCount === 0) {
				throw new Error('Cannot delete the last remaining active project.');
			}
		}
		this.#projects = this.#projects.filter((p) => p.id !== id);
	}

	countSessionsForProject(projectId: string): number {
		return this.#sessions.filter((s) => s.projectId === projectId).length;
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
		if (!project || project.isArchived) {
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

	#requireProject(id: string): Project {
		const project = this.#projects.find((p) => p.id === id);
		if (!project) throw new Error(`Project not found: ${id}`);
		return project;
	}

	#activeProjects(): Project[] {
		return this.#projects.filter((p) => !p.isArchived);
	}

	#assertNotLastActive(id: string): void {
		const active = this.#activeProjects();
		if (active.length <= 1 && active.some((p) => p.id === id)) {
			throw new Error('Cannot archive or delete the last remaining active project.');
		}
	}

	#assertCodeUnique(code: string | undefined, excludeId?: string): void {
		if (!code) return;
		const clash = this.#projects.find(
			(p) => p.id !== excludeId && p.code && p.code.toUpperCase() === code.toUpperCase()
		);
		if (clash) {
			throw new Error(`Code "${code}" is already in use.`);
		}
	}
}

function cloneSession(s: TimeSession): TimeSession {
	return {
		...s,
		tags: s.tags ? [...s.tags] : undefined
	};
}
