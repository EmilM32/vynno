import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseHttpOrigin, parseHttpOriginWithPort } from '../src/lib/origin';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function loadDotEnv() {
	const path = resolve(root, '.env');
	if (existsSync(path)) {
		process.loadEnvFile(path);
	}
}

loadDotEnv();

const preview = parseHttpOriginWithPort(process.env.E2E_ORIGIN, 'E2E_ORIGIN');

/** Playwright `baseURL` and CORS Origin sent to vynno-api. */
export const e2eOrigin = preview.origin;

/** Host/port for `vite preview` — parsed from `E2E_ORIGIN`. */
export const e2ePreview = { host: preview.host, port: preview.port };

/** vynno-api origin (no `/v1`). */
export const apiOrigin = parseHttpOrigin(process.env.API_ORIGIN, 'API_ORIGIN');

/** Mailpit HTTP API (Compose UI/API on 8025). */
export const mailpitUrl = (process.env.MAILPIT_URL ?? 'http://127.0.0.1:8025').replace(/\/$/, '');

/** Direct vynno-api `/v1` for e2e setup. Override with `E2E_API_BASE`. */
export const apiBase = (() => {
	const override = process.env.E2E_API_BASE?.trim();
	if (!override) return `${apiOrigin}/v1`;
	let url: URL;
	try {
		url = new URL(override);
	} catch {
		throw new Error(`E2E_API_BASE must be an absolute URL, got ${JSON.stringify(override)}`);
	}
	if (url.protocol !== 'http:' && url.protocol !== 'https:') {
		throw new Error(
			`E2E_API_BASE must be an absolute http(s) URL, got ${JSON.stringify(override)}`
		);
	}
	return override.replace(/\/$/, '');
})();
