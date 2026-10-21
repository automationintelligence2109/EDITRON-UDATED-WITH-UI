#!/bin/bash
cd "$(dirname "$0")"
export OMP_NUM_THREADS=1
export PYTHONUNBUFFERED=1
exec python3 -u app.py
