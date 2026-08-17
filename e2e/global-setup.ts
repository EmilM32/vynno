/** Fail fast when vynno-api is not running. Playwright does not start the API. */
export default async function globalSetup() {
	const origin = (process.env.PUBLIC_API_BASE ?? 'http://localhost:8080/v1').replace(
		/\/v1\/?$/,
		''
	);
	const url = `${origin}/healthz`;
	try {
		const res = await fetch(url);
		if (!res.ok) {
			throw new Error(`${url} responded ${res.status}`);
		}
	} catch (err) {
		const detail = err instanceof Error ? err.message : String(err);
		throw new Error(
			`vynno-api is not reachable (${detail}). Start it on ${origin}, then run npm run test:e2e.`
		);
	}
}
