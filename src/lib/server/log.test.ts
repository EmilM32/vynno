import { describe, expect, it } from 'vitest';
import { logLine } from './log';

describe('logLine', () => {
	it('writes slog-shaped JSON with time, level, and msg', () => {
		const parsed = JSON.parse(logLine('INFO', 'listen', { addr: '127.0.0.1:27180' })) as {
			time: string;
			level: string;
			msg: string;
			addr: string;
		};
		expect(parsed.level).toBe('INFO');
		expect(parsed.msg).toBe('listen');
		expect(parsed.addr).toBe('127.0.0.1:27180');
		expect(parsed.time).toMatch(/^\d{4}-\d{2}-\d{2}T/);
	});

	it('serializes Error as err.msg / err.name and drops undefined fields', () => {
		const err = new Error('fetch failed');
		err.name = 'TypeError';
		const parsed = JSON.parse(
			logLine('ERROR', 'upstream', { err, path: '/v1/me', skipped: undefined })
		) as {
			err: { msg: string; name: string; stack?: string };
			path: string;
			skipped?: unknown;
		};
		expect(parsed.err.msg).toBe('fetch failed');
		expect(parsed.err.name).toBe('TypeError');
		expect(parsed.err.stack).toEqual(expect.stringContaining('fetch failed'));
		expect(parsed.path).toBe('/v1/me');
		expect('skipped' in parsed).toBe(false);
	});

	it('nests Error.cause code', () => {
		const cause = Object.assign(new Error('connect'), { code: 'ECONNREFUSED' });
		const err = new Error('fetch failed', { cause });
		const parsed = JSON.parse(logLine('ERROR', 'upstream', { err })) as {
			err: { cause: { msg: string; code: string } };
		};
		expect(parsed.err.cause.msg).toBe('connect');
		expect(parsed.err.cause.code).toBe('ECONNREFUSED');
	});
});
