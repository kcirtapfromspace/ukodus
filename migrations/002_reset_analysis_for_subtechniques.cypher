// Migration: Reset analysis state for sub-technique re-analysis
// Run once via cypher-shell before running ukodus-analyzer analyze-batch.
//
// The old 18-technique solver only created REQUIRES_TECHNIQUE edges for broad
// techniques (e.g. XWing). The new sudoku-core v0.1.0 engine implements all 45
// techniques including sub-techniques (FinnedXWing, FrankenFish, MutantFish, etc.).
// This migration clears stale analysis edges and marks all puzzles for re-analysis.

// Delete stale analysis edges
MATCH ()-[r:REQUIRES_TECHNIQUE]->() DELETE r;
MATCH ()-[r:MAX_TECHNIQUE]->() DELETE r;
MATCH ()-[r:IN_TIER]->() DELETE r;
MATCH ()-[r:SHARES_TECHNIQUE_PROFILE]->() DELETE r;

// Mark all puzzles for re-analysis
MATCH (p:Puzzle)
SET p.needs_analysis = true, p.analysis_error = false;
