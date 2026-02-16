import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: '404.html',
			precompress: true
		}),
		prerender: {
			entries: [
				'/',
				'/play/',
				'/galaxy/',
				'/about/',
				'/privacy/',
				'/difficulty/',
				'/techniques/',
				'/how-to-play/',
				'/app/'
			]
		}
	}
};

export default config;
