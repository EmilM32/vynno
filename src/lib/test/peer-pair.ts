import type { PeerMessage, SessionPeer } from '$lib/stores/session-sync';

/**
 * In-process stand-in for two tabs on one BroadcastChannel. Delivery is
 * synchronous and structured-cloned; like a real channel it never echoes back.
 */
export function createPeerPair(): [SessionPeer, SessionPeer] {
	const handlers: [((m: PeerMessage) => void) | null, ((m: PeerMessage) => void) | null] = [
		null,
		null
	];
	const closed = [false, false];
	const side = (self: 0 | 1): SessionPeer => {
		const other = self === 0 ? 1 : 0;
		return {
			post: (message) => {
				if (closed[self] || closed[other]) return;
				handlers[other]?.(structuredClone(message));
			},
			listen: (handler) => {
				handlers[self] = handler;
			},
			close: () => {
				closed[self] = true;
				handlers[self] = null;
			}
		};
	};
	return [side(0), side(1)];
}
