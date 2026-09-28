import { m } from '$lib/paraglide/messages.js';
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
