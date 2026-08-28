import { getApiBase } from '$lib/api/config';
import type { ProfileDto } from '$lib/api/schemas/profile';
import type { UserProfile } from '$lib/types/domain';

/**
 * Same-origin `/v1` BFF: rewrite absolute API avatar URLs to a path so HTTPS
 * pages do not load mixed-content `http://vynno.local:27182/v1/avatars/…`.
 * Absolute PUBLIC_API_BASE (desktop) keeps the API origin.
 */
export function rewriteAvatarUrl(url: string, base = getApiBase()): string {
	if (!base.startsWith('/')) return url;
	try {
		const parsed = new URL(url);
		if (parsed.pathname.startsWith('/v1/avatars/')) return parsed.pathname;
	} catch {
		/* relative or invalid — keep */
	}
	return url;
}

export function profileFromDto(dto: ProfileDto, base = getApiBase()): UserProfile {
	const profile: UserProfile = {
		displayName: dto.displayName,
		email: dto.email
	};
	if (dto.avatarUrl) profile.avatarUrl = rewriteAvatarUrl(dto.avatarUrl, base);
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
