import type { ProfileDto } from '$lib/api/schemas/profile';
import type { UserProfile } from '$lib/types/domain';

export function profileFromDto(dto: ProfileDto): UserProfile {
	const profile: UserProfile = {
		displayName: dto.displayName,
		email: dto.email
	};
	if (dto.avatarUrl) profile.avatarUrl = dto.avatarUrl;
	return profile;
}

export function profileToDto(profile: UserProfile): ProfileDto {
	return {
		displayName: profile.displayName,
		email: profile.email,
		avatarUrl: profile.avatarUrl ?? null
	};
}

/** Chrome identity: display name if set, otherwise the raw email. */
export function profileLabel(profile: { displayName: string; email: string }): string {
	return profile.displayName.trim() || profile.email;
}
