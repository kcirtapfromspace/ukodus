# Galaxy API: Data Requirements for Frontend Visualization

## Current State

The galaxy frontend visualization depends on two key data fields from `GET /api/v1/galaxy/overview` that are currently always empty:

- **`techniques: []`** — empty for all 6 nodes
- **`edges: []`** — no relationships returned

### Root Cause: Relationship Name Mismatch

The analyzer and API use different Neo4j relationship names:

| What | Analyzer Creates | API Queries For |
|------|-----------------|-----------------|
| Technique links | `REQUIRES_TECHNIQUE` | `USES_TECHNIQUE` |
| Similarity edges | `SHARES_TECHNIQUE_PROFILE` | `SIMILAR_TO` |

**Fix:** Either rename the relationships in the analyzer to match the API, or update the API's Cypher queries to use the analyzer's names. The simplest fix is updating `queries.rs`:

```
// queries.rs — current (broken):
MATCH (p)-[:USES_TECHNIQUE]->(t:Technique)

// should be:
MATCH (p)-[:REQUIRES_TECHNIQUE]->(t:Technique)
```

```
// queries.rs — current (broken):
MATCH (a:Puzzle)-[s:SIMILAR_TO]->(b:Puzzle)

// should be:
MATCH (a:Puzzle)-[s:SHARES_TECHNIQUE_PROFILE]-(b:Puzzle)
```

The same mismatch exists in:
- `get_galaxy_overview()` — lines ~190-230 in queries.rs
- `get_galaxy_neighbors()` — line ~276 in queries.rs
- `get_puzzles_by_technique()` — lines ~396-421 in queries.rs
- Any other query referencing `USES_TECHNIQUE` or `SIMILAR_TO`

### Secondary Issue: Analyzer May Not Be Running

Even after fixing the relationship names, puzzles submitted before the analyzer ran (or if the CronJob hasn't triggered) will have `needs_analysis = true` and no technique data. Verify:

```bash
# Check if analyzer CronJob is running
kubectl -n ukodus get cronjob

# Check recent analyzer job runs
kubectl -n ukodus get jobs --sort-by=.metadata.creationTimestamp

# Check for unanalyzed puzzles in Neo4j
# (via cypher console or API debug endpoint)
MATCH (p:Puzzle {needs_analysis: true}) RETURN count(p)
```

---

## What the Frontend Needs and Why

### 1. `techniques: string[]` — Populated per node

**Used for:**
- **Family classification** — `nodePrimaryFamily(node)` takes the last (hardest) technique in the array and maps it to one of 10 families (Singles, Pairs & Triples, Intersections, Fish, Wings, Chains, Rectangles, ALS, Forcing, Other)
- **Technique filter sidebar** — counts nodes per family, enables checkbox filtering
- **Hull clustering** — D3 draws convex hulls around nodes sharing a family, giving the galaxy visible structure
- **Tooltip detail** — planned for showing technique breakdown on hover

**Current behavior when empty:** All nodes default to "singles" family. The sidebar shows "Singles: 6" and all other families at 0. No meaningful clustering.

**Expected format:** Array of technique names ordered by difficulty (easiest → hardest), matching the keys in `TECHNIQUE_FAMILIES`:
```json
["HiddenSingle", "NakedSingle", "NakedPair", "PointingPair", "XWing"]
```

The last element is treated as the "hardest" technique and determines family assignment.

### 2. `edges: GalaxyEdge[]` — Relationships between nodes

**Used for:**
- **Force-directed graph links** — D3's `forceLink` uses edges to pull related nodes together, creating the galaxy structure. Without edges, nodes just repel each other randomly.
- **Visual connections** — edges are drawn as lines between nodes, with opacity proportional to `similarity`
- **Neighbor exploration** — clicking a node should highlight connected puzzles

**Current behavior when empty:** Nodes float freely with only charge repulsion. No visible structure, no connections, no clustering by technique similarity.

**Expected format:**
```json
{
  "source": "puzzle_hash_a",
  "target": "puzzle_hash_b",
  "similarity": 0.73
}
```

`similarity` should be 0.0–1.0 (Jaccard similarity of technique sets). The analyzer already computes this with a 0.5 threshold.

### 3. `max_technique: string | null` — Fallback for family classification

**Currently:** 5 of 6 nodes have `null`. Only 1 has `"Naked Single"`.

**Used for:** Frontend fallback when `techniques[]` is empty — we now use `max_technique` to determine family. This field is set via the `MAX_TECHNIQUE` relationship the analyzer creates.

**Expected:** Should always be set after analysis. Matches a technique name key.

### 4. `se_rating: number` — Puzzle difficulty rating

**Currently:** 2 nodes have `0.0` (missing), others have real values (2.3, 11.0).

**Used for:** Frontend fallback clustering when technique data is unavailable. Also displayed in tooltip. Nodes with `0.0` are treated as "unrated."

**Expected:** Should be set after analysis. The SE (Sudoku Explainer) rating from the hardest technique required. Range is typically 1.0–12.0.

---

## Recommended API Changes (Priority Order)

### P0: Fix relationship name mismatch in queries.rs
Rename `USES_TECHNIQUE` → `REQUIRES_TECHNIQUE` and `SIMILAR_TO` → `SHARES_TECHNIQUE_PROFILE` in all Cypher queries. This alone should fix both `techniques[]` and `edges[]` for analyzed puzzles.

### P1: Verify analyzer CronJob is running
Check that the analyzer CronJob fires every 15 minutes and successfully processes puzzles. After P0 fix, re-analyze existing puzzles or clear `needs_analysis` flags.

### P2: Backfill existing puzzles
Run the analyzer manually for the 6 existing puzzles:
```bash
kubectl -n ukodus create job --from=cronjob/ukodus-analyzer analyzer-backfill
```

### P3: Return `total_techniques` and `avg_solve_time` in stats
The `GalaxyStats` model has these fields but they may not be populated. The stats sidebar uses them.

---

## Frontend Resilience (Already Implemented)

While the API issues are fixed, the frontend now:
1. Falls back to `max_technique` for family classification when `techniques[]` is empty
2. Falls back to `difficulty` tier when both are missing
3. Generates client-side edges based on shared difficulty and SE rating proximity
4. Colors nodes by difficulty tier (always available) rather than technique family
