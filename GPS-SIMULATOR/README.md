# 🚗 GPS Tracker Simulator

A Python-based simulator that mimics a GPS tracker moving along a defined route and periodically sends location updates to a webhook endpoint.

---

## ⚙️ Features

- **Dynamic scheduled-trip playback** powered by MongoDB device, vehicle, and route data
- **Google Maps route simulation** between arbitrary start and end points
- **Programmable update cadence** with adjustable intervals and durations
- **Webhook delivery** for boot, heartbeat, status, and location messages

---

## 🧰 Installation

```bash
git clone https://github.com/theanuraganand/gps-simulator.git
cd gps-simulator
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

---

## ⚙️ Configuration

Update `default.json` with either Google Maps details or MongoDB connectivity:

```json
{
  "start": "Bishop Cotton Boys' School, Bengaluru, India",
  "end": "1st Cross Rd, Victoria Layout, Bengaluru, India",
  "interval": 20,
  "duration": 0,
  "api_key": "<YOUR_GOOGLE_MAPS_API_KEY>",
  "webhook_url": "<YOUR_WEBHOOK_URL>",
  "tracker_id": "simulated-tracker-3",
  "webhook_api_key": "<YOUR_WEBHOOK_API_KEY>",
  "mongo_uri": "mongodb://localhost:27017/vts",
  "mongo_db": "vts",
  "scheduled_trip_id": null,
  "device_id": null,
  "trip_period": "morning",
  "day": null,
  "default_speed_kmh": 30
}
```

- **MongoDB fields** are optional; provide `mongo_uri` plus either `scheduled_trip_id` or `device_id` to drive simulation from stored routes.
- **Google Maps fields** (`start`, `end`, `api_key`) are only required when not sourcing routes from MongoDB.

---

## ▶️ Usage

### 1. Google Maps mode

```bash
python simulate-tracker.py \
  --start "Bengaluru" \
  --end "Mysuru" \
  --interval 15 \
  --duration 0 \
  --api_key "<YOUR_GOOGLE_MAPS_API_KEY>" \
  --webhook_url "<YOUR_WEBHOOK_URL>" \
  --tracker_id "tracker-01" \
  --webhook_api_key "<YOUR_WEBHOOK_API_KEY>"
```

### 2. Scheduled trip playback from MongoDB

```bash
python simulate-tracker.py \
  --mongo_uri "mongodb://localhost:27017/vts" \
  --mongo_db "vts" \
  --scheduled_trip_id "SCHTRP-123" \
  --webhook_url "<YOUR_WEBHOOK_URL>" \
  --interval 5 \
  --default_speed_kmh 32
```

- Provide `--device_id "DEV-123"` instead of `--scheduled_trip_id` to auto-select the active trip for that tracker’s vehicle based on repeat days and period.
- Use `--day` to force a particular weekday filter (defaults to current UTC weekday).

---

## 🛰️ Webhook payloads

Location updates are posted as JSON payloads similar to:

```json
{
  "message_type": "location_update",
  "tracker_id": "tracker-01",
  "latitude": 12.9716,
  "longitude": 77.5946,
  "speed_kmh": 28.4,
  "timestamp": "2025-01-01T12:00:00Z"
}
```

Boot, heartbeat, and status notifications share the same tracker identifier.

---

## 🌍 Google Maps API setup

1. Visit the Google Cloud Console
2. Enable **Geocoding API** and **Directions API**
3. Generate and copy your API key
