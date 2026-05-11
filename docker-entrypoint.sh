#!/bin/sh
set -e

CONFIG_FILE="/usr/share/nginx/html/config.js"

write_config() {
  cat > "$CONFIG_FILE" <<EOF
window.__COVERTONE_CONFIG__ = {
EOF

  if [ -n "$COVERTONE_SERVER" ]; then
    echo '  server: "'"$COVERTONE_SERVER"'",' >> "$CONFIG_FILE"
  fi
  if [ -n "$COVERTONE_USERNAME" ]; then
    echo '  username: "'"$COVERTONE_USERNAME"'",' >> "$CONFIG_FILE"
  fi
  if [ -n "$COVERTONE_PASSWORD" ]; then
    echo '  password: "'"$COVERTONE_PASSWORD"'",' >> "$CONFIG_FILE"
  fi
  if [ -n "$COVERTONE_AI_ENDPOINT" ]; then
    echo '  aiEndpoint: "'"$COVERTONE_AI_ENDPOINT"'",' >> "$CONFIG_FILE"
  fi
  if [ -n "$COVERTONE_AI_KEY" ]; then
    echo '  aiKey: "'"$COVERTONE_AI_KEY"'",' >> "$CONFIG_FILE"
  fi
  if [ -n "$COVERTONE_AI_MODEL" ]; then
    echo '  aiModel: "'"$COVERTONE_AI_MODEL"'",' >> "$CONFIG_FILE"
  fi

  echo '};' >> "$CONFIG_FILE"
}

if [ -n "$COVERTONE_SERVER" ] || [ -n "$COVERTONE_USERNAME" ] || [ -n "$COVERTONE_PASSWORD" ] || \
   [ -n "$COVERTONE_AI_ENDPOINT" ] || [ -n "$COVERTONE_AI_KEY" ] || [ -n "$COVERTONE_AI_MODEL" ]; then
  write_config
fi

exec "$@"
