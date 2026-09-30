import { SESSION_LIST_DEFAULT_LIMIT } from '$lib/api/pagination';
import type { AppSeed } from '$lib/api/types';
import { DAILY_TARGET_MAX_MS, DAILY_TARGET_MIN_MS } from '$lib/api/schemas/prefs';
import { DAY_TOTALS_MAX_DAYS } from '$lib/api/schemas/stats';
import { isValidEmail, normalizeEmail } from '$lib/auth/validate';
import {
	normalizeCode,
	normalizeProjectFields,
	PROJECT_NAME_MAX,
	resolvedProjectName,
	validateProjectFields
} from '$lib/projects/validate';
import { normalizeName } from '$lib/text/normalize';
import { isActivityColorToken, type ActivityColorToken } from '$lib/time/activity-styles';
import { dayTotalsFromSessions } from '$lib/time/day-totals';
import { checkSessionTimes, type SessionTimesReject } from '$lib/time/session-bounds';
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
import { DomainError } from './errors';
import type { TimeTrackingRepository } from './repository';

/** The memory repo has no mailbox: every email change code is this one. */
export const MEMORY_EMAIL_CODE = '123456';

/** The memory repo's account password, for `changePassword` / `requestEmailChange`. */
export const MEMORY_PASSWORD = 'memory-password';

function newId(prefix: string): string {
	return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

function cloneProject(p: Project): Project {
	return { ...p };
}

function cloneSession(s: TimeSession): TimeSession {
	return { ...s };
}

function cloneActivityType(a: ActivityType): ActivityType {
	return { ...a };
}

function encodeMemoryCursor(startedAt: string, id: string): string {
	const raw = `${startedAt}|${id}`;
	return btoa(raw).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function decodeMemoryCursor(raw: string): { startedAt: string; id: string } | null {
	try {
		const pad = raw.length % 4 === 0 ? '' : '='.repeat(4 - (raw.length % 4));
		const s = atob(raw.replaceAll('-', '+').replaceAll('_', '/') + pad);
		const i = s.lastIndexOf('|');
		if (i <= 0 || i === s.length - 1) return null;
		return { startedAt: s.slice(0, i), id: s.slice(i + 1) };
	} catch {
		return null;
	}
}

function sessionAfterCursor(s: TimeSession, startedAt: string, id: string): boolean {
	const a = Date.parse(s.startedAt);
	const b = Date.parse(startedAt);
	if (a < b) return true;
	if (a > b) return false;
	return s.id < id;
}

/**
 * In-memory repository seeded from an {@link AppSeed}.
 * Mutations are session-scoped (lost on full page reload).
 */
export class MemoryTimeTrackingRepository implements TimeTrackingRepository {
	#projects: Project[];
	#activityTypes: ActivityType[];
	#sessions: TimeSession[];
	#profile: UserProfile;
	#prefs: UserPrefs;
	#password = MEMORY_PASSWORD;
	#pendingEmail: string | null = null;

	constructor(seed: AppSeed) {
		this.#projects = structuredClone(seed.projects);
		this.#activityTypes = (seed.activityTypes ?? []).map(cloneActivityType);
		this.#sessions = seed.sessions.map(cloneSession);
		this.#profile = { ...seed.profile };
		this.#prefs = { ...seed.prefs };
	}

	async listProjects(options: ProjectListOptions = {}): Promise<Project[]> {
		const list = options.includeArchived
			? this.#projects
			: this.#projects.filter((p) => !p.isArchived);
		return list.map(cloneProject);
	}

	async getProject(id: string): Promise<Project | undefined> {
		const p = this.#projects.find((x) => x.id === id);
		return p ? cloneProject(p) : undefined;
	}

	async createProject(input: CreateProjectInput): Promise<Project> {
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
		if (err) throw new DomainError('invalid_body', err);
		this.#assertCodeUnique(fields.code);

		if (
			input.progressPercent != null &&
			(!Number.isInteger(input.progressPercent) ||
				input.progressPercent < 0 ||
				input.progressPercent > 100)
		) {
			throw new DomainError('invalid_body', 'progressPercent must be 0–100.');
		}

		const project: Project = {
			id: newId('proj'),
			name: fields.name,
			color: fields.color,
			...(fields.code ? { code: fields.code } : {}),
			...(input.progressPercent != null ? { progressPercent: input.progressPercent } : {}),
			isArchived: false
		};
		this.#projects.push(project);
		return cloneProject(project);
	}

	async updateProject(id: string, input: UpdateProjectInput): Promise<Project> {
		const project = this.#requireProject(id);

		const nextName = input.name !== undefined ? resolvedProjectName(input.name) : project.name;
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
		if (err) throw new DomainError('invalid_body', err);
		this.#assertCodeUnique(nextCode, id);

		if (
			input.progressPercent != null &&
			(!Number.isInteger(input.progressPercent) ||
				input.progressPercent < 0 ||
				input.progressPercent > 100)
		) {
			throw new DomainError('invalid_body', 'progressPercent must be 0–100.');
		}

		project.name = nextName;
		project.color = nextColor;
		if (nextCode) project.code = nextCode;
		else delete project.code;
		if ('progressPercent' in input) {
			if (input.progressPercent == null) delete project.progressPercent;
			else project.progressPercent = input.progressPercent;
		}

		return cloneProject(project);
	}

	async archiveProject(id: string): Promise<Project> {
		const project = this.#requireProject(id);
		if (project.isArchived) {
			throw new DomainError('invalid_transition', 'Project is already archived.');
		}
		this.#assertNotLastActive(id);
		project.isArchived = true;
		return cloneProject(project);
	}

	async restoreProject(id: string): Promise<Project> {
		const project = this.#requireProject(id);
		if (!project.isArchived) {
			throw new DomainError('invalid_transition', 'Project is not archived.');
		}
		project.isArchived = false;
		return cloneProject(project);
	}

	async deleteProject(id: string): Promise<void> {
		const project = this.#requireProject(id);
		const sessions = this.#sessions.filter((s) => s.projectId === id).length;
		if (sessions > 0) {
			throw new DomainError(
				'project_has_sessions',
				'This project has logged sessions. Archive it instead.'
			);
		}
		if (!project.isArchived) {
			this.#assertNotLastActive(id);
		} else {
			const activeCount = this.#projects.filter((p) => !p.isArchived).length;
			if (activeCount === 0) {
				throw new DomainError(
					'last_active_project',
					'Cannot delete the last remaining active project.'
				);
			}
		}
		this.#projects = this.#projects.filter((p) => p.id !== id);
	}

	async countSessionsForProject(projectId: string): Promise<number> {
		return this.#sessions.filter((s) => s.projectId === projectId).length;
	}

	async listActivityTypes(): Promise<ActivityType[]> {
		return [...this.#activityTypes]
			.sort((a, b) => a.name.localeCompare(b.name))
			.map(cloneActivityType);
	}

	async getActivityType(id: string): Promise<ActivityType | undefined> {
		const a = this.#activityTypes.find((x) => x.id === id);
		return a ? cloneActivityType(a) : undefined;
	}

	async createActivityType(input: CreateActivityTypeInput): Promise<ActivityType> {
		const name = this.#requireActivityName(input.name);
		const color = this.#requireActivityColor(input.color);
		this.#assertActivityNameUnique(name);
		const created: ActivityType = { id: newId('act'), name, color };
		this.#activityTypes.push(created);
		return cloneActivityType(created);
	}

	async updateActivityType(id: string, input: UpdateActivityTypeInput): Promise<ActivityType> {
		const current = this.#activityTypes.find((x) => x.id === id);
		if (!current) throw new DomainError('not_found', `Activity type not found: ${id}`);
		if (input.name !== undefined) {
			current.name = this.#requireActivityName(input.name);
			this.#assertActivityNameUnique(current.name, id);
		}
		if (input.color !== undefined) {
			current.color = this.#requireActivityColor(input.color);
		}
		return cloneActivityType(current);
	}

	async deleteActivityType(id: string): Promise<void> {
		const idx = this.#activityTypes.findIndex((x) => x.id === id);
		if (idx < 0) throw new DomainError('not_found', `Activity type not found: ${id}`);
		if (this.#sessions.some((s) => s.activityTypeId === id)) {
			throw new DomainError(
				'activity_type_has_sessions',
				'Cannot delete an activity type that has sessions.'
			);
		}
		this.#activityTypes.splice(idx, 1);
	}

	async countSessionsForActivityType(activityTypeId: string): Promise<number> {
		return this.#sessions.filter((s) => s.activityTypeId === activityTypeId).length;
	}

	#requireActivityName(name: string): string {
		const normalized = normalizeName(name, { min: 1, max: PROJECT_NAME_MAX });
		if (!normalized.ok) {
			throw new DomainError('invalid_body', 'Name must be 1–80 characters after trim.');
		}
		return normalized.value;
	}

	#requireActivityColor(color: string): ActivityColorToken {
		const c = color.trim().toLowerCase();
		if (!isActivityColorToken(c)) {
			throw new DomainError('invalid_body', 'Color must be a known token.');
		}
		return c;
	}

	#assertActivityNameUnique(name: string, excludeId?: string): void {
		if (
			this.#activityTypes.some(
				(a) => a.name.toLowerCase() === name.toLowerCase() && a.id !== excludeId
			)
		) {
			throw new DomainError('name_in_use', 'That name is already in use.');
		}
	}

	async getProfile(): Promise<UserProfile> {
		return { ...this.#profile };
	}

	async updateProfile(input: UpdateProfileInput): Promise<UserProfile> {
		const name = normalizeName(input.displayName, { min: 0, max: PROJECT_NAME_MAX });
		if (!name.ok) {
			throw new DomainError('invalid_body', 'Display name is too long.');
		}
		this.#profile = { ...this.#profile, displayName: name.value };
		return { ...this.#profile };
	}

	async uploadAvatar(file: Blob): Promise<UserProfile> {
		if (file.size === 0 || file.size > 1024 * 1024) {
			throw new DomainError('invalid_body', 'Avatar must be at most 1 MiB.');
		}
		const buf = new Uint8Array(await file.arrayBuffer());
		if (!isAllowedAvatar(buf)) {
			throw new DomainError('invalid_body', 'Avatar must be a JPEG, PNG, or WebP image.');
		}
		this.#profile = {
			...this.#profile,
			avatarUrl: `memory:avatar:${crypto.randomUUID()}`
		};
		return { ...this.#profile };
	}

	async getPrefs(): Promise<UserPrefs> {
		return { ...this.#prefs };
	}

	async updatePrefs(input: UpdatePrefsInput): Promise<UserPrefs> {
		const next = { ...this.#prefs };
		if ('dailyTargetMs' in input) {
			const ms = input.dailyTargetMs;
			if (ms == null) delete next.dailyTargetMs;
			else if (!Number.isInteger(ms) || ms < DAILY_TARGET_MIN_MS || ms > DAILY_TARGET_MAX_MS) {
				throw new DomainError('invalid_body', 'dailyTargetMs is out of range.');
			} else next.dailyTargetMs = ms;
		}
		if ('defaultProjectId' in input) {
			const id = input.defaultProjectId;
			if (id == null) delete next.defaultProjectId;
			else {
				this.#requireProject(id);
				next.defaultProjectId = id;
			}
		}
		this.#prefs = next;
		return { ...next };
	}

	async changePassword(input: ChangePasswordInput): Promise<void> {
		if (input.newPassword.length < 8 || input.newPassword.length > 128) {
			throw new DomainError('invalid_body', 'Password must be 8–128 characters.');
		}
		if (input.currentPassword !== this.#password) {
			throw new DomainError('invalid_credentials', 'Current password is incorrect.');
		}
		this.#password = input.newPassword;
	}

	async requestEmailChange(input: RequestEmailChangeInput): Promise<void> {
		const email = normalizeEmail(input.email);
		if (!isValidEmail(email)) throw new DomainError('invalid_body', 'Invalid email.');
		if (email === this.#profile.email) {
			throw new DomainError('invalid_body', 'That is already your email.');
		}
		if (input.password !== this.#password) {
			throw new DomainError('invalid_credentials', 'Current password is incorrect.');
		}
		this.#pendingEmail = email;
	}

	async changeEmail(input: ChangeEmailInput): Promise<UserProfile> {
		const email = normalizeEmail(input.email);
		if (email !== this.#pendingEmail || input.code !== MEMORY_EMAIL_CODE) {
			throw new DomainError('invalid_code', 'That code is invalid or has expired.');
		}
		this.#pendingEmail = null;
		this.#profile = { ...this.#profile, email };
		return { ...this.#profile };
	}

	async listDayTotals(range: DayTotalsRange): Promise<DayTotal[]> {
		const from = Date.parse(`${range.from}T00:00:00Z`);
		const to = Date.parse(`${range.to}T00:00:00Z`);
		if (Number.isNaN(from) || Number.isNaN(to) || to < from) {
			throw new DomainError('invalid_query', 'Bad date range.');
		}
		if ((to - from) / 86_400_000 + 1 > DAY_TOTALS_MAX_DAYS) {
			throw new DomainError('invalid_query', 'The range must be at most 400 days.');
		}
		return dayTotalsFromSessions(this.#sessions, range);
	}

	async deleteAvatar(): Promise<UserProfile> {
		const next = { ...this.#profile };
		delete next.avatarUrl;
		this.#profile = next;
		return { ...this.#profile };
	}

	async listSessions(filters: SessionFilters = {}): Promise<SessionPage> {
		let list = [...this.#sessions];

		if (filters.status?.length) {
			const set = new Set(filters.status);
			list = list.filter((s) => set.has(s.status));
		}

		list.sort((a, b) => {
			const dt = Date.parse(b.startedAt) - Date.parse(a.startedAt);
			if (dt !== 0) return dt;
			return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
		});

		if (filters.cursor) {
			const cur = decodeMemoryCursor(filters.cursor);
			if (!cur) {
				throw new DomainError('invalid_query', 'cursor is not valid.');
			}
			const start = list.findIndex((s) => sessionAfterCursor(s, cur.startedAt, cur.id));
			list = start < 0 ? [] : list.slice(start);
		}

		const limit = filters.limit ?? SESSION_LIST_DEFAULT_LIMIT;
		let nextCursor: string | null = null;
		if (limit > 0 && list.length > limit) {
			const last = list[limit - 1]!;
			nextCursor = encodeMemoryCursor(last.startedAt, last.id);
			list = list.slice(0, limit);
		}

		return { items: list.map(cloneSession), nextCursor };
	}

	async getSession(id: string): Promise<TimeSession | undefined> {
		const s = this.#sessions.find((x) => x.id === id);
		return s ? cloneSession(s) : undefined;
	}

	async getActiveSession(): Promise<TimeSession | null> {
		const s = this.#sessions.find((x) => x.status === 'active');
		return s ? cloneSession(s) : null;
	}

	async startSession(input: StartSessionInput): Promise<TimeSession> {
		if (await this.getActiveSession()) {
			throw new DomainError(
				'session_already_active',
				'An active session already exists. Stop it before starting a new one.'
			);
		}

		const project = await this.getProject(input.projectId);
		if (!project) {
			throw new DomainError('not_found', `Project not found: ${input.projectId}`);
		}
		if (project.isArchived) {
			throw new DomainError('project_archived', `Project is archived: ${input.projectId}`);
		}

		if (input.activityTypeId) {
			const type = this.#activityTypes.find((x) => x.id === input.activityTypeId);
			if (!type) {
				throw new DomainError('not_found', `Activity type not found: ${input.activityTypeId}`);
			}
		}

		const session: TimeSession = {
			id: newId('sess'),
			projectId: input.projectId,
			note: input.note.trim() || 'Untitled session',
			ticketId: input.ticketId,
			activityTypeId: input.activityTypeId,
			status: 'active',
			startedAt: new Date().toISOString(),
			targetDurationMs: input.targetDurationMs
		};

		this.#sessions.unshift(session);
		return cloneSession(session);
	}

	async stopSession(id: string): Promise<TimeSession> {
		const session = this.#require(id);
		if (session.status !== 'active') {
			throw new DomainError('invalid_transition', 'Session is already stopped');
		}
		session.status = 'stopped';
		session.endedAt = new Date().toISOString();
		return cloneSession(session);
	}

	async updateSession(id: string, input: UpdateSessionInput): Promise<TimeSession> {
		const current = this.#require(id);
		const session = cloneSession(current);
		if (input.projectId !== undefined) {
			this.#requireProject(input.projectId);
			session.projectId = input.projectId;
		}
		if (input.note !== undefined) {
			session.note = input.note.trim() || 'Untitled session';
		}
		if ('ticketId' in input) {
			if (input.ticketId) session.ticketId = input.ticketId;
			else delete session.ticketId;
		}
		if ('activityTypeId' in input) {
			if (input.activityTypeId) {
				const type = this.#activityTypes.find((x) => x.id === input.activityTypeId);
				if (!type) {
					throw new DomainError('not_found', `Activity type not found: ${input.activityTypeId}`);
				}
				session.activityTypeId = input.activityTypeId;
			} else {
				delete session.activityTypeId;
			}
		}
		if (input.startedAt !== undefined) session.startedAt = input.startedAt;
		if ('endedAt' in input) {
			if (input.endedAt) session.endedAt = input.endedAt;
			else delete session.endedAt;
		}
		if ('targetDurationMs' in input) {
			if (input.targetDurationMs != null) session.targetDurationMs = input.targetDurationMs;
			else delete session.targetDurationMs;
		}
		assertSessionTimes(
			session,
			Date.now(),
			input.startedAt !== undefined || input.endedAt !== undefined
		);
		const idx = this.#sessions.findIndex((s) => s.id === id);
		this.#sessions[idx] = session;
		this.#sortSessions();
		return cloneSession(session);
	}

	async deleteSession(id: string): Promise<void> {
		this.#require(id);
		this.#sessions = this.#sessions.filter((s) => s.id !== id);
	}

	async createManualSession(input: CreateManualSessionInput): Promise<TimeSession> {
		this.#requireProject(input.projectId);
		if (input.activityTypeId) {
			const type = this.#activityTypes.find((x) => x.id === input.activityTypeId);
			if (!type) {
				throw new DomainError('not_found', `Activity type not found: ${input.activityTypeId}`);
			}
		}
		const session: TimeSession = {
			id: newId('sess'),
			projectId: input.projectId,
			note: input.note.trim() || 'Untitled session',
			ticketId: input.ticketId,
			activityTypeId: input.activityTypeId,
			status: 'stopped',
			startedAt: input.startedAt,
			endedAt: input.endedAt,
			targetDurationMs: input.targetDurationMs
		};
		assertSessionTimes(session, Date.now());
		this.#sessions.unshift(session);
		this.#sortSessions();
		return cloneSession(session);
	}

	#sortSessions(): void {
		this.#sessions.sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
	}

	#require(id: string): TimeSession {
		const session = this.#sessions.find((s) => s.id === id);
		if (!session) throw new DomainError('not_found', `Session not found: ${id}`);
		return session;
	}

	#requireProject(id: string): Project {
		const project = this.#projects.find((p) => p.id === id);
		if (!project) throw new DomainError('not_found', `Project not found: ${id}`);
		return project;
	}

	#activeProjects(): Project[] {
		return this.#projects.filter((p) => !p.isArchived);
	}

	#assertNotLastActive(id: string): void {
		const active = this.#activeProjects();
		if (active.length <= 1 && active.some((p) => p.id === id)) {
			throw new DomainError(
				'last_active_project',
				'Cannot archive or delete the last remaining active project.'
			);
		}
	}

	#assertCodeUnique(code: string | undefined, excludeId?: string): void {
		if (!code) return;
		const clash = this.#projects.find(
			(p) => p.id !== excludeId && p.code && p.code.toUpperCase() === code.toUpperCase()
		);
		if (clash) {
			throw new DomainError('code_in_use', `Code "${code}" is already in use.`);
		}
	}
}

const SESSION_TIMES_MESSAGE: Record<SessionTimesReject, string> = {
	end_before_start: 'endedAt must be after startedAt.',
	before_min: 'startedAt must be on or after 2000-01-01T00:00:00Z.',
	in_future: 'startedAt and endedAt must not be more than 5 minutes in the future.',
	too_long: 'A session must not last longer than 7 days.'
};

/** `checkBounds` is false for a patch that omits both instants (contract: no bounds re-check). */
function assertSessionTimes(session: TimeSession, nowMs: number, checkBounds = true): void {
	const started = Date.parse(session.startedAt);
	if (Number.isNaN(started)) {
		throw new DomainError('invalid_body', 'must be an ISO-8601 timestamp.');
	}
	let ended: number | null = null;
	if (session.status === 'stopped') {
		if (!session.endedAt) {
			throw new DomainError('invalid_body', 'endedAt is required on a stopped session.');
		}
		ended = Date.parse(session.endedAt);
		if (Number.isNaN(ended) || ended <= started) {
			throw new DomainError('invalid_body', SESSION_TIMES_MESSAGE.end_before_start);
		}
	} else if (session.endedAt) {
		throw new DomainError(
			'invalid_body',
			'endedAt is only set on stopped sessions; use POST .../stop.'
		);
	}
	if (!checkBounds) return;
	const reject = checkSessionTimes(started, ended, nowMs);
	if (reject) throw new DomainError('invalid_body', SESSION_TIMES_MESSAGE[reject]);
}

function isAllowedAvatar(buf: Uint8Array): boolean {
	if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true;
	if (
		buf.length >= 8 &&
		buf[0] === 0x89 &&
		buf[1] === 0x50 &&
		buf[2] === 0x4e &&
		buf[3] === 0x47 &&
		buf[4] === 0x0d &&
		buf[5] === 0x0a &&
		buf[6] === 0x1a &&
		buf[7] === 0x0a
	) {
		return true;
	}
	if (
		buf.length >= 12 &&
		buf[0] === 0x52 &&
		buf[1] === 0x49 &&
		buf[2] === 0x46 &&
		buf[3] === 0x46 &&
		buf[8] === 0x57 &&
		buf[9] === 0x45 &&
		buf[10] === 0x42 &&
		buf[11] === 0x50
	) {
		return true;
	}
	return false;
}
