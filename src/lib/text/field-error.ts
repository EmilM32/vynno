import { m } from '$lib/paraglide/messages.js';
import { SESSION_MAX_DURATION_DAYS, type SessionTimesReject } from '$lib/time/session-bounds';
import { NOTE_MAX, TICKET_MAX, type TextReject } from './normalize';

export function nameRejectMessage(reason: TextReject, max: number): string {
	if (reason === 'empty') return m.validation_name_required();
	if (reason === 'too_long') return m.validation_name_max({ max });
	return m.validation_text_invalid();
}

export function noteRejectMessage(reason: TextReject): string {
	if (reason === 'too_long') return m.validation_note_max({ max: NOTE_MAX });
	return m.validation_text_invalid();
}

export function ticketRejectMessage(reason: TextReject): string {
	if (reason === 'too_long') return m.validation_ticket_max({ max: TICKET_MAX });
	return m.validation_text_invalid();
}

/** `invalid` = an empty or unparseable time field. */
export function sessionTimeRejectMessage(reason: SessionTimesReject | 'invalid'): string {
	if (reason === 'before_min') return m.logs_time_before_min();
	if (reason === 'in_future') return m.logs_time_future();
	if (reason === 'too_long') return m.logs_time_too_long({ days: SESSION_MAX_DURATION_DAYS });
	return m.logs_time_invalid();
}
