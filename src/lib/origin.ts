/** Parse a required http(s) origin (scheme + host + optional port, no path). */
export function parseHttpOrigin(raw: string | undefined, name: string): string {
	const value = raw?.trim();
	if (!value) {
		throw new Error(`${name} is required. Copy .env.example to .env and set it.`);
	}

	let url: URL;
	try {
		url = new URL(value);
	} catch {
		throw new Error(`${name} must be an absolute http(s) origin, got ${JSON.stringify(value)}`);
	}

	if (url.protocol !== 'http:' && url.protocol !== 'https:') {
		throw new Error(`${name} must be an absolute http(s) origin, got ${JSON.stringify(value)}`);
	}
	if (url.username || url.password) {
		throw new Error(`${name} must not include credentials`);
	}
	if (url.pathname !== '/' && url.pathname !== '') {
		throw new Error(
			`${name} must be an origin only (no path or query), e.g. https://api.example.com`
		);
	}
	if (url.search || url.hash) {
		throw new Error(
			`${name} must be an origin only (no path or query), e.g. https://api.example.com`
		);
	}

	return url.origin;
}

/** Like `parseHttpOrigin`, but the URL must include an explicit port. */
export function parseHttpOriginWithPort(
	raw: string | undefined,
	name: string
): { origin: string; host: string; port: string } {
	const origin = parseHttpOrigin(raw, name);
	const url = new URL(origin);
	if (!url.port) {
		throw new Error(`${name} must include an explicit port`);
	}
	return { origin: url.origin, host: url.hostname, port: url.port };
}
