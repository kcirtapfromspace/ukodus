#!/bin/sh
# Generate runtime config from environment variables
CONFIG=/usr/share/nginx/html/runtime-config.js

cat > "$CONFIG" <<EOF
window.__RUNTIME_CONFIG__ = {
  POSTHOG_KEY: "${POSTHOG_KEY:-}",
  POSTHOG_HOST: "${POSTHOG_HOST:-}",
  MINING_API_KEY: "${MINING_API_KEY:-}"
};
EOF

# Remove stale pre-compressed copies so nginx gzip_static serves the fresh file
rm -f "${CONFIG}.gz" "${CONFIG}.br"

exec "$@"
