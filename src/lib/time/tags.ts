/** Split a comma-separated tag field. Trims, drops empties, de-dupes in order. */
export function parseTags(raw: string): string[] {
	const seen = new Set<string>();
	const out: string[] = [];
	for (const part of raw.split(',')) {
		const tag = part.trim();
		if (!tag || seen.has(tag)) continue;
		seen.add(tag);
		out.push(tag);
	}
	return out;
}

export function formatTags(tags: string[] | undefined): string {
	return tags?.join(', ') ?? '';
}

export function tagsEqual(a: string[] | undefined, b: string[]): boolean {
	const left = a ?? [];
	if (left.length !== b.length) return false;
	return left.every((tag, i) => tag === b[i]);
}
