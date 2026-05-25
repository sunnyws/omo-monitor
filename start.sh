#!/bin/bash
# omo-monitor startup script

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Run the monitor
cd "$SCRIPT_DIR"
npm run dev
