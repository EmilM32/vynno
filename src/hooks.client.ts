import type { HandleClientError } from '@sveltejs/kit';

// Lapse animation inspector — dev server only. `import.meta.env.DEV` is a
// compile-time `false` in production builds, so this branch and the ~1.7 MB
// panel chunk are dropped entirely. It patches the global clock (rAF,
// performance.now, Date.now, timers), so it must never reach production.
if (import.meta.env.DEV) {
	import('@aiforui/lapse/panel').then(({ mountLapse }) => mountLapse());
}

export const handleError: HandleClientError = ({ error, message }) => {
	console.error(error);
	return { message };
};
