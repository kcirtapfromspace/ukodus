import { expect, it } from 'vitest';
import { STELLAR_TYPES, REFERENCE_STAR_COUNT, assignStellarTypes, temperatureRGB, stellarAppearance, techniqueStellarMapping } from '../src/lib/galaxy/celestial';
import type { GalaxyNode } from '../src/lib/api/types';
const node = (id: string, technique = 'NakedSingle'): GalaxyNode => ({id, puzzle_hash:id, techniques:[technique], play_count:0, difficulty:'Easy', se_rating:1});

it('uses the documented conditional census and exactly reproduces its counts at the reference size', () => {
 expect(REFERENCE_STAR_COUNT).toBe(422);
 expect(STELLAR_TYPES.reduce((sum, type) => sum + type.fraction, 0)).toBeCloseTo(1);
 const assigned = [...assignStellarTypes(Array.from({length:422}, (_, i) => node(String(i)))).values()];
 expect(STELLAR_TYPES.map(type => assigned.filter(item => item.spectral === type.spectral).length)).toEqual([249,45,38,21,20,19,18,8,4]);
});
it('rounds small atlases honestly and never counts duplicated puzzles or plays as additional stars', () => {
 for (const size of [0,1,2,42,53,100,318]) {
  const nodes = Array.from({length:size}, (_, i) => node(String(i)));
  const assigned = assignStellarTypes(nodes);
  expect(assigned.size).toBe(size);
  for (const type of STELLAR_TYPES) expect(Math.abs([...assigned.values()].filter(item => item.spectral === type.spectral).length - size * type.fraction)).toBeLessThan(1);
  if (size) {
   const duplicate = {...nodes[0], id:'duplicate', play_count:100000};
   const updated = assignStellarTypes([...nodes, duplicate]);
   expect(updated.get('duplicate')).toEqual(updated.get(nodes[0].id));
   for (const original of nodes) expect(updated.get(original.id)).toEqual(assigned.get(original.id));
  }
 }
});
it('maps rare techniques toward rarer classes consistently across order and technique aliases', () => {
 const nodes = Array.from({length:100}, (_, i) => node(String(i).padStart(3,'0'), i === 99 ? 'XWing' : 'Naked Single'));
 const assigned = assignStellarTypes(nodes);
 expect(assigned.get('099')?.spectral).toBe('A');
 expect(assignStellarTypes([...nodes].reverse())).toEqual(assigned);
 expect(assignStellarTypes(nodes.map(n => ({...n, techniques:n.techniques?.map(t => t === 'Naked Single' ? 'NakedSingle' : t), play_count:9999})))).toEqual(assigned);
});
it('derives ordered display intensity from V magnitudes and chromaticity from temperature', () => {
 expect(STELLAR_TYPES.find(type => type.spectral === 'G')?.relativeLight).toBe(1);
 expect(STELLAR_TYPES[0].relativeLight).toBeCloseTo(10 ** (-.4 * (11.15 - 4.80)));
 for (const type of STELLAR_TYPES) {
  expect(type.rgb.every(channel => Number.isFinite(channel) && channel >= 0 && channel <= 255)).toBe(true);
  expect(type.radius).toBeGreaterThanOrEqual(2);
 }
 const cool = temperatureRGB(3430), hot = temperatureRGB(9700);
 expect(cool[0]).toBeGreaterThan(cool[2]);
 expect(hot[2]).toBeGreaterThan(hot[0]);
});

it('uses measured infrared bands without inventing missing white-dwarf measurements', () => {
 const white = STELLAR_TYPES.find(type => type.spectral === 'D')!;
 expect(white.kelvin).toBeNull(); expect(white.relativeLight).toBeNull(); expect(white.infraredLight).toBeNull();
 for (const mode of ['visible', 'infrared'] as const) expect(stellarAppearance(white, mode).markerOnly).toBe(true);
 for (const spectral of ['L', 'T', 'Y']) {
  const type = STELLAR_TYPES.find(item => item.spectral === spectral)!;
  expect(stellarAppearance(type, 'visible').markerOnly).toBe(true);
  expect(stellarAppearance(type, 'infrared').markerOnly).toBe(false);
  expect(type.infraredLight).toBeCloseTo(10 ** (-.4 * (type.absoluteJ! - 3.60)), 12);
  expect(type.infraredRGB.every(channel => Number.isFinite(channel) && channel >= 0 && channel <= 255)).toBe(true);
 }
 const l = STELLAR_TYPES.find(type => type.spectral === 'L')!;
 const y = STELLAR_TYPES.find(type => type.spectral === 'Y')!;
 expect(l.infraredRGB[0]).toBeGreaterThan(l.infraredRGB[2]);
 expect(y.infraredRGB[2]).toBeGreaterThan(y.infraredRGB[0]);
 expect(l.infraredExposure).toBeGreaterThan(y.infraredExposure);
});
it('shows every actual technique-to-class assignment and deduplicates the key', () => {
 const nodes = Array.from({length:53}, (_,i) => node(String(i), i % 3 ? 'NakedSingle' : 'XWing'));
 const mapping = techniqueStellarMapping([...nodes, {...nodes[0], id:'duplicate'}]);
 expect(mapping.reduce((sum, row) => sum + row.count, 0)).toBe(53);
 const assigned = assignStellarTypes(nodes);
 for (const row of mapping) {
  expect(row.types.reduce((sum, entry) => sum + entry.count, 0)).toBe(row.count);
  for (const entry of row.types) expect(entry.count).toBe(row.puzzles.filter(puzzle => assigned.get(puzzle.id)?.spectral === entry.type.spectral || puzzle.id === 'duplicate' && assigned.get(puzzle.puzzle_hash!)?.spectral === entry.type.spectral).length);
 }
});
