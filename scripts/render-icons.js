/**
 * Rasterise the brand mark into the web app manifest icons under static/icons/.
 *
 * The mark paths must match src/lib/assets/logo-mark.svg, favicon.svg and BrandMark.svelte.
 * Colours are the dark theme's tile and mark, like the favicon's default. Rerun after a
 * brand change: `node scripts/render-icons.js` (uses Playwright's Chromium, no image tools).
 */
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const TILE = '#0b1326';
const MARK = '#8ed5ff';
const PATHS = `
	<path d="M25.33 23.55A12 12 0 1 1 25.33 8.45L21.6 11.47A7.2 7.2 0 1 0 21.6 20.53Z" />
	<path d="M21.45 11.3L29.2 16L21.45 20.7L24.4 16Z" />`;

/**
 * @param {{ rounded: boolean; scale: number }} opts `rounded` = the favicon's tile corners;
 * full-bleed squares are for platforms that apply their own mask. `scale` shrinks the mark
 * about the centre so it stays inside a maskable icon's safe zone.
 */
function iconSvg({ rounded, scale }) {
	const tile = rounded
		? `<rect width="32" height="32" rx="6" fill="${TILE}" />`
		: `<rect width="32" height="32" fill="${TILE}" />`;
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="100%" height="100%">
	${tile}
	<g fill="${MARK}" transform="translate(16 16) scale(${scale}) translate(-16 -16)">${PATHS}</g>
</svg>`;
}

const ICONS = [
	{ file: 'icon-192.png', size: 192, rounded: true, scale: 1 },
	{ file: 'icon-512.png', size: 512, rounded: true, scale: 1 },
	// Maskable safe zone is the centre circle of radius 40%; the mark reaches ~13.2/16 at scale 1.
	{ file: 'icon-maskable-512.png', size: 512, rounded: false, scale: 0.72 },
	// iOS rounds the corners itself.
	{ file: 'apple-touch-icon.png', size: 180, rounded: false, scale: 0.8 }
];

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const outDir = join(root, 'static', 'icons');
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
try {
	const page = await browser.newPage();
	for (const icon of ICONS) {
		await page.setViewportSize({ width: icon.size, height: icon.size });
		await page.setContent(
			`<!doctype html><html><body style="margin:0;background:transparent">${iconSvg(icon)}</body></html>`
		);
		await page.screenshot({ path: join(outDir, icon.file), omitBackground: true });
		console.log(`static/icons/${icon.file} (${icon.size}px)`);
	}
} finally {
	await browser.close();
}
