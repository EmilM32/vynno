import { describe, expect, it } from 'vitest';
import { makeProject, makeSession } from '$lib/test/factories';
import { profileFromDto, profileToDto } from './profile';
import { createProjectToDto, projectFromDto, projectToDto, updateProjectToDto } from './project';
import { sessionFromDto, sessionToDto, startSessionToDto } from './session';

describe('project mappers', () => {
	it('maps archived + null optionals onto omitted domain fields', () => {
		const project = projectFromDto({
			id: 'proj-1',
			name: 'Identity',
			color: '#3b82f6',
			code: null,
			progressPercent: null,
			archived: true
		});
		expect(project).toEqual({
			id: 'proj-1',
			name: 'Identity',
			color: '#3b82f6',
			isArchived: true
		});
		expect(project.code).toBeUndefined();
		expect(project.progressPercent).toBeUndefined();
	});

	it('round-trips a full project through DTO nulls', () => {
		const original = makeProject({
			code: 'AUTH',
			progressPercent: 60,
			isArchived: false
		});
		const back = projectFromDto(projectToDto(original));
		expect(back).toEqual(original);
	});

	it('create/update DTOs use null for missing code', () => {
		expect(createProjectToDto({ name: 'X', color: '#3b82f6' })).toEqual({
			name: 'X',
			color: '#3b82f6',
			code: null
		});
		expect(updateProjectToDto({ code: null })).toEqual({ code: null });
		expect(updateProjectToDto({ name: 'Y' })).toEqual({ name: 'Y' });
	});
});

describe('session mappers', () => {
	it('omits empty tags and null ticket from domain', () => {
		const session = sessionFromDto({
			id: 'sess-1',
			projectId: 'proj-auth',
			note: 'Work',
			ticketId: null,
			activityType: 'coding',
			tags: [],
			status: 'stopped',
			startedAt: '2026-03-10T08:00:00.000Z',
			endedAt: '2026-03-10T09:00:00.000Z',
			pausedMs: 0,
			pausedAt: null,
			targetDurationMs: null
		});
		expect(session.tags).toBeUndefined();
		expect(session.ticketId).toBeUndefined();
		expect(session.pausedAt).toBeUndefined();
		expect(session.targetDurationMs).toBeUndefined();
		expect(session.activityType).toBe('coding');
	});

	it('round-trips tags and ticket', () => {
		const original = makeSession({
			ticketId: 'DEV-1',
			activityType: 'debugging',
			tags: ['Backend'],
			endedAt: '2026-03-10T10:00:00.000Z'
		});
		const back = sessionFromDto(sessionToDto(original));
		expect(back).toEqual(original);
	});

	it('start DTO always sends arrays and nulls', () => {
		expect(
			startSessionToDto({
				projectId: 'proj-auth',
				note: 'Work'
			})
		).toEqual({
			projectId: 'proj-auth',
			note: 'Work',
			ticketId: null,
			activityType: null,
			tags: [],
			targetDurationMs: null
		});
	});
});

describe('profile mappers', () => {
	it('omits null avatar from domain', () => {
		expect(
			profileFromDto({ displayName: 'Alex Dev', handle: '@alexdev', avatarUrl: null })
		).toEqual({ displayName: 'Alex Dev', handle: '@alexdev' });
	});

	it('round-trips avatar', () => {
		const profile = { displayName: 'Alex', handle: '@a', avatarUrl: 'https://x/a.png' };
		expect(profileFromDto(profileToDto(profile))).toEqual(profile);
	});
});
