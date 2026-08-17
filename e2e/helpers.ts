import { expect, type APIRequestContext, type Locator, type Page } from '@playwright/test';

/** Bootstrap account — only for optional overrides. Default e2e login registers a throwaway user. */
export const E2E_USERNAME = process.env.E2E_USERNAME ?? 'alexdev';
export const E2E_PASSWORD = process.env.E2E_PASSWORD ?? 'local-dev-password';

export const API_BASE = (process.env.PUBLIC_API_BASE ?? 'http://localhost:8080/v1').replace(
	/\/$/,
	''
);
const API_ORIGIN = new URL(API_BASE).origin;
const SPA_ORIGIN = 'http://localhost:4173';

export type E2EAccount = {
	username: string;
	password: string;
	displayName: string;
};

export function uniqueNote(prefix = 'e2e'): string {
	return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export async function registerAccount(request: APIRequestContext): Promise<E2EAccount> {
	const username = `e2e_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
	const password = 'e2epassword';
	const displayName = `E2E ${username}`;
	const res = await request.post(`${API_BASE}/auth/register`, {
		data: { username, password, displayName, rememberMe: true },
		failOnStatusCode: false
	});
	if (!res.ok()) {
		const body = await res.text();
		throw new Error(
			`Could not register e2e user (${res.status()} ${body}). ` +
				`Start vynno-api on ${API_ORIGIN}, then re-run npm run test:e2e.`
		);
	}
	return { username, password, displayName };
}

export async function loginWith(page: Page, username: string, password: string) {
	await page.goto('/login');
	await page.getByLabel('Username').fill(username);
	await page.getByRole('textbox', { name: 'Password', exact: true }).fill(password);
	await page.getByRole('button', { name: 'Log in' }).click();
	await expect(page).toHaveURL(/\/dashboard$/);
}

/** Register a throwaway user and sign in. Does not touch the local `alexdev` account. */
export async function login(page: Page, account?: E2EAccount): Promise<E2EAccount> {
	const creds = account ?? (await registerAccount(page.request));
	await loginWith(page, creds.username, creds.password);
	return creds;
}

async function apiFetch(page: Page, path: string, init: { method?: string; data?: unknown } = {}) {
	const cookies = await page.context().cookies(API_ORIGIN);
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
	await desktopNav(page).getByRole('link', { name: label, exact: true }).click();
	await expect(page).toHaveURL(new RegExp(`${href}$`));
}

export async function startSession(page: Page, note: string, projectLabel?: string) {
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
	await page.getByRole('button', { name: 'Start', exact: true }).click();
	await expect(page.getByTestId('timer-status')).toHaveText('ACTIVE');
}

export async function stopSession(page: Page) {
	await page.getByRole('button', { name: 'Stop', exact: true }).click();
	await expect(page.getByRole('button', { name: 'Start', exact: true })).toBeVisible();
}
