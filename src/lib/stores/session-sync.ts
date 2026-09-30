import type { ActivityType, Project, TimeSession } from '$lib/types/domain';

/**
 * A write this tab made, replayed in sibling tabs of the same browser so their
 * stores match without a round-trip. Other devices catch up on focus instead.
 */
export type PeerChange =
	| { type: 'session'; session: TimeSession; created: boolean }
	| { type: 'session-removed'; id: string; projectId?: string; activityTypeId?: string }
	| { type: 'project'; project: Project }
	| { type: 'project-removed'; id: string }
	| { type: 'activity-type'; activityType: ActivityType }
	| { type: 'activity-type-removed'; id: string };

/** `owner` is the signed-in email; a tab ignores changes made under another account. */
export type PeerMessage = PeerChange & { owner: string };

export interface SessionPeer {
	post(message: PeerMessage): void;
	listen(handler: (message: PeerMessage) => void): void;
	close(): void;
}

export const SESSION_CHANNEL = 'vynno-session';

/** `null` where the platform has no BroadcastChannel. */
export function createBroadcastPeer(name = SESSION_CHANNEL): SessionPeer | null {
	if (typeof BroadcastChannel === 'undefined') return null;
	const channel = new BroadcastChannel(name);
	return {
		post: (message) => channel.postMessage(message),
		listen: (handler) => {
			channel.onmessage = (e: MessageEvent<PeerMessage>) => handler(e.data);
		},
		close: () => channel.close()
	};
}
