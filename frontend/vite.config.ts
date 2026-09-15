import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { wasmAssetVersion } from './scripts/wasm-version.mjs';

export default defineConfig({
	define: { 'import.meta.env.VITE_WASM_ASSET_VERSION': JSON.stringify(wasmAssetVersion) },
	plugins: [sveltekit()],
	server: {
		proxy: {
			'/api': {
				target: 'http://localhost:3000',
				changeOrigin: true
			},
			'/s': {
				target: 'http://localhost:3000',
				changeOrigin: true
			}
		}
	}
});
