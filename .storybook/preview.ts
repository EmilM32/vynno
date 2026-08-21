import type { Preview } from '@storybook/sveltekit';
import { withThemeByDataAttribute } from '@storybook/addon-themes';
import '../src/routes/layout.css';
import './preview.css';

// Kit's `$env/dynamic/public` reads `globalThis.__sveltekit_dev.env`.
// Storybook does not boot the Kit server, so seed a public env for stories
// that import the session store (`createRepository` → `getApiBase`).
const kitDev = ((globalThis as Record<string, unknown>).__sveltekit_dev ??= {
	env: {}
}) as { env: Record<string, string | undefined> };
kitDev.env.PUBLIC_API_BASE ??= '/v1';

const preview: Preview = {
	tags: ['autodocs'],
	parameters: {
		layout: 'padded',
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/i
			}
		},
		sveltekit_experimental: {
			state: {
				page: {
					url: new URL('http://storybook.local/dashboard')
				}
			}
		}
	},
	decorators: [
		withThemeByDataAttribute({
			themes: {
				Dark: 'dark',
				Light: 'light',
				'Deep Dark': 'deep-dark'
			},
			defaultTheme: 'Dark',
			attributeName: 'data-theme'
		})
	]
};

export default preview;
