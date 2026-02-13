# Ukodus

A Sudoku puzzle universe -- play puzzles in the browser via WASM, explore the
technique galaxy as a force-directed graph, and let the analyzer map every
puzzle's solving path through a Neo4j knowledge graph.

```
                         +------------------+
                         |   ukodus.local   |
                         |  nginx ingress   |
                         +--------+---------+
                                  |
                 +----------------+----------------+
                 |                |                 |
          /api, /s           /galaxy             /play
                 |                |                 |
        +--------v--------+  +---v----+    +-------v-------+
        |   ukodus-api    |  |  CDN / |    |   Frontend    |
        |  (Axum, Rust)   |  | Static |    | (WASM solver) |
        |  port 3000      |  +---+----+    +-------+-------+
        +---+--------+----+      |                 |
            |        |           |          +------v------+
            |        |           +----------| sudoku-wasm |
            |        |                      +-------------+
       +----v---+ +--v--------+
       | Redis  | |   Neo4j   |
       | :6379  | |:7474/:7687|
       +--------+ +-----------+
                        ^
                        |
              +---------+---------+
              | ukodus-analyzer   |
              | (CronJob, 15min) |
              +-------------------+
```

## Prerequisites

- **Rust** 1.75+ with `wasm32-unknown-unknown` target
- **wasm-pack** (`cargo install wasm-pack`)
- **Docker** and **Docker Compose** v2
- **kubectl** (for Kubernetes deployment)
- **Argo CD** (optional, for GitOps)

## Quick Start (Docker Compose)

```bash
# Build WASM assets from the upstream sudoku solver
./scripts/build-wasm.sh

# Start all services
docker compose up --build -d

# Seed the technique graph
./scripts/seed-galaxy.sh docker

# Open in browser
open http://localhost:8080
```

## Kubernetes Deployment

### Manual

```bash
# Apply all manifests via Kustomize
kubectl apply -k k8s/

# Wait for pods
kubectl get pods -n ukodus -w

# Seed techniques
./scripts/seed-galaxy.sh k8s
```

### GitOps with Argo CD

```bash
# One-time: apply the Argo CD application
kubectl apply -f argocd/application.yaml

# Or use the full bootstrap script
./scripts/setup-local.sh
```

Argo CD watches the `k8s/` directory on `main` and auto-syncs changes.

### DNS Setup

Add to `/etc/hosts` (replace with your cluster IP):

```
192.168.150.174  ukodus.local
```

## Development

### Project Structure

```
ukodus/
  crates/
    sudoku-core/      # Solver, generator, techniques (synced from upstream)
    ukodus-api/       # Axum REST + WebSocket API
    ukodus-analyzer/  # Batch puzzle analysis worker
  frontend/
    index.html        # Landing page
    play/             # WASM puzzle player
    galaxy/           # D3 technique galaxy visualization
    wasm/             # Built WASM artifacts
  k8s/                # Kubernetes manifests (Kustomize)
  argocd/             # Argo CD GitOps config
  scripts/            # Build and deployment utilities
```

### Syncing sudoku-core

The `sudoku-core` crate is pulled from the upstream repo via `git subtree`:

```bash
./scripts/sync-core.sh
```

### Building

```bash
# Build all Rust crates
cargo build --workspace

# Build WASM
./scripts/build-wasm.sh

# Run tests
cargo test --workspace
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/healthz` | Liveness probe |
| `GET` | `/readyz` | Readiness probe |
| `GET` | `/api/v1/puzzles` | List puzzles |
| `POST` | `/api/v1/puzzles` | Generate a new puzzle |
| `GET` | `/api/v1/puzzles/:id` | Get puzzle by ID |
| `POST` | `/api/v1/puzzles/:id/results` | Submit solve result |
| `GET` | `/api/v1/techniques` | List all techniques |
| `GET` | `/api/v1/galaxy` | Galaxy graph data (nodes + edges) |
| `GET` | `/api/v1/galaxy/stats` | Galaxy statistics |
| `GET` | `/s/:code` | Resolve shared puzzle short code |
| `WS` | `/api/v1/ws/play` | Real-time game session |

## Graph Data Model

The Neo4j knowledge graph captures the relationships between puzzles,
techniques, and solving paths:

```
(:Puzzle {code, difficulty, se_rating, clue_count})
    -[:REQUIRES]-> (:Technique {name, se_rating, tier, category})
    -[:SOLVED_BY]-> (:SolvePath {steps, duration_ms})

(:Technique)
    -[:DEPENDS_ON]-> (:Technique)
    -[:SAME_TIER]-> (:Technique)

(:SolvePath)
    -[:USES {step_number, eliminations}]-> (:Technique)
```

**Nodes:**
- **Puzzle** -- a generated Sudoku with its difficulty metadata
- **Technique** -- one of the 45 solving techniques (naked single through forcing chains)
- **SolvePath** -- a recorded sequence of technique applications

**Relationships:**
- `REQUIRES` -- puzzle requires this technique to solve (no simpler path exists)
- `DEPENDS_ON` -- technique A is a prerequisite for technique B
- `USES` -- a solve path used this technique at a given step

## License

MIT
