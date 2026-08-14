import type { CreateProjectDto, ProjectDto, UpdateProjectDto } from '$lib/api/schemas/project';
import type { CreateProjectInput, Project, UpdateProjectInput } from '$lib/types/domain';

export function projectFromDto(dto: ProjectDto): Project {
	const project: Project = {
		id: dto.id,
		name: dto.name,
		color: dto.color,
		isArchived: dto.archived
	};
	if (dto.code) project.code = dto.code;
	if (dto.progressPercent != null) project.progressPercent = dto.progressPercent;
	return project;
}

export function projectToDto(project: Project): ProjectDto {
	return {
		id: project.id,
		name: project.name,
		color: project.color,
		code: project.code ?? null,
		progressPercent: project.progressPercent ?? null,
		archived: project.isArchived ?? false
	};
}

export function createProjectToDto(input: CreateProjectInput): CreateProjectDto {
	return {
		name: input.name,
		color: input.color,
		code: input.code ?? null
	};
}

export function updateProjectToDto(input: UpdateProjectInput): UpdateProjectDto {
	const dto: UpdateProjectDto = {};
	if (input.name !== undefined) dto.name = input.name;
	if (input.color !== undefined) dto.color = input.color;
	if (input.code !== undefined) dto.code = input.code;
	return dto;
}

export function createProjectFromDto(dto: CreateProjectDto): CreateProjectInput {
	return {
		name: dto.name,
		color: dto.color,
		...(dto.code ? { code: dto.code } : {})
	};
}

export function updateProjectFromDto(dto: UpdateProjectDto): UpdateProjectInput {
	const input: UpdateProjectInput = {};
	if (dto.name !== undefined) input.name = dto.name;
	if (dto.color !== undefined) input.color = dto.color;
	if (dto.code !== undefined) input.code = dto.code;
	return input;
}
