/** JSON lines on stdout/stderr, matching vynno-api slog field names. */

export type LogLevel = 'INFO' | 'WARN' | 'ERROR';

export type LogFields = Record<string, unknown>;

function serializeErr(err: unknown): Record<string, unknown> {
	if (err instanceof Error) {
		const out: Record<string, unknown> = { msg: err.message, name: err.name };
		if (err.stack) out.stack = err.stack;
		if ('cause' in err && err.cause !== undefined && err.cause !== null) {
			const cause = err.cause;
			if (cause instanceof Error) {
				const nested: Record<string, unknown> = { msg: cause.message, name: cause.name };
				if ('code' in cause && cause.code !== undefined) nested.code = cause.code;
				out.cause = nested;
			} else if (typeof cause === 'object' && 'code' in cause) {
				out.cause = { code: (cause as { code: unknown }).code };
			} else {
				out.cause = { msg: String(cause) };
			}
		}
		return out;
	}
	return { msg: String(err) };
}

export function logLine(level: LogLevel, msg: string, fields: LogFields = {}): string {
	const rec: Record<string, unknown> = {
		time: new Date().toISOString(),
		level,
		msg
	};
	for (const [key, value] of Object.entries(fields)) {
		if (value === undefined) continue;
		rec[key] = key === 'err' ? serializeErr(value) : value;
	}
	return JSON.stringify(rec);
}

function write(level: LogLevel, msg: string, fields?: LogFields): void {
	const line = logLine(level, msg, fields) + '\n';
	if (level === 'ERROR') {
		process.stderr.write(line);
	} else {
		process.stdout.write(line);
	}
}

export const logger = {
	info: (msg: string, fields?: LogFields) => write('INFO', msg, fields),
	warn: (msg: string, fields?: LogFields) => write('WARN', msg, fields),
	error: (msg: string, fields?: LogFields) => write('ERROR', msg, fields)
};
