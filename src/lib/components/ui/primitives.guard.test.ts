import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Design-system guard.
 *
 * The point of `Button` / `IconButton` / `Icon` is that `.press`, `.focus-ring`, the
 * hover and disabled tokens and the size scale are owned by the component, so a call
 * site cannot forget one. These tests are what stops the codebase drifting back to
 * hand-written class strings — they run in `npm test`, which is what the husky
 * pre-commit and pre-push hooks execute.
 *
 * Every allowlist entry below needs a reason. Adding one shows up in the diff.
 */

const SRC = new URL('../../../', import.meta.url).pathname;

/**
 * Interactive surfaces that are deliberately NOT `Button`.
 * `docs/motion.md` treats these as a different category from chrome.
 */
const RAW_BUTTON_ALLOWLIST: Record<string, string> = {
	'lib/components/ui/Button.svelte': 'the primitive itself',
	'lib/components/ui/IconButton.svelte': 'the primitive itself',
	'lib/components/ui/Dialog.svelte': 'full-bleed dismiss scrim, not chrome',
	'lib/components/shell/CommandPalette.svelte': 'full-bleed dismiss scrim, not chrome',
	'lib/components/timer/RecentTasks.svelte': 'list row — motion.md excludes rows from .press',
	'lib/components/projects/ProjectColorPicker.svelte': 'swatch radio — Phase 3',
	'lib/components/settings/ActivityColorPicker.svelte': 'swatch radio — Phase 3'
};

/**
 * Utilities that must come from `variant` / `size`, never from a call site's `class`.
 *
 * Matched against the *base* utility with any variant prefix stripped, so
 * `md:group-hover:opacity-0` is checked as `opacity-0`. Colour is deliberately absent:
 * `quiet` and `inline` inherit their ink, so a caller recolouring them — including on
 * hover — is using the API as intended. A hover *background* is still caught by `bg-`.
 */
const BANNED_IN_CLASS = [
	'bg-',
	'p-',
	'px-',
	'py-',
	'pt-',
	'pb-',
	'pl-',
	'pr-',
	'rounded',
	'border',
	'min-h-',
	'font-',
	'text-body',
	'text-code',
	'text-headline',
	'text-[',
	'justify-'
];

/** Strip Tailwind variant prefixes (`md:`, `group-hover:`, …) down to the base utility. */
function baseUtility(token: string): string {
	const cut = token.lastIndexOf(':');
	return cut === -1 ? token : token.slice(cut + 1);
}

function bannedUtilitiesIn(value: string): string[] {
	return value
		.split(/\s+/)
		.filter(Boolean)
		.map(baseUtility)
		.filter((util) => BANNED_IN_CLASS.some((prefix) => util.startsWith(prefix)));
}

function svelteFiles(dir: string, acc: string[] = []): string[] {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const full = join(dir, entry.name);
		if (entry.isDirectory()) {
			if (entry.name === 'paraglide') continue;
			svelteFiles(full, acc);
		} else if (entry.name.endsWith('.svelte')) {
			acc.push(full);
		}
	}
	return acc;
}

const files = svelteFiles(SRC).map((path) => ({
	path: relative(SRC, path),
	source: readFileSync(path, 'utf8')
}));

/** Pull the `class="..."` value out of every `<Tag ...>` opening tag in a source file. */
function classAttrsOn(source: string, tag: string): string[] {
	const found: string[] = [];
	const openings = new RegExp(`<${tag}\\b[^>]*>`, 'gs');
	for (const [opening] of source.matchAll(openings)) {
		const attr = opening.match(/\bclass=(?:"([^"]*)"|'([^']*)')/);
		if (attr) found.push(attr[1] ?? attr[2] ?? '');
	}
	return found;
}

describe('UI primitives guard', () => {
	it('has at least one file to check', () => {
		expect(files.length).toBeGreaterThan(30);
	});

	it('routes every button through Button/IconButton', () => {
		const offenders = files
			.filter(({ path }) => !(path in RAW_BUTTON_ALLOWLIST))
			.filter(({ source }) => /<button[\s>]/.test(source))
			.map(({ path }) => path);

		expect(
			offenders,
			'Raw <button> found. Use $lib/components/ui/Button.svelte (or IconButton), ' +
				'or add the file to RAW_BUTTON_ALLOWLIST with a reason.'
		).toEqual([]);
	});

	it('keeps every allowlist entry justified and in use', () => {
		for (const [path, reason] of Object.entries(RAW_BUTTON_ALLOWLIST)) {
			const file = files.find((f) => f.path === path);
			expect(file, `Allowlisted file no longer exists: ${path}`).toBeDefined();
			expect(reason.length, `Allowlist entry needs a reason: ${path}`).toBeGreaterThan(0);
			expect(/<button[\s>]/.test(file!.source), `${path} no longer has a raw <button>`).toBe(true);
		}
	});

	it('never passes visual utilities into a primitive class prop', () => {
		const offenders: string[] = [];

		for (const { path, source } of files) {
			for (const tag of ['Button', 'IconButton']) {
				for (const value of classAttrsOn(source, tag)) {
					const hits = bannedUtilitiesIn(value);
					if (hits.length > 0) {
						offenders.push(`${path}: <${tag} class="${value}"> → ${hits.join(', ')}`);
					}
				}
			}
		}

		expect(
			offenders,
			'`class` on a primitive is for layout and colour only. Padding, radius, border, ' +
				'background and type scale come from `variant` and `size`.'
		).toEqual([]);
	});

	it('sizes icons through the Icon scale, not arbitrary pixel classes', () => {
		const offenders: string[] = [];

		for (const { path, source } of files) {
			for (const value of classAttrsOn(source, 'Icon')) {
				if (value.includes('text-[')) offenders.push(`${path}: <Icon class="${value}">`);
			}
		}

		expect(offenders, 'Use the Icon `size` prop instead of an arbitrary `text-[Npx]`.').toEqual([]);
	});

	it('keeps the Material Symbols class inside Icon.svelte', () => {
		const offenders = files
			.filter(({ path }) => path !== 'lib/components/ui/Icon.svelte')
			.filter(({ source }) => source.includes('material-symbols-outlined'))
			.map(({ path }) => path);

		expect(offenders, 'Use $lib/components/ui/Icon.svelte instead of a raw icon span.').toEqual([]);
	});
});
