import { sveltekit } from '@sveltejs/kit/vite';
import { svelteTesting } from '@testing-library/svelte/vite';
import { defineConfig } from 'vitest/config';
import { wasmAssetVersion } from './scripts/wasm-version.mjs';

export default defineConfig({
	define: { 'import.meta.env.VITE_WASM_ASSET_VERSION': JSON.stringify(wasmAssetVersion) },
	plugins: [sveltekit(), svelteTesting()],
	resolve: {
		alias: { '/wasm/sudoku_wasm.js': new URL('./static/wasm/sudoku_wasm.js', import.meta.url).pathname }
	},
	test: {
		environment: 'jsdom',
		include: ['tests/**/*.test.ts'],
		setupFiles: ['tests/setup.ts'],
		clearMocks: true,
		coverage: {
			provider: 'istanbul',
			reportOnFailure: true,
			include: ['src/**/*.{ts,svelte}'],
			exclude: ['src/**/*.d.ts', 'src/lib/api/types.ts'],
			reporter: ['text', 'json', 'json-summary', 'html', 'lcov'],
			thresholds: {
				lines: 95,
				statements: 95,
				functions: 95,
				branches: 85,
				'src/lib/game/GameBridge.ts': { lines: 100, branches: 100 }
			}
		}
	}
});
