<script lang="ts">
 import { onMount } from 'svelte';
 import { stableRandom } from './constellations';
 import { stellarTypeAt, stellarAppearance, type ObservationMode } from './celestial';
 let { paused = false, mode = 'visible' }: { paused?: boolean; mode?: ObservationMode } = $props();
 let redraw: (() => void) | undefined;
 $effect(() => { mode; redraw?.(); });
 let canvas: HTMLCanvasElement;
 let nebulaCanvas: HTMLCanvasElement;

 // Render the gas and dust once at a bounded resolution. Layered value noise
 // creates photographic structure without a shader loop running every frame.
 function noise(x: number, y: number) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const hash = (a: number, b: number) => {
   let h = Math.imul(a, 374761393) + Math.imul(b, 668265263);
   h = Math.imul(h ^ (h >>> 13), 1274126177);
   return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  };
  const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
  return a + (b - a) * sx + (c - a) * sy * (1 - sx) + (d - b) * sx * sy;
 }
 function cloudNoise(x: number, y: number) {
  let value = 0, amplitude = .54;
  for (let octave = 0; octave < 4; octave++) {
   value += noise(x, y) * amplitude;
   x = x * 2.07 + 13.2; y = y * 2.03 - 7.1; amplitude *= .48;
  }
  return value;
 }
 function paintNebula(width: number, height: number) {
  const ctx = nebulaCanvas.getContext('2d');
  if (!ctx) return;
  const scale = Math.min(1, 560 / width, 420 / height);
  nebulaCanvas.width = Math.max(1, Math.round(width * scale));
  nebulaCanvas.height = Math.max(1, Math.round(height * scale));
  const image = ctx.createImageData(nebulaCanvas.width, nebulaCanvas.height);
  const warm = [198, 111, 62], rose = [147, 75, 143], cool = [50, 141, 180];
  for (let y = 0; y < image.height; y++) {
   for (let x = 0; x < image.width; x++) {
    const u = x / image.width, v = y / image.height;
    const warp = cloudNoise(u * 3 + 8, v * 3 - 4);
    const curl = cloudNoise(u * 4 - 12, v * 4 + 9);
    const detail = cloudNoise(u * 14 + warp * 4, v * 14 + curl * 4);
    const ridge = .92 - u * .78 + Math.sin(u * 6) * .07;
    const band = Math.exp(-Math.pow((v - ridge) / .27, 2));
    const body = Math.max(0, (cloudNoise(u * 5 + warp * 2, v * 5 + curl * 2) - .22) * 2.5);
    const rift = Math.max(0, 1 - Math.abs(v - ridge + .04 + (detail - .45) * .28) / .07);
    const density = Math.max(0, body * (.45 + detail) - rift * .42) * band;
    const blend = Math.min(1, Math.max(0, u * 1.2 - .1 + (warp - .5) * .3));
    const from = blend < .5 ? warm : rose, to = blend < .5 ? rose : cool;
    const t = blend < .5 ? blend * 2 : (blend - .5) * 2;
    const index = (y * image.width + x) * 4;
    for (let channel = 0; channel < 3; channel++) image.data[index + channel] = from[channel] + (to[channel] - from[channel]) * t;
    image.data[index + 3] = Math.min(.72, density * .9) * 255;
   }
  }
  ctx.putImageData(image, 0, 0);
 }

 onMount(() => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  let previousSize = '';
  let previousMode: ObservationMode | undefined;
  function draw() {
   const { width, height } = canvas.getBoundingClientRect();
   const ratio = Math.min(window.devicePixelRatio || 1, 2);
   if (!width || !height || (previousSize === `${width}:${height}:${ratio}` && previousMode === mode)) return;
   if (previousSize !== `${width}:${height}:${ratio}`) paintNebula(width, height);
   previousSize = `${width}:${height}:${ratio}`; previousMode = mode;
   canvas.width = width * ratio; canvas.height = height * ratio;
   ctx!.setTransform(ratio, 0, 0, ratio, 0, 0);
   ctx!.clearRect(0, 0, width, height);
   const count = Math.min(2200, Math.round(width * height / 340));
   for (let i = 0; i < count; i++) {
    const x = stableRandom(`sky-x-${i}`) * width;
    const y = stableRandom(`sky-y-${i}`) * height;
    const type = stellarAppearance(stellarTypeAt((i + .5) / count), mode);
    if (type.markerOnly) continue;
    const intensity = .3 + type.exposure * .7;
    const radius = .3 + type.exposure * .9;
    const tint = type.rgb.join(',');
    ctx!.fillStyle = `rgba(${tint},${.18 + intensity * .58})`;
    ctx!.beginPath(); ctx!.arc(x, y, radius, 0, Math.PI * 2); ctx!.fill();
    if (intensity > .982) {
     const glow = ctx!.createRadialGradient(x, y, 0, x, y, 7);
     glow.addColorStop(0, `rgba(${tint},.34)`); glow.addColorStop(.22, `rgba(${tint},.10)`); glow.addColorStop(1, `rgba(${tint},0)`);
     ctx!.fillStyle = glow; ctx!.fillRect(x - 7, y - 7, 14, 14);
    }
   }
   // Fine dust along a diagonal cloud gives the field photographic depth.
   for (let i = 0; i < 3200; i++) {
    const x = stableRandom(`dust-x-${i}`) * width;
    const scatter = (stableRandom(`dust-y-${i}`) + stableRandom(`dust-z-${i}`) - 1) * height * .45;
    const y = height * .85 - x * height / width * .6 + scatter;
    const tint = x / width < .38 ? '224,159,111' : x / width < .64 ? '198,147,213' : '116,186,211';
    ctx!.fillStyle = `rgba(${tint},${stableRandom(`dust-a-${i}`) * .15})`;
    ctx!.fillRect(x, y, 1, 1);
   }
  }
  redraw = draw; draw();
  const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(draw) : null;
  observer?.observe(canvas);
  window.addEventListener('resize', draw);
  return () => { redraw = undefined; observer?.disconnect(); window.removeEventListener('resize', draw); };
 });
</script>

<div class="starfield" class:paused aria-hidden="true">
 <div class="nebula nebula-one"></div><div class="nebula nebula-two"></div>
 <canvas class="nebula-texture" bind:this={nebulaCanvas}></canvas>
 <canvas class="distant-stars" bind:this={canvas}></canvas>
 <div class="vignette"></div>
</div>

<style>
 .starfield { position: absolute; inset: 0; overflow: hidden; pointer-events: none; background: #060a12; }
 canvas { position: absolute; inset: -3%; width: 106%; height: 106%; }
 .distant-stars { opacity: .96; animation: sky-drift 55s ease-in-out infinite alternate; }
 .nebula-texture { opacity: .92; animation: cloud-drift 65s ease-in-out infinite alternate; }
 .nebula { position: absolute; inset: -15%; pointer-events: none; }
 .nebula-one { background: radial-gradient(ellipse at 74% 26%, #1b719249, transparent 45%), radial-gradient(ellipse at 22% 72%, #a15a3938, transparent 42%); animation: nebula-drift 42s ease-in-out infinite alternate; }
 .nebula-two { background: radial-gradient(ellipse at 48% 55%, #7f44752c, transparent 44%), radial-gradient(ellipse at 70% 64%, #2f4d902b, transparent 38%); }
 .vignette { position: absolute; inset: 0; background: radial-gradient(ellipse at 50% 50%, transparent 30%, #05091066 100%); }
 .paused *, :global([data-theme='high-contrast']) .starfield * { animation-play-state: paused !important; }
 :global([data-theme='high-contrast']) canvas, :global([data-theme='high-contrast']) .nebula { opacity: .18; animation: none; }
 @keyframes sky-drift { from { transform: translate3d(-.6%, .3%, 0); opacity: .72; } to { transform: translate3d(.6%, -.3%, 0); opacity: .96; } }
 @keyframes nebula-drift { from { transform: translate3d(-1%, 0, 0); } to { transform: translate3d(1%, 1%, 0); } }
 @keyframes cloud-drift { from { transform: translate3d(-.8%, .5%, 0) scale(1); } to { transform: translate3d(.8%, -.5%, 0) scale(1.025); } }
 @media (prefers-reduced-motion: reduce) { canvas, .nebula { animation: none; } }
</style>
