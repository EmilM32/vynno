import { normalizeNote, normalizeTicketId, type TextReject } from '$lib/text/normalize';
import { datetimeLocalToIso, isoToDatetimeLocal } from '$lib/time/duration';
import { checkSessionTimes, type SessionTimesReject } from '$lib/time/session-bounds';
import type { CreateManualSessionInput, TimeSession, UpdateSessionInput } from '$lib/types/domain';

/** Raw `SessionForm` field values; times are `datetime-local` strings (host-local). */
export type SessionFormValues = {
	note: string;
	projectId: string;
	activityTypeId: string;
	ticketId: string;
	startedLocal: string;
	endedLocal: string;
};

/** `invalid` = an empty or unparseable time field. */
export type SessionTimeReject = SessionTimesReject | 'invalid';

export type SessionFormErrors = {
	time: SessionTimeReject | null;
	note: TextReject | null;
	ticket: TextReject | null;
};

export type SessionSubmit =
	| { kind: 'invalid'; errors: SessionFormErrors }
	| { kind: 'create'; input: CreateManualSessionInput }
	| { kind: 'update'; input: UpdateSessionInput };

/**
 * Validate the form and build the request body.
 *
 * Edit sends `startedAt` / `endedAt` only when the field changed. The API re-checks the
 * time bounds only for a patch that carries an instant, so a note-only edit of a legacy
 * out-of-bounds row still saves, and untouched times keep their seconds.
 */
export function buildSessionSubmit(opts: {
	mode: 'create' | 'edit';
	session?: TimeSession;
	values: SessionFormValues;
	nowMs: number;
}): SessionSubmit {
	const { values, nowMs } = opts;
	const editing = opts.mode === 'edit' ? opts.session : undefined;
	const live = editing?.status === 'active';

	const startedChanged = !editing || values.startedLocal !== isoToDatetimeLocal(editing.startedAt);
	const endedChanged =
		!live && (!editing || values.endedLocal !== isoToDatetimeLocal(editing.endedAt ?? ''));
	const startedAt = startedChanged ? datetimeLocalToIso(values.startedLocal) : editing!.startedAt;
	const endedAt = live
		? null
		: endedChanged
			? datetimeLocalToIso(values.endedLocal)
			: (editing!.endedAt ?? '');

	let time: SessionTimeReject | null = null;
	if (!startedAt || endedAt === '') time = 'invalid';
	else if (startedChanged || endedChanged) {
		time = checkSessionTimes(
			Date.parse(startedAt),
			endedAt === null ? null : Date.parse(endedAt),
			nowMs
		);
	}

	const noteResult = normalizeNote(values.note);
	const ticketResult = normalizeTicketId(values.ticketId);
	const keepLegacyNote = !!editing && values.note === editing.note && !noteResult.ok;
	const keepLegacyTicket =
		!!editing && values.ticketId === (editing.ticketId ?? '') && !ticketResult.ok;
	const note = noteResult.ok || keepLegacyNote ? null : noteResult.reason;
	const ticket = ticketResult.ok || keepLegacyTicket ? null : ticketResult.reason;

	if (time || note || ticket) return { kind: 'invalid', errors: { time, note, ticket } };

	if (!editing) {
		if (!noteResult.ok || !ticketResult.ok || !endedAt) {
			return { kind: 'invalid', errors: { time: 'invalid', note, ticket } };
		}
		return {
			kind: 'create',
			input: {
				projectId: values.projectId,
				note: noteResult.value,
				activityTypeId: values.activityTypeId || undefined,
				ticketId: ticketResult.value || undefined,
				startedAt,
				endedAt
			}
		};
	}

	const patch: UpdateSessionInput = {
		projectId: values.projectId,
		activityTypeId: values.activityTypeId || null
	};
	if (startedChanged) patch.startedAt = startedAt;
	if (endedChanged && endedAt) patch.endedAt = endedAt;
	if (noteResult.ok) patch.note = noteResult.value;
	if (ticketResult.ok) patch.ticketId = ticketResult.value || null;
	return { kind: 'update', input: patch };
}
