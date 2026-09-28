import type { GalaxyEdge, GalaxyNode } from '$lib/api/types';
import { canonicalTechniqueName, nodePrimaryFamily, TECHNIQUE_FAMILIES } from '$lib/stores/galaxy.svelte';
import { assignStellarTypes, type CelestialType } from './celestial';

export interface Star extends GalaxyNode { x: number; y: number; family: string; radius: number; celestial: CelestialType }
export interface ConstellationLink { id: string; source: Star; target: Star; similarity: number; kind: 'catalog' | 'technique' }
export interface Constellation { key: string; label: string; stars: Star[]; x: number; y: number; description: string }

export const FAMILY_STORIES: Record<string, string> = {
 singles: 'One possibility. One clear next step. This is where the journey begins.',
 pairs_triples: 'Small groups of candidates, revealing something greater together.',
 intersections: 'Discover what happens where rows, columns, and boxes meet.',
 fish: 'Follow patterns across the grid, from X-Wings to distant, deeper waters.',
 wings: 'A few connected cells can change the shape of an entire puzzle.',
 rectangles: 'Find the hidden geometry that makes a solution unique.',
 chains: 'Trace a thread of logic from one possibility to the next.',
 als: 'Almost locked sets open the door to unexpected deductions.',
 forcing: 'Explore the far reaches of conditional reasoning.',
 other: 'Unusual techniques at the edges of the familiar sky.'
};

// Deliberate atlas regions keep a family's identity stable across filtering,
// camera moves, and visits. These are puzzle constellations, not astronomical coordinates.
const regions: Record<string, [number, number, number, number]> = {
 singles: [560, 280, 340, 290], pairs_triples: [245, 390, 205, 220],
 intersections: [230, 150, 185, 170], fish: [940, 195, 210, 200],
 wings: [1040, 485, 160, 165], rectangles: [655, 610, 235, 155],
 chains: [1300, 270, 195, 170], als: [1280, 600, 160, 160],
 forcing: [305, 775, 195, 165], other: [970, 815, 165, 140]
};

export function stableRandom(value: string): number {
 let h = 2166136261;
 for (let i = 0; i < value.length; i++) h = Math.imul(h ^ value.charCodeAt(i), 16777619);
 h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13;
 return (h >>> 0) / 4294967296;
}

export function buildConstellations(nodes: GalaxyNode[], edges: GalaxyEdge[]) {
 const assignments = assignStellarTypes(nodes);
 const stars: Star[] = nodes.map((node) => {
  const family = nodePrimaryFamily(node);
  const [cx, cy, w, h] = regions[family] ?? regions.other;
  return { ...node, family, celestial: assignments.get(node.id)!,
   x: cx + (stableRandom(`${node.id}:x`) - .5) * w,
   y: cy + (stableRandom(`${node.id}:y`) - .5) * h,
   radius: assignments.get(node.id)!.radius
  };
 });
 const byId = new Map(stars.map((star) => [star.id, star]));
 const links: ConstellationLink[] = [];
 const seen = new Set<string>();
 const add = (source: Star, target: Star, similarity: number, kind: ConstellationLink['kind']) => {
  if (source.id === target.id) return;
  const id = [source.id, target.id].sort().join(':');
  if (!seen.has(id)) { seen.add(id); links.push({ id, source, target, similarity, kind }); }
 };
 // Retain the catalog's real connections; never invent similarity scores.
 for (const edge of edges) {
  const source = byId.get(typeof edge.source === 'string' ? edge.source : edge.source.id);
  const target = byId.get(typeof edge.target === 'string' ? edge.target : edge.target.id);
  if (source && target) add(source, target, edge.similarity, 'catalog');
 }
 const constellations: Constellation[] = [];
 for (const [key, family] of Object.entries(TECHNIQUE_FAMILIES)) {
  const members = stars.filter((star) => star.family === key).sort((a, b) => a.id.localeCompare(b.id));
  if (!members.length) continue;
  // A sparse spanning forest makes the shared-technique relationships legible.
  // Join only pairs with a real, named technique in common. Missing metadata
  // leaves an isolated star rather than asserting an unverified relationship.
  const techniques = new Map(members.map((star) => [star.id, new Set((star.techniques ?? []).map(canonicalTechniqueName))]));
  const connected = new Set<string>();
  const nearest = new Map<string, { source: Star; distance: number }>();
  let current = members[0];
  while (connected.size < members.length) {
   connected.add(current.id); nearest.delete(current.id);
   for (const target of members) {
    if (connected.has(target.id)) continue;
    if (![...techniques.get(current.id)!].some((technique) => techniques.get(target.id)!.has(technique))) continue;
    const distance = Math.hypot(target.x - current.x, target.y - current.y);
    if (distance < (nearest.get(target.id)?.distance ?? Infinity)) nearest.set(target.id, { source: current, distance });
   }
   let best: Star | undefined;
   let bestDistance = Infinity;
   for (const target of members) {
    const distance = nearest.get(target.id)?.distance ?? Infinity;
    if (distance < bestDistance) { best = target; bestDistance = distance; }
   }
   if (best) { add(nearest.get(best.id)!.source, best, 0, 'technique'); current = best; }
   else { const next = members.find(star => !connected.has(star.id)); if (!next) break; current = next; }
  }
  const [x, y, , height] = regions[key] ?? regions.other;
  constellations.push({ key, label: family.label, stars: members, x, y: y + height / 2 + 30, description: FAMILY_STORIES[key] });
 }
 return { stars, links, constellations };
}
