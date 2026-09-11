import adapter from '@sveltejs/adapter-node';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
	},
	kit: {
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
