# 🏋️‍♂️ FitPass Gym Map Explorer

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Gyms Mapped](https://img.shields.io/badge/FitPass%20Studios-2%2C574%20Mapped-D6383B?style=flat&logo=target)](https://github.com/kaustubh135/FitPassMap)
[![Coverage](https://img.shields.io/badge/Pan--India-150%2B%20Cities-0A1F34)](https://github.com/kaustubh135/FitPassMap)
[![Deployment](https://img.shields.io/badge/Deploy-GitHub%20Pages-success?logo=github)](https://kaustubh135.github.io/FitPassMap/)
[![Map Engine](https://img.shields.io/badge/Map%20Engine-Leaflet.js%20%2B%20MarkerCluster-green?logo=leaflet)](https://leafletjs.com/)

An interactive, high-performance web application that visualizes and filters all **FitPass-supported fitness studios and gyms** on a responsive live map with full search, distance radii, ratings, amenities, operating hours, and photo galleries.

Originally seeded around **Oberoi Mall, Goregaon East, Mumbai**, the platform includes a verified catalog of **2,574 fitness centers** across Mumbai, Pune, Bangalore, Hyderabad, Delhi NCR, and 150+ Indian cities.

---

## 📸 Key Highlights

- **🗺️ Interactive Map (No API Key Required)**: Seamless Leaflet.js map with clustering to render thousands of gym pins with zero lag. Includes layer switcher for **OpenStreetMap**, **Google Maps Streets**, **Esri World Street Map**, and **Carto Dark Mode**.
- **📍 Search Origin & Distance Radius**: Pinned with a pulsing radar beacon at **Oberoi Mall**. Includes instant distance filters for `< 2 km` (Walking), `< 5 km` (Cycling), `< 10 km` (Neighborhood), `< 25 km` (Greater Mumbai), and `All India`, plus a granular 1–50 km slider.
- **🔍 Full FitPass Search Filters**:
  - **Live Search**: Instant debounce filtering by gym name, locality, address, or activity.
  - **Rating 4.0+**: One-click toggle matching FitPass's top-rated filter.
  - **Verified Partners**: Filter for official FitPass Verified Partner centers.
  - **Open Now**: Evaluates current local device clock against gym hours (`open_time`).
  - **Workout Activities**: Multi-select tags for *Gym Workout, Yoga, Zumba, HIIT, Crossfit, Swimming, Pilates, MMA, Combat, Dance, Women-Only Gyms*, and more.
  - **Amenities & Facilities**: Filter for *Air Conditioner, Parking, WiFi, Water Cooler, Locker, Cafeteria, and Certified Trainers*.
  - **Sorting**: Nearest first, Highest Rated, Most Reviews, or Name (A-Z).
- **🏢 Deep Studio Profile Modal**:
  - High-resolution photo gallery carousel.
  - One-click **Copy Address** button.
  - Operating hours & real-time Open/Closed status.
  - Full amenities checklist with visual icons.
  - Real member reviews & ratings breakdown.
  - Direct links to **Official FitPass Studio Page** and **Google Maps Turn-by-Turn Navigation**.

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
