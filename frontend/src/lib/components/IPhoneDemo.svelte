<script lang="ts">
	import { onMount } from 'svelte';
	let video: HTMLVideoElement;
	let paused = $state(true);

	function play() {
		void video.play()?.catch(() => { paused = true; });
	}

	onMount(() => {
		const motion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
		if (!motion?.matches) play();
		const respectMotion = () => { if (motion?.matches) video.pause(); };
		motion?.addEventListener('change', respectMotion);
		return () => motion?.removeEventListener('change', respectMotion);
	});
</script>

<figure class="iphone" aria-label="Ukodus iOS demo video in a Cosmic Orange iPhone 17 Pro frame">
	<div class="hardware" aria-hidden="true">
		<span class="button action"></span>
		<span class="button volume-up"></span>
		<span class="button volume-down"></span>
		<span class="button side"></span>
		<span class="button camera"></span>
	</div>
	<div class="frame">
		<div class="screen">
			<!-- The recording includes the status bar and Dynamic Island. Keep them
			     at their native aspect ratio; never add a second cutout over them. -->
			<video
				bind:this={video}
				onplay={() => paused = false}
				onpause={() => paused = true}
				preload="metadata"
				src="/assets/demos/ios-demo.mp4"
				poster="/assets/demos/ios-demo-poster.jpg"
				width="720"
				height="1566"
				aria-label="Ukodus Sudoku gameplay on iPhone"
				playsinline
				muted
				loop
			>
				Your browser does not support video.
			</video>
		</div>
	</div>
	<figcaption>
		<span>Ukodus for iOS</span>
		<button type="button" onclick={() => paused ? play() : video.pause()} aria-label={paused ? 'Play iPhone preview' : 'Pause iPhone preview'}>
			<svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
				{#if paused}<path d="m3 1 8 5-8 5z" />{:else}<path d="M3 1h2v10H3zm4 0h2v10H7z" />{/if}
			</svg>
			{paused ? 'Play preview' : 'Pause preview'}
		</button>
	</figcaption>
</figure>

<style>
	.iphone {
		/* Scale the hardware and concentric screen corners together. The shell
		   follows the 6.3-inch iPhone 17 Pro's approximately 71.9 × 150 mm body. */
		container-type: inline-size;
		position: relative;
		isolation: isolate;
		width: min(var(--phone-width, 350px), calc(100% - 12px));
		margin: 0 auto;
	}

	figcaption { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px 2px 0; color: var(--muted); font-size: 10px; }
	figcaption button { display: inline-flex; align-items: center; gap: 6px; padding: 8px 0 8px 8px; min-height: 44px; border: 0; background: transparent; color: var(--ink); font: inherit; cursor: pointer; }
	figcaption button:hover { text-decoration: underline; text-underline-offset: 4px; }

	.frame {
		position: relative;
		padding: 3.7cqw;
		border-radius: 15.5cqw;
		background: linear-gradient(105deg, #ae4b21, #f6ad76 18%, #ce622b 47%, #ed8b4b 78%, #a9461d);
		box-shadow:
			inset 0 0 0 0.25cqw #a54a20,
			inset 0 0 0 0.55cqw #f5aa72,
			0 3px 5px rgba(36, 32, 26, 0.16),
			0 24px 48px -12px rgba(36, 32, 26, 0.3);
	}

	.frame::before {
		content: '';
		position: absolute;
		inset: 0.9cqw;
		border-radius: 14.6cqw;
		background: #101112;
		box-shadow: 0 0 0 0.2cqw #98451f;
		pointer-events: none;
	}

	.frame::after {
		content: '';
		position: absolute;
		top: 1.5cqw;
		left: 44%;
		width: 12%;
		height: 0.45cqw;
		border-radius: 1cqw;
		background: #050506;
		box-shadow: 0 0.2cqw 0 #2b2c2d;
		pointer-events: none;
	}

	.screen {
		position: relative;
		overflow: hidden;
		aspect-ratio: 720 / 1566;
		border-radius: 11.8cqw;
		background: #fff;
		box-shadow: 0 0 0 0.25cqw #08090a;
	}

	video {
		display: block;
		width: 100%;
		height: auto;
	}

	.hardware {
		height: calc(100% - 60px);
		position: absolute;
		inset: 0;
		z-index: -1;
		pointer-events: none;
	}

	.button {
		position: absolute;
		left: -0.7cqw;
		width: 1cqw;
		border-radius: 0.6cqw 0 0 0.6cqw;
		background: linear-gradient(90deg, #ad4a20, #ee985a 55%, #a2471f);
		box-shadow: inset 0 0 0 0.15cqw rgba(108, 42, 17, 0.45);
	}

	.action { top: 17%; height: 3.3%; }
	.volume-up { top: 24%; height: 6.5%; }
	.volume-down { top: 32.5%; height: 6.5%; }

	.side,
	.camera {
		left: auto;
		right: -0.7cqw;
		border-radius: 0 0.6cqw 0.6cqw 0;
	}

	.side { top: 26%; height: 10%; }
	.camera { top: 62%; height: 6.2%; }
</style>
