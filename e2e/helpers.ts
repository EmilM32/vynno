import { expect, type APIRequestContext, type Locator, type Page } from '@playwright/test';
import { apiBase, apiOrigin, e2eOrigin, mailpitUrl } from './env';

/** Bootstrap account — only for optional overrides. Default e2e login registers a throwaway user. */
export const E2E_EMAIL = process.env.E2E_EMAIL ?? 'alexdev@vynno.local';
export const E2E_PASSWORD = process.env.E2E_PASSWORD ?? 'local-dev-password';

/** Direct vynno-api `/v1` for e2e setup (not the SPA `/v1` proxy). */
export const API_BASE = apiBase;
const SPA_ORIGIN = e2eOrigin;

export type E2EAccount = {
	email: string;
	password: string;
	displayName: string;
};

export function uniqueNote(prefix = 'e2e'): string {
	return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

const otpPat = /\b(\d{6})\b/;

type MailpitSearch = {
	messages?: { ID: string }[];
};

async function waitForMailpitCode(
	email: string,
	opts: { subjectIncludes?: string } = {}
): Promise<string> {
	const query = encodeURIComponent(`to:${email}`);
	const deadline = Date.now() + 10_000;
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
		`No Mailpit code for ${email} (${mailpitUrl} last HTTP ${lastStatus}). ` +
			`Start vynno-api with MAIL_MODE=smtp pointing at Mailpit, then re-run npm run test:e2e.`
	);
}

export async function registerAccount(_request?: APIRequestContext): Promise<E2EAccount> {
	const local = `e2e_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
	const email = `${local}@example.com`;
	const password = 'e2epassword';
	const displayName = `E2E ${local}`;
	const headers = { 'content-type': 'application/json', origin: SPA_ORIGIN };
	// Node fetch so Playwright's page cookie jar is not seeded (SSR would skip /login).
	const codeRes = await fetch(`${API_BASE}/auth/register/code`, {
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
	const code = await waitForMailpitCode(email);
	const res = await fetch(`${API_BASE}/auth/register`, {
		method: 'POST',
		headers,
		body: JSON.stringify({ email, password, displayName, rememberMe: true, code })
	});
	if (!res.ok) {
		const body = await res.text();
		throw new Error(
			`Could not register e2e user (${res.status} ${body}). ` +
				`Start vynno-api on ${apiOrigin}, then re-run npm run test:e2e.`
		);
	}
	return { email, password, displayName };
}

export async function fillRegisterCode(page: Page, email: string) {
	const code = await waitForMailpitCode(email, { subjectIncludes: 'confirmation' });
	await page.getByLabel('Confirmation code').fill(code);
}

export async function fillResetCode(page: Page, email: string) {
	const code = await waitForMailpitCode(email, { subjectIncludes: 'password reset' });
	await page.getByLabel('Reset code').fill(code);
}

/** LoginView is SSR'd; native submit 405s until Kit client mount (`#svelte-announcer`). */
export async function gotoLogin(page: Page) {
	await page.goto('/login');
	await expect(page.locator('#svelte-announcer')).toBeAttached();
}

export async function loginWith(page: Page, email: string, password: string) {
	await gotoLogin(page);
	await page.getByLabel('Email').fill(email);
	await page.getByRole('textbox', { name: 'Password', exact: true }).fill(password);
	await page.getByRole('button', { name: 'Log in' }).click();
	await expect(page).toHaveURL(/\/dashboard$/);
}

/** Register a throwaway user and sign in. Does not touch the local seed account. */
export async function login(page: Page, account?: E2EAccount): Promise<E2EAccount> {
	const creds = account ?? (await registerAccount(page.request));
	await loginWith(page, creds.email, creds.password);
	return creds;
}

async function apiFetch(page: Page, path: string, init: { method?: string; data?: unknown } = {}) {
	const cookies = await page.context().cookies();
	const cookie = cookies.map((c) => `${c.name}=${c.value}`).join('; ');
	const url = `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
	return page.request.fetch(url, {
		method: init.method ?? 'GET',
		headers: {
			origin: SPA_ORIGIN,
			cookie,
			...(init.data !== undefined ? { 'content-type': 'application/json' } : {})
		},
		data: init.data,
		failOnStatusCode: false
	});
}

export async function ensureIdle(page: Page) {
	if (!/\/(timer|dashboard|logs|insights|projects|settings)/.test(page.url())) {
		return;
	}
	const stop = page.getByRole('button', { name: 'Stop', exact: true });
	if (await stop.isVisible().catch(() => false)) {
		await stop.click();
		await expect(page.getByRole('button', { name: 'Start', exact: true })).toBeVisible();
	}
}

/** Create stopped sessions via the API, then full-navigate so the SPA hydrates them. */
export async function seedStoppedSessions(page: Page, count: number) {
	const list = await apiFetch(page, '/projects');
	if (!list.ok()) {
		throw new Error(`GET /projects failed (${list.status()} ${await list.text()})`);
	}
	const body = (await list.json()) as { items: { id: string }[] };
	const projectId = body.items[0]?.id;
	if (!projectId) throw new Error('e2e account has no project to seed sessions onto');

	for (let i = 0; i < count; i++) {
		const started = await apiFetch(page, '/sessions', {
			method: 'POST',
			data: { projectId, note: uniqueNote(`seed${i}`) }
		});
		if (!started.ok()) {
			throw new Error(`POST /sessions failed (${started.status()} ${await started.text()})`);
		}
		const session = (await started.json()) as { id: string };
		const stopped = await apiFetch(page, `/sessions/${session.id}/stop`, { method: 'POST' });
		if (!stopped.ok()) {
			throw new Error(`POST /stop failed (${stopped.status()} ${await stopped.text()})`);
		}
	}
}

/** Desktop sidebar is `md:flex` (≥768px). Prefer this for SPA nav that keeps store state. */
export function desktopNav(page: Page): Locator {
	return page.locator('nav.md\\:flex[aria-label="Main"]');
}

/** Mobile bottom bar is `md:hidden`. */
export function mobileNav(page: Page): Locator {
	return page.locator('nav.md\\:hidden[aria-label="Main"]');
}

/**
 * Client-side navigation via desktop sidebar.
 * Prefer this after mutations so the same browser session (and cookie) is kept.
 */
export async function spaGo(page: Page, label: string, href: string) {
	const desktop = desktopNav(page);
	const nav = (await desktop.isVisible()) ? desktop : mobileNav(page);
	await nav.getByRole('link', { name: label, exact: true }).click();
	await expect(page).toHaveURL(new RegExp(`${href}$`));
}

export async function startSession(
	page: Page,
	note: string,
	projectLabel?: string,
	activityType?: string
) {
	if (!page.url().includes('/timer') && !page.url().includes('/dashboard')) {
		await login(page);
	}
	await page.goto('/timer');
	await ensureIdle(page);
	const task = page.getByRole('textbox', { name: 'Task description' });
	await task.fill(note);
	if (projectLabel) {
		await page.locator('#project-select').selectOption({ label: projectLabel });
	}
	if (activityType) {
		const existing = await page
			.locator('#activity-select option')
			.evaluateAll((opts) => opts.map((o) => (o as HTMLOptionElement).textContent?.trim() ?? ''));
		if (!existing.includes(activityType)) {
			const res = await page.request.post('/v1/activity-types', {
				data: { name: activityType, color: 'secondary' }
			});
			if (!res.ok()) {
				throw new Error(`Could not create activity type (${res.status()} ${await res.text()})`);
			}
			await page.reload();
			await page.getByRole('textbox', { name: 'Task description' }).fill(note);
			if (projectLabel) {
				await page.locator('#project-select').selectOption({ label: projectLabel });
			}
		}
		await page.locator('#activity-select').selectOption({ label: activityType });
	}
	await page.getByRole('button', { name: 'Start', exact: true }).click();
	await expect(page.getByTestId('timer-status')).toHaveText('ACTIVE');
}

export async function stopSession(page: Page) {
	await page.getByRole('button', { name: 'Stop', exact: true }).click();
	await expect(page.getByRole('button', { name: 'Start', exact: true })).toBeVisible();
}
