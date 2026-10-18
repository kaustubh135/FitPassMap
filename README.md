# FitPass Gym Map Explorer

Interactive web application that maps out all **FitPass-supported fitness centers and gyms** centered around **Oberoi Mall, Goregaon East, Mumbai** (and across India), complete with all Fitpass search filters, distance filtering, ratings, amenities, photo galleries, and member reviews.

---

## 📍 Origin & Query Details
- **Search Origin**: Oberoi Mall, Goregaon East, Mumbai (`19.1742, 72.86041`)
- **Starter Link Query**: `https://fitpass.co.in/search?query=U2FsdGVkX18...`
- **Decrypted Query**: `{"lat":19.1742, "lon":72.86041, "cityName":"Oberoi Mall"}`
- **Total FitPass Studios Retrieved**: **2,574 gyms** across 129 pages
- **Enriched Nearby Studios**: 450+ studios in Mumbai and surrounding region with detailed amenities, photo galleries, descriptions, and user reviews.

---

## 🚀 How to Run the Webpage

The application is fully client-side and can be accessed in two ways:

### Option 1: Live Local Server (Currently Running)
The local server is already running. Open your browser and navigate to:
```
http://localhost:8080
```

To start or restart the server manually at any time:
```bash
python server.py
```

### Option 2: Open Directly in Browser
You can also open [index.html](file:///c:/Users/kaust/Documents/Projects/FitPassMap/index.html) directly in any web browser without needing a server. It automatically loads `studios_data.js`.

---

## 🌟 Key Features

### 1. Interactive Map (Leaflet.js + MarkerCluster)
- **User Location Beacon**: A distinct blue pulsing beacon marks your search origin at **Oberoi Mall**.
- **FitPass Studio Markers**: Custom red branded pins showing gym location, name, rating, and distance.
- **Marker Clustering**: Smooth grouping so thousands of gym pins render without lag.
- **Rich Popups**: Click any pin to see gym photo, verified badge, rating, distance, open status, workout tags, and a "View Full Details" button.
- **Map Theme Switcher**: Toggle between Clean Light (Carto Positron), Colorful (Carto Voyager), Night/Dark Mode (Carto Dark), and OpenStreetMap.

### 2. Search & Filter Suite (All FitPass Filters Supported)
- **Real-time Search**: Debounced instant search across gym names, localities, full addresses, and workout types.
- **Distance Radius Presets**:
  - `< 2 km` (Walking distance - 7 gyms)
  - `< 5 km` (Default nearby - 43 gyms)
  - `< 10 km` (Suburban - 146 gyms)
  - `< 25 km` (Greater Mumbai - 328 gyms)
  - `All India` (2,574 gyms)
- **Granular Distance Slider**: Slide from 1 km to 50 km.
- **Rating Filter**: One-click filter for **Rating 4.0+** (matching Fitpass website default).
- **Verified Studios**: Show only official **FITPASS Verified Partner** studios.
- **Currently Open**: Live clock check against studio operating hours (`open_time`).
- **Workout Activities Multi-Select**: Filter by Gym Workout, Yoga, Zumba, HIIT, Crossfit, Swimming, Pilates, MMA, Combat, Dance, Women-Only Gym, etc.
- **Amenities Filter**: Filter by:
  - ❄️ Air Conditioner
  - 🚗 Parking
  - 📶 WiFi
  - 💧 Water Cooler
  - 🔒 Locker
  - ☕ Cafeteria
  - 🏋️‍♂️ Certified Trainers
- **Sorting Options**:
  - Nearest (Distance)
  - Highest Rated (Rating)
  - Most Reviews (Rating Count)
  - Name (A-Z)

### 3. Studio Details Modal & Drawer
- **Photo Gallery**: High-resolution studio photos with thumbnail viewer.
- **Full Address**: Address line 1, line 2, locality, and city with a **1-click Copy Address button**.
- **Real-time Status**: Live "Open Now" or "Closed" badge with operating hours (e.g., `06:00 - 23:00`).
- **Amenities Grid**: Visual chips with icons for all supported amenities.
- **About the Studio**: Detailed description of equipment, facilities, and atmosphere.
- **Member Reviews**: Real FitPass user reviews, star ratings, and comments.
- **Navigation Actions**:
  - 🔗 **View on FITPASS**: Opens original studio profile on `fitpass.co.in`.
  - 🗺️ **Google Maps Directions**: One-click turn-by-turn navigation link starting from Oberoi Mall.

---

## 📁 Project Structure

| File | Description |
|---|---|
| [index.html](file:///c:/Users/kaust/Documents/Projects/FitPassMap/index.html) | Main HTML interface with split map & list layout |
| [styles.css](file:///c:/Users/kaust/Documents/Projects/FitPassMap/styles.css) | Modern UI design system with responsive layouts |
| [app.js](file:///c:/Users/kaust/Documents/Projects/FitPassMap/app.js) | Core application logic (Leaflet map, clustering, filters, modal) |
| [studios_data.js](file:///c:/Users/kaust/Documents/Projects/FitPassMap/studios_data.js) | Complete database of 2,574 studios formatted as global JS object |
| [studios_data.json](file:///c:/Users/kaust/Documents/Projects/FitPassMap/studios_data.json) | Complete JSON dataset with metadata, activities, and coordinates |
| [server.py](file:///c:/Users/kaust/Documents/Projects/FitPassMap/server.py) | Lightweight HTTP server runner on port 8080 |
| `download_all_studios.js` | Script that paginated and retrieved all 129 pages from Fitpass API |
| `enrich_studios.js` | Concurrency worker that scraped amenities, galleries, and reviews |
