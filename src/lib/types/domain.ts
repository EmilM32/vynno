/** Domain types for Vynno frontend — see docs/domain-model.md */

import { ACTIVITY_COLOR_TOKENS, type ActivityColorToken } from '$lib/time/activity-styles';

export type SessionStatus = 'active' | 'stopped';

export { ACTIVITY_COLOR_TOKENS, type ActivityColorToken };

export interface ActivityType {
	id: string;
	/** Display label, stored as typed. */
	name: string;
	/** Theme token (primary, secondary, …). */
	color: string;
}

export interface CreateActivityTypeInput {
	name: string;
	color: ActivityColorToken;
}

export interface UpdateActivityTypeInput {
	name?: string;
	color?: ActivityColorToken;
}

export interface Project {
	id: string;
	name: string;
	/** Hex color for dots/bars */
	color: string;
	/** Short code for chips (e.g. AUTH) */
	code?: string;
	progressPercent?: number;
	isArchived?: boolean;
}

export interface TimeSession {
	id: string;
	projectId: string;
	note: string;
	ticketId?: string;
	activityTypeId?: string;
	status: SessionStatus;
	/** ISO datetime */
	startedAt: string;
	/** ISO datetime — set on stop */
	endedAt?: string;
}

export interface UserProfile {
	displayName: string;
	email: string;
	avatarUrl?: string;
}

export interface UpdateProfileInput {
	displayName: string;
}

/** Account-wide settings (`/me/prefs`). Absent = unset; the UI applies its default. */
export interface UserPrefs {
	dailyTargetMs?: number;
	defaultProjectId?: string;
}

/** Omit leaves a pref unchanged; `null` clears it. */
export interface UpdatePrefsInput {
	dailyTargetMs?: number | null;
	defaultProjectId?: string | null;
}

export interface ChangePasswordInput {
	currentPassword: string;
	newPassword: string;
}

export interface RequestEmailChangeInput {
	email: string;
	password: string;
}

export interface ChangeEmailInput {
	email: string;
	code: string;
}

/** Inclusive civil dates (`YYYY-MM-DD`) in an IANA zone. */
export interface DayTotalsRange {
	from: string;
	to: string;
	timeZone: string;
}

/** `GET /sessions?from&to`: ISO instants; sessions overlapping `[from, to)`. */
export interface SessionWindow {
	from: string;
	to: string;
}

/** Stopped-session time for one local date, project and activity type (`/stats/days`). */
export interface DayTotal {
	date: string;
	projectId: string;
	activityTypeId?: string;
	durationMs: number;
	sessionCount: number;
}

export interface StartSessionInput {
	projectId: string;
	note: string;
	ticketId?: string;
	activityTypeId?: string;
}

export interface UpdateSessionInput {
	projectId?: string;
	note?: string;
	ticketId?: string | null;
	activityTypeId?: string | null;
	startedAt?: string;
	endedAt?: string | null;
}

export interface CreateManualSessionInput {
	projectId: string;
	note: string;
	ticketId?: string;
	activityTypeId?: string;
	startedAt: string;
	endedAt: string;
}

export interface SessionPage {
	items: TimeSession[];
	nextCursor: string | null;
}

export interface SessionFilters {
	/** Include only these statuses (default: all) */
	status?: SessionStatus[];
	/** Max number of sessions (newest first). Default 20 on the API. */
	limit?: number;
	/** Opaque nextCursor from the previous page. */
	cursor?: string;
	/** ISO instant: keep sessions still running or ending after it (`endedAt > from`). */
	from?: string;
	/** ISO instant: keep sessions started before it (`startedAt < to`). */
	to?: string;
}

export interface ProjectListOptions {
	/** When true, include archived projects (default false). */
	includeArchived?: boolean;
}

export interface CreateProjectInput {
	name: string;
	color: string;
	code?: string;
	progressPercent?: number;
}

export interface UpdateProjectInput {
	name?: string;
	color?: string;
	/** Set to null to clear optional code. */
	code?: string | null;
	/** Set to null to clear the dashboard bar. */
	progressPercent?: number | null;
}
