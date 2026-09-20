#!/bin/zsh
set -e

project_dir="/Users/daddy/Documents/ChatGPT/Nick"
port="3000"

if ! command -v node >/dev/null 2>&1; then
  osascript -e 'display alert "For Nick needs Node.js" message "Install Node.js 20 or later, then launch For Nick again."'
  exit 1
fi

if ! lsof -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
  cd "$project_dir"
  nohup npm run dev > /tmp/for-nick.log 2>&1 &
  for attempt in {1..20}; do
    curl -fsS "http://localhost:$port" >/dev/null 2>&1 && break
    sleep 0.25
  done
fi

open "http://localhost:$port"
