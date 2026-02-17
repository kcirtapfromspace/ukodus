#!/bin/sh
# Generate runtime config from environment variables
cat > /usr/share/nginx/html/runtime-config.js <<EOF
window.__RUNTIME_CONFIG__ = {
  POSTHOG_KEY: "${POSTHOG_KEY:-}",
  POSTHOG_HOST: "${POSTHOG_HOST:-}"
};
EOF

exec "$@"
