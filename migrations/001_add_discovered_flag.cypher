// Migration: Add discovered flag to existing puzzles
// Run once via Neo4j Browser before deploying the mining feature.
//
// All existing puzzles were already publicly available, so mark them discovered.
// Also set mined=false since they were created organically (not via mining).

MATCH (p:Puzzle)
WHERE p.discovered IS NULL
SET p.discovered = true, p.mined = false;
