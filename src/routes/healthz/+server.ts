import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/** Process liveness for scripts/status. Does not touch vynno-api. */
export const GET: RequestHandler = () => json({ status: 'ok' });
