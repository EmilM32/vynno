import type {
	ActivityTypeDto,
	CreateActivityTypeDto,
	UpdateActivityTypeDto
} from '$lib/api/schemas/activity-type';
import type {
	ActivityType,
	CreateActivityTypeInput,
	UpdateActivityTypeInput
} from '$lib/types/domain';

export function activityTypeFromDto(dto: ActivityTypeDto): ActivityType {
	return { id: dto.id, name: dto.name, color: dto.color };
}

export function createActivityTypeToDto(input: CreateActivityTypeInput): CreateActivityTypeDto {
	return { name: input.name, color: input.color };
}

export function updateActivityTypeToDto(input: UpdateActivityTypeInput): UpdateActivityTypeDto {
	const dto: UpdateActivityTypeDto = {};
	if (input.name !== undefined) dto.name = input.name;
	if (input.color !== undefined) dto.color = input.color;
	return dto;
}
