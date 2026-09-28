import { safeParse } from 'valibot';
import { describe, expect, it } from 'vitest';
import {
	TARGET_DURATION_MAX_MS,
	createManualSessionDtoSchema,
	sessionDtoSchema
} from './session';

const startedAt = '2026-09-20T10:00:00.000Z';
const endedAt = '2026-09-20T11:00:00.000Z';

describe('session request limits', () => {
	it('accepts a 500-code-point note, a 64-code-point ticket, and the target max', () => {
		const parsed = safeParse(createManualSessionDtoSchema, {
			projectId: 'p',
			note: '😀'.repeat(500),
			ticketId: 't'.repeat(64),
			startedAt,
			endedAt,
			targetDurationMs: TARGET_DURATION_MAX_MS
		});
		expect(parsed.success).toBe(true);
	});

	it('rejects a 501-code-point note, a 65-code-point ticket, and a target above the max', () => {
		expect(
			safeParse(createManualSessionDtoSchema, {
				projectId: 'p',
				note: 'a'.repeat(501),
				startedAt,
				endedAt
			}).success
		).toBe(false);
		expect(
			safeParse(createManualSessionDtoSchema, {
				projectId: 'p',
				note: 'ok',
				ticketId: 't'.repeat(65),
				startedAt,
				endedAt
			}).success
		).toBe(false);
		expect(
			safeParse(createManualSessionDtoSchema, {
				projectId: 'p',
				note: 'ok',
				startedAt,
				endedAt,
				targetDurationMs: TARGET_DURATION_MAX_MS + 1
			}).success
		).toBe(false);
	});

	it('still loads a legacy oversized note and ticket on the response schema', () => {
		const parsed = safeParse(sessionDtoSchema, {
			id: 's',
			projectId: 'p',
			note: 'a'.repeat(501),
			ticketId: 't'.repeat(65),
			activityTypeId: null,
			status: 'stopped',
			startedAt,
			endedAt,
			targetDurationMs: null
		});
		expect(parsed.success).toBe(true);
	});
});
