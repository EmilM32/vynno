import { safeParse } from 'valibot';
import { describe, expect, it } from 'vitest';
import { sessionFromDto } from '$lib/api/mappers/session';
import { createManualSessionDtoSchema, sessionDtoSchema } from './session';

const startedAt = '2026-09-20T10:00:00.000Z';
const endedAt = '2026-09-20T11:00:00.000Z';

describe('session request limits', () => {
	it('accepts a 500-code-point note and a 64-code-point ticket', () => {
		const parsed = safeParse(createManualSessionDtoSchema, {
			projectId: 'p',
			note: '😀'.repeat(500),
			ticketId: 't'.repeat(64),
			startedAt,
			endedAt
		});
		expect(parsed.success).toBe(true);
	});

	it('rejects a 501-code-point note and a 65-code-point ticket', () => {
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
			endedAt
		});
		expect(parsed.success).toBe(true);
	});
});

describe('legacy session target', () => {
	const row = {
		id: 's',
		projectId: 'p',
		note: 'Deep work',
		ticketId: null,
		activityTypeId: null,
		status: 'active',
		startedAt,
		endedAt: null
	};

	it.each([25 * 60_000, null])('loads a row that still carries targetDurationMs = %s', (target) => {
		const parsed = safeParse(sessionDtoSchema, { ...row, targetDurationMs: target });
		expect(parsed.success).toBe(true);
		if (!parsed.success) return;
		expect(parsed.output).not.toHaveProperty('targetDurationMs');
		expect(sessionFromDto(parsed.output)).not.toHaveProperty('targetDurationMs');
	});
});
