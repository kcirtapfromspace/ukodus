#!/usr/bin/env bash
set -euo pipefail

# Seed the Neo4j graph with technique reference data.
# This populates the "galaxy" -- the graph of all known Sudoku
# techniques, their SE ratings, dependencies, and relationships.
#
# Usage (Docker Compose):
#   docker compose exec analyzer ukodus-analyzer seed-techniques
#
# Usage (Kubernetes):
#   kubectl exec -n ukodus deploy/ukodus-api -- ukodus-analyzer seed-techniques

MODE="${1:-auto}"

case "$MODE" in
    docker)
        echo "Seeding techniques via Docker Compose..."
        docker compose exec analyzer ukodus-analyzer seed-techniques
        ;;
    k8s)
        echo "Seeding techniques via Kubernetes..."
        kubectl exec -n ukodus deploy/ukodus-api -- ukodus-analyzer seed-techniques
        ;;
    auto)
        if kubectl get namespace ukodus &>/dev/null 2>&1; then
            echo "Detected Kubernetes namespace 'ukodus'. Seeding via kubectl..."
            kubectl exec -n ukodus deploy/ukodus-api -- ukodus-analyzer seed-techniques
        elif docker compose ps --services 2>/dev/null | grep -q analyzer; then
            echo "Detected Docker Compose services. Seeding via docker compose..."
            docker compose exec analyzer ukodus-analyzer seed-techniques
        else
            echo "ERROR: No running environment detected."
            echo "Usage: $0 [docker|k8s|auto]"
            exit 1
        fi
        ;;
    *)
        echo "Usage: $0 [docker|k8s|auto]"
        exit 1
        ;;
esac

echo "Technique seeding complete."
