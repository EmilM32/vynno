/** Domain types for Vynno frontend — see docs/domain-model.md */

import { ACTIVITY_COLOR_TOKENS, type ActivityColorToken } from '$lib/time/activity-styles';

export type SessionStatus = 'active' | 'paused' | 'stopped';

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
	tags?: string[];
	status: SessionStatus;
	/** ISO datetime */
	startedAt: string;
	/** ISO datetime — set on stop */
	endedAt?: string;
	/** Total ms spent in completed pause intervals */
	pausedMs: number;
	/** When currently paused, ISO timestamp of pause start */
	pausedAt?: string;
	targetDurationMs?: number;
}

export interface UserProfile {
	displayName: string;
	email: string;
	avatarUrl?: string;
}

export interface UpdateProfileInput {
	displayName: string;
}

export interface StartSessionInput {
	projectId: string;
	note: string;
	ticketId?: string;
	activityTypeId?: string;
	tags?: string[];
	targetDurationMs?: number;
}

export interface UpdateSessionInput {
	projectId?: string;
	note?: string;
	ticketId?: string | null;
	activityTypeId?: string | null;
	tags?: string[];
	startedAt?: string;
	endedAt?: string | null;
	pausedMs?: number;
	targetDurationMs?: number | null;
}

export interface CreateManualSessionInput {
	projectId: string;
	note: string;
	ticketId?: string;
	activityTypeId?: string;
	tags?: string[];
	targetDurationMs?: number;
	startedAt: string;
	endedAt: string;
	pausedMs?: number;
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
}

export interface ProjectListOptions {
	/** When true, include archived projects (default false). */
	includeArchived?: boolean;
}

export interface CreateProjectInput {
	name: string;
	color: string;
	code?: string;
}

export interface UpdateProjectInput {
	name?: string;
	color?: string;
	/** Set to null to clear optional code. */
	code?: string | null;
}
