import type { DayTotalDto } from '$lib/api/schemas/stats';
import type { DayTotal } from '$lib/types/domain';

export function dayTotalFromDto(dto: DayTotalDto): DayTotal {
	const total: DayTotal = {
		date: dto.date,
		projectId: dto.projectId,
		durationMs: dto.durationMs,
		sessionCount: dto.sessionCount
	};
	if (dto.activityTypeId != null) total.activityTypeId = dto.activityTypeId;
	return total;
}
