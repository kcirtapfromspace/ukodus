#!/usr/bin/env bash
set -euo pipefail

# Bootstrap local K8s cluster with Argo CD for Ukodus.
# Target server: 192.168.150.174
#
# Prerequisites:
#   - kubectl configured to reach the target cluster
#   - Argo CD installed in the cluster (argocd namespace)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TARGET_SERVER="${TARGET_SERVER:-192.168.150.174}"

echo "=== Ukodus Local K8s Setup ==="
echo "Target: $TARGET_SERVER"
echo ""

# 1. Verify kubectl context
echo "[1/5] Verifying kubectl context..."
CURRENT_CONTEXT="$(kubectl config current-context)"
echo "  Current context: $CURRENT_CONTEXT"

if ! kubectl cluster-info &>/dev/null; then
    echo "ERROR: Cannot connect to Kubernetes cluster."
    echo "Verify your kubeconfig and that the cluster at $TARGET_SERVER is reachable."
    exit 1
fi
echo "  Cluster is reachable."

# 2. Ensure Argo CD namespace exists
echo "[2/5] Checking Argo CD installation..."
if ! kubectl get namespace argocd &>/dev/null; then
    echo "  Argo CD namespace not found. Installing Argo CD..."
    kubectl create namespace argocd
    kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
    echo "  Waiting for Argo CD to be ready..."
    kubectl wait --for=condition=available --timeout=300s \
        deployment/argocd-server -n argocd
else
    echo "  Argo CD is installed."
fi

# 3. Apply the Argo CD Application manifest
echo "[3/5] Applying Argo CD application..."
kubectl apply -f "$PROJECT_ROOT/argocd/application.yaml"

# 4. Wait for Argo CD to sync
echo "[4/5] Waiting for Argo CD sync..."
echo "  This may take a few minutes on first deploy..."

MAX_WAIT=180
ELAPSED=0
while [ $ELAPSED -lt $MAX_WAIT ]; do
    HEALTH=$(kubectl get application ukodus -n argocd -o jsonpath='{.status.health.status}' 2>/dev/null || echo "Unknown")
    SYNC=$(kubectl get application ukodus -n argocd -o jsonpath='{.status.sync.status}' 2>/dev/null || echo "Unknown")
    echo "  Health: $HEALTH | Sync: $SYNC ($ELAPSED/${MAX_WAIT}s)"

    if [ "$HEALTH" = "Healthy" ] && [ "$SYNC" = "Synced" ]; then
        echo "  Argo CD sync complete."
        break
    fi

    sleep 10
    ELAPSED=$((ELAPSED + 10))
done

if [ $ELAPSED -ge $MAX_WAIT ]; then
    echo "WARNING: Timed out waiting for sync. Check Argo CD dashboard."
fi

# 5. Seed technique data
echo "[5/5] Seeding technique graph data..."
echo "  Waiting for API deployment to be ready..."
kubectl wait --for=condition=available --timeout=120s \
    deployment/ukodus-api -n ukodus 2>/dev/null || true

"$SCRIPT_DIR/seed-galaxy.sh" k8s || echo "  Seeding skipped (API may not be ready yet). Run scripts/seed-galaxy.sh later."

echo ""
echo "=== Setup Complete ==="
echo "Argo CD dashboard: https://$TARGET_SERVER (port-forward argocd-server if needed)"
echo "Ukodus: http://ukodus.local (ensure DNS or /etc/hosts points to $TARGET_SERVER)"
