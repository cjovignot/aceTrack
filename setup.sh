#!/bin/bash

find . -type f -name "*Zone.Identifier*" -delete

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(pwd)"

echo ""
echo "🚀 ENV Wizard from .env.local.example"
echo "──────────────────────────────"

# ───────────────────────────────
# PROJECT NAME
# ───────────────────────────────
printf "📁 Project name [your_project_name] : " > /dev/tty
read -r PROJECT_NAME < /dev/tty
PROJECT_NAME=${PROJECT_NAME:-acetrack}

ENV_FILE="$ROOT_DIR/.env.local"

rm -f "$ENV_FILE"
touch "$ENV_FILE"

# ───────────────────────────────
# TEMPLATE
# ───────────────────────────────
if [ -f "$SCRIPT_DIR/.env.local.example" ]; then
  TEMPLATE="$SCRIPT_DIR/.env.local.example"
else
  echo "❌ Missing .env.local.example" > /dev/tty
  exit 1
fi

echo ""
echo "📄 Template: $TEMPLATE" > /dev/tty

# ───────────────────────────────
# ASK FUNCTION
# ───────────────────────────────
ask_var() {
  local key="$1"
  local default="$2"
  local value

  echo "" > /dev/tty
  echo "──────────────────────────────" > /dev/tty
  echo "🔧 $key" > /dev/tty
  echo "Default: $default" > /dev/tty
  echo "──────────────────────────────" > /dev/tty

  printf "➡️ > " > /dev/tty
  read -r value < /dev/tty

  # keep default if empty
  echo "${value:-$default}"
}

# ───────────────────────────────
# LOOP TEMPLATE
# ───────────────────────────────
while IFS= read -r line || [[ -n "$line" ]]; do

  # keep CRLF clean
  line="${line//$'\r'/}"

  # ── COMMENTS → COPY DIRECT ──
  if [[ "$line" =~ ^[[:space:]]*# || -z "$line" ]]; then
    echo "$line" >> "$ENV_FILE"
    continue
  fi

  # ── PARSE KEY=VALUE ──
  key="${line%%=*}"
  default="${line#*=}"

  key="$(echo "$key" | xargs)"
  default="$(echo "$default" | xargs)"

  # ── USER INPUT ──
  value=$(ask_var "$key" "$default")

  # ── WRITE RESULT ──
  echo "$key=$value" >> "$ENV_FILE"

done < "$TEMPLATE"

# ───────────────────────────────
# END
# ───────────────────────────────
echo ""
echo "✅ .env.local generated successfully"
echo "📄 Path: $ENV_FILE" > /dev/tty

# ───────────────────────────────
# OPTIONAL INSTALLS
# ───────────────────────────────
printf "📦 Run npm install? (Y/n) : " > /dev/tty
read -r npm_install < /dev/tty

if [[ ! "$npm_install" =~ ^[Nn]$ ]]; then
  npm install
fi

printf "📡 Install Vercel CLI? (y/N) : " > /dev/tty
read -r vercel < /dev/tty

if [[ "$vercel" =~ ^[Yy]$ ]]; then
  npm i -g vercel
fi

# ───────────────────────────────
# NORMALIZE PROJECT NAME FOR PACKAGE.JSON
# ───────────────────────────────
PACKAGE_NAME=$(echo "$PROJECT_NAME" \
  | tr '[:upper:]' '[:lower:]' \
  | sed -E 's/[^a-z0-9]+/-/g' \
  | sed -E 's/-+/-/g' \
  | sed -E 's/^-+|-+$//g')


echo ""
echo "🔁 Updating name '$PROJECT_NAME' in all project files..."

# ───────────────────────────────
# REPLACE IN ALL FILES EXCEPT package.json
# ───────────────────────────────
# find "$ROOT_DIR" -type f \
#   ! -name "package.json" \
#   ! -name "setup.sh" \
#   -exec sed -i "s/aceTrack/$PROJECT_NAME/g" {} +
  
find "$ROOT_DIR" -type f ! -name "package.json" -exec sed -i "s/aceTrack/$PROJECT_NAME/g" {} +
find "$ROOT_DIR" -type f -name "setup.sh" -exec sed -i "s/aceTrack/$PROJECT_NAME/g" {} +

# ───────────────────────────────
# REPLACE IN package.json (special format)
# ───────────────────────────────
find "$ROOT_DIR" -type f -name "package.json" -exec sed -i "s/acetrack/$PACKAGE_NAME/g" {} +
find "$ROOT_DIR" -type f -name "setup.sh" -exec sed -i "s/acetrack/$PACKAGE_NAME/g" {} +
find "$ROOT_DIR" -type f -name "route.js" -exec sed -i "s/acetrack/$PACKAGE_NAME/g" {} +

echo "✅ Project updated"

echo ""
echo "🎉 DONE"
echo "📁 Project: $ROOT_DIR/$PROJECT_NAME"
echo "📄 Env: $ENV_FILE"

echo "npm run dev" > /dev/tty