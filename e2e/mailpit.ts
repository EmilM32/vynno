import { apiBase, apiOrigin, e2eOrigin, mailpitUrl } from './env';

const otpPat = /\b(\d{6})\b/;

type MailpitSearch = {
	messages?: { ID: string }[];
};

const smtpHint =
	`Playground vynno-api on ${apiOrigin} is not delivering mail to Mailpit (${mailpitUrl}). ` +
	`Restart it with ./scripts/dev (SMTP to Mailpit by default). ` +
	`DEV_MAIL_MODE=log keeps codes in process logs and breaks e2e. Mailpit UI: ${mailpitUrl}.`;

export async function waitForMailpitCode(
	email: string,
	opts: { subjectIncludes?: string; timeoutMs?: number } = {}
): Promise<string> {
	const query = encodeURIComponent(`to:${email}`);
	const deadline = Date.now() + (opts.timeoutMs ?? 10_000);
	let lastStatus = 0;
	while (Date.now() < deadline) {
		const res = await fetch(`${mailpitUrl}/api/v1/search?query=${query}`);
		lastStatus = res.status;
		if (res.ok) {
			const data = (await res.json()) as MailpitSearch;
			for (const item of data.messages ?? []) {
				const msgRes = await fetch(`${mailpitUrl}/api/v1/message/${item.ID}`);
				if (!msgRes.ok) continue;
				const msg = (await msgRes.json()) as { Text?: string; Subject?: string };
				if (
					opts.subjectIncludes &&
					!msg.Subject?.toLowerCase().includes(opts.subjectIncludes.toLowerCase())
				) {
					continue;
				}
				const match = msg.Text?.match(otpPat);
				if (match) return match[1];
			}
		}
		await new Promise((r) => setTimeout(r, 200));
	}
	throw new Error(
		`No Mailpit code for ${email} (${mailpitUrl} last HTTP ${lastStatus}). ${smtpHint}`
	);
}

export async function assertMailpitReachable() {
	const url = `${mailpitUrl}/api/v1/info`;
	try {
		const res = await fetch(url);
		if (!res.ok) {
			throw new Error(`${url} responded ${res.status}`);
		}
	} catch (err) {
		const detail = err instanceof Error ? err.message : String(err);
		throw new Error(
			`Mailpit is not reachable (${detail}). Start vynno-api Compose (Mailpit on ${mailpitUrl}), then run npm run test:e2e.`,
			{ cause: err }
		);
	}
}

/** One register/code round-trip so MAIL_MODE=log fails here, not in 110 tests. */
export async function assertPlaygroundSendsMail() {
	const email = `e2e_probe_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}@example.com`;
	const headers = { 'content-type': 'application/json', origin: e2eOrigin };
	const codeRes = await fetch(`${apiBase}/auth/register/code`, {
		method: 'POST',
		headers,
		body: JSON.stringify({ email })
	});
	if (!codeRes.ok) {
		const body = await codeRes.text();
		throw new Error(
			`Could not request register code (${codeRes.status} ${body}). ` +
				`Start vynno-api on ${apiOrigin} with Mailpit, then re-run npm run test:e2e.`
		);
	}
	try {
		await waitForMailpitCode(email, { timeoutMs: 5_000 });
	} catch (err) {
		throw new Error(smtpHint, { cause: err });
	}
}
