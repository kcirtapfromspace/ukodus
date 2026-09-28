import { expect, it } from 'vitest';
import { buildConstellations } from '../src/lib/galaxy/constellations';
import type { GalaxyNode } from '../src/lib/api/types';
const node = (id: string, techniques = ['NakedSingle']): GalaxyNode => ({ id, puzzle_hash: id, difficulty: 'Easy', play_count: 2, se_rating: 2.3, techniques });

it('keeps star coordinates stable when the order changes or the sky grows', () => {
 const first = buildConstellations([node('one'), node('two')], []);
 const next = buildConstellations([node('three'), node('two'), node('one')], []);
 for (const star of first.stars) expect(next.stars.find(item => item.id === star.id)).toMatchObject({ x: star.x, y: star.y, family: star.family });
});
it('creates sparse connections only for named techniques in common', () => {
 const nodes = Array.from({length: 30}, (_, i) => node(String(i)));
 const { links } = buildConstellations(nodes, []);
 expect(links).toHaveLength(29);
 expect(links.every(link => link.kind === 'technique' && link.source.id !== link.target.id)).toBe(true);
 expect(new Set(links.flatMap(link => [link.source.id, link.target.id])).size).toBe(30);
 const sparse = buildConstellations([node('one'), node('two', ['Hidden Single']), node('missing', [])], []);
 expect(sparse.links).toHaveLength(0);
});
it('normalizes technique aliases and preserves catalog connections without mutating input', () => {
 const nodes = [node('one', ['Naked Single']), node('two'), node('three', ['XWing'])];
 const edges = [{source:'one', target:'three', similarity:.7}, {source:'one', target:'missing', similarity:1}];
 const {links} = buildConstellations(nodes, edges);
 expect(links).toHaveLength(2);
 expect(links.find(link => link.kind === 'catalog')).toMatchObject({similarity:.7, source:{id:'one'},target:{id:'three'}});
 expect(links.find(link => link.kind === 'technique')).toMatchObject({source:{id:'one'},target:{id:'two'}});
 expect(nodes[0].x).toBeUndefined();
 expect(edges[0].source).toBe('one');
});
it('handles empty skies, unknown techniques and malformed catalog edges', () => {
 expect(buildConstellations([],[])).toEqual({ stars:[], links:[], constellations:[] });
 const { stars, links } = buildConstellations([node('x',['Uncatalogued'])], [{source:'x',target:'x',similarity:1}]);
 expect(stars[0].x).toBeTypeOf('number'); expect(stars[0].radius).toBeGreaterThan(0); expect(links).toHaveLength(0);
});
