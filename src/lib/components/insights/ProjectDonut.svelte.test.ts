import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer, type ViteDevServer } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { svelte, vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { chromium } from 'playwright-core';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import ProjectDonut from './ProjectDonut.svelte';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');

const eight = Array.from({ length: 8 }, (_, i) => ({
	id: `p${i}`,
	label: `Project ${i}`,
	color: 'var(--color-primary)',
	ms: (8 - i) * 60_000,
	percent: 12
}));

const four = eight.slice(0, 4);

function slotHeightPx(body: string): number {
	const imgAt = body.indexOf('role="img"');
	const tag = body.slice(body.lastIndexOf('<', imgAt), body.indexOf('>', imgAt) + 1);
	const height = Number(tag.match(/height:\s*(\d+(?:\.\d+)?)px/)?.[1]);
	return height;
}

describe('ProjectDonut chart box', () => {
	it('renders the chart slot at a definite pixel height', () => {
		const { body } = render(ProjectDonut, { props: { items: eight, totalMs: 1_000_000 } });
		const height = slotHeightPx(body);
		expect(height).toBeGreaterThanOrEqual(140);
		expect(body).not.toContain('min-h-40');
	});

	it(
		'keeps the ring at least 140px at a 390px width, with 8 projects and with 4',
		async () => {
			const measured = await measureRings([
				{ items: eight, totalMs: 1_000_000 },
				{ items: four, totalMs: 400_000 }
			]);
			for (const ring of measured) {
				expect(ring.svgHeight).toBeGreaterThanOrEqual(140);
				expect(ring.diameter).toBeGreaterThanOrEqual(140);
				expect(ring.totalBottom).toBeLessThanOrEqual(ring.legendTop);
			}
		},
		60_000
	);
});

async function measureRings(
	cases: { items: typeof eight; totalMs: number }[]
): Promise<{ svgHeight: number; diameter: number; totalBottom: number; legendTop: number }[]> {
	const server = await startHarness();
	const browser = await chromium.launch();
	try {
		const logs: string[] = [];
		const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
		page.on('console', (msg) => logs.push(`console:${msg.type()}:${msg.text()}`));
		page.on('pageerror', (err) => logs.push(`pageerror:${err.message}`));
		page.on('requestfailed', (req) => logs.push(`failed:${req.url()} ${req.failure()?.errorText}`));
		const address = server.httpServer?.address();
		if (address == null || typeof address === 'string') throw new Error('harness has no port');
		const out = [];
		for (const props of cases) {
			const response = await page.goto(`http://127.0.0.1:${address.port}/harness`);
			const ready = await page
				.waitForFunction(
					() => typeof (window as Window & { __mount?: unknown }).__mount === 'function',
					undefined,
					{ timeout: 8_000 }
				)
				.then(() => true)
				.catch(async () => {
					const html = await page.content();
					throw new Error(
						`status=${response?.status()} url=${page.url()}\n${logs.join('\n')}\n${html.slice(0, 2500)}`
					);
				});
			if (!ready) throw new Error('mount missing');
			await page.evaluate((next) => {
				const win = window as Window & { __mount?: (props: unknown) => void };
				win.__mount?.(next);
			}, props);
			await page
				.waitForSelector('.lc-layout-svg', { state: 'attached', timeout: 12_000 })
				.catch(async () => {
					const detail = await page.evaluate(() => ({
						text: document.body.innerText.slice(0, 400),
						host: document.getElementById('host')?.innerHTML.slice(0, 1500) ?? ''
					}));
					throw new Error(`${logs.join('\n')}\n${detail.text}\n${detail.host}`);
				});
			out.push(
				await page.evaluate(() => {
					const svg = document.querySelector('.lc-layout-svg');
					if (!(svg instanceof SVGSVGElement)) throw new Error('chart svg missing');
					const rect = svg.getBoundingClientRect();
					const arcs = svg.querySelector('g');
					const box = arcs?.getBBox();
					const total = document
						.querySelector('[role="img"] .tabular-nums')
						?.getBoundingClientRect();
					const legend = document.querySelector('.border-t')?.getBoundingClientRect();
					if (!box || !total || !legend) throw new Error('chart geometry missing');
					return {
						svgHeight: rect.height,
						diameter: Math.max(box.width, box.height),
						totalBottom: total.bottom,
						legendTop: legend.top
					};
				})
			);
		}
		return out;
	} finally {
		await browser.close();
		await server.close();
	}
}

async function startHarness(): Promise<ViteDevServer> {
	const server = await createServer({
		root,
		configFile: false,
		appType: 'custom',
		logLevel: 'error',
		plugins: [
			tailwindcss(),
			svelte({ preprocess: vitePreprocess() }),
			{
				name: 'donut-harness',
				resolveId(id) {
					if (id === '$app/paths') return '\0app-paths';
				},
				load(id) {
					if (id === '\0app-paths') return 'export function resolve(path) { return path; }\n';
				},
				configureServer(dev) {
					dev.middlewares.use(async (req, res, next) => {
						if (req.url !== '/harness') return next();
						const raw = `<!doctype html>
<html>
<body style="margin:0">
<div id="host" style="width:390px"></div>
<script type="module">
import '/src/routes/layout.css';
import { mount, unmount } from 'svelte';
import ProjectDonut from '/src/lib/components/insights/ProjectDonut.svelte';
const host = document.getElementById('host');
let app;
window.__mount = (props) => {
  if (app) unmount(app);
  host.replaceChildren();
  app = mount(ProjectDonut, { target: host, props });
};
</script>
</body>
</html>`;
						try {
							const html = await dev.transformIndexHtml('/harness', raw);
							res.setHeader('content-type', 'text/html');
							res.end(html);
						} catch (err) {
							next(err);
						}
					});
				}
			}
		],
		resolve: {
			alias: [{ find: '$lib', replacement: path.join(root, 'src/lib') }]
		},
		server: { host: '127.0.0.1', port: 0, strictPort: false }
	});
	await server.listen();
	return server;
}
