#!/bin/bash

# Test webhook with location update
curl -X POST http://localhost:8787/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "tracker_id": "simulated-tracker-1",
    "latitude": 13.0827,
    "longitude": 80.2707,
    "speed_kmh": 65,
    "timestamp": "'$(date -u +'%Y-%m-%dT%H:%M:%SZ')'",
    "battery_level": 85,
    "satellites": 12,
    "fix_quality": 2
  }' 2>/dev/null

sleep 2
