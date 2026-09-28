import { describe, expect, it } from 'vitest';
import { buildVersionMismatch } from './verify-build.js';

const server = (hash) => `const options = { version_hash: "${hash}", root };`;
const client = (hash) =>
	`if(globalThis.__sveltekit_${hash}.data){let e=globalThis.__sveltekit_${hash}}`;

describe('buildVersionMismatch', () => {
	it('passes when both halves use one name', () => {
		expect(
			buildVersionMismatch({ server: [server('1fe62fu'), 'x'], client: [client('1fe62fu'), 'y'] })
		).toBeNull();
	});

	it('flags a server hash the client never reads (vitest rewrote generated/ mid-build)', () => {
		expect(buildVersionMismatch({ server: [server('1pbo1aw')], client: [client('1fe62fu')] })).toBe(
			'server writes __sveltekit_1pbo1aw but the client reads __sveltekit_1fe62fu'
		);
	});

	it('flags missing or split names', () => {
		expect(buildVersionMismatch({ server: [], client: [client('a1')] })).toMatch(
			/one server version_hash, found none/
		);
		expect(
			buildVersionMismatch({ server: [server('a1')], client: [client('a1'), client('b2')] })
		).toMatch(/one client __sveltekit_\* global, found a1, b2/);
	});
});
