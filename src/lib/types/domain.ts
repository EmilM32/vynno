/** Domain types for Vynno frontend — see docs/domain-model.md */

import { m } from '$lib/paraglide/messages.js';

export type SessionStatus = 'active' | 'paused' | 'stopped';

export type ActivityType =
	| 'deep_work'
	| 'meeting'
	| 'maintenance'
	| 'coding'
	| 'debugging'
	| 'docs'
	| 'research'
	| 'other';

/** Localized display label for an activity type (UI only). */
export function activityLabel(type: ActivityType): string {
	switch (type) {
		case 'deep_work':
			return m.activity_deep_work();
		case 'meeting':
			return m.activity_meeting();
		case 'maintenance':
			return m.activity_maintenance();
		case 'coding':
			return m.activity_coding();
		case 'debugging':
			return m.activity_debugging();
		case 'docs':
			return m.activity_docs();
		case 'research':
			return m.activity_research();
		case 'other':
			return m.activity_other();
	}
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
	activityType?: ActivityType;
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
	handle: string;
	avatarUrl?: string;
}

export interface UpdateProfileInput {
	displayName: string;
}

export interface StartSessionInput {
	projectId: string;
	note: string;
	ticketId?: string;
	activityType?: ActivityType;
	tags?: string[];
	targetDurationMs?: number;
}

export interface SessionFilters {
	/** Include only these statuses (default: all) */
	status?: SessionStatus[];
	/** Max number of sessions (newest first) */
	limit?: number;
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
