/** Domain types for DevTime frontend — see docs/domain-model.md */

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

export const ACTIVITY_LABELS: Record<ActivityType, string> = {
	deep_work: 'Deep Work',
	meeting: 'Meeting',
	maintenance: 'Maintenance',
	coding: 'Coding',
	debugging: 'Debug',
	docs: 'Docs',
	research: 'Research',
	other: 'Other'
};

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
