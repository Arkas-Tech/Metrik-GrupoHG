#!/bin/bash
cd /home/sgpme/app/backend
exec ./venv/bin/python -m uvicorn main:app --host 127.0.0.1 --port 8080
