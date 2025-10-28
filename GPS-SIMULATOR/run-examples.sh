#!/bin/bash

# GPS Multi-Device Simulator - Example Scripts
# This script provides common usage examples

set -e

WEBHOOK_URL="${WEBHOOK_URL:-http://localhost:8787/webhook}"
WEBHOOK_KEY="${WEBHOOK_KEY:-my-secret-key-123}"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║    GPS Multi-Device Simulator - Example Scenarios              ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Webhook URL: $WEBHOOK_URL"
echo "API Key: $WEBHOOK_KEY"
echo ""
echo "Select an example to run:"
echo ""
echo "1) All Devices - Full Route Duration"
echo "2) All Devices - 1 Minute Test"
echo "3) All Devices - 5 Minute Test"
echo "4) Device 1 Only - Full Route"
echo "5) Device 1 Only - 2 Minute Test"
echo "6) Device 2 Only - Full Route"
echo "7) Device 3 Only - Full Route"
echo "8) High Frequency (1s updates) - All Devices"
echo "9) Low Frequency (30s updates) - All Devices"
echo "10) Custom..."
echo ""
read -p "Enter choice (1-10): " choice

case $choice in
  1)
    echo ""
    echo "Running: All devices, full route duration..."
    python3 simulate-multi-tracker.py \
      --webhook_url "$WEBHOOK_URL" \
      --webhook_api_key "$WEBHOOK_KEY" \
      --interval 2
    ;;
  2)
    echo ""
    echo "Running: All devices, 1 minute test..."
    python3 simulate-multi-tracker.py \
      --webhook_url "$WEBHOOK_URL" \
      --webhook_api_key "$WEBHOOK_KEY" \
      --duration 60 \
      --interval 2
    ;;
  3)
    echo ""
    echo "Running: All devices, 5 minute test..."
    python3 simulate-multi-tracker.py \
      --webhook_url "$WEBHOOK_URL" \
      --webhook_api_key "$WEBHOOK_KEY" \
      --duration 300 \
      --interval 2
    ;;
  4)
    echo ""
    echo "Running: Device 1 only, full route..."
    python3 simulate-multi-tracker.py \
      --device 1 \
      --webhook_url "$WEBHOOK_URL" \
      --webhook_api_key "$WEBHOOK_KEY" \
      --interval 2
    ;;
  5)
    echo ""
    echo "Running: Device 1 only, 2 minute test..."
    python3 simulate-multi-tracker.py \
      --device 1 \
      --webhook_url "$WEBHOOK_URL" \
      --webhook_api_key "$WEBHOOK_KEY" \
      --duration 120 \
      --interval 2
    ;;
  6)
    echo ""
    echo "Running: Device 2 only, full route (Chennai → Kolkata)..."
    python3 simulate-multi-tracker.py \
      --device 2 \
      --webhook_url "$WEBHOOK_URL" \
      --webhook_api_key "$WEBHOOK_KEY" \
      --interval 2
    ;;
  7)
    echo ""
    echo "Running: Device 3 only, full route (Kolkata → Haryana)..."
    python3 simulate-multi-tracker.py \
      --device 3 \
      --webhook_url "$WEBHOOK_URL" \
      --webhook_api_key "$WEBHOOK_KEY" \
      --interval 2
    ;;
  8)
    echo ""
    echo "Running: All devices, high frequency (1s updates)..."
    python3 simulate-multi-tracker.py \
      --webhook_url "$WEBHOOK_URL" \
      --webhook_api_key "$WEBHOOK_KEY" \
      --interval 1 \
      --duration 300
    ;;
  9)
    echo ""
    echo "Running: All devices, low frequency (30s updates)..."
    python3 simulate-multi-tracker.py \
      --webhook_url "$WEBHOOK_URL" \
      --webhook_api_key "$WEBHOOK_KEY" \
      --interval 30
    ;;
  10)
    echo ""
    read -p "Enter webhook URL (default: $WEBHOOK_URL): " custom_url
    custom_url="${custom_url:-$WEBHOOK_URL}"
    
    read -p "Enter device ID (1-3, or blank for all): " custom_device
    
    read -p "Enter duration in seconds (0 for full route): " custom_duration
    custom_duration="${custom_duration:-0}"
    
    read -p "Enter update interval in seconds (default: 2): " custom_interval
    custom_interval="${custom_interval:-2}"
    
    cmd="python3 simulate-multi-tracker.py --webhook_url \"$custom_url\" --webhook_api_key \"$WEBHOOK_KEY\" --interval $custom_interval"
    
    if [ -n "$custom_device" ]; then
      cmd="$cmd --device $custom_device"
    fi
    
    if [ "$custom_duration" -gt 0 ] 2>/dev/null; then
      cmd="$cmd --duration $custom_duration"
    fi
    
    echo ""
    echo "Running custom configuration..."
    echo "Command: $cmd"
    echo ""
    eval "$cmd"
    ;;
  *)
    echo "Invalid choice"
    exit 1
    ;;
esac

echo ""
echo "✅ Simulation complete!"
