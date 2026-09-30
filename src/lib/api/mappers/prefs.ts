import type { PrefsDto, UpdatePrefsDto } from '$lib/api/schemas/prefs';
import type { UpdatePrefsInput, UserPrefs } from '$lib/types/domain';

export function prefsFromDto(dto: PrefsDto): UserPrefs {
	const prefs: UserPrefs = {};
	if (dto.dailyTargetMs != null) prefs.dailyTargetMs = dto.dailyTargetMs;
	if (dto.defaultProjectId != null) prefs.defaultProjectId = dto.defaultProjectId;
	return prefs;
}

export function updatePrefsToDto(input: UpdatePrefsInput): UpdatePrefsDto {
	const dto: UpdatePrefsDto = {};
	if ('dailyTargetMs' in input) dto.dailyTargetMs = input.dailyTargetMs ?? null;
	if ('defaultProjectId' in input) dto.defaultProjectId = input.defaultProjectId ?? null;
	return dto;
}
