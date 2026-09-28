/**
 * Fail a build whose server and client halves disagree on the SvelteKit global.
 *
 * The server writes `__sveltekit_${version_hash}` into every page; the client reads the name
 * baked into its chunks. Another process loading svelte.config.js during a build (vitest,
 * svelte-kit sync, vite dev) used to rewrite `.svelte-kit/generated` with a different hash: the
 * build still "succeeded", /healthz was green, and no page hydrated. `kit.version.name` is now
 * the git commit, so this should not happen; this check makes any other cause loud.
 *
 * Usage: node scripts/verify-build.js [dir...]
 * Default dirs: .svelte-kit/output (vite preview / e2e) and the adapter output
 * (BUILD_DIR, else build/), whichever exist. Each dir holds server/ and client/.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SERVER_HASH = /version_hash:\s*"([a-z0-9]+)"/g;
const CLIENT_GLOBAL = /__sveltekit_([a-z0-9]+)/g;

/**
 * @param {{ server: string[]; client: string[] }} sources JS file contents of each half
 * @returns {string | null} what is wrong, or null when both halves use one name
 */
export function buildVersionMismatch({ server, client }) {
	const serverHashes = collect(server, SERVER_HASH);
	const clientHashes = collect(client, CLIENT_GLOBAL);
	if (serverHashes.size !== 1) {
		return `expected one server version_hash, found ${describe(serverHashes)}`;
	}
	if (clientHashes.size !== 1) {
		return `expected one client __sveltekit_* global, found ${describe(clientHashes)}`;
	}
	const [serverHash] = serverHashes;
	const [clientHash] = clientHashes;
	if (serverHash !== clientHash) {
		return `server writes __sveltekit_${serverHash} but the client reads __sveltekit_${clientHash}`;
	}
	return null;
}

/** @param {string[]} texts @param {RegExp} pattern */
function collect(texts, pattern) {
	const found = new Set();
	for (const text of texts) {
		for (const match of text.matchAll(pattern)) found.add(match[1]);
	}
	return found;
}

/** @param {Set<string>} hashes */
function describe(hashes) {
	return hashes.size === 0 ? 'none' : [...hashes].join(', ');
}

/** @param {string} dir @returns {string[]} contents of every `.js` file below `dir` */
function readJs(dir) {
	const out = [];
	for (const entry of readdirSync(dir, { withFileTypes: true, recursive: true })) {
		if (entry.isFile() && entry.name.endsWith('.js')) {
			out.push(readFileSync(join(entry.parentPath, entry.name), 'utf8'));
		}
	}
	return out;
}

function main() {
	const args = process.argv.slice(2);
	const dirs = (
		args.length ? args : ['.svelte-kit/output', process.env.BUILD_DIR || 'build']
	).filter((dir) => existsSync(join(dir, 'server')) && existsSync(join(dir, 'client')));
	if (dirs.length === 0) {
		console.error('verify-build: no build output found (expected <dir>/server and <dir>/client)');
		process.exit(1);
	}
	let failed = false;
	for (const dir of dirs) {
		const problem = buildVersionMismatch({
			server: readJs(join(dir, 'server')),
			client: readJs(join(dir, 'client'))
		});
		if (problem) {
			failed = true;
			console.error(
				`verify-build: ${dir}: ${problem}. Pages would render but never hydrate. ` +
					'Another process rewrote .svelte-kit/generated during the build (or HEAD moved ' +
					'mid-build). Run the build again.'
			);
		} else {
			console.log(`verify-build: ${dir}: server and client agree`);
		}
	}
	if (failed) process.exit(1);
}

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) main();
