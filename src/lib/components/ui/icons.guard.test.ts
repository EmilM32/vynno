import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Icon-font guard.
 *
 * Material Symbols is self-hosted as a subset: only the ligatures listed in
 * `ICON_NAMES` (scripts/fetch-fonts) are in the woff2. Any other name renders as
 * its literal text ("FOLDER") instead of a glyph, and nothing else catches it.
 * Add the name there and re-run `scripts/fetch-fonts`, or pick one already in it.
 */

const ROOT = new URL('../../../../', import.meta.url).pathname;
const SRC = join(ROOT, 'src');

function subsetNames(): Set<string> {
	const script = readFileSync(join(ROOT, 'scripts', 'fetch-fonts'), 'utf8');
	const match = /ICON_NAMES='([^']+)'/.exec(script);
	if (!match) throw new Error('ICON_NAMES not found in scripts/fetch-fonts');
	return new Set(match[1]!.split(','));
}

function sourceFiles(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) return entry.name === 'paraglide' ? [] : sourceFiles(path);
		if (!/\.(svelte|ts)$/.test(entry.name) || /\.(test|spec)\.ts$/.test(entry.name)) return [];
		return [path];
	});
}

/**
 * Literal icon names: `<Icon name="…">`, `<IconButton icon="…">`, and `icon: '…'`
 * in data (nav items, commands, deltas). The UI primitives' own size maps also use
 * an `icon:` key, so `components/ui/` is skipped for that pattern.
 */
function literalIcons(file: string, text: string): string[] {
	const names = [
		...text.matchAll(/<Icon\b[^>]*?\sname="([a-z0-9_]+)"/g),
		...text.matchAll(/<IconButton\b[^>]*?\sicon="([a-z0-9_]+)"/g)
	].map((m) => m[1]!);
	if (!relative(SRC, file).startsWith(join('lib', 'components', 'ui'))) {
		names.push(...[...text.matchAll(/\bicon:\s*'([a-z0-9_]+)'/g)].map((m) => m[1]!));
	}
	return names;
}

describe('icon font subset', () => {
	it('contains every icon name used in the source', () => {
		const subset = subsetNames();
		const missing = sourceFiles(SRC).flatMap((file) =>
			literalIcons(file, readFileSync(file, 'utf8'))
				.filter((name) => !subset.has(name))
				.map((name) => `${relative(SRC, file)}: ${name}`)
		);
		expect(missing).toEqual([]);
	});
});
