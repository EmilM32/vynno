import type { ProfileDto } from '$lib/api/schemas/profile';
import type { UserProfile } from '$lib/types/domain';

export function profileFromDto(dto: ProfileDto): UserProfile {
	const profile: UserProfile = {
		displayName: dto.displayName,
		handle: dto.handle
	};
	if (dto.avatarUrl) profile.avatarUrl = dto.avatarUrl;
	return profile;
}

export function profileToDto(profile: UserProfile): ProfileDto {
	return {
		displayName: profile.displayName,
		handle: profile.handle,
		avatarUrl: profile.avatarUrl ?? null
	};
}
