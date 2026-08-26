import { paraglideVitePlugin } from '@inlang/paraglide-js';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),

		paraglideVitePlugin({
			project: './project.inlang',
			outdir: './src/lib/paraglide',
			emitTsDeclarations: true,
			// App-level locale only — no URL prefixes (/en/timer).
			strategy: ['cookie', 'localStorage', 'preferredLanguage', 'baseLocale']
		})
	],
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}'],
		environment: 'node'
	},

	// Tell Vitest to use the browser entry points in package.json files
	resolve: process.env.VITEST ? { conditions: ['browser'] } : undefined
});
