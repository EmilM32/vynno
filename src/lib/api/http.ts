import { json } from '@sveltejs/kit';

export function jsonError(status: number, code: string, message: string): Response {
	return json({ error: { code, message } }, { status });
}
