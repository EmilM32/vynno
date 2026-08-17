import type { LayoutLoad } from './$types';

/** First-paint data comes from `+layout.server.ts`. */
export const load: LayoutLoad = ({ data }) => data;
