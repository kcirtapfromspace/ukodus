import type { GalaxyNode } from '$lib/api/types';
import { canonicalTechniqueName, nodePrimaryTechnique } from '$lib/stores/galaxy.svelte';

export const ASTRONOMY_SOURCES = {
 census: { title: 'Reylé et al. (2021), Table 3', url: 'https://arxiv.org/abs/2104.14972' },
 properties: { title: 'Pecaut & Mamajek stellar sequence (2022 table)', url: 'https://www.pas.rochester.edu/~emamajek/EEM_dwarf_UBVIJHK_colors_Teff.txt' },
 color: { title: 'Wyman et al. (2013), CIE color matching', url: 'https://jcgt.org/published/0002/02/01/' },
 infrared: { title: 'NASA: brown dwarfs and infrared light', url: 'https://science.nasa.gov/universe/stars/types/' },
 redshift: { title: 'NASA: cosmological redshift', url: 'https://science.nasa.gov/asset/webb/what-is-cosmological-redshift/' },
 nucleus: { title: 'NASA: types of black holes', url: 'https://science.nasa.gov/universe/black-holes/types/' }
};

// Reylé et al. (2021), Table 3: all 422 classified A–Y/D objects within
// 10 pc. Excludes 41 untyped objects, 77 planets and the Sun. This local,
// detection-limited sample is not a universal or completeness-corrected rate.
// J/K magnitudes and H-K colors: Mamajek 2022-04-16; Y uses MKO JHK.
// D has no representative in that sequence: keep missing measurements null.
const reference = [
 { spectral: 'M', name: 'Red dwarf', count: 249, subtype: 'M3V', kelvin: 3430, absoluteV: 11.15, absoluteJ: 7.38, absoluteK: 6.55, hMinusK: .252 },
 { spectral: 'T', name: 'Methane brown dwarf', count: 45, subtype: 'T6V', kelvin: 950, absoluteV: null, absoluteJ: 15.34, absoluteK: 15.3, hMinusK: -.03 },
 { spectral: 'K', name: 'Orange dwarf', count: 38, subtype: 'K5V', kelvin: 4440, absoluteV: 7.28, absoluteJ: 5.10, absoluteK: 4.397, hMinusK: .132 },
 { spectral: 'L', name: 'Ultracool L dwarf', count: 21, subtype: 'L3V', kelvin: 1920, absoluteV: 21.7, absoluteJ: 12.78, absoluteK: 11.40, hMinusK: .61 },
 { spectral: 'D', name: 'White dwarf', count: 20, subtype: null, kelvin: null, absoluteV: null, absoluteJ: null, absoluteK: null, hMinusK: null },
 { spectral: 'Y', name: 'Cold brown dwarf', count: 19, subtype: 'Y0V', kelvin: 450, absoluteV: null, absoluteJ: 20.15, absoluteK: 21.0, hMinusK: -.5 },
 { spectral: 'G', name: 'Sun-like star', count: 18, subtype: 'G2V', kelvin: 5770, absoluteV: 4.80, absoluteJ: 3.60, absoluteK: 3.236, hMinusK: .073 },
 { spectral: 'F', name: 'Yellow-white star', count: 8, subtype: 'F5V', kelvin: 6550, absoluteV: 3.37, absoluteJ: 2.52, absoluteK: 2.291, hMinusK: .054 },
 { spectral: 'A', name: 'White star', count: 4, subtype: 'A0V', kelvin: 9700, absoluteV: .99, absoluteJ: .95, absoluteK: .949, hMinusK: .028 }
] as const;
export const REFERENCE_STAR_COUNT = reference.reduce((sum, type) => sum + type.count, 0);

// Planck spectrum, 380–780 nm; CIE 1931 analytic fit, Wyman et al. Eq. 2.
// Approximate blackbody display chromaticity, not a measured stellar spectrum.
export function temperatureRGB(kelvin: number): [number, number, number] {
 let x = 0, y = 0, z = 0;
 for (let nm = 380; nm <= 780; nm += 5) {
  const wavelength = nm * 1e-9;
  const radiance = 1 / (wavelength ** 5 * Math.expm1(.01438776877 / (wavelength * kelvin)));
  x += radiance * (1.065 * Math.exp(-.5 * ((nm - 595.8) / 33.33) ** 2) + .366 * Math.exp(-.5 * ((nm - 446.8) / 19.44) ** 2));
  y += radiance * 1.014 * Math.exp(-.5 * ((Math.log(nm) - Math.log(556.3)) / .075) ** 2);
  z += radiance * 1.839 * Math.exp(-.5 * ((Math.log(nm) - Math.log(449.8)) / .051) ** 2);
 }
 const rgb = [3.2406 * x - 1.5372 * y - .4986 * z, -.9689 * x + 1.8758 * y + .0415 * z, .0557 * x - .204 * y + 1.057 * z];
 const peak = Math.max(...rgb);
 return rgb.map(channel => {
  const linear = Math.max(0, channel / peak);
  return Math.round(255 * (linear <= .0031308 ? 12.92 * linear : 1.055 * linear ** (1 / 2.4) - .055));
 }) as [number, number, number];
}

export type ObservationMode = 'visible' | 'infrared';
const neutralRGB: [number, number, number] = [178, 192, 212];
const srgb = (linear: number) => Math.round(255 * (linear <= .0031308 ? 12.92 * linear : 1.055 * linear ** (1 / 2.4) - .055));

export const STELLAR_TYPES = reference.map(type => {
 const rgb = type.kelvin === null ? neutralRGB : temperatureRGB(type.kelvin);
 const relativeLight = type.absoluteV === null ? null : 10 ** (-.4 * (type.absoluteV - 4.80));
 const exposure = relativeLight === null ? 0 : Math.log1p(relativeLight) / Math.log1p(10 ** (-.4 * (.99 - 4.80)));
 const infraredLight = type.absoluteJ === null ? null : 10 ** (-.4 * (type.absoluteJ - 3.60));
 // False color, not human vision or a simulated telescope: Vega-normalized
 // K/H/J band signals map to R/G/B. H is derived from the tabulated H-K.
 const infraredMagnitudes = type.absoluteK === null || type.hMinusK === null || type.absoluteJ === null ? null : [type.absoluteK, type.absoluteK + type.hMinusK, type.absoluteJ];
 const infraredRGB = infraredMagnitudes === null ? neutralRGB : infraredMagnitudes.map(magnitude => srgb(10 ** (-.4 * (magnitude - Math.min(...infraredMagnitudes))))) as [number, number, number];
 // A common log stretch, referenced to the faintest J entry (Y0V), not
 // separate boosts per class. Marker floors and pixels are UI choices.
 const faintestJ = 10 ** (-.4 * (20.15 - 3.60));
 const infraredExposure = infraredLight === null ? 0 : Math.log1p(infraredLight / faintestJ) / Math.log1p(10 ** (-.4 * (.95 - 3.60)) / faintestJ);
 return { ...type, fraction: type.count / REFERENCE_STAR_COUNT, rgb, tint: `rgb(${rgb.join(',')})`, relativeLight, exposure, radius: 2 + exposure * 3.2, infraredRGB, infraredLight, infraredExposure };
});
export type CelestialType = typeof STELLAR_TYPES[number];

export function stellarAppearance(type: CelestialType, mode: ObservationMode = 'visible') {
 const markerOnly = type.spectral === 'D' || (mode === 'visible' && ['L', 'T', 'Y'].includes(type.spectral));
 const rgb = markerOnly ? neutralRGB : mode === 'infrared' ? type.infraredRGB : type.rgb;
 const exposure = markerOnly ? 0 : mode === 'infrared' ? type.infraredExposure : type.exposure;
 return { rgb, tint: `rgb(${rgb.join(',')})`, exposure, radius: markerOnly ? 3 : 2 + exposure * 3.2, markerOnly };
}

export function stellarTypeAt(quantile: number): CelestialType {
 let cumulative = 0;
 for (const type of STELLAR_TYPES) { cumulative += type.fraction; if (quantile < cumulative) return type; }
 return STELLAR_TYPES[STELLAR_TYPES.length - 1];
}

// Largest-remainder quotas preserve the observed proportions to within one
// object. Technique rarity determines rank; ID only breaks equal-frequency ties.
export function assignStellarTypes(nodes: GalaxyNode[]): Map<string, CelestialType> {
 const unique = [...new Map(nodes.map(node => [node.puzzle_hash || node.id, node])).values()];
 const frequencies = new Map<string, number>();
 const technique = (node: GalaxyNode) => canonicalTechniqueName(nodePrimaryTechnique(node));
 for (const node of unique) frequencies.set(technique(node), (frequencies.get(technique(node)) ?? 0) + 1);
 const ranked = [...unique].sort((a, b) => (frequencies.get(technique(b))! - frequencies.get(technique(a))!) || (a.puzzle_hash || a.id).localeCompare(b.puzzle_hash || b.id));
 const quotas = STELLAR_TYPES.map((type, index) => ({ type, index, count: Math.floor(type.fraction * unique.length), remainder: type.fraction * unique.length % 1 }));
 const remaining = unique.length - quotas.reduce((sum, quota) => sum + quota.count, 0);
 [...quotas].sort((a, b) => b.remainder - a.remainder || a.index - b.index).slice(0, remaining).forEach(quota => quota.count++);
 const byPuzzle = new Map<string, CelestialType>();
 let cursor = 0;
 for (const quota of quotas) for (let i = 0; i < quota.count; i++) { const node = ranked[cursor++]; byPuzzle.set(node.puzzle_hash || node.id, quota.type); }
 return new Map(nodes.map(node => [node.id, byPuzzle.get(node.puzzle_hash || node.id)!]));
}

// An explicit key for the current catalog. Techniques can cross quota
// boundaries; show every assigned class rather than promise a 1:1 mapping.
export function techniqueStellarMapping(nodes: GalaxyNode[]) {
 const unique = [...new Map(nodes.map(node => [node.puzzle_hash || node.id, node])).values()];
 const assigned = assignStellarTypes(unique);
 const groups = new Map<string, GalaxyNode[]>();
 for (const node of unique) {
  const key = nodePrimaryTechnique(node);
  groups.set(key, [...(groups.get(key) ?? []), node]);
 }
 return [...groups].map(([technique, puzzles]) => ({
  technique, puzzles, count: puzzles.length,
  types: STELLAR_TYPES.map(type => ({ type, count: puzzles.filter(node => assigned.get(node.id)?.spectral === type.spectral).length })).filter(item => item.count)
 })).sort((a, b) => b.count - a.count || a.technique.localeCompare(b.technique));
}

export function techniqueLabel(technique: string): string {
 return technique.replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2').replace(/([a-z\d])([A-Z])/g, '$1 $2');
}
