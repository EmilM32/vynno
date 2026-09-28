import { describe, expect, it } from 'vitest';
import { m } from '$lib/paraglide/messages.js';
import {
	nameRejectMessage,
	noteRejectMessage,
	sessionTimeRejectMessage,
	ticketRejectMessage
} from './field-error';

describe('field error messages', () => {
	it('maps name rejects, with the caller max', () => {
		expect(nameRejectMessage('empty', 80)).toBe(m.validation_name_required());
		expect(nameRejectMessage('too_long', 80)).toBe(m.validation_name_max({ max: 80 }));
		expect(nameRejectMessage('invalid', 80)).toBe(m.validation_text_invalid());
	});

	it('maps note and ticket rejects to their own limits', () => {
		expect(noteRejectMessage('too_long')).toBe(m.validation_note_max({ max: 500 }));
		expect(noteRejectMessage('invalid')).toBe(m.validation_text_invalid());
		expect(ticketRejectMessage('too_long')).toBe(m.validation_ticket_max({ max: 64 }));
		expect(ticketRejectMessage('invalid')).toBe(m.validation_text_invalid());
	});

	it('maps each session time reject to its own message (EMI-69)', () => {
		expect(sessionTimeRejectMessage('before_min')).toBe(m.logs_time_before_min());
		expect(sessionTimeRejectMessage('in_future')).toBe(m.logs_time_future());
		expect(sessionTimeRejectMessage('too_long')).toBe(m.logs_time_too_long({ days: 7 }));
		expect(sessionTimeRejectMessage('end_before_start')).toBe(m.logs_time_invalid());
		expect(sessionTimeRejectMessage('invalid')).toBe(m.logs_time_invalid());
		const all = ['before_min', 'in_future', 'too_long', 'end_before_start'] as const;
		expect(new Set(all.map(sessionTimeRejectMessage)).size).toBe(all.length);
	});
});
