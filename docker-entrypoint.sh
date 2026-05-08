#!/bin/sh
set -e

if [ -n "$COVERTONE_SERVER" ] || [ -n "$COVERTONE_USERNAME" ] || [ -n "$COVERTONE_PASSWORD" ]; then
  cat > /usr/share/nginx/html/config.js <<EOF
window.__COVERTONE_CONFIG__ = {
  server: "${COVERTONE_SERVER}",
  username: "${COVERTONE_USERNAME}",
  password: "${COVERTONE_PASSWORD}"
};
EOF
fi

exec "$@"
