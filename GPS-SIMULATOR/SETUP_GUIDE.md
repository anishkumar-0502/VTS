# GPS Multi-Device Simulator Setup Guide

## What Was Created

### New Files

1. **`simulate-multi-tracker.py`** - Main multi-device simulator script
2. **`routes.json`** - Configuration file with predefined routes and devices
3. **`utils/route_generator.py`** - Route generation utility using direct GPS coordinates
4. **`MULTI_DEVICE_GUIDE.md`** - Comprehensive usage guide
5. **`SETUP_GUIDE.md`** - This file

## Quick Start

### 1. Verify Dependencies

```bash
cd /Users/outdid/Desktop/Work/VTS/GPS-SIMULATOR
pip install -r requirements.txt
```

All required packages are already installed:
- ✅ numpy
- ✅ requests  
- ✅ polyline
- ✅ tqdm

### 2. Run All Devices

Simulate all 3 GPS devices simultaneously:

```bash
python3 simulate-multi-tracker.py \
  --webhook_url http://localhost:3000/webhook \
  --webhook_api_key my-secret-key-123
```

### 3. Run Single Device

Simulate only Device 1 (Bengaluru → Chennai):

```bash
python3 simulate-multi-tracker.py \
  --device 1 \
  --webhook_url http://localhost:3000/webhook \
  --webhook_api_key my-secret-key-123
```

### 4. Test Run (10 seconds)

Quick test with all devices:

```bash
python3 simulate-multi-tracker.py \
  --duration 10 \
  --webhook_url http://localhost:3000/webhook \
  --webhook_api_key my-secret-key-123
```

## Predefined Routes & Devices

### Routes Available

```
Route 1: Bengaluru → Chennai
  Start: 12.971599°N, 77.594566°E
  End: 13.082680°N, 80.270721°E
  Distance: ~290 km

Route 2: Chennai → Kolkata  
  Start: 13.082680°N, 80.270721°E
  End: 22.572645°N, 88.363892°E
  Distance: ~1,260 km

Route 3: Kolkata → Haryana
  Start: 22.572645°N, 88.363892°E
  End: 29.058777°N, 76.085602°E
  Distance: ~1,400 km

Route 4: Bengaluru → Salem, US
  Start: 12.971599°N, 77.594566°E
  End: 42.519539°N, -70.896713°W
  Distance: ~10,000 km (International)
```

### Devices Available

```
Device 1 → Route 1 (Bengaluru → Chennai) → simulated-tracker-1
Device 2 → Route 2 (Chennai → Kolkata)    → simulated-tracker-2
Device 3 → Route 3 (Kolkata → Haryana)    → simulated-tracker-3
```

## Configuration (routes.json)

### Adding a New Route

Edit `routes.json`:

```json
{
  "id": 5,
  "name": "Route: Mumbai → Delhi",
  "start": { "lat": 19.076090, "lng": 72.877426 },
  "end": { "lat": 28.704060, "lng": 77.102493 }
}
```

Find GPS coordinates at: https://www.google.com/maps

### Adding a New Device

Add to the `devices` array in `routes.json`:

```json
{
  "id": 4,
  "name": "GPS-Device-4",
  "route_id": 5,
  "tracker_id": "simulated-tracker-4"
}
```

## Command-Line Options

```bash
python3 simulate-multi-tracker.py [options]

Options:
  --config FILE              Routes configuration file (default: routes.json)
  --webhook_url URL          Webhook endpoint (default: http://localhost:3000/webhook)
  --webhook_api_key KEY      API key for webhook (default: my-secret-key-123)
  --interval N               Update interval in seconds (default: 2)
  --duration N               Duration in seconds, 0=full route (default: 0)
  --device N                 Specific device to simulate (1-3)
```

## Example Scenarios

### Scenario 1: Production Testing (All Devices, Full Duration)

```bash
python3 simulate-multi-tracker.py \
  --webhook_url http://your-server.com/webhook \
  --webhook_api_key production-api-key \
  --interval 5
```

**What it does:**
- Simulates all 3 devices simultaneously
- Each device follows its assigned route to completion
- GPS updates every 5 seconds
- Real-time progress tracking for each device

### Scenario 2: Quick Test (All Devices, 1 Minute)

```bash
python3 simulate-multi-tracker.py \
  --duration 60 \
  --webhook_url http://localhost:3000/webhook \
  --webhook_api_key test-key
```

### Scenario 3: Single Device Test

```bash
python3 simulate-multi-tracker.py \
  --device 2 \
  --duration 300 \
  --interval 3 \
  --webhook_url http://localhost:3000/webhook \
  --webhook_api_key test-key
```

### Scenario 4: High-Frequency Updates

```bash
python3 simulate-multi-tracker.py \
  --interval 1 \
  --webhook_url http://localhost:3000/webhook \
  --webhook_api_key test-key
```

**What it does:**
- GPS updates every 1 second (instead of default 2)
- More realistic for real-time applications
- Higher data volume

### Scenario 5: Slow Updates (Battery Saving)

```bash
python3 simulate-multi-tracker.py \
  --interval 30 \
  --webhook_url http://localhost:3000/webhook \
  --webhook_api_key test-key
```

**What it does:**
- GPS updates every 30 seconds
- Simulates low-power/battery-saving mode
- Useful for testing sparse data handling

## Key Features

✅ **No API Dependencies**: Uses direct GPS coordinates instead of Google Maps API  
✅ **Realistic Movement**: Haversine formula for accurate distances  
✅ **Concurrent Simulation**: All devices run in parallel threads  
✅ **Per-Device Progress**: Individual progress bars for each device  
✅ **Flexible Configuration**: Easy to add routes and devices  
✅ **Customizable Timing**: Adjust update intervals for different scenarios  

## How It Works

### Route Generation

1. **Interpolation**: Generates 100 waypoints between start and end coordinates
2. **Distance Calculation**: Uses Haversine formula for accurate GPS distances
3. **Speed Simulation**: Assumes average 60 km/h with ±10% random variation
4. **Duration Calculation**: Derived from total distance and speed

### Message Types

Each device sends three types of messages at each update:

1. **LocationUpdate** - GPS coordinates and movement data
2. **Heartbeat** - Device status and signal strength
3. **StatusNotification** - Fix quality and satellite info

### Threading

- Main thread creates one thread per device
- Each thread independently simulates its route
- All threads run in parallel for true concurrency
- Safe webhook communication via requests library

## Comparison With Old Simulator

| Aspect | Old Simulator | New Simulator |
|--------|---------------|---------------|
| **Devices** | 1 only | Up to 3+ |
| **Routes** | Address strings via Google Maps | Direct GPS coordinates |
| **Execution** | Sequential | Parallel (threaded) |
| **Configuration** | CLI arguments | JSON config file |
| **API Dependency** | Google Maps API required | None required |
| **Setup Time** | API key + address lookup | Just coordinates |
| **Flexibility** | CLI args | Editable JSON |

## Troubleshooting

### Webhook Connection Refused
```
Error: [Device-1] Network Error: Connection refused
```
**Solution**: Ensure backend is running on specified webhook URL

### 401 Unauthorized
```
[Device-1] HTTP 401
```
**Solution**: Verify `--webhook_api_key` matches backend configuration

### Slow Simulation
**Solution**: Increase `--interval` (e.g., `--interval 5`) or reduce devices

### Memory/CPU Issues
**Solution**: Use `--device N` to simulate one device at a time

## Next Steps

1. **Customize Routes**: Edit `routes.json` with your specific routes
2. **Add More Devices**: Add entries to the devices array
3. **Integrate with Backend**: Update webhook URL and API key
4. **Monitor in Real-Time**: Use your VTS frontend to watch devices move
5. **Test Edge Cases**: Use `--interval` to test different update frequencies

## Support

For issues or questions about the multi-device simulator, check:
- `MULTI_DEVICE_GUIDE.md` - Comprehensive documentation
- `simulate-multi-tracker.py` - Source code with comments
- Original simulator docs for basic GPS concepts

---

**Created**: October 27, 2025  
**Version**: 1.0.0  
**Status**: Ready for production testing
