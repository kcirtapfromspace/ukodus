import { sveltekit } from '@sveltejs/kit/vite';
import { svelteTesting } from '@testing-library/svelte/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
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
				lines: 60,
				branches: 50,
				'src/lib/game/GameBridge.ts': { lines: 90 }
			}
		}
	}
});
