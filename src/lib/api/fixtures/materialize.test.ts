import { describe, expect, it } from 'vitest';
import * as v from 'valibot';
import { FIXED_NOW, localIso } from '$lib/test/factories';
import { projectListDtoSchema } from '$lib/api/schemas/project';
import { profileDtoSchema } from '$lib/api/schemas/profile';
import { sessionListDtoSchema } from '$lib/api/schemas/session';
import { fixtureAppSeed, mockProfileDto, mockProjectListDto, mockSessionDtos } from './load';
import { materializeSessionDtos, parseSessionSeed } from './materialize';
import sessionSeedJson from './sessions.seed.json';

describe('fixture schemas', () => {
	it('parses checked-in project and profile JSON', () => {
		expect(v.safeParse(projectListDtoSchema, mockProjectListDto()).success).toBe(true);
		expect(v.safeParse(profileDtoSchema, mockProfileDto()).success).toBe(true);
	});

	it('rejects a project missing id', () => {
		const parsed = v.safeParse(projectListDtoSchema, {
			items: [{ name: 'X', color: '#3b82f6', code: null, progressPercent: null, archived: false }]
		});
		expect(parsed.success).toBe(false);
	});
});

describe('materializeSessionDtos', () => {
	it('places sess-today-1 and sess-yest-1 on the local calendar around FIXED_NOW', () => {
		const seed = parseSessionSeed(sessionSeedJson);
		const dtos = materializeSessionDtos(seed, FIXED_NOW);
		const today = dtos.find((s) => s.id === 'sess-today-1');
		const yesterday = dtos.find((s) => s.id === 'sess-yest-1');
		expect(today?.startedAt).toBe(localIso(2026, 2, 11, 9, 0));
		expect(yesterday?.startedAt).toBe(localIso(2026, 2, 10, 10, 0));
		expect(today?.endedAt).toBe(localIso(2026, 2, 11, 11, 15));
		expect(v.safeParse(sessionListDtoSchema, { items: dtos }).success).toBe(true);
	});

	it('fixtureAppSeed maps to domain projects and historical session ids', () => {
		const seed = fixtureAppSeed(FIXED_NOW);
		expect(seed.profile.handle).toBe('@alexdev');
		expect(seed.projects.some((p) => p.id === 'proj-auth' && p.code === 'AUTH')).toBe(true);
		expect(seed.sessions.some((s) => s.id === 'sess-today-1')).toBe(true);
		expect(mockSessionDtos(FIXED_NOW).length).toBe(seed.sessions.length);
	});
});
