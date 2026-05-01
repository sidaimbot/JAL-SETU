import sys
import pickle
import math
import random
import urllib.request
import urllib.parse
from pathlib import Path
from flask import Flask, request, jsonify
from flask_cors import CORS

# Ensure the flood_prediction_system module is in the path
sys.path.append(str(Path(__file__).parent / 'flood_prediction_system'))
from utils.real_time_prediction import PredictionEngine

app = Flask(__name__)
# Enable CORS so the React Dashboard (localhost:3000/3004) can communicate instantly
CORS(app)

# ── Paths ──────────────────────────────────────────────────────────────────────
_SAVED = Path(__file__).parent / 'flood_prediction_system' / 'models' / 'saved'

# ── Initialize the ML Engine ──────────────────────────────────────────────────
print("Loading JalSetu ML Prediction Engine...")
try:
    engine = PredictionEngine()
except Exception as e:
    print(f"FAILED to initialize PredictionEngine: {e}")
    engine = None

# ── Load raw feature metadata (for dashboard introspection) ───────────────────
try:
    with open(_SAVED / 'raw_feature_names.pkl', 'rb') as f:
        _RAW_FEATURES = pickle.load(f)
except Exception:
    _RAW_FEATURES = []

try:
    with open(_SAVED / 'feature_names.pkl', 'rb') as f:
        _ENC_FEATURES = pickle.load(f)
except Exception:
    _ENC_FEATURES = []

# ── Sensor → ML feature bridge ────────────────────────────────────────────────
# Maps compact ESP32/dashboard fields to the 21 raw ML feature columns.
# Fields the sensor cannot provide use physically reasonable defaults for
# Kamrup District, Assam (the demo GPS location).
_SENSOR_DEFAULTS = {
    "monsoon_season":   1,      # April–October  (boolean)
    "elevation":        45.0,   # m — Brahmaputra floodplain
    "catchment_area":   120.0,  # km²
    "soil_moisture":    65.0,   # % — high during monsoon
    "land_use":         0,      # 0 = agricultural/low-lying
    "distance_to_river":0.8,    # km — close to river
    "drainage_quality": 2,      # 0–4 scale (2 = average)
}

def _build_feature_dict(sensor: dict) -> dict:
    """Bridge ESP32-style compact sensor dict → ML raw feature dict."""
    wl   = float(sensor.get('waterLevel',    0))
    ri   = float(sensor.get('rainIntensity', 0))
    temp = float(sensor.get('temperature',   30.0))
    hum  = float(sensor.get('humidity',      70.0))
    
    # ── Verify via 30-day Rain History ────────────────────────────
    recent_rain = float(sensor.get('recentRainTotal', 0))
    rain_risk   = float(sensor.get('recentRainRisk',  0))
    
    # Base baseline for Kamrup District
    base_soil_moisture = _SENSOR_DEFAULTS["soil_moisture"]
    
    # Adjust soil moisture dynamically based on the past 30 days of rain.
    if recent_rain > 0:
        simulated_soil_moisture = min(100.0, base_soil_moisture + (rain_risk * 0.3) + (recent_rain / 5.0))
    else:
        simulated_soil_moisture = base_soil_moisture

    # Scale to physical units expected by the training data
    base_water_level_m = round(wl  / 100.0 * 10.0, 3)   # 0–10 m
    # Map IoT Rain Intensity directly to mm/hr
    rainfall_mm_hr     = round(ri  / 100.0 * 200.0, 3)  
    
    # Simulate massive river swelling from 30-day continuous rain history
    river_swell_m = (recent_rain / 100.0) * 1.2
    flood_flash_m = (rain_risk / 100.0) * 2.5
    water_level_m = min(15.0, base_water_level_m + river_swell_m + flood_flash_m)

    river_discharge = round(water_level_m * 125.0, 1)

    features = {
        "water_level":         water_level_m,
        "rainfall_intensity":  rainfall_mm_hr,
        "temperature":         temp,
        "humidity":            hum,
        "river_discharge":     river_discharge,
        "ultrasonic_distance": float(sensor.get('ultrasonicDist', 200)),
        
        # Inject 30-day history severely into the 24h accumulation feature 
        # so the model inherently perceives extreme saturation
        "rainfall_accumulation_24h": recent_rain * 0.4 + (rain_risk * 2.0),
        
        "distance_from_river": 0.8,
        "elevation":           45.0,
        "historical_flood_freq": 0.7 if rain_risk > 50 else 0.2,
    }

    # Fill any remaining raw feature columns with 0 so the model never errors
    for col in _RAW_FEATURES:
        if col not in features:
            features[col] = 0

    return features


# ══════════════════════════════════════════════════════════════════════════════
#   ROUTES
# ══════════════════════════════════════════════════════════════════════════════

def generate_dynamic_safe_zones(lat, lon, risk_level):
    """
    Simulates ML-driven safe zone generation.
    Places safe zones radially around [lat, lon]. If risk is 'High', closer zones
    are marked as unsafe.
    """
    random.seed(int(lat * 1000) + int(lon * 1000))
    zones = []
    names = ["District Hospital", "Government High School", "PWD Guest House (Hill)", "Main Highway Bridge", "Community Hall", "Red Cross Shelter"]
    
    for i in range(4):
        dist_km = random.uniform(1.0, 6.0)
        angle = random.uniform(0, 2 * math.pi)
        
        # 1 degree approx 111 km
        dz_lat = dist_km * math.cos(angle) / 111.0
        dz_lon = dist_km * math.sin(angle) / (111.0 * math.cos(math.radians(lat)))
        
        z_lat = lat + dz_lat
        z_lon = lon + dz_lon
        
        safe = True
        if risk_level == 'High' and dist_km < 3.5:
            safe = False
        elif risk_level == 'Medium' and dist_km < 1.5:
            safe = False
            
        direction = '↗' if angle < math.pi/2 else '↖' if angle < math.pi else '↙' if angle < 1.5*math.pi else '↘'
        
        zones.append({
            'id': f'sz-{i}',
            'name': names[i % len(names)],
            'lat': round(z_lat, 5),
            'lon': round(z_lon, 5),
            'dist': f"{round(dist_km, 1)} km",
            'safe': safe,
            'direction': direction,
            'bearing': ['NorthEast', 'NorthWest', 'SouthWest', 'SouthEast'][int(angle // (math.pi/2))]
        })
    
    # Sort closest first
    zones.sort(key=lambda z: float(z['dist'].split()[0]))
    return zones

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'Online',
        'engine_loaded': engine is not None,
        'raw_features': len(_RAW_FEATURES),
        'encoded_features': len(_ENC_FEATURES),
    })


@app.route('/features', methods=['GET'])
def get_features():
    """Return the feature metadata — lets the React app know what the model expects."""
    return jsonify({
        'raw_feature_names': _RAW_FEATURES,
        'encoded_feature_names': _ENC_FEATURES,
        'sensor_defaults': _SENSOR_DEFAULTS,
    })


@app.route('/predict/quick', methods=['POST'])
def predict_quick():
    """
    Simplified endpoint for the React dashboard.
    
    Accepts compact ESP32-style sensor dict:
      { waterLevel, rainIntensity, temperature, humidity, battery, rssi, ... }
    
    Returns flood probability, risk level, and confidence without requiring
    the caller to know the 21 raw ML feature names.
    """
    if not engine:
        return jsonify({'error': 'Prediction engine offline'}), 500

    sensor = request.json or {}
    try:
        features = _build_feature_dict(sensor)
        recent_rain = float(sensor.get('recentRainTotal', 0))
        
        # 1. Base ML model prediction
        prediction = engine.predict(features)
        risk       = engine.get_risk_level(features)
        
        # 2. Physics-Based Heuristic Override
        # If the ML model was trained on distinct climates, it might under-predict Assam/Arunachal monsoons.
        # We manually verify using exact location 30-day data:
        # If ground is fundamentally saturated (>150mm rain) AND live sensors are elevated,
        # physics dictates an imminent flood regardless of statistical tree splitting.
        wl = float(sensor.get('waterLevel', 0))
        ri = float(sensor.get('rainIntensity', 0))
        
        if recent_rain > 150.0 and (wl > 50.0 or ri > 50.0):
            prediction['flood_prob'] = min(0.98, prediction['flood_prob'] + 0.65)
            prediction['flood'] = 'Yes'
            risk = 'High'
            prediction['confidence'] = min(0.99, prediction['confidence'] + 0.15)
        elif recent_rain > 75.0 and (wl > 40.0 or ri > 40.0):
            prediction['flood_prob'] = max(0.65, prediction['flood_prob'] + 0.35)
            prediction['flood'] = 'Yes'
            if risk == 'Low': risk = 'Medium'

        return jsonify({
            'status':      'success',
            'prediction':  prediction,
            'risk':        risk,
            'input_sensor': {
                'waterLevel':    sensor.get('waterLevel'),
                'rainIntensity': sensor.get('rainIntensity'),
                'temperature':   sensor.get('temperature'),
                'humidity':      sensor.get('humidity'),
            },
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/predict/escape-routes', methods=['POST'])
def predict_escape_routes():
    """
    Returns 5 nearest safe zones using a 2-mirror Overpass waterfall.
    Mirrors tried in order; first success wins.
    Accepts: { lat, lon, risk }
    """
    import json as _json
    data = request.json or {}
    try:
        lat  = float(data.get('lat', 26.1445))
        lon  = float(data.get('lon', 91.7362))
        risk = data.get('risk', 'Low')

        query = (
            f"[out:json][timeout:22];"
            f"(node[\"amenity\"~\"hospital|clinic|school|community_centre\"]"
            f"(around:5000,{lat},{lon}););"
            f"out 5;"
        )
        req_data = urllib.parse.urlencode({'data': query}).encode('utf-8')

        mirrors = [
            'https://overpass.openstreetmap.fr/api/interpreter',
            'https://overpass-api.de/api/interpreter',
        ]

        elements     = []
        overpass_err = None

        for mirror_url in mirrors:
            try:
                req = urllib.request.Request(mirror_url, data=req_data)
                req.add_header('User-Agent', 'JalSetu-Flood-EWS-App/1.0')
                with urllib.request.urlopen(req, timeout=22) as response:
                    parsed = _json.loads(response.read().decode('utf-8'))
                    elements = parsed.get('elements', [])
                    print(f"Overpass [{mirror_url}] → {len(elements)} elements for ({lat},{lon})")
                    overpass_err = None
                    break  # success
            except Exception as api_err:
                overpass_err = str(api_err)
                print(f"Overpass [{mirror_url}] failed: {api_err}")

        # Build safe_zones from raw elements
        safe_zones = []
        for node in elements:
            n_lat = node.get('lat')
            n_lon = node.get('lon')
            if not n_lat or not n_lon:
                continue
            tags = node.get('tags', {})
            name = tags.get('name') or tags.get('amenity', 'Safe Zone').replace('_', ' ').title()
            dist_km = math.sqrt(
                ((n_lat - lat) * 111.0) ** 2 +
                ((n_lon - lon) * 111.0 * math.cos(math.radians(lat))) ** 2
            )
            safe = True
            if risk == 'High'   and dist_km < 3.5: safe = False
            if risk == 'Medium' and dist_km < 1.5: safe = False

            angle = math.atan2(n_lon - lon, n_lat - lat)
            if angle < 0: angle += 2 * math.pi
            direction   = ['\u2197', '\u2198', '\u2199', '\u2196'][int(angle / (math.pi / 2)) % 4]
            bearing_str = ['NorthEast', 'SouthEast', 'SouthWest', 'NorthWest'][int(angle / (math.pi / 2)) % 4]

            safe_zones.append({
                'id':      f"osm-{node['id']}",
                'name':    name,
                'lat':     round(n_lat, 5),
                'lon':     round(n_lon, 5),
                'dist':    f"{round(dist_km, 1)} km",
                'safe':    safe,
                'direction': direction,
                'bearing': bearing_str,
            })

        safe_zones.sort(key=lambda z: float(z['dist'].split()[0]))

        # Enrich with Open-Meteo elevation data
        if safe_zones:
            try:
                lats = [str(round(lat, 5))] + [str(round(z['lat'], 5)) for z in safe_zones]
                lons = [str(round(lon, 5))] + [str(round(z['lon'], 5)) for z in safe_zones]
                elev_url = f"https://api.open-meteo.com/v1/elevation?latitude={','.join(lats)}&longitude={','.join(lons)}"
                with urllib.request.urlopen(elev_url, timeout=5) as r:
                    elevations = _json.loads(r.read()).get('elevation', [])
                    if len(elevations) == len(safe_zones) + 1:
                        user_elev = elevations[0]
                        for i, z in enumerate(safe_zones):
                            diff = elevations[i + 1] - user_elev
                            z['elevation_diff'] = round(diff, 1)
                            if risk in ['Medium', 'High'] and diff < -3.0:
                                z['safe'] = False
                                z['name'] += ' (Low Terrain)'
                            elif diff > 3.0:
                                z['elev_label'] = f"\u2191 {round(diff, 1)}m Higher Ground"
                            elif diff < -3.0:
                                z['elev_label'] = f"\u2193 {abs(round(diff, 1))}m Lower Terrain"
            except Exception as e:
                print("Elevation API failed:", e)

        return jsonify({
            'status':        'success',
            'safe_zones':    safe_zones,
            'found_count':   len(safe_zones),
            'overpass_error': overpass_err,
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500





@app.route('/predict/nodes', methods=['POST'])
def predict_nodes():
    """
    Multi-node endpoint (original).
    Accepts: { nodes: { node_id: { feature: value, … } } }
    """
    if not engine:
        return jsonify({'error': 'Prediction engine offline'}), 500

    data = request.json
    if not data or 'nodes' not in data:
        return jsonify({'error': 'Invalid request. Must contain "nodes" dictionary.'}), 400

    results = {}
    for node_id, feat in data['nodes'].items():
        try:
            prediction = engine.predict(feat)
            risk       = engine.get_risk_level(feat)
            results[node_id] = {
                'status':     'success',
                'prediction': prediction,
                'risk':       risk,
            }
        except Exception as e:
            results[node_id] = {'status': 'error', 'message': str(e)}

    return jsonify({'results': results})


if __name__ == '__main__':
    print("JalSetu ML API starting on http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)
