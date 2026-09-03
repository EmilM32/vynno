import { apiOrigin } from './env';
import { assertMailpitReachable, assertPlaygroundSendsMail } from './mailpit';

/** Fail fast when vynno-api or Mailpit SMTP is not ready. Playwright does not start the API. */
export default async function globalSetup() {
	const url = `${apiOrigin}/healthz`;
	try {
		const res = await fetch(url);
		if (!res.ok) {
			throw new Error(`${url} responded ${res.status}`);
		}
	} catch (err) {
		const detail = err instanceof Error ? err.message : String(err);
		throw new Error(
			`vynno-api is not reachable (${detail}). Start it on ${apiOrigin}, then run npm run test:e2e.`,
			{ cause: err }
		);
	}
	await assertMailpitReachable();
	await assertPlaygroundSendsMail();
}
