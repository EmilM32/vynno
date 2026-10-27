import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { THEMES } from './themes';

// `app.html` sets theme-color before hydration from its own copy of the palette map.
const html = readFileSync(new URL('../../app.html', import.meta.url), 'utf8');

describe('app.html pre-paint theme-color', () => {
	it.each(THEMES.map((t) => [t.id, t.themeColor]))('maps %s to %s', (id, color) => {
		const key = /^[a-z]+$/.test(id) ? id : `'${id}'`;
		expect(html).toContain(`${key}: '${color}'`);
	});

	it('has exactly one theme-color tag', () => {
		expect(html.match(/<meta name="theme-color"/g)).toHaveLength(1);
	});
});
