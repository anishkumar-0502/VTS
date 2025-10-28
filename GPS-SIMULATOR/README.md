# 🚗 GPS Tracker Simulator

A Python-based simulator that mimics a GPS tracker moving along a defined route and periodically sends location updates to a webhook endpoint.

---

## ⚙️ Features

✅ Simulate movement between two locations  
✅ Send live GPS coordinates to a webhook endpoint  
✅ Adjustable update interval and duration  
✅ Google Maps API integration (Directions & Geocoding)

---

## 🛠️ Upcoming Enhancements

- Continuous looping mode (`--duration -1`)  
- GPS inaccuracy simulation  
- Connection blackout simulation  
- Custom departure time  
- Traffic delay simulation  
- Alternative route selection  

---

## 🧰 Installation

```bash
git clone https://github.com/theanuraganand/gps-simulator.git
cd gps-simulator
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
⚙️ Configuration
Update your default.json file with your route, API key, and webhook details:

json
Copy code
{
  "start": "Bishop Cotton Boys' School, Bengaluru, India",
  "end": "1st Cross Rd, Victoria Layout, Bengaluru, India",
  "interval": 20,
  "duration": 0,
  "api_key": "<YOUR_GOOGLE_MAPS_API_KEY>",
  "webhook_url": "<YOUR_WEBHOOK_URL>",
  "tracker_id": "simulated-tracker-3",
  "webhook_api_key": "<YOUR_WEBHOOK_API_KEY>"
}
▶️ Usage
Run the simulator with default configuration:

bash
Copy code
python simulate-tracker.py
Or override parameters via command line:

bash
Copy code
python simulate-tracker.py \
  --start "Bengaluru" \
  --end "Mysuru" \
  --interval 15 \
  --duration 0 \
  --api_key "<YOUR_GOOGLE_MAPS_API_KEY>" \
  --webhook_url "<YOUR_WEBHOOK_URL>" \
  --tracker_id "tracker-01" \
  --webhook_api_key "<YOUR_WEBHOOK_API_KEY>"
🛰️ Webhook Payload
Each GPS update is sent as a JSON payload:

json
Copy code
{
  "id": "tracker-01",
  "coordinates": {
    "lat": 12.9716,
    "lng": 77.5946
  }
}
🌍 Google Maps API Setup
Visit the Google Cloud Console

Create or select a project

Enable these APIs:

Geocoding API

Directions API

Generate and copy your API Key
