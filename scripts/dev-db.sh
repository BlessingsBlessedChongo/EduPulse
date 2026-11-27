#!/usr/bin/env bash
# A private PostgreSQL for working on EduPulse, kept in .devdb inside the project.
#
#   scripts/dev-db.sh start   create it if needed, then start it on port 54329
#   scripts/dev-db.sh stop    stop it
#   scripts/dev-db.sh reset   throw the data away and start empty
#
# It uses the PostgreSQL programs already installed on the machine but its own
# data folder and port, so it never touches any other database you run.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DATA="$ROOT/.devdb"
PORT="${EDUPULSE_DB_PORT:-54329}"

BIN=""
for candidate in "/c/Program Files/PostgreSQL"/*/bin /usr/lib/postgresql/*/bin /opt/homebrew/opt/postgresql*/bin /usr/local/opt/postgresql*/bin; do
  if [ -x "$candidate/pg_ctl" ] || [ -x "$candidate/pg_ctl.exe" ]; then BIN="$candidate"; fi
done
if [ -z "$BIN" ] && command -v pg_ctl >/dev/null 2>&1; then BIN="$(dirname "$(command -v pg_ctl)")"; fi
if [ -z "$BIN" ]; then echo "PostgreSQL was not found. Install it, or set EDUPULSE_DB to a database you already have."; exit 1; fi

running() { "$BIN/pg_ctl" -D "$DATA" status >/dev/null 2>&1; }

case "${1:-start}" in
  start)
    if [ ! -d "$DATA" ]; then
      "$BIN/initdb" -D "$DATA" -U edupulse -A trust -E UTF8 --locale=C >/dev/null
      echo "Created a new database folder at .devdb"
    fi
    if ! running; then
      "$BIN/pg_ctl" -D "$DATA" -o "-p $PORT -c listen_addresses=localhost" -l "$DATA/server.log" -w start </dev/null >/dev/null 2>&1
    fi
    for name in edupulse edupulse_test; do
      "$BIN/psql" -p "$PORT" -U edupulse -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$name'" | grep -q 1 \
        || "$BIN/createdb" -p "$PORT" -U edupulse "$name"
    done
    echo "Database ready on port $PORT"
    ;;
  stop)
    if running; then "$BIN/pg_ctl" -D "$DATA" -m fast -w stop >/dev/null; fi
    echo "Database stopped"
    ;;
  reset)
    if running; then "$BIN/pg_ctl" -D "$DATA" -m fast -w stop >/dev/null; fi
    rm -rf "$DATA"
    exec "$0" start
    ;;
  *)
    echo "Use: scripts/dev-db.sh start | stop | reset"; exit 1 ;;
esac
