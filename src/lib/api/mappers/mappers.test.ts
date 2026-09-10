import { describe, expect, it } from 'vitest';
import { makeProject, makeSession } from '$lib/test/factories';
import { profileFromDto, profileToDto, rewriteAvatarUrl } from './profile';
import {
	createProjectFromDto,
	createProjectToDto,
	projectFromDto,
	projectToDto,
	updateProjectFromDto,
	updateProjectToDto
} from './project';
import { sessionFromDto, sessionToDto, startSessionFromDto, startSessionToDto } from './session';

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
			code: null,
			progressPercent: null
		});
		expect(updateProjectToDto({ code: null })).toEqual({ code: null });
		expect(updateProjectToDto({ name: 'Y' })).toEqual({ name: 'Y' });
		expect(updateProjectToDto({ progressPercent: null })).toEqual({ progressPercent: null });
		expect(updateProjectToDto({ progressPercent: 60 })).toEqual({ progressPercent: 60 });
		expect(createProjectFromDto({ name: 'X', color: '#3b82f6', code: null })).toEqual({
			name: 'X',
			color: '#3b82f6'
		});
		expect(updateProjectFromDto({ code: null })).toEqual({ code: null });
		expect(updateProjectFromDto({ progressPercent: null })).toEqual({ progressPercent: null });
	});
});

describe('session mappers', () => {
	it('omits null ticket from domain', () => {
		const session = sessionFromDto({
			id: 'sess-1',
			projectId: 'proj-auth',
			note: 'Work',
			ticketId: null,
			activityTypeId: 'act-coding',
			status: 'stopped',
			startedAt: '2026-03-10T08:00:00.000Z',
			endedAt: '2026-03-10T09:00:00.000Z',
			targetDurationMs: null
		});
		expect(session.ticketId).toBeUndefined();
		expect(session.targetDurationMs).toBeUndefined();
		expect(session.activityTypeId).toBe('act-coding');
	});

	it('round-trips ticket', () => {
		const original = makeSession({
			ticketId: 'DEV-1',
			activityTypeId: 'act-debugging',
			endedAt: '2026-03-10T10:00:00.000Z'
		});
		const back = sessionFromDto(sessionToDto(original));
		expect(back).toEqual(original);
	});

	it('start DTO always sends nulls', () => {
		expect(
			startSessionToDto({
				projectId: 'proj-auth',
				note: 'Work'
			})
		).toEqual({
			projectId: 'proj-auth',
			note: 'Work',
			ticketId: null,
			activityTypeId: null,
			targetDurationMs: null
		});
		expect(
			startSessionFromDto({
				projectId: 'proj-auth',
				note: 'Work',
				ticketId: null,
				activityTypeId: null,
				targetDurationMs: null
			})
		).toEqual({
			projectId: 'proj-auth',
			note: 'Work'
		});
	});
});

describe('profile mappers', () => {
	it('omits null avatar from domain', () => {
		expect(
			profileFromDto({ displayName: 'Alex Dev', email: 'alex@example.com', avatarUrl: null })
		).toEqual({ displayName: 'Alex Dev', email: 'alex@example.com' });
	});

	it('round-trips avatar', () => {
		const profile = { displayName: 'Alex', email: 'a@example.com', avatarUrl: 'https://x/a.png' };
		expect(profileFromDto(profileToDto(profile))).toEqual(profile);
	});

	it('rewrites absolute API avatar URLs to the same-origin BFF path', () => {
		expect(rewriteAvatarUrl('http://vynno.localhost:27182/v1/avatars/abc', '/v1')).toBe(
			'/v1/avatars/abc'
		);
		expect(rewriteAvatarUrl('https://vynno.localhost:27182/v1/avatars/abc', '/v1')).toBe(
			'/v1/avatars/abc'
		);
		expect(
			profileFromDto({
				displayName: 'Alex',
				email: 'a@example.com',
				avatarUrl: 'http://vynno.localhost:27182/v1/avatars/abc'
			})
		).toEqual({ displayName: 'Alex', email: 'a@example.com', avatarUrl: '/v1/avatars/abc' });
	});

	it('leaves avatar URLs alone when PUBLIC_API_BASE is an absolute origin', () => {
		expect(
			rewriteAvatarUrl('http://vynno.localhost:27182/v1/avatars/abc', 'https://api.example.test/v1')
		).toBe('http://vynno.localhost:27182/v1/avatars/abc');
	});
});
