import { localStore } from './local-storage';

/**
 * Desktop notifications: a device-local opt-in (like the theme) on top of the
 * browser's own permission. Nothing asks for permission until the user turns
 * this on in Settings.
 */

export const NOTIFICATIONS_STORAGE_KEY = 'vynno-notifications';

export type NotificationState = 'unsupported' | 'off' | 'on' | 'blocked';

function supported(): boolean {
	return typeof window !== 'undefined' && 'Notification' in window;
}

class NotificationPrefs {
	/** Wanted on this device. Only effective while the browser permission is granted. */
	wanted = $state(false);
	permission = $state<NotificationPermission | 'unsupported'>('unsupported');

	state = $derived.by((): NotificationState => {
		if (this.permission === 'unsupported') return 'unsupported';
		if (this.permission === 'denied') return 'blocked';
		return this.wanted && this.permission === 'granted' ? 'on' : 'off';
	});

	/** Read storage and the current permission. Call on the client after mount. */
	load = (): void => {
		this.permission = supported() ? Notification.permission : 'unsupported';
		this.wanted = localStore()?.getItem(NOTIFICATIONS_STORAGE_KEY) === 'on';
	};

	enable = async (): Promise<void> => {
		if (!supported()) return;
		this.permission =
			Notification.permission === 'default'
				? await Notification.requestPermission()
				: Notification.permission;
		this.#persist(this.permission === 'granted');
	};

	disable = (): void => {
		this.#persist(false);
	};

	#persist = (on: boolean): void => {
		this.wanted = on;
		const store = localStore();
		if (!store) return;
		if (on) store.setItem(NOTIFICATIONS_STORAGE_KEY, 'on');
		else store.removeItem(NOTIFICATIONS_STORAGE_KEY);
	};
}

export const notificationPrefs = new NotificationPrefs();

/**
 * Show a desktop notification when the user opted in. The `tag` makes several
 * open tabs collapse into one notification instead of stacking.
 */
export function notify(title: string, options: { body?: string; tag: string }): void {
	if (notificationPrefs.state !== 'on' || !supported()) return;
	try {
		const n = new Notification(title, { body: options.body, tag: options.tag });
		n.onclick = () => {
			window.focus();
			n.close();
		};
	} catch {
		// Some platforms only allow notifications from a service worker.
	}
}
