/**
 * FitRadar Map
 * Multi-Platform Gym & Fitness Pass Explorer across India (FitPass, FitSquare, and more)
 */

(function () {
  'use strict';

  // Global State
  let allStudios = [];
  let filteredStudios = [];
  let map = null;
  let markerCluster = null;
  let studioMarkersMap = new Map();
  let userMarker = null;
  let currentTileIndex = 0;
  let tileLayers = [];
  let activeStudio = null;
  let isManualPinMode = false;

  // Filter States
  const filterState = {
    search: '',
    maxDistance: 5,
    rating4Plus: false,
    verifiedOnly: false,
    openNowOnly: false,
    selectedWorkouts: new Set(),
    selectedAmenities: new Set(),
    selectedPlatforms: new Set(['fitpass', 'fitsquare']),
    selectedTiers: new Set(),
    sortBy: 'distance_asc'
  };

  // User Location State
  let userCoords = [19.0760, 72.8777]; // Default Mumbai
  let userLocationName = 'Detecting location...';
  let isLocationSet = false;

  // Storage Keys
  const STORAGE_KEY_LOCATION = 'fitpass_user_location';
  const STORAGE_KEY_RECENTS = 'fitradar_recent_searches';

  // Mobile Bottom Sheet States: 'peek', 'half', 'expanded'
  let mobileSheetState = 'peek';

  // Tile Providers (Universal compatibility, no API keys required)
  const TILE_STYLES = [
    {
      name: 'OpenStreetMap (Standard)',
      url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    },
    {
      name: 'Google Maps (Streets)',
      url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
      attribution: '&copy; Google Maps',
      maxZoom: 20
    },
    {
      name: 'Esri World Street Map',
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
      attribution: 'Tiles &copy; Esri',
      maxZoom: 19
    },
    {
      name: 'Carto Voyager (Clean)',
      url: 'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
      maxZoom: 19
    },
    {
      name: 'Carto Dark (Night Mode)',
      url: 'https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
      maxZoom: 19
    }
  ];

  // Canonical Amenity Dictionary with FontAwesome 6 classes
  const AMENITY_ICONS = {
    'Air Conditioning': 'fa-solid fa-snowflake',
    'Air Conditioner': 'fa-solid fa-snowflake',
    'AC': 'fa-solid fa-snowflake',
    'Free Wi-Fi': 'fa-solid fa-wifi',
    'WiFi': 'fa-solid fa-wifi',
    'Parking': 'fa-solid fa-square-parking',
    'Car Parking': 'fa-solid fa-car',
    'Bike Parking': 'fa-solid fa-motorcycle',
    'Lockers': 'fa-solid fa-lock',
    'Locker': 'fa-solid fa-lock',
    'Showers': 'fa-solid fa-shower',
    'Changing Room': 'fa-solid fa-person-booth',
    'Drinking Water': 'fa-solid fa-glass-water',
    'Water Cooler': 'fa-solid fa-glass-water',
    'CCTV Surveillance': 'fa-solid fa-video',
    'Sauna': 'fa-solid fa-hot-tub-person',
    'Steam Bath': 'fa-solid fa-bath',
    'Cafeteria / Juice Bar': 'fa-solid fa-mug-hot',
    'Cafeteria': 'fa-solid fa-mug-hot',
    'Certified Trainers': 'fa-solid fa-user-tie',
    'Accessibility': 'fa-solid fa-wheelchair',
    'Wheel Chair Accessibile': 'fa-solid fa-wheelchair',
    'First Aid': 'fa-solid fa-kit-medical',
    'Restrooms': 'fa-solid fa-restroom',
    'Restrooms (Men)': 'fa-solid fa-person',
    'Restrooms (Women)': 'fa-solid fa-person-dress',
    'Hand Sanitizers': 'fa-solid fa-pump-medical',
    'Shoe Rack': 'fa-solid fa-shoe-prints',
    'Ice Bath': 'fa-solid fa-icicles',
    'Lounge Area': 'fa-solid fa-couch',
    'Security': 'fa-solid fa-shield-halved'
  };

  const POPULAR_WORKOUTS = [
    'Gym Workout', 'Yoga', 'Zumba', 'HIIT', 'Crossfit', 'Swimming',
    'Pilates', 'Strength Training', 'Core', 'Cardio', 'Abs Workout',
    'MMA', 'Combat', 'Dance', 'Gym Workout (Women Only)'
  ];

  // DOM Elements Cache
  const el = {};

  function queryElements() {
    el.map = document.getElementById('map');
    el.changeLocationBtn = document.getElementById('changeLocationBtn');
    el.refLocationLabel = document.getElementById('refLocationLabel');
    el.headerGymCountText = document.getElementById('headerGymCountText');
    el.searchInput = document.getElementById('searchInput');
    el.clearSearchBtn = document.getElementById('clearSearchBtn');
    el.mobileSearchInput = document.getElementById('mobileSearchInput');
    el.clearMobileSearchBtn = document.getElementById('clearMobileSearchBtn');
    el.recenterBtn = document.getElementById('recenterBtn');
    el.toggleTileLayerBtn = document.getElementById('toggleTileLayerBtn');
    el.openMobileFiltersBtn = document.getElementById('openMobileFiltersBtn');
    el.mobileFilterBadge = document.getElementById('mobileFilterBadge');

    // Filter strip elements
    el.togglePlatformFitpass = document.getElementById('togglePlatformFitpass');
    el.togglePlatformFitsquare = document.getElementById('togglePlatformFitsquare');
    el.countBadgeFitpass = document.getElementById('countBadgeFitpass');
    el.countBadgeFitsquare = document.getElementById('countBadgeFitsquare');

    el.distancePillBtn = document.getElementById('distancePillBtn');
    el.distancePillLabel = document.getElementById('distancePillLabel');
    el.distanceDropdownWrapper = document.getElementById('distanceDropdownWrapper');
    el.distanceMenu = document.getElementById('distanceMenu');
    el.distanceRangeSlider = document.getElementById('distanceRangeSlider');
    el.sliderValLabel = document.getElementById('sliderValLabel');

    el.ratingFilterBtn = document.getElementById('ratingFilterBtn');
    el.openNowFilterBtn = document.getElementById('openNowFilterBtn');
    el.verifiedFilterBtn = document.getElementById('verifiedFilterBtn');
    el.resetFiltersBtn = document.getElementById('resetFiltersBtn');

    el.tierPillBtn = document.getElementById('tierPillBtn');
    el.tierPillLabel = document.getElementById('tierPillLabel');
    el.tierDropdownWrapper = document.getElementById('tierDropdownWrapper');
    el.tierChipsContainer = document.getElementById('tierChipsContainer');

    el.workoutPillBtn = document.getElementById('workoutPillBtn');
    el.workoutPillLabel = document.getElementById('workoutPillLabel');
    el.workoutDropdownWrapper = document.getElementById('workoutDropdownWrapper');
    el.workoutChipsContainer = document.getElementById('workoutChipsContainer');

    el.amenityPillBtn = document.getElementById('amenityPillBtn');
    el.amenityPillLabel = document.getElementById('amenityPillLabel');
    el.amenityDropdownWrapper = document.getElementById('amenityDropdownWrapper');
    el.amenityChipsContainer = document.getElementById('amenityChipsContainer');

    // Sidebar & Map
    el.studiosList = document.getElementById('studiosList');
    el.resultsCountLabel = document.getElementById('resultsCountLabel');
    el.resultsSubtitle = document.getElementById('resultsSubtitle');
    el.sortSelect = document.getElementById('sortSelect');
    el.mapPinBanner = document.getElementById('mapPinBanner');
    el.cancelPinModeBtn = document.getElementById('cancelPinModeBtn');
    el.mapFitBoundsBtn = document.getElementById('mapFitBoundsBtn');
    el.mapCenterMeBtn = document.getElementById('mapCenterMeBtn');
    el.legendUserLabel = document.getElementById('legendUserLabel');

    // Mobile Elements
    el.mobileBottomSheet = document.getElementById('mobileBottomSheet');
    el.sheetDragHandle = document.getElementById('sheetDragHandle');
    el.sheetGymCount = document.getElementById('sheetGymCount');
    el.sheetLocationSub = document.getElementById('sheetLocationSub');
    el.mobileSortSelect = document.getElementById('mobileSortSelect');
    el.sheetExpandToggleBtn = document.getElementById('sheetExpandToggleBtn');
    el.mobileCardsList = document.getElementById('mobileCardsList');
    el.mobileFloatingPill = document.getElementById('mobileFloatingPill');
    el.mobileViewToggleBtn = document.getElementById('mobileViewToggleBtn');
    el.viewToggleIcon = document.getElementById('viewToggleIcon');
    el.viewToggleLabel = document.getElementById('viewToggleLabel');
    el.mobileCountBadge = document.getElementById('mobileCountBadge');

    // Mobile Preview Card
    el.mobilePreviewCard = document.getElementById('mobilePreviewCard');
    el.closePreviewCardBtn = document.getElementById('closePreviewCardBtn');
    el.previewCardContent = document.getElementById('previewCardContent');

    // Studio Detail Modal
    el.studioModalBackdrop = document.getElementById('studioModalBackdrop');
    el.modalCloseBtn = document.getElementById('modalCloseBtn');
    el.modalBannerImg = document.getElementById('modalBannerImg');
    el.modalLogoImg = document.getElementById('modalLogoImg');
    el.modalStudioName = document.getElementById('modalStudioName');
    el.modalStudioAddress = document.getElementById('modalStudioAddress');
    el.modalAddressText = document.getElementById('modalAddressText');
    el.copyAddressBtn = document.getElementById('copyAddressBtn');
    el.modalBadgesRow = document.getElementById('modalBadgesRow');
    el.modalPlatformCardsGrid = document.getElementById('modalPlatformCardsGrid');
    el.modalAmenitiesSection = document.getElementById('modalAmenitiesSection');
    el.modalAmenitiesGrid = document.getElementById('modalAmenitiesGrid');
    el.modalWorkoutsSection = document.getElementById('modalWorkoutsSection');
    el.modalWorkoutsList = document.getElementById('modalWorkoutsList');
    el.modalAboutSection = document.getElementById('modalAboutSection');
    el.modalAboutText = document.getElementById('modalAboutText');
    el.modalGallerySection = document.getElementById('modalGallerySection');
    el.modalGalleryGrid = document.getElementById('modalGalleryGrid');
    el.modalReviewsSection = document.getElementById('modalReviewsSection');
    el.modalReviewsList = document.getElementById('modalReviewsList');
    el.modalPlatformButtonsContainer = document.getElementById('modalPlatformButtonsContainer');
    el.modalGoogleMapsLink = document.getElementById('modalGoogleMapsLink');

    // Location Selector Modal
    el.locationModalBackdrop = document.getElementById('locationModalBackdrop');
    el.locationModalCloseBtn = document.getElementById('locationModalCloseBtn');
    el.useGpsBtn = document.getElementById('useGpsBtn');
    el.dropPinManualBtn = document.getElementById('dropPinManualBtn');
    el.locationNotice = document.getElementById('locationNotice');
    el.locationNoticeText = document.getElementById('locationNoticeText');
    el.locationSearchInput = document.getElementById('locationSearchInput');
    el.clearLocationSearchBtn = document.getElementById('clearLocationSearchBtn');
    el.submitLocationSearchBtn = document.getElementById('submitLocationSearchBtn');
    el.locationResultsList = document.getElementById('locationResultsList');
    el.recentLocationsSection = document.getElementById('recentLocationsSection');
    el.recentLocationsGrid = document.getElementById('recentLocationsGrid');
    el.clearRecentBtn = document.getElementById('clearRecentBtn');
    el.popularLocationsGrid = document.getElementById('popularLocationsGrid');

    // Mobile Filters Modal
    el.mobileFilterModalBackdrop = document.getElementById('mobileFilterModalBackdrop');
    el.closeMobileFilterModalBtn = document.getElementById('closeMobileFilterModalBtn');
    el.mobileSliderDistanceVal = document.getElementById('mobileSliderDistanceVal');
    el.mobileDistancePresets = document.getElementById('mobileDistancePresets');
    el.mobileTierChipsContainer = document.getElementById('mobileTierChipsContainer');
    el.mobileWorkoutChipsContainer = document.getElementById('mobileWorkoutChipsContainer');
    el.mobileAmenityChipsContainer = document.getElementById('mobileAmenityChipsContainer');
    el.mobileResetAllFiltersBtn = document.getElementById('mobileResetAllFiltersBtn');
    el.mobileApplyFiltersBtn = document.getElementById('mobileApplyFiltersBtn');
  }

  /**
   * Main App Initialization
   */
  async function init() {
    queryElements();
    loadDataset();
    initLeafletMap();
    initFiltersData();
    initLocationModalHandlers();
    bindUserEvents();
    initUserLocation();
    setMobileSheetState('peek');
  }

  /**
   * Load Data from window.STUDIOS_DATA or window.FITPASS_DATA or fetch fallback
   */
  function loadDataset() {
    const raw = window.STUDIOS_DATA || window.FITPASS_DATA;
    if (raw && raw.studios) {
      allStudios = raw.studios;
      console.log(`Loaded ${allStudios.length} gyms from dataset`);
      if (raw.metadata && raw.metadata.platformCounts) {
        if (el.countBadgeFitpass) el.countBadgeFitpass.textContent = raw.metadata.platformCounts.fitpass.toLocaleString();
        if (el.countBadgeFitsquare) el.countBadgeFitsquare.textContent = raw.metadata.platformCounts.fitsquare.toLocaleString();
      }
    } else {
      console.warn("STUDIOS_DATA not found synchronously. Trying fetch fallback...");
      fetch('studios_data.json')
        .then(res => res.json())
        .then(data => {
          allStudios = data.studios || [];
          if (data.metadata && data.metadata.platformCounts) {
            if (el.countBadgeFitpass) el.countBadgeFitpass.textContent = data.metadata.platformCounts.fitpass.toLocaleString();
            if (el.countBadgeFitsquare) el.countBadgeFitsquare.textContent = data.metadata.platformCounts.fitsquare.toLocaleString();
          }
          initFiltersData();
          applyFilters();
        })
        .catch(err => {
          console.error("Failed to load studios dataset:", err);
          showDataLoadError();
        });
    }
  }

  function showDataLoadError() {
    const html = `
      <div class="empty-state">
        <div class="empty-state-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
        <h3>Failed to Load Gyms</h3>
        <p>Could not load the gym directory data. Please check your network connection and reload.</p>
      </div>
    `;
    if (el.studiosList) el.studiosList.innerHTML = html;
    if (el.mobileCardsList) el.mobileCardsList.innerHTML = html;
  }

  /**
   * Initialize Leaflet Map & Tile Layers
   */
  function initLeafletMap() {
    map = L.map('map', {
      center: userCoords,
      zoom: 13,
      zoomControl: true,
      maxZoom: 19,
      minZoom: 4
    });

    TILE_STYLES.forEach((style, index) => {
      const layer = L.tileLayer(style.url, {
        attribution: style.attribution,
        maxZoom: style.maxZoom || 19,
        subdomains: style.subdomains || 'abc'
      });
      tileLayers.push(layer);
      if (index === 0) layer.addTo(map);
    });

    // User Beacon Marker
    const userIcon = L.divIcon({
      className: 'user-marker-icon',
      html: '<div class="user-beacon"></div>',
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    userMarker = L.marker(userCoords, { icon: userIcon, zIndexOffset: 2000 })
      .addTo(map)
      .bindPopup(`
        <div style="padding: 10px; font-family: inherit;">
          <div style="font-weight: 800; font-size: 14px; color: var(--secondary);">📍 You are here</div>
          <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">${escapeHtml(userLocationName)}</div>
          <div style="font-size: 11px; color: var(--primary); font-weight: 600; margin-top: 4px;">Search origin</div>
        </div>
      `, { offset: [0, -6] });

    // MarkerCluster Group
    markerCluster = L.markerClusterGroup({
      chunkedLoading: true,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      maxClusterRadius: 40
    });

    map.addLayer(markerCluster);

    // Responsive map invalidateSize
    const refreshMapSize = () => {
      if (map) map.invalidateSize();
    };
    setTimeout(refreshMapSize, 150);
    setTimeout(refreshMapSize, 600);
    window.addEventListener('resize', refreshMapSize);
  }

  /**
   * Haversine Great-Circle Distance (Kilometers)
   */
  function calcDistanceKm(lat1, lon1, lat2, lon2) {
    if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return 9999;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  }

  function recalculateAllDistances() {
    if (!userCoords) return;
    const [uLat, uLng] = userCoords;
    allStudios.forEach(s => {
      s.distance = calcDistanceKm(uLat, uLng, s.lat, s.lng);
    });
  }

  /**
   * Update active user origin location
   */
  function setUserLocation(lat, lng, name, saveToStorage = true) {
    userCoords = [lat, lng];
    userLocationName = name;
    isLocationSet = true;

    if (saveToStorage) {
      try {
        localStorage.setItem(STORAGE_KEY_LOCATION, JSON.stringify({ lat, lng, name }));
      } catch (e) {}
      addRecentSearch(name, lat, lng);
    }

    if (el.refLocationLabel) {
      el.refLocationLabel.textContent = name;
      el.refLocationLabel.title = `Active search location: ${name} (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
    }
    if (el.legendUserLabel) {
      el.legendUserLabel.textContent = `You (${name.split(',')[0]})`;
    }
    if (el.sheetLocationSub) {
      el.sheetLocationSub.textContent = `Within ${filterState.maxDistance === 99999 ? 'all' : filterState.maxDistance + ' km'} of ${name.split(',')[0]}`;
    }

    recalculateAllDistances();

    if (map) {
      if (userMarker) {
        userMarker.setLatLng(userCoords);
      }
      map.setView(userCoords, 13, { animate: true });
    }

    applyFilters();
  }

  /**
   * Reverse Geocoding with Nominatim
   */
  async function reverseGeocodeCoords(lat, lng) {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`;
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (!res.ok) return;
      const data = await res.json();
      const addr = data.address || {};
      const locality = addr.suburb || addr.neighbourhood || addr.residential || addr.city_district || addr.road || '';
      const city = addr.city || addr.town || addr.state_district || addr.state || '';
      const cleanName = [locality, city].filter(Boolean).join(', ') || data.name || 'Current Location';

      userLocationName = cleanName;
      if (el.refLocationLabel) el.refLocationLabel.textContent = cleanName;
      if (el.legendUserLabel) el.legendUserLabel.textContent = `You (${cleanName.split(',')[0]})`;
      if (el.sheetLocationSub) el.sheetLocationSub.textContent = `Within ${filterState.maxDistance === 99999 ? 'all' : filterState.maxDistance + ' km'} of ${cleanName.split(',')[0]}`;

      try {
        localStorage.setItem(STORAGE_KEY_LOCATION, JSON.stringify({ lat, lng, name: cleanName }));
      } catch (e) {}
    } catch (e) {
      console.warn('Reverse geocoding error:', e);
    }
  }

  /**
   * Request device location via Geolocation API
   */
  function requestDeviceLocation(fromUserClick = false) {
    if (!('geolocation' in navigator)) {
      openLocationModal(true, 'Geolocation is not supported by your browser.');
      return;
    }

    if (fromUserClick && el.useGpsBtn) {
      const titleEl = el.useGpsBtn.querySelector('.loc-card-title');
      if (titleEl) titleEl.textContent = 'Detecting GPS coordinates...';
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserLocation(lat, lng, 'Current Location', true);
        reverseGeocodeCoords(lat, lng);
        closeLocationModal();
        if (fromUserClick && el.useGpsBtn) {
          const titleEl = el.useGpsBtn.querySelector('.loc-card-title');
          if (titleEl) titleEl.textContent = 'Use My Current Location';
        }
      },
      (err) => {
        console.warn('Geolocation denied or failed:', err);
        if (fromUserClick && el.useGpsBtn) {
          const titleEl = el.useGpsBtn.querySelector('.loc-card-title');
          if (titleEl) titleEl.textContent = 'Use My Current Location';
        }
        openLocationModal(true, 'Location access was not enabled or timed out. Please choose or search your city below.');
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  }

  /**
   * Initialize user location on launch
   */
  function initUserLocation() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LOCATION);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.lat === 'number' && typeof parsed.lng === 'number') {
          setUserLocation(parsed.lat, parsed.lng, parsed.name || 'Saved Location', false);
          return;
        }
      }
    } catch (e) {}

    // Fallback: try GPS detection
    requestDeviceLocation(false);
  }

  /**
   * Dynamic Major Cities from Gym Density
   */
  function getTopCitiesFromData() {
    if (!allStudios || !allStudios.length) return [];
    const cityMap = new Map();
    allStudios.forEach(s => {
      const city = (s.city || '').trim();
      if (!city || city === 'Unknown' || city.toLowerCase() === 'maharashtra' || city.length < 3) return;
      if (!cityMap.has(city)) {
        cityMap.set(city, { count: 0, latSum: 0, lngSum: 0 });
      }
      const entry = cityMap.get(city);
      entry.count += 1;
      entry.latSum += s.lat;
      entry.lngSum += s.lng;
    });

    return Array.from(cityMap.entries())
      .filter(([_, d]) => d.count >= 20)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([cityName, d]) => ({
        name: cityName,
        count: d.count,
        lat: +(d.latSum / d.count).toFixed(6),
        lng: +(d.lngSum / d.count).toFixed(6)
      }));
  }

  function getRecentSearches() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY_RECENTS) || '[]');
    } catch (e) {
      return [];
    }
  }

  function addRecentSearch(name, lat, lng) {
    if (!name || name === 'Detecting location...' || name.includes('Geolocation') || isNaN(lat) || isNaN(lng)) return;
    try {
      let recents = getRecentSearches();
      recents = recents.filter(r => r.name.toLowerCase() !== name.toLowerCase() && (Math.abs(r.lat - lat) > 0.01 || Math.abs(r.lng - lng) > 0.01));
      recents.unshift({ name, lat: +lat.toFixed(6), lng: +lng.toFixed(6), timestamp: Date.now() });
      if (recents.length > 8) recents = recents.slice(0, 8);
      localStorage.setItem(STORAGE_KEY_RECENTS, JSON.stringify(recents));
      renderRecentLocations();
    } catch (e) {}
  }

  function renderRecentLocations() {
    if (!el.recentLocationsSection || !el.recentLocationsGrid) return;
    const recents = getRecentSearches();
    if (!recents.length) {
      el.recentLocationsSection.style.display = 'none';
      el.recentLocationsGrid.innerHTML = '';
      return;
    }
    el.recentLocationsSection.style.display = 'flex';
    el.recentLocationsGrid.innerHTML = '';
    recents.forEach(item => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'loc-pill';
      btn.innerHTML = `
        <i class="fa-solid fa-clock-rotate-left text-indigo-500"></i>
        <span>${escapeHtml(item.name)}</span>
      `;
      btn.addEventListener('click', () => {
        setUserLocation(item.lat, item.lng, item.name, true);
        closeLocationModal();
      });
      el.recentLocationsGrid.appendChild(btn);
    });
  }

  function populateMajorCities() {
    if (!el.popularLocationsGrid) return;
    el.popularLocationsGrid.innerHTML = '';
    const topCities = getTopCitiesFromData();
    topCities.forEach(city => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'loc-pill';
      btn.innerHTML = `
        <span>${escapeHtml(city.name)}</span>
        <span class="loc-pill-badge">(${city.count})</span>
      `;
      btn.addEventListener('click', () => {
        setUserLocation(city.lat, city.lng, city.name, true);
        closeLocationModal();
      });
      el.popularLocationsGrid.appendChild(btn);
    });
  }

  /**
   * Manual Pin Placement Mode
   */
  function startManualPinMode() {
    isManualPinMode = true;
    closeLocationModal();

    if (el.mapPinBanner) el.mapPinBanner.style.display = 'flex';
    setMobileSheetState('peek');

    if (map) {
      map.once('click', handleManualPinClick);
    }
  }

  function cancelManualPinMode() {
    isManualPinMode = false;
    if (el.mapPinBanner) el.mapPinBanner.style.display = 'none';
    if (map) {
      map.off('click', handleManualPinClick);
    }
  }

  async function handleManualPinClick(e) {
    if (!isManualPinMode) return;
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;
    cancelManualPinMode();

    let placeName = `Pin (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.address) {
          const parts = [
            data.address.suburb || data.address.neighbourhood || data.address.commercial || data.address.road || data.address.residential,
            data.address.city || data.address.town || data.address.city_district
          ].filter(Boolean);
          if (parts.length > 0) placeName = parts.join(', ');
        }
      }
    } catch (err) {}

    setUserLocation(lat, lng, placeName, true);
  }

  /**
   * Initialize Location Modal Controls
   */
  function initLocationModalHandlers() {
    renderRecentLocations();
    populateMajorCities();

    if (el.changeLocationBtn) {
      el.changeLocationBtn.addEventListener('click', () => openLocationModal(false));
    }
    if (el.locationModalCloseBtn) {
      el.locationModalCloseBtn.addEventListener('click', closeLocationModal);
    }
    if (el.locationModalBackdrop) {
      el.locationModalBackdrop.addEventListener('click', (e) => {
        if (e.target === el.locationModalBackdrop) closeLocationModal();
      });
    }

    if (el.useGpsBtn) {
      el.useGpsBtn.addEventListener('click', () => requestDeviceLocation(true));
    }
    if (el.dropPinManualBtn) {
      el.dropPinManualBtn.addEventListener('click', startManualPinMode);
    }
    if (el.cancelPinModeBtn) {
      el.cancelPinModeBtn.addEventListener('click', cancelManualPinMode);
    }
    if (el.clearRecentBtn) {
      el.clearRecentBtn.addEventListener('click', () => {
        try {
          localStorage.removeItem(STORAGE_KEY_RECENTS);
          renderRecentLocations();
        } catch (e) {}
      });
    }

    if (el.clearLocationSearchBtn) {
      el.clearLocationSearchBtn.addEventListener('click', () => {
        el.locationSearchInput.value = '';
        el.clearLocationSearchBtn.classList.remove('visible');
        if (el.locationResultsList) el.locationResultsList.style.display = 'none';
        el.locationSearchInput.focus();
      });
    }

    if (el.locationSearchInput) {
      el.locationSearchInput.addEventListener('input', (e) => {
        const hasVal = e.target.value.trim().length > 0;
        if (el.clearLocationSearchBtn) el.clearLocationSearchBtn.classList.toggle('visible', hasVal);
      });
      el.locationSearchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          executeLocationSearch();
        }
      });
    }

    if (el.submitLocationSearchBtn) {
      el.submitLocationSearchBtn.addEventListener('click', executeLocationSearch);
    }
  }

  function openLocationModal(showNotice = false, noticeMsg = '') {
    if (el.locationNotice && el.locationNoticeText) {
      if (showNotice && noticeMsg) {
        el.locationNoticeText.textContent = noticeMsg;
        el.locationNotice.style.display = 'flex';
      } else {
        el.locationNotice.style.display = 'none';
      }
    }
    if (el.locationModalBackdrop) {
      renderRecentLocations();
      populateMajorCities();
      el.locationModalBackdrop.classList.add('open');
      setTimeout(() => {
        if (el.locationSearchInput) el.locationSearchInput.focus();
      }, 150);
    }
  }

  function closeLocationModal() {
    if (el.locationModalBackdrop) el.locationModalBackdrop.classList.remove('open');
    if (el.locationResultsList) el.locationResultsList.style.display = 'none';
  }

  async function executeLocationSearch() {
    const query = (el.locationSearchInput.value || '').trim();
    if (!query) return;

    el.submitLocationSearchBtn.disabled = true;
    el.submitLocationSearchBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    el.locationResultsList.style.display = 'block';
    el.locationResultsList.innerHTML = `
      <div style="padding: 12px; text-align: center; color: var(--text-muted); font-size: 12px;">
        <i class="fa-solid fa-spinner fa-spin"></i> Searching locations...
      </div>
    `;

    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=in&limit=6&addressdetails=1`;
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (!res.ok) throw new Error('Search failed');
      const results = await res.json();

      if (!results || results.length === 0) {
        el.locationResultsList.innerHTML = `
          <div style="padding: 12px; text-align: center; color: var(--text-muted); font-size: 12px;">
            No locations found for "<strong>${escapeHtml(query)}</strong>".
          </div>
        `;
      } else {
        el.locationResultsList.innerHTML = '';
        results.forEach(item => {
          const div = document.createElement('div');
          div.className = 'loc-result-item';
          const parts = item.display_name.split(',').map(s => s.trim());
          const primaryName = parts.slice(0, 2).join(', ');
          const secondaryName = parts.slice(2, 4).join(', ');

          div.innerHTML = `
            <i class="fa-solid fa-location-dot"></i>
            <div>
              <div style="font-weight: 700;">${escapeHtml(primaryName)}</div>
              <div style="font-size: 11px; color: var(--text-muted);">${escapeHtml(secondaryName || primaryName)}</div>
            </div>
          `;

          div.addEventListener('click', () => {
            const lat = parseFloat(item.lat);
            const lng = parseFloat(item.lon);
            const cleanName = primaryName || item.display_name.split(',')[0];
            setUserLocation(lat, lng, cleanName, true);
            closeLocationModal();
          });

          el.locationResultsList.appendChild(div);
        });
      }
    } catch (err) {
      el.locationResultsList.innerHTML = `
        <div style="padding: 12px; text-align: center; color: var(--primary); font-size: 12px;">
          Unable to search right now. Please select one of the cities below.
        </div>
      `;
    } finally {
      el.submitLocationSearchBtn.disabled = false;
      el.submitLocationSearchBtn.innerHTML = '<span>Find</span>';
    }
  }

  /**
   * Initialize Dynamic Filters Options (Tiers, Workouts, Amenities)
   */
  function initFiltersData() {
    // 1. FitSquare Tiers
    const rawData = window.STUDIOS_DATA || window.FITPASS_DATA;
    let tiers = (rawData && rawData.metadata && rawData.metadata.tiers) ? rawData.metadata.tiers : [];
    if (!tiers || tiers.length === 0) {
      const collected = new Set();
      allStudios.forEach(s => {
        if (s.platform_details && s.platform_details.fitsquare && s.platform_details.fitsquare.tier) {
          collected.add(s.platform_details.fitsquare.tier);
        }
      });
      tiers = Array.from(collected).sort();
    }

    const renderTierChips = (container) => {
      if (!container) return;
      container.innerHTML = '';
      tiers.forEach(tier => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'chip-item';
        btn.dataset.tier = tier;
        btn.innerHTML = `<i class="fa-solid fa-id-badge text-orange-500"></i><span>${escapeHtml(tier)}</span>`;
        btn.addEventListener('click', () => {
          if (filterState.selectedTiers.has(tier)) {
            filterState.selectedTiers.delete(tier);
            btn.classList.remove('active');
          } else {
            filterState.selectedTiers.add(tier);
            btn.classList.add('active');
          }
          syncTierPillLabel();
          applyFilters();
        });
        container.appendChild(btn);
      });
    };
    renderTierChips(el.tierChipsContainer);
    renderTierChips(el.mobileTierChipsContainer);

    // 2. Workouts
    const availableWorkouts = new Set();
    allStudios.forEach(s => (s.workouts || []).forEach(w => availableWorkouts.add(w)));
    const sortedWorkouts = Array.from(availableWorkouts).sort((a, b) => {
      const aPop = POPULAR_WORKOUTS.indexOf(a);
      const bPop = POPULAR_WORKOUTS.indexOf(b);
      if (aPop !== -1 && bPop !== -1) return aPop - bPop;
      if (aPop !== -1) return -1;
      if (bPop !== -1) return 1;
      return a.localeCompare(b);
    });

    const renderWorkoutChips = (container) => {
      if (!container) return;
      container.innerHTML = '';
      sortedWorkouts.slice(0, 24).forEach(workout => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'chip-item';
        btn.dataset.workout = workout;
        btn.innerHTML = `<i class="fa-solid fa-dumbbell"></i><span>${escapeHtml(workout)}</span>`;
        btn.addEventListener('click', () => {
          if (filterState.selectedWorkouts.has(workout)) {
            filterState.selectedWorkouts.delete(workout);
            btn.classList.remove('active');
          } else {
            filterState.selectedWorkouts.add(workout);
            btn.classList.add('active');
          }
          syncWorkoutPillLabel();
          applyFilters();
        });
        container.appendChild(btn);
      });
    };
    renderWorkoutChips(el.workoutChipsContainer);
    renderWorkoutChips(el.mobileWorkoutChipsContainer);

    // 3. Amenities
    const standardAmenities = Object.keys(AMENITY_ICONS);
    const renderAmenityChips = (container) => {
      if (!container) return;
      container.innerHTML = '';
      standardAmenities.forEach(amenity => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'chip-item';
        btn.dataset.amenity = amenity;
        const iconClass = AMENITY_ICONS[amenity] || 'fa-solid fa-check';
        btn.innerHTML = `<i class="${iconClass}"></i><span>${escapeHtml(amenity)}</span>`;
        btn.addEventListener('click', () => {
          if (filterState.selectedAmenities.has(amenity)) {
            filterState.selectedAmenities.delete(amenity);
            btn.classList.remove('active');
          } else {
            filterState.selectedAmenities.add(amenity);
            btn.classList.add('active');
          }
          syncAmenityPillLabel();
          applyFilters();
        });
        container.appendChild(btn);
      });
    };
    renderAmenityChips(el.amenityChipsContainer);
    renderAmenityChips(el.mobileAmenityChipsContainer);
  }

  function syncTierPillLabel() {
    if (!el.tierPillLabel) return;
    const count = filterState.selectedTiers.size;
    el.tierPillLabel.textContent = count === 0 ? 'All Tiers' : `Tiers (${count})`;
    el.tierPillBtn.classList.toggle('active', count > 0);
  }

  function syncWorkoutPillLabel() {
    if (!el.workoutPillLabel) return;
    const count = filterState.selectedWorkouts.size;
    el.workoutPillLabel.textContent = count === 0 ? 'Workouts' : `Workouts (${count})`;
    el.workoutPillBtn.classList.toggle('active', count > 0);
  }

  function syncAmenityPillLabel() {
    if (!el.amenityPillLabel) return;
    const count = filterState.selectedAmenities.size;
    el.amenityPillLabel.textContent = count === 0 ? 'Amenities' : `Amenities (${count})`;
    el.amenityPillBtn.classList.toggle('active', count > 0);
  }

  /**
   * Bind User Interface Events
   */
  function bindUserEvents() {
    // Platform Toggles
    const setupPlatformToggle = (btn, platformKey) => {
      if (!btn) return;
      btn.addEventListener('click', () => {
        if (filterState.selectedPlatforms.has(platformKey)) {
          if (filterState.selectedPlatforms.size === 1) return; // Keep at least one
          filterState.selectedPlatforms.delete(platformKey);
          btn.classList.remove('active');
        } else {
          filterState.selectedPlatforms.add(platformKey);
          btn.classList.add('active');
        }
        applyFilters();
      });
    };
    setupPlatformToggle(el.togglePlatformFitpass, 'fitpass');
    setupPlatformToggle(el.togglePlatformFitsquare, 'fitsquare');

    // Desktop Search Input
    let debounceTimer = null;
    const handleSearchInput = (val) => {
      clearTimeout(debounceTimer);
      if (el.clearSearchBtn) el.clearSearchBtn.classList.toggle('visible', val.length > 0);
      if (el.clearMobileSearchBtn) el.clearMobileSearchBtn.classList.toggle('visible', val.length > 0);
      debounceTimer = setTimeout(() => {
        filterState.search = val.toLowerCase();
        applyFilters();
      }, 200);
    };

    if (el.searchInput) {
      el.searchInput.addEventListener('input', (e) => {
        if (el.mobileSearchInput) el.mobileSearchInput.value = e.target.value;
        handleSearchInput(e.target.value.trim());
      });
    }

    if (el.clearSearchBtn) {
      el.clearSearchBtn.addEventListener('click', () => {
        el.searchInput.value = '';
        if (el.mobileSearchInput) el.mobileSearchInput.value = '';
        handleSearchInput('');
      });
    }

    // Mobile Search Input
    if (el.mobileSearchInput) {
      el.mobileSearchInput.addEventListener('input', (e) => {
        if (el.searchInput) el.searchInput.value = e.target.value;
        handleSearchInput(e.target.value.trim());
      });
    }

    if (el.clearMobileSearchBtn) {
      el.clearMobileSearchBtn.addEventListener('click', () => {
        el.mobileSearchInput.value = '';
        if (el.searchInput) el.searchInput.value = '';
        handleSearchInput('');
      });
    }

    // Distance Dropdown & Presets
    if (el.distancePillBtn && el.distanceDropdownWrapper) {
      el.distancePillBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllDropdowns(el.distanceDropdownWrapper);
        el.distanceDropdownWrapper.classList.toggle('open');
      });
    }

    if (el.distanceMenu) {
      el.distanceMenu.addEventListener('click', (e) => {
        const item = e.target.closest('.menu-item');
        if (!item) return;
        el.distanceMenu.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
        item.classList.add('active');

        const dist = item.dataset.distance;
        setDistanceFilter(dist === 'all' ? 99999 : parseFloat(dist));
        el.distanceDropdownWrapper.classList.remove('open');
      });
    }

    if (el.distanceRangeSlider) {
      el.distanceRangeSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        setDistanceFilter(val);
      });
    }

    if (el.mobileDistancePresets) {
      el.mobileDistancePresets.addEventListener('click', (e) => {
        const btn = e.target.closest('.dist-btn');
        if (!btn) return;
        const dist = btn.dataset.distance;
        setDistanceFilter(dist === 'all' ? 99999 : parseFloat(dist));
      });
    }

    // Tiers Dropdown
    if (el.tierPillBtn && el.tierDropdownWrapper) {
      el.tierPillBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllDropdowns(el.tierDropdownWrapper);
        el.tierDropdownWrapper.classList.toggle('open');
      });
    }

    // Workouts Dropdown
    if (el.workoutPillBtn && el.workoutDropdownWrapper) {
      el.workoutPillBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllDropdowns(el.workoutDropdownWrapper);
        el.workoutDropdownWrapper.classList.toggle('open');
      });
    }

    // Amenities Dropdown
    if (el.amenityPillBtn && el.amenityDropdownWrapper) {
      el.amenityPillBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllDropdowns(el.amenityDropdownWrapper);
        el.amenityDropdownWrapper.classList.toggle('open');
      });
    }

    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.filter-dropdown-wrapper')) {
        closeAllDropdowns(null);
      }
    });

    // Quick Filter: Rating 4.0+
    if (el.ratingFilterBtn) {
      el.ratingFilterBtn.addEventListener('click', () => {
        filterState.rating4Plus = !filterState.rating4Plus;
        el.ratingFilterBtn.classList.toggle('active', filterState.rating4Plus);
        applyFilters();
      });
    }

    // Quick Filter: Open Now
    if (el.openNowFilterBtn) {
      el.openNowFilterBtn.addEventListener('click', () => {
        filterState.openNowOnly = !filterState.openNowOnly;
        el.openNowFilterBtn.classList.toggle('active', filterState.openNowOnly);
        applyFilters();
      });
    }

    // Quick Filter: Verified Only
    if (el.verifiedFilterBtn) {
      el.verifiedFilterBtn.addEventListener('click', () => {
        filterState.verifiedOnly = !filterState.verifiedOnly;
        el.verifiedFilterBtn.classList.toggle('active', filterState.verifiedOnly);
        applyFilters();
      });
    }

    // Reset Filters
    if (el.resetFiltersBtn) {
      el.resetFiltersBtn.addEventListener('click', resetAllFilters);
    }

    // Sorting Dropdown
    if (el.sortSelect) {
      el.sortSelect.addEventListener('change', (e) => {
        filterState.sortBy = e.target.value;
        if (el.mobileSortSelect) el.mobileSortSelect.value = e.target.value;
        applyFilters();
      });
    }
    if (el.mobileSortSelect) {
      el.mobileSortSelect.addEventListener('change', (e) => {
        filterState.sortBy = e.target.value;
        if (el.sortSelect) el.sortSelect.value = e.target.value;
        applyFilters();
      });
    }

    // Recenter map
    const recenterAction = () => {
      if (userCoords && map) {
        map.setView(userCoords, 14, { animate: true });
        if (userMarker) userMarker.openPopup();
      }
    };
    if (el.recenterBtn) el.recenterBtn.addEventListener('click', recenterAction);
    if (el.mapCenterMeBtn) el.mapCenterMeBtn.addEventListener('click', recenterAction);

    // Fit Bounds
    if (el.mapFitBoundsBtn) {
      el.mapFitBoundsBtn.addEventListener('click', () => {
        if (markerCluster && markerCluster.getLayers().length > 0) {
          map.fitBounds(markerCluster.getBounds(), { padding: [40, 40], maxZoom: 16 });
        }
      });
    }

    // Tile Layer Switcher
    if (el.toggleTileLayerBtn) {
      el.toggleTileLayerBtn.addEventListener('click', () => {
        if (!map || !tileLayers.length) return;
        map.removeLayer(tileLayers[currentTileIndex]);
        currentTileIndex = (currentTileIndex + 1) % tileLayers.length;
        map.addLayer(tileLayers[currentTileIndex]);
        const style = TILE_STYLES[currentTileIndex];
        el.toggleTileLayerBtn.title = `Current Layer: ${style.name} (Click to toggle)`;
      });
    }

    // Mobile Bottom Sheet Drag & Interaction
    setupMobileBottomSheetEvents();

    // Mobile Floating Pill (View Map / View List)
    if (el.mobileViewToggleBtn) {
      el.mobileViewToggleBtn.addEventListener('click', () => {
        if (mobileSheetState === 'peek') {
          setMobileSheetState('half');
        } else {
          setMobileSheetState('peek');
        }
      });
    }

    // Mobile Filters Modal Trigger
    if (el.openMobileFiltersBtn && el.mobileFilterModalBackdrop) {
      el.openMobileFiltersBtn.addEventListener('click', () => {
        el.mobileFilterModalBackdrop.classList.add('open');
      });
    }
    if (el.closeMobileFilterModalBtn && el.mobileFilterModalBackdrop) {
      el.closeMobileFilterModalBtn.addEventListener('click', () => {
        el.mobileFilterModalBackdrop.classList.remove('open');
      });
    }
    if (el.mobileApplyFiltersBtn && el.mobileFilterModalBackdrop) {
      el.mobileApplyFiltersBtn.addEventListener('click', () => {
        el.mobileFilterModalBackdrop.classList.remove('open');
      });
    }
    if (el.mobileResetAllFiltersBtn) {
      el.mobileResetAllFiltersBtn.addEventListener('click', resetAllFilters);
    }

    // Close preview card
    if (el.closePreviewCardBtn) {
      el.closePreviewCardBtn.addEventListener('click', () => {
        if (el.mobilePreviewCard) el.mobilePreviewCard.style.display = 'none';
      });
    }

    // Studio Detail Modal Close
    if (el.modalCloseBtn) {
      el.modalCloseBtn.addEventListener('click', closeModal);
    }
    if (el.studioModalBackdrop) {
      el.studioModalBackdrop.addEventListener('click', (e) => {
        if (e.target === el.studioModalBackdrop) closeModal();
      });
    }

    // Copy Address Button
    if (el.copyAddressBtn && el.modalAddressText) {
      el.copyAddressBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(el.modalAddressText.textContent).then(() => {
          const icon = el.copyAddressBtn.querySelector('i');
          icon.className = 'fa-solid fa-check text-green-600';
          setTimeout(() => { icon.className = 'fa-regular fa-copy'; }, 1500);
        });
      });
    }

    // Keyboard ESC to close any modal
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeModal();
        closeLocationModal();
        if (el.mobileFilterModalBackdrop) el.mobileFilterModalBackdrop.classList.remove('open');
        cancelManualPinMode();
      }
    });
  }

  function closeAllDropdowns(except) {
    document.querySelectorAll('.filter-dropdown-wrapper').forEach(w => {
      if (w !== except) w.classList.remove('open');
    });
  }

  function setDistanceFilter(val) {
    filterState.maxDistance = val;
    if (val >= 99999) {
      if (el.distancePillLabel) el.distancePillLabel.textContent = 'All India';
      if (el.sliderValLabel) el.sliderValLabel.textContent = 'All India';
      if (el.mobileSliderDistanceVal) el.mobileSliderDistanceVal.textContent = 'All India';
      if (el.resultsSubtitle) el.resultsSubtitle.textContent = 'Nationwide';
      if (el.sheetLocationSub) el.sheetLocationSub.textContent = 'Nationwide';
    } else {
      if (el.distancePillLabel) el.distancePillLabel.textContent = `< ${val} km`;
      if (el.sliderValLabel) el.sliderValLabel.textContent = `${val} km`;
      if (el.mobileSliderDistanceVal) el.mobileSliderDistanceVal.textContent = `${val} km`;
      if (el.resultsSubtitle) el.resultsSubtitle.textContent = `within ${val} km`;
      if (el.sheetLocationSub) el.sheetLocationSub.textContent = `Within ${val} km of ${userLocationName.split(',')[0]}`;
    }
    if (el.distanceRangeSlider) el.distanceRangeSlider.value = Math.min(50, val);

    if (el.mobileDistancePresets) {
      el.mobileDistancePresets.querySelectorAll('.dist-btn').forEach(btn => {
        const d = btn.dataset.distance;
        const isAct = (d === 'all' && val >= 99999) || (parseFloat(d) === val);
        btn.classList.toggle('active', isAct);
      });
    }

    if (el.distanceMenu) {
      el.distanceMenu.querySelectorAll('.menu-item').forEach(m => {
        const d = m.dataset.distance;
        const isAct = (d === 'all' && val >= 99999) || (parseFloat(d) === val);
        m.classList.toggle('active', isAct);
      });
    }

    applyFilters();
  }

  /**
   * Setup Mobile Bottom Sheet States & Drag Gestures
   */
  function setupMobileBottomSheetEvents() {
    if (!el.mobileBottomSheet || !el.sheetDragHandle) return;

    if (el.sheetExpandToggleBtn) {
      el.sheetExpandToggleBtn.addEventListener('click', () => {
        if (mobileSheetState === 'peek') setMobileSheetState('half');
        else if (mobileSheetState === 'half') setMobileSheetState('expanded');
        else setMobileSheetState('peek');
      });
    }

    if (el.sheetHeader) {
      el.sheetHeader.addEventListener('click', (e) => {
        if (e.target.closest('select')) return;
        if (mobileSheetState === 'peek') setMobileSheetState('half');
      });
    }

    // Touch Drag Handling
    let startY = 0;
    let currentY = 0;
    let isDragging = false;

    el.sheetDragHandle.addEventListener('touchstart', (e) => {
      startY = e.touches[0].clientY;
      isDragging = true;
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (!isDragging) return;
      currentY = e.touches[0].clientY;
    }, { passive: true });

    window.addEventListener('touchend', () => {
      if (!isDragging) return;
      isDragging = false;
      const deltaY = currentY - startY;

      if (Math.abs(deltaY) > 30) {
        if (deltaY < 0) {
          // Dragged up
          if (mobileSheetState === 'peek') setMobileSheetState('half');
          else if (mobileSheetState === 'half') setMobileSheetState('expanded');
        } else {
          // Dragged down
          if (mobileSheetState === 'expanded') setMobileSheetState('half');
          else if (mobileSheetState === 'half') setMobileSheetState('peek');
        }
      }
    });
  }

  function setMobileSheetState(state) {
    mobileSheetState = state;
    if (!el.mobileBottomSheet) return;

    el.mobileBottomSheet.classList.remove('state-peek', 'state-half', 'state-expanded');
    el.mobileBottomSheet.classList.add(`state-${state}`);

    if (el.sheetExpandToggleBtn) {
      const icon = el.sheetExpandToggleBtn.querySelector('i');
      if (icon) {
        icon.className = state === 'expanded' ? 'fa-solid fa-chevron-down' : 'fa-solid fa-chevron-up';
      }
    }

    // Update Floating Switcher Pill
    if (el.mobileFloatingPill && el.viewToggleLabel && el.viewToggleIcon) {
      if (state === 'peek') {
        el.viewToggleLabel.innerHTML = `View List (<span id="mobileCountBadge">${filteredStudios.length}</span>)`;
        el.viewToggleIcon.className = 'fa-solid fa-list';
      } else {
        el.viewToggleLabel.textContent = 'View Map';
        el.viewToggleIcon.className = 'fa-solid fa-map';
      }
    }

    // Hide quick preview card if sheet is expanded
    if (state === 'expanded' && el.mobilePreviewCard) {
      el.mobilePreviewCard.style.display = 'none';
    }
  }

  /**
   * Reset All Filters to defaults
   */
  function resetAllFilters() {
    filterState.search = '';
    filterState.maxDistance = 5;
    filterState.rating4Plus = false;
    filterState.verifiedOnly = false;
    filterState.openNowOnly = false;
    filterState.selectedWorkouts.clear();
    filterState.selectedAmenities.clear();
    filterState.selectedPlatforms = new Set(['fitpass', 'fitsquare']);
    filterState.selectedTiers.clear();
    filterState.sortBy = 'distance_asc';

    if (el.searchInput) el.searchInput.value = '';
    if (el.mobileSearchInput) el.mobileSearchInput.value = '';
    if (el.clearSearchBtn) el.clearSearchBtn.classList.remove('visible');
    if (el.clearMobileSearchBtn) el.clearMobileSearchBtn.classList.remove('visible');

    if (el.togglePlatformFitpass) el.togglePlatformFitpass.classList.add('active');
    if (el.togglePlatformFitsquare) el.togglePlatformFitsquare.classList.add('active');

    if (el.ratingFilterBtn) el.ratingFilterBtn.classList.remove('active');
    if (el.openNowFilterBtn) el.openNowFilterBtn.classList.remove('active');
    if (el.verifiedFilterBtn) el.verifiedFilterBtn.classList.remove('active');

    document.querySelectorAll('.chip-item.active').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('#distanceMenu .menu-item').forEach(m => {
      m.classList.toggle('active', m.dataset.distance === '5');
    });

    syncTierPillLabel();
    syncWorkoutPillLabel();
    syncAmenityPillLabel();
    setDistanceFilter(5);
  }

  /**
   * Filter & Sort Engine
   */
  function applyFilters() {
    const query = filterState.search;

    filteredStudios = allStudios.filter(studio => {
      // Platform filter
      const studioPlatforms = studio.platforms || ['fitpass'];
      const hasPlatform = studioPlatforms.some(p => filterState.selectedPlatforms.has(p));
      if (!hasPlatform) return false;

      // FitSquare Tier filter
      if (filterState.selectedTiers.size > 0) {
        const tier = studio.platform_details && studio.platform_details.fitsquare && studio.platform_details.fitsquare.tier;
        if (!tier || !filterState.selectedTiers.has(tier)) return false;
      }

      // Distance filter
      if (studio.distance > filterState.maxDistance) return false;

      // Rating 4.0+
      if (filterState.rating4Plus && (studio.rating || 0) < 4.0) return false;

      // Verified only
      if (filterState.verifiedOnly && !studio.verified) return false;

      // Open now
      if (filterState.openNowOnly && !isStudioOpenNow(studio.open_time)) return false;

      // Search text
      if (query) {
        const nameMatch = studio.name.toLowerCase().includes(query);
        const localityMatch = (studio.locality || '').toLowerCase().includes(query);
        const addressMatch = (studio.address || '').toLowerCase().includes(query);
        const workoutMatch = (studio.workouts || []).some(w => w.toLowerCase().includes(query));
        if (!nameMatch && !localityMatch && !addressMatch && !workoutMatch) return false;
      }

      // Selected Workouts (Match at least one)
      if (filterState.selectedWorkouts.size > 0) {
        const setW = new Set(studio.workouts || []);
        let match = false;
        for (const w of filterState.selectedWorkouts) {
          if (setW.has(w)) { match = true; break; }
        }
        if (!match) return false;
      }

      // Selected Amenities (Must have ALL selected)
      if (filterState.selectedAmenities.size > 0) {
        const setA = new Set(studio.amenities || []);
        for (const a of filterState.selectedAmenities) {
          if (!setA.has(a)) return false;
        }
      }

      return true;
    });

    // Sort Results
    filteredStudios.sort((a, b) => {
      switch (filterState.sortBy) {
        case 'distance_asc':
          return a.distance - b.distance;
        case 'rating_desc':
          return (b.rating || 0) - (a.rating || 0) || a.distance - b.distance;
        case 'reviews_desc':
          return (b.rating_count || 0) - (a.rating_count || 0);
        case 'name_asc':
          return a.name.localeCompare(b.name);
        default:
          return a.distance - b.distance;
      }
    });

    // Update Counts
    const totalCount = filteredStudios.length;
    if (el.resultsCountLabel) el.resultsCountLabel.textContent = `Showing ${totalCount.toLocaleString()} gym${totalCount === 1 ? '' : 's'}`;
    if (el.headerGymCountText) el.headerGymCountText.textContent = `${totalCount.toLocaleString()} Gyms Nearby`;
    if (el.sheetGymCount) el.sheetGymCount.textContent = `${totalCount.toLocaleString()} Gyms Nearby`;
    if (el.mobileCountBadge) el.mobileCountBadge.textContent = totalCount.toLocaleString();

    // Update Filter Active Badge
    updateFilterBadgeCount();

    // Render Markers & Cards
    renderMapMarkers();
    renderCardsList();
  }

  function updateFilterBadgeCount() {
    let count = 0;
    if (filterState.rating4Plus) count++;
    if (filterState.verifiedOnly) count++;
    if (filterState.openNowOnly) count++;
    count += filterState.selectedWorkouts.size;
    count += filterState.selectedAmenities.size;
    if (filterState.selectedPlatforms.size < 2) count++;
    count += filterState.selectedTiers.size;
    if (filterState.maxDistance !== 5) count++;

    if (el.mobileFilterBadge) {
      if (count > 0) {
        el.mobileFilterBadge.textContent = count;
        el.mobileFilterBadge.style.display = 'flex';
      } else {
        el.mobileFilterBadge.style.display = 'none';
      }
    }

    if (el.resetFiltersBtn) {
      el.resetFiltersBtn.style.display = count > 0 ? 'inline-flex' : 'none';
    }
  }

  function isStudioOpenNow(openTimeStr) {
    if (!openTimeStr || typeof openTimeStr !== 'string') return true;
    const parts = openTimeStr.split('-');
    if (parts.length !== 2) return true;
    try {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const [startH, startM] = parts[0].split(':').map(Number);
      const [endH, endM] = parts[1].split(':').map(Number);
      const startMin = startH * 60 + startM;
      const endMin = endH * 60 + endM;

      if (startMin <= endMin) {
        return currentMinutes >= startMin && currentMinutes <= endMin;
      } else {
        return currentMinutes >= startMin || currentMinutes <= endMin;
      }
    } catch (e) {
      return true;
    }
  }

  /**
   * Render Map Markers with Custom Pins
   */
  function renderMapMarkers() {
    if (!markerCluster) return;
    markerCluster.clearLayers();
    studioMarkersMap.clear();

    const newMarkers = [];

    filteredStudios.forEach(studio => {
      const platforms = studio.platforms || ['fitpass'];
      const isMultiPass = platforms.length > 1;
      const isFitSquareOnly = platforms.length === 1 && platforms[0] === 'fitsquare';

      let pinClass = 'pin-fitpass';
      if (isMultiPass) pinClass = 'pin-multipass';
      else if (isFitSquareOnly) pinClass = 'pin-fitsquare';

      const gymIcon = L.divIcon({
        className: 'gym-marker-icon',
        html: `<div class="gym-pin ${pinClass}"><i class="fa-solid fa-dumbbell"></i></div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -30]
      });

      const marker = L.marker([studio.lat, studio.lng], { icon: gymIcon });
      const isOpen = isStudioOpenNow(studio.open_time);
      const ratingStars = studio.rating ? studio.rating.toFixed(1) : 'New';

      // Platform Badges Html
      const platformBadgesHtml = platforms.map(p => {
        if (p === 'fitpass') return '<span class="platform-tag pt-fitpass">FitPass</span>';
        if (p === 'fitsquare') {
          const tier = (studio.platform_details && studio.platform_details.fitsquare && studio.platform_details.fitsquare.tier) || '';
          return `<span class="platform-tag pt-fitsquare-${tier.toLowerCase()}">FitSquare ${escapeHtml(tier)}</span>`;
        }
        return `<span class="platform-tag">${escapeHtml(p)}</span>`;
      }).join(' ');

      // Desktop Popup HTML
      const popupHtml = `
        <div class="popup-card">
          <div class="popup-img-wrap">
            <img class="popup-img" src="${studio.image || 'https://cdn.fitimg.in/studio-profile-6CC82C76E06C6C.jpeg'}" alt="${escapeHtml(studio.name)}" loading="lazy" onerror="this.src='https://cdn.fitimg.in/studio-profile-6CC82C76E06C6C.jpeg'">
            ${studio.logo ? `<img class="popup-logo" src="${studio.logo}" alt="Logo" onerror="this.style.display='none'">` : ''}
          </div>
          <div class="popup-body">
            <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 4px;">
              ${platformBadgesHtml}
            </div>
            <h3 class="popup-name">${escapeHtml(studio.name)}</h3>
            <div class="popup-location-line">
              <i class="fa-solid fa-location-dot" style="color: var(--primary);"></i>
              <span>${escapeHtml(studio.locality || studio.city)} • <strong style="color: var(--primary);">${studio.distance} km</strong></span>
            </div>
            <div class="popup-stats-line">
              <div class="card-rating">
                <i class="fa-solid fa-star"></i>
                <span>${ratingStars}</span>
                <span style="opacity: 0.7;">(${studio.rating_count})</span>
              </div>
              <div class="card-open-status ${isOpen ? 'status-open' : 'status-closed'}">
                ● ${isOpen ? 'Open Now' : 'Closed'}
              </div>
            </div>
            ${(studio.amenities && studio.amenities.length > 0) ? `
              <div class="popup-amenities-row">
                ${studio.amenities.slice(0, 4).map(a => {
                  const icon = AMENITY_ICONS[a] || 'fa-solid fa-check';
                  return `<span class="popup-amenity-chip"><i class="${icon}"></i> <span>${escapeHtml(a)}</span></span>`;
                }).join('')}
                ${studio.amenities.length > 4 ? `<span class="popup-amenity-chip">+${studio.amenities.length - 4}</span>` : ''}
              </div>
            ` : ''}
            <button class="popup-btn-detail" onclick="window.viewStudioDetails('${studio.id}')">
              <i class="fa-solid fa-circle-info"></i> View Full Details
            </button>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, { maxWidth: 300, minWidth: 280 });

      marker.on('click', () => {
        // Highlight in list
        highlightStudioCard(studio.id);

        // On mobile, show docked preview card
        if (window.innerWidth <= 960) {
          showMobilePreviewCard(studio);
        }
      });

      studioMarkersMap.set(String(studio.id), marker);
      newMarkers.push(marker);
    });

    markerCluster.addLayers(newMarkers);
  }

  /**
   * Show Mobile Bottom Preview Card when a Pin is clicked
   */
  function showMobilePreviewCard(studio) {
    if (!el.mobilePreviewCard || !el.previewCardContent) return;

    const platforms = studio.platforms || ['fitpass'];
    const isOpen = isStudioOpenNow(studio.open_time);
    const ratingStars = studio.rating ? studio.rating.toFixed(1) : 'New';

    const platformBadgesHtml = platforms.map(p => {
      if (p === 'fitpass') return '<span class="platform-tag pt-fitpass">FitPass</span>';
      if (p === 'fitsquare') {
        const tier = (studio.platform_details && studio.platform_details.fitsquare && studio.platform_details.fitsquare.tier) || '';
        return `<span class="platform-tag pt-fitsquare-${tier.toLowerCase()}">FitSquare ${escapeHtml(tier)}</span>`;
      }
      return `<span class="platform-tag">${escapeHtml(p)}</span>`;
    }).join(' ');

    const directionsUrl = userCoords
      ? `https://www.google.com/maps/dir/?api=1&origin=${userCoords[0]},${userCoords[1]}&destination=${studio.lat},${studio.lng}`
      : `https://www.google.com/maps/dir/?api=1&destination=${studio.lat},${studio.lng}`;

    el.previewCardContent.innerHTML = `
      <div class="preview-top-row">
        <img class="preview-thumb" src="${studio.image || 'https://cdn.fitimg.in/studio-profile-6CC82C76E06C6C.jpeg'}" alt="${escapeHtml(studio.name)}" onerror="this.src='https://cdn.fitimg.in/studio-profile-6CC82C76E06C6C.jpeg'">
        <div class="preview-info">
          <div style="display: flex; gap: 4px; margin-bottom: 2px;">${platformBadgesHtml}</div>
          <div class="preview-name">${escapeHtml(studio.name)}</div>
          <div class="preview-meta">
            <strong style="color: var(--primary);">${studio.distance} km</strong> • ${escapeHtml(studio.locality || studio.city)}
          </div>
          <div style="display: flex; align-items: center; gap: 8px; margin-top: 3px;">
            <span class="card-rating"><i class="fa-solid fa-star"></i> ${ratingStars} (${studio.rating_count})</span>
            <span class="card-open-status ${isOpen ? 'status-open' : 'status-closed'}">● ${isOpen ? 'Open Now' : 'Closed'}</span>
          </div>
        </div>
      </div>
      <div class="preview-bottom-actions">
        <a href="${directionsUrl}" target="_blank" rel="noopener noreferrer" class="btn-preview-nav btn-nav-primary">
          <i class="fa-solid fa-diamond-turn-right"></i> Directions
        </a>
        <button type="button" class="btn-preview-nav btn-nav-details" onclick="window.viewStudioDetails('${studio.id}')">
          <i class="fa-solid fa-circle-info"></i> Details
        </button>
      </div>
    `;

    el.mobilePreviewCard.style.display = 'block';
    setMobileSheetState('peek');
  }

  /**
   * Render Studio Cards (Desktop Sidebar & Mobile Sheet)
   */
  function renderCardsList() {
    if (!el.studiosList) return;
    el.studiosList.innerHTML = '';
    if (el.mobileCardsList) el.mobileCardsList.innerHTML = '';

    if (filteredStudios.length === 0) {
      const emptyHtml = `
        <div class="empty-state">
          <div class="empty-state-icon"><i class="fa-solid fa-dumbbell"></i></div>
          <h3>No Gyms Found</h3>
          <p>No gyms match your current filter settings. Try expanding your search radius or clearing active filters.</p>
          <button type="button" class="btn-empty-reset" onclick="window.resetFiltersTrigger()">Reset Filters</button>
        </div>
      `;
      el.studiosList.innerHTML = emptyHtml;
      if (el.mobileCardsList) el.mobileCardsList.innerHTML = emptyHtml;
      return;
    }

    const initialBatch = filteredStudios.slice(0, 35);
    appendCardsToContainer(initialBatch, el.studiosList, false);
    if (el.mobileCardsList) appendCardsToContainer(initialBatch, el.mobileCardsList, true);

    let renderedCount = initialBatch.length;
    const handleScroll = (container) => {
      if (renderedCount >= filteredStudios.length) return;
      const { scrollTop, scrollHeight, clientHeight } = container;
      if (scrollTop + clientHeight >= scrollHeight - 350) {
        const nextBatch = filteredStudios.slice(renderedCount, renderedCount + 25);
        appendCardsToContainer(nextBatch, el.studiosList, false);
        if (el.mobileCardsList) appendCardsToContainer(nextBatch, el.mobileCardsList, true);
        renderedCount += nextBatch.length;
      }
    };

    el.studiosList.onscroll = () => handleScroll(el.studiosList);
    const sheetBody = document.getElementById('sheetBody');
    if (sheetBody) sheetBody.onscroll = () => handleScroll(sheetBody);
  }

  function appendCardsToContainer(studios, container, isMobile = false) {
    if (!container) return;

    studios.forEach(studio => {
      const card = document.createElement('div');
      card.className = 'studio-card';
      card.id = `${isMobile ? 'm-' : ''}studio-card-${studio.id}`;

      const ratingStars = studio.rating ? studio.rating.toFixed(1) : 'New';
      const isOpen = isStudioOpenNow(studio.open_time);
      const platforms = studio.platforms || ['fitpass'];

      // Platform Badges
      const cardPlatformsHtml = platforms.map(p => {
        if (p === 'fitpass') return '<span class="platform-tag pt-fitpass"><i class="fa-solid fa-check"></i> FitPass</span>';
        if (p === 'fitsquare') {
          const tier = (studio.platform_details && studio.platform_details.fitsquare && studio.platform_details.fitsquare.tier) || 'Pass';
          return `<span class="platform-tag pt-fitsquare-${tier.toLowerCase()}"><i class="fa-solid fa-cube"></i> FitSquare: ${escapeHtml(tier)}</span>`;
        }
        return `<span class="platform-tag">${escapeHtml(p)}</span>`;
      }).join('');

      // Amenity Icons Preview
      const amenitiesHtml = (studio.amenities || []).slice(0, 4).map(a => {
        const icon = AMENITY_ICONS[a] || 'fa-solid fa-check';
        return `<span class="card-amenity-icon" title="${escapeHtml(a)}"><i class="${icon}"></i></span>`;
      }).join('');

      const directionsUrl = userCoords
        ? `https://www.google.com/maps/dir/?api=1&origin=${userCoords[0]},${userCoords[1]}&destination=${studio.lat},${studio.lng}`
        : `https://www.google.com/maps/dir/?api=1&destination=${studio.lat},${studio.lng}`;

      card.innerHTML = `
        <div class="card-thumb-wrap">
          <img class="card-thumb" src="${studio.image || 'https://cdn.fitimg.in/studio-profile-6CC82C76E06C6C.jpeg'}" alt="${escapeHtml(studio.name)}" loading="lazy" onerror="this.src='https://cdn.fitimg.in/studio-profile-6CC82C76E06C6C.jpeg'">
          ${studio.logo ? `<img class="card-logo-badge" src="${studio.logo}" alt="Logo" onerror="this.style.display='none'">` : ''}
        </div>
        <div class="card-content">
          <div>
            <div class="card-title-row">
              <h3 class="card-name" title="${escapeHtml(studio.name)}">${escapeHtml(studio.name)}</h3>
              ${studio.verified ? '<i class="fa-solid fa-certificate verified-icon" title="Verified Gym"></i>' : ''}
            </div>
            <div class="card-platforms">${cardPlatformsHtml}</div>
            <div class="card-meta-line">
              <span class="card-distance">${studio.distance} km</span>
              <span>•</span>
              <span class="card-locality">${escapeHtml(studio.locality || studio.city)}</span>
            </div>
            <div class="card-stats-line">
              <span class="card-rating"><i class="fa-solid fa-star"></i> ${ratingStars}</span>
              <span class="card-review-count">(${studio.rating_count})</span>
              <span class="card-open-status ${isOpen ? 'status-open' : 'status-closed'}">● ${isOpen ? 'Open' : 'Closed'}</span>
            </div>
          </div>
          ${amenitiesHtml ? `<div class="card-amenities-row">${amenitiesHtml}</div>` : ''}
          <div class="card-actions-row">
            <a href="${directionsUrl}" target="_blank" rel="noopener noreferrer" class="btn-card-action btn-card-directions" onclick="event.stopPropagation()">
              <i class="fa-solid fa-diamond-turn-right"></i> Directions
            </a>
            <button type="button" class="btn-card-action btn-card-details" onclick="event.stopPropagation(); window.viewStudioDetails('${studio.id}')">
              <i class="fa-solid fa-circle-info"></i> Details
            </button>
          </div>
        </div>
      `;

      card.addEventListener('click', () => {
        focusStudioOnMap(studio);
      });

      container.appendChild(card);
    });
  }

  function focusStudioOnMap(studio) {
    highlightStudioCard(studio.id);

    const marker = studioMarkersMap.get(String(studio.id));
    if (marker && markerCluster && map) {
      markerCluster.zoomToShowLayer(marker, () => {
        map.setView([studio.lat, studio.lng], Math.max(map.getZoom(), 15), { animate: true });
        marker.openPopup();
      });
    }

    if (window.innerWidth <= 960) {
      showMobilePreviewCard(studio);
    }
  }

  function highlightStudioCard(studioId) {
    document.querySelectorAll('.studio-card.active').forEach(c => c.classList.remove('active'));
    const desktopCard = document.getElementById(`studio-card-${studioId}`);
    if (desktopCard) {
      desktopCard.classList.add('active');
      desktopCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    const mobileCard = document.getElementById(`m-studio-card-${studioId}`);
    if (mobileCard) {
      mobileCard.classList.add('active');
      mobileCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  /**
   * Studio Details Full Modal / Slide-Over Sheet
   */
  function openModal(studio) {
    activeStudio = studio;

    el.modalBannerImg.src = studio.image || (studio.gallery && studio.gallery[0]) || 'https://cdn.fitimg.in/studio-profile-6CC82C76E06C6C.jpeg';
    el.modalLogoImg.src = studio.logo || 'https://cdn.fitimg.in/studio_logo_63AA4A977C3235.png';
    el.modalStudioName.textContent = studio.name;
    el.modalAddressText.textContent = studio.address || `${studio.locality}, ${studio.city}`;

    const isOpen = isStudioOpenNow(studio.open_time);
    el.modalBadgesRow.innerHTML = `
      <span class="detail-pill" style="background: var(--primary-light); color: var(--primary);">
        <i class="fa-solid fa-location-dot"></i> ${studio.distance} km away
      </span>
      <span class="detail-pill" style="background: #FEF3C7; color: #B45309;">
        <i class="fa-solid fa-star"></i> ${studio.rating ? studio.rating.toFixed(1) : 'New'} (${studio.rating_count} reviews)
      </span>
      <span class="detail-pill" style="background: ${isOpen ? '#ECFDF5' : '#F1F5F9'}; color: ${isOpen ? '#059669' : '#64748B'};">
        <i class="fa-solid fa-clock"></i> ${isOpen ? 'Open Now' : 'Closed'} (${studio.open_time})
      </span>
      ${studio.verified ? '<span class="detail-pill" style="background: #EFF6FF; color: #1D4ED8;"><i class="fa-solid fa-shield-halved"></i> Verified</span>' : ''}
    `;

    // Supported Platforms & Access Cards
    if (el.modalPlatformCardsGrid) {
      el.modalPlatformCardsGrid.innerHTML = '';
      const platforms = studio.platforms || ['fitpass'];
      const pDetails = studio.platform_details || {};

      platforms.forEach(p => {
        if (p === 'fitpass') {
          const fp = pDetails.fitpass || {
            name: studio.name,
            rating: studio.rating,
            rating_count: studio.rating_count,
            url: studio.url || `https://fitpass.co.in/studio/${studio.id}`
          };
          const card = document.createElement('div');
          card.className = 'pac-card card-fitpass';
          card.innerHTML = `
            <div class="pac-card-header">
              <span class="pac-brand" style="color: #0284C7;"><i class="fa-solid fa-ticket"></i> FITPASS</span>
              <span class="platform-tag pt-fitpass">All-Access Pass</span>
            </div>
            <div class="pac-body">
              <div><strong>${escapeHtml(fp.name || studio.name)}</strong></div>
              <div><i class="fa-solid fa-star text-amber-500"></i> ${fp.rating ? fp.rating.toFixed(1) : 'New'} (${fp.rating_count || 0} reviews)</div>
              <div style="color: #059669;"><i class="fa-solid fa-circle-check"></i> Included in all FitPass memberships</div>
            </div>
            <a href="${fp.url}" target="_blank" rel="noopener noreferrer" class="pac-btn pac-btn-fitpass">
              <span>View on FitPass</span> <i class="fa-solid fa-arrow-up-right-from-square"></i>
            </a>
          `;
          el.modalPlatformCardsGrid.appendChild(card);
        } else if (p === 'fitsquare') {
          const fs = pDetails.fitsquare || {
            name: studio.name,
            tier: 'Standard',
            rating: studio.rating,
            rating_count: studio.rating_count,
            url: `https://fitsquare.in/gym/${studio.id}`
          };
          const tier = fs.tier || 'Standard';
          const card = document.createElement('div');
          card.className = 'pac-card card-fitsquare';
          card.innerHTML = `
            <div class="pac-card-header">
              <span class="pac-brand" style="color: #EA580C;"><i class="fa-solid fa-cube"></i> FITSQUARE</span>
              <span class="platform-tag pt-fitsquare-${tier.toLowerCase()}">${escapeHtml(tier)} Tier</span>
            </div>
            <div class="pac-body">
              <div><strong>${escapeHtml(fs.name || studio.name)}</strong></div>
              <div><i class="fa-solid fa-star text-amber-500"></i> ${fs.rating ? fs.rating.toFixed(1) : 'New'} (${fs.rating_count || 0} reviews)</div>
              ${fs.telephone ? `<div><i class="fa-solid fa-phone text-blue-600"></i> ${escapeHtml(fs.telephone)}</div>` : ''}
              <div style="color: #EA580C;"><i class="fa-solid fa-tag"></i> Lifetime valid session pack access</div>
            </div>
            <a href="${fs.url}" target="_blank" rel="noopener noreferrer" class="pac-btn pac-btn-fitsquare">
              <span>View on FitSquare</span> <i class="fa-solid fa-arrow-up-right-from-square"></i>
            </a>
          `;
          el.modalPlatformCardsGrid.appendChild(card);
        }
      });
    }

    // Amenities Grid
    if (studio.amenities && studio.amenities.length > 0) {
      el.modalAmenitiesSection.style.display = 'flex';
      el.modalAmenitiesGrid.innerHTML = studio.amenities.map(a => {
        const icon = AMENITY_ICONS[a] || 'fa-solid fa-check';
        return `
          <div class="amenity-cell">
            <i class="${icon}"></i>
            <span>${escapeHtml(a)}</span>
          </div>
        `;
      }).join('');
    } else {
      el.modalAmenitiesSection.style.display = 'none';
    }

    // Workouts
    if (studio.workouts && studio.workouts.length > 0) {
      el.modalWorkoutsSection.style.display = 'flex';
      el.modalWorkoutsList.innerHTML = studio.workouts.map(w =>
        `<span class="workout-badge">${escapeHtml(w)}</span>`
      ).join('');
    } else {
      el.modalWorkoutsSection.style.display = 'none';
    }

    // About Section
    if (studio.about) {
      el.modalAboutSection.style.display = 'flex';
      el.modalAboutText.textContent = studio.about;
    } else {
      el.modalAboutSection.style.display = 'none';
    }

    // Gallery
    const galleryItems = (studio.gallery_detailed && studio.gallery_detailed.length > 0)
      ? studio.gallery_detailed.map(g => g.url)
      : (studio.gallery && studio.gallery.length > 0 ? studio.gallery : (studio.image ? [studio.image] : []));

    if (galleryItems.length > 0) {
      el.modalGallerySection.style.display = 'flex';
      el.modalGalleryGrid.innerHTML = galleryItems.map(url => `
        <img class="gallery-photo-thumb" src="${url}" alt="Gallery" loading="lazy" onclick="window.setModalHeroPhoto('${url}')">
      `).join('');
    } else {
      el.modalGallerySection.style.display = 'none';
    }

    // Reviews
    if (studio.reviews && studio.reviews.length > 0) {
      el.modalReviewsSection.style.display = 'flex';
      el.modalReviewsList.innerHTML = studio.reviews.map(r => `
        <div class="review-item-card">
          <div class="review-meta">
            <span>${escapeHtml(r.user_name || 'Fitness Member')}</span>
            <span class="card-rating"><i class="fa-solid fa-star"></i> ${r.star || 5}</span>
          </div>
          <p class="review-text">${escapeHtml(r.message || 'Great fitness center.')}</p>
        </div>
      `).join('');
    } else {
      el.modalReviewsSection.style.display = 'none';
    }

    // Directions Link
    el.modalGoogleMapsLink.href = userCoords
      ? `https://www.google.com/maps/dir/?api=1&origin=${userCoords[0]},${userCoords[1]}&destination=${studio.lat},${studio.lng}`
      : `https://www.google.com/maps/dir/?api=1&destination=${studio.lat},${studio.lng}`;

    el.studioModalBackdrop.classList.add('open');
  }

  function closeModal() {
    if (el.studioModalBackdrop) el.studioModalBackdrop.classList.remove('open');
  }

  // Utilities
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Global window handlers
  window.viewStudioDetails = function (id) {
    const s = allStudios.find(item => String(item.id) === String(id));
    if (s) openModal(s);
  };

  window.setModalHeroPhoto = function (src) {
    if (el.modalBannerImg) el.modalBannerImg.src = src;
  };

  window.resetFiltersTrigger = resetAllFilters;

  document.addEventListener('DOMContentLoaded', init);

})();
