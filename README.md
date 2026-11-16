# 📡 FitRadar Map — Multi-Platform Fitness Pass Explorer

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Gyms Mapped](https://img.shields.io/badge/Gyms%20Mapped-2%2C680%20Unified-0284C7?style=flat&logo=target)](https://github.com/kaustubh135/FitPassMap)
[![Platforms](https://img.shields.io/badge/Platforms-FitPass%20%2B%20FitSquare-F97316)](https://github.com/kaustubh135/FitPassMap)
[![Weekly Sync](https://img.shields.io/badge/Weekly%20Sync-Every%20Sunday-success?logo=githubactions)](https://github.com/kaustubh135/FitPassMap/actions)
[![Deployment](https://img.shields.io/badge/Deploy-GitHub%20Pages-success?logo=github)](https://kaustubh135.github.io/FitPassMap/)

**FitRadar Map** is an interactive, high-performance web application that visualizes and aggregates fitness centers, gyms, and workout studios across multiple platforms (**FitPass**, **FitSquare**, and extensible to **Cult.fit** and others) on a responsive live map with entity deduplication, multi-platform badges, membership tier filters, canonical amenities, and side-by-side platform comparisons.

The platform currently maps **2,680 unified fitness locations** across 150+ Indian cities, including **104 dual-listed gyms** available on both FitPass and FitSquare simultaneously.

---

## 📸 Key Highlights

- **⚡ Multi-Platform Hub & Entity Resolution**:
  - Automatically merges identical gyms listed on multiple platforms using spatial proximity (Haversine $\le$ 200m) + token-based fuzzy matching.
  - Overlapping gyms (e.g. *3 Musketeers Fitness Club*, *Elixir Fitness*, *Bodylink Fitness*) display unified cards with multi-platform badges (`[FitPass]` `[FitSquare: Premium]`).
- **🗺️ Scalable Map Pins & Color Differentiation**:
  - 🟦 **FitPass Only**: Classic Blue pin (`#0284C7`).
  - 🟧 **FitSquare Only**: Vibrant Orange pin (`#F97316`).
  - ⚡ **Multi-Pass Hub (Both Platforms)**: Gradient dual-color pin with a `2x` badge.
  - 5 Free Map Styles: OpenStreetMap, Google Maps Streets, Esri World Street Map, Carto Voyager, and Carto Dark.
- **⭐ Weighted Rating Aggregation (with Zero-Review Guard)**:
  - Computes review-weighted ratings across platforms so that unrated platforms never drag down an established gym's rating.
  - Detail modal provides a clear side-by-side platform rating and review count breakdown.
- **🏷️ Dynamic Membership Tiers (Zero Hardcoding)**:
  - Dynamically extracts available membership tiers directly from web data (e.g., `Basic`, `Premium`, `Elite`).
  - Allows filtering by specific FitSquare membership tiers or showing all.
- **🧼 Canonical Amenity Normalization**:
  - Maps differing platform vocabularies (`AC` vs `Air Conditioner`, `WiFi` vs `Free Wifi`, `Cafeteria` vs `Juice Bar Cafe`, `Bike/Car Parking` vs `Parking`) to a unified, standardized amenity checklist.
- **📍 Dynamic Device Location & City Search**:
  - Automatically detects location via device GPS or forward geocoding across Indian neighborhoods and cities.
  - Real-time Haversine distance recalculation with quick presets (`< 2 km`, `< 5 km`, `< 10 km`, `< 25 km`, `All India`) and 1–50 km slider.
- **🔄 Automated Weekly Sunday Sync**:
  - GitHub Actions cron workflow (`.github/workflows/weekly-sync.yml`) runs automatically every Sunday at midnight UTC to pull the latest catalogs from FitPass and FitSquare, merge and deduplicate, and deploy updates.

---

## 🚀 Quick Start (Local Setup)

The application is completely self-contained and zero-dependency for client viewing.

### Option 1: Run with Node.js
```bash
# Clone the repository
git clone https://github.com/kaustubh135/FitPassMap.git
cd FitPassMap

# Install optional scraper dependencies
npm install

# Start local server
npm start
```
Open **[http://localhost:8080](http://localhost:8080)** in your browser.

### Option 2: Run with Python
```bash
python server.py
```
Open **[http://localhost:8080](http://localhost:8080)** in your browser.

### Option 3: Double-Click (Zero Server Required)
Simply open [`index.html`](index.html) directly in any modern browser (Chrome, Edge, Safari, Firefox). The dataset is pre-compiled into [`studios_data.js`](studios_data.js) as a global bundle, eliminating CORS restrictions on `file://`.

---

## 🛠️ Data Pipeline & Architecture

### 1. Reverse-Engineering the FitPass Search Link
The starter search query:
```
https://fitpass.co.in/search?query=U2FsdGVkX18MBp5N0NLJatv3fWUK5VwqNEoeQA1LMnpqB7DVm2rKrF0afyQ9fgU5RrVx5jPIpm1ceAgmSJ3mR6aUT/Fkm8RBXamGdCtLBI8=
```
Using the extracted AES passphrase `s1d2f1j4` from FitPass client bundles, the query decrypts to:
```json
{
  "lat": 19.1742,
  "lon": 72.86041,
  "cityName": "Oberoi Mall"
}
```

### 2. Multi-Page Pagination & Enrichment
The data ingestion scripts in [`scripts/`](scripts/) automatically handle data collection:

```
                  ┌───────────────────────────────┐
                  │ FitPass API (service: listing)│
                  └──────────────┬────────────────┘
                                 │
                     129 Pages Automated Pagination
                                 │
                  ┌──────────────▼────────────────┐
                  │ 2,574 Studios (studios_raw)   │
                  └──────────────┬────────────────┘
                                 │
                      Concurrent Page Scraper
                 (Amenities, Photos, Reviews, About)
                                 │
                  ┌──────────────▼────────────────┐
                  │ Enriched Dataset (450+ nearby)│
                  └──────────────┬────────────────┘
                                 │
                     Data Optimizer & Serializer
                                 │
               ┌─────────────────┴─────────────────┐
               ▼                                   ▼
      studios_data.js                     studios_data.json
  (Self-contained browser bundle)     (Raw JSON API distribution)
```

### 3. Re-Running the Data Scraper
To refresh the dataset with live data from FitPass at any time:

```bash
# Full automated pipeline (Fetch -> Enrich -> Optimize)
npm run data:refresh

# Or run individual stages:
npm run data:fetch    # Pulls all search listing pages
npm run data:enrich   # Fetches individual profile pages for amenities/reviews
npm run data:prepare  # Compiles and optimizes studios_data.js
```

---

## 📂 Project Structure

```text
FitPassMap/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Pages CI/CD workflow
├── public/
│   └── favicon.svg             # Vector brand icon
├── scripts/
│   ├── fetch_studios.js        # Automated API paginator (129 pages)
│   ├── enrich_studios.js       # Concurrency worker for amenities & reviews
│   ├── prepare_data.js         # Cleans, optimizes, and serializes dataset
│   └── update_all.js           # One-click master pipeline orchestrator
├── app.js                      # Core frontend logic (Leaflet, clustering, filters, modal)
├── index.html                  # Responsive application interface
├── package.json                # Project configuration & npm scripts
├── server.js                   # Zero-dependency Node.js HTTP server
├── server.py                   # Lightweight Python fallback HTTP server
├── studios_data.js             # Standalone production dataset (global window object)
├── studios_data.json           # Raw JSON dataset
├── styles.css                  # Custom responsive CSS design system
├── vercel.json                 # Vercel deployment & security headers config
└── README.md                   # Project documentation
```

---

## 🌐 Deployment

### GitHub Pages (Included Workflow)
This repository includes a GitHub Actions workflow in [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).
1. Go to your repository on GitHub: **Settings** → **Pages**.
2. Under **Build and deployment** → **Source**, select **GitHub Actions**.
3. Every push to `main` will automatically build and publish the live site at:
   `https://<username>.github.io/FitPassMap/`

### Vercel / Netlify
- **Vercel**: Import the repository on Vercel. Preset: `Other`. Root directory: `.`. The included [`vercel.json`](vercel.json) handles security and cache headers automatically.
- **Netlify**: Drag and drop the project folder or link your Git repository. Publish directory: `.`.

---

## 🤝 Contributing & Customization

### Changing the Search Origin to Your City
To set a different default search location (e.g. Bandra, South Mumbai, Bangalore, or Delhi NCR):
1. Open [`scripts/fetch_studios.js`](scripts/fetch_studios.js) and update the `lat` and `lon` defaults.
2. Open [`app.js`](app.js) and update `REF_COORDS` with your desired latitude and longitude.
3. Run `npm run data:refresh` to update the data around your location.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
FitPass is a registered trademark of Fitpass India. This project is for personal discovery and educational use.
