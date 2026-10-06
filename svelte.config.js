import adapter from '@sveltejs/adapter-node';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

/**
 * Every process that loads this config (vite build, vitest, svelte-kit sync, vite dev) rewrites
 * `.svelte-kit/generated/server/internal.js` with a hash of this name. Kit's default is
 * `Date.now()`, so a vitest run during a build gave the server half a different
 * `__sveltekit_*` global than the client half, and no page hydrated. The commit is the same
 * in every process. Rebuilding one commit with uncommitted edits keeps the name: reload open tabs.
 */
function appVersion() {
	try {
		return execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
			.toString()
			.trim();
	} catch {
		// No git (e.g. a copied tree): still deterministic across processes.
		return JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version;
	}
}

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
	},
	kit: {
		version: { name: appVersion() },

		// Local production is a Node process on this machine (ADR-0014).
		// BUILD_DIR lets a concurrent e2e build write elsewhere so it cannot replace `build/`
		// under the live daily Node (ADR-0014 amendment). Daily default is unchanged.
		adapter: adapter({
			out: process.env.BUILD_DIR || 'build',
			precompress: !process.env.BUILD_DIR
		}),

		// ADR-0025. Nonce mode: Kit nonces its own hydration script and the one hand-written
		// inline script in app.html (`%sveltekit.nonce%`). Nothing loads cross-origin — fonts are
		// self-hosted and `/v1` is same-origin through the BFF — so 'self' needs no exceptions.
		csp: {
			mode: 'nonce',
			directives: {
				'default-src': ['self'],
				'script-src': ['self'],
				// Svelte and LayerChart set inline `style=` attributes. `style-src-attr` is spelled
				// out so those keep working even if Kit adds a nonce to `style-src` (a nonce makes
				// 'unsafe-inline' ignored).
				'style-src': ['self', 'unsafe-inline'],
				'style-src-attr': ['unsafe-inline'],
				// `data:` covers the inline SVG chevrons in src/routes/layout.css.
				'img-src': ['self', 'data:'],
				'font-src': ['self'],
				// The Settings → About pronunciation clip, a hashed same-origin asset (EMI-197).
				'media-src': ['self'],
				'connect-src': ['self'],
				'object-src': ['none'],
				'base-uri': ['self'],
				'form-action': ['self'],
				'frame-ancestors': ['none']
			}
		}
	}
};

export default config;
