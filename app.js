/**
 * FitPass Gym Map Explorer
 * Interactive Map & Directory for FitPass Studios near Oberoi Mall & Pan-India
 */

(function () {
  'use strict';

  // State Management
  let allStudios = [];
  let filteredStudios = [];
  let map = null;
  let markerCluster = null;
  let studioMarkersMap = new Map(); // id -> L.marker
  let userMarker = null;
  let currentTileIndex = 0;
  let tileLayers = [];
  let activeStudio = null;

  // Filter States
  const filterState = {
    search: '',
    maxDistance: 5, // default 5 km (nearby Oberoi Mall)
    rating4Plus: false,
    verifiedOnly: false,
    openNowOnly: false,
    selectedWorkouts: new Set(),
    selectedAmenities: new Set(),
    sortBy: 'distance_asc'
  };

  // Reference Location (Oberoi Mall, Goregaon East)
  const REF_COORDS = [19.1742, 72.86041];

  // Tile Providers (100% Free, No API key needed, Universal compatibility)
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
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom',
      maxZoom: 19
    },
    {
      name: 'Carto Voyager (Clean Colorful)',
      url: 'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 19
    },
    {
      name: 'Carto Dark (Night Mode)',
      url: 'https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 19
    }
  ];

  // Amenity Icons Mapping
  const AMENITY_ICONS = {
    'Air Conditioner': 'fa-solid fa-snowflake',
    'Parking': 'fa-solid fa-square-parking',
    'WiFi': 'fa-solid fa-wifi',
    'Water Cooler': 'fa-solid fa-glass-water',
    'Locker': 'fa-solid fa-lock',
    'Cafeteria': 'fa-solid fa-mug-hot',
    'Certified Trainers': 'fa-solid fa-user-tie'
  };

  // Top Workouts to emphasize
  const POPULAR_WORKOUTS = [
    'Gym Workout', 'Yoga', 'Zumba', 'HIIT', 'Crossfit', 'Swimming',
    'Pilates', 'Strength Training', 'Core', 'Cardio', 'Abs Workout',
    'MMA', 'Combat', 'Dance', 'Gym Workout (Women Only)'
  ];

  // DOM Elements
  const el = {
    map: document.getElementById('map'),
    appContainer: document.getElementById('appContainer'),
    studiosList: document.getElementById('studiosList'),
    searchInput: document.getElementById('searchInput'),
    clearSearchBtn: document.getElementById('clearSearchBtn'),
    distancePresets: document.getElementById('distancePresets'),
    distanceRangeSlider: document.getElementById('distanceRangeSlider'),
    sliderDistanceVal: document.getElementById('sliderDistanceVal'),
    toggleFiltersDrawerBtn: document.getElementById('toggleFiltersDrawerBtn'),
    filtersDrawer: document.getElementById('filtersDrawer'),
    activeFilterBadge: document.getElementById('activeFilterBadge'),
    ratingFilterBtn: document.getElementById('ratingFilterBtn'),
    verifiedFilterBtn: document.getElementById('verifiedFilterBtn'),
    openNowFilterBtn: document.getElementById('openNowFilterBtn'),
    resetFiltersBtn: document.getElementById('resetFiltersBtn'),
    sortSelect: document.getElementById('sortSelect'),
    resultsCountLabel: document.getElementById('resultsCountLabel'),
    headerCounterBadge: document.getElementById('headerCounterBadge'),
    recenterBtn: document.getElementById('recenterBtn'),
    mapCenterMeBtn: document.getElementById('mapCenterMeBtn'),
    mapFitBoundsBtn: document.getElementById('mapFitBoundsBtn'),
    toggleTileLayerBtn: document.getElementById('toggleTileLayerBtn'),
    workoutChipsContainer: document.getElementById('workoutChipsContainer'),
    amenityChipsContainer: document.getElementById('amenityChipsContainer'),
    mobileShowListBtn: document.getElementById('mobileShowListBtn'),
    mobileShowMapBtn: document.getElementById('mobileShowMapBtn'),
    mobileCount: document.getElementById('mobileCount'),
    // Modal Elements
    studioModalBackdrop: document.getElementById('studioModalBackdrop'),
    modalCloseBtn: document.getElementById('modalCloseBtn'),
    modalBannerImg: document.getElementById('modalBannerImg'),
    modalLogoImg: document.getElementById('modalLogoImg'),
    modalStudioName: document.getElementById('modalStudioName'),
    modalStudioAddress: document.getElementById('modalStudioAddress'),
    modalAddressText: document.getElementById('modalAddressText'),
    copyAddressBtn: document.getElementById('copyAddressBtn'),
    modalBadgesRow: document.getElementById('modalBadgesRow'),
    modalAmenitiesSection: document.getElementById('modalAmenitiesSection'),
    modalAmenitiesGrid: document.getElementById('modalAmenitiesGrid'),
    modalWorkoutsList: document.getElementById('modalWorkoutsList'),
    modalAboutSection: document.getElementById('modalAboutSection'),
    modalAboutText: document.getElementById('modalAboutText'),
    modalGallerySection: document.getElementById('modalGallerySection'),
    modalGalleryGrid: document.getElementById('modalGalleryGrid'),
    modalReviewsSection: document.getElementById('modalReviewsSection'),
    modalReviewsList: document.getElementById('modalReviewsList'),
    modalFitpassLink: document.getElementById('modalFitpassLink'),
    modalGoogleMapsLink: document.getElementById('modalGoogleMapsLink')
  };

  /**
   * Initialize App
   */
  async function init() {
    loadData();
    initMap();
    initFiltersUI();
    bindEvents();
    applyFilters();
  }

  /**
   * Load Data from window.FITPASS_DATA or fetch fallback
   */
  function loadData() {
    if (window.FITPASS_DATA && window.FITPASS_DATA.studios) {
      allStudios = window.FITPASS_DATA.studios;
      console.log(`Loaded ${allStudios.length} studios from FITPASS_DATA`);
    } else {
      console.warn("window.FITPASS_DATA not found. Trying fetch fallback...");
      fetch('studios_data.json')
        .then(res => res.json())
        .then(data => {
          allStudios = data.studios;
          applyFilters();
        })
        .catch(err => {
          console.error("Failed to load studios data:", err);
          el.studiosList.innerHTML = `<div class="empty-state">
            <i class="fa-solid fa-triangle-exclamation"></i>
            <h3>Data Not Loaded</h3>
            <p>Please ensure studios_data.js or studios_data.json is present.</p>
          </div>`;
        });
    }
  }

  /**
   * Initialize Leaflet Map
   */
  function initMap() {
    map = L.map('map', {
      center: REF_COORDS,
      zoom: 14,
      zoomControl: true,
      maxZoom: 19,
      minZoom: 4
    });

    // Base Maps Object for Layer Switcher
    const baseLayersMap = {};

    // Setup Tile Layers
    TILE_STYLES.forEach((style, index) => {
      const layer = L.tileLayer(style.url, {
        attribution: style.attribution,
        maxZoom: style.maxZoom || 19,
        subdomains: style.subdomains || 'abc'
      });

      // Handle tile error fallback
      layer.on('tileerror', function(error, tile) {
        console.warn(`Tile failed to load: ${error.url}`);
      });

      tileLayers.push(layer);
      baseLayersMap[style.name] = layer;

      // Add first layer as default
      if (index === 0) layer.addTo(map);
    });

    // Add Native Leaflet Layer Switcher Control
    L.control.layers(baseLayersMap, null, { position: 'topright', collapsed: true }).addTo(map);

    // User Beacon Marker (Oberoi Mall)
    const userIcon = L.divIcon({
      className: 'user-marker-icon',
      html: '<div class="user-beacon"></div>',
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    userMarker = L.marker(REF_COORDS, { icon: userIcon, zIndexOffset: 2000 })
      .addTo(map)
      .bindPopup(`
        <div style="padding: 10px; font-family: inherit;">
          <div style="font-weight: 800; font-size: 14px; color: #0A1F34;">📍 You are here</div>
          <div style="font-size: 12px; color: #64748B; margin-top: 2px;">Oberoi Mall, Goregaon East, Mumbai</div>
          <div style="font-size: 11px; color: #D6383B; font-weight: 600; margin-top: 4px;">Search reference origin</div>
        </div>
      `, { offset: [0, -6] });

    // Marker Cluster Group
    markerCluster = L.markerClusterGroup({
      chunkedLoading: true,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      maxClusterRadius: 45
    });

    map.addLayer(markerCluster);

    // Ensure map tiles are sized and rendered properly across all viewports
    const fixMapSize = () => {
      if (map) {
        map.invalidateSize();
      }
    };

    setTimeout(fixMapSize, 100);
    setTimeout(fixMapSize, 400);
    setTimeout(fixMapSize, 1000);
    window.addEventListener('resize', fixMapSize);
    window.addEventListener('load', fixMapSize);
  }

  /**
   * Initialize Filter UI Options (Workout & Amenity Chips)
   */
  function initFiltersUI() {
    // Workout Chips
    const availableWorkouts = new Set();
    allStudios.forEach(s => {
      (s.workouts || []).forEach(w => availableWorkouts.add(w));
    });

    // Combine popular first, then others
    const sortedWorkouts = Array.from(availableWorkouts).sort((a, b) => {
      const aPop = POPULAR_WORKOUTS.indexOf(a);
      const bPop = POPULAR_WORKOUTS.indexOf(b);
      if (aPop !== -1 && bPop !== -1) return aPop - bPop;
      if (aPop !== -1) return -1;
      if (bPop !== -1) return 1;
      return a.localeCompare(b);
    });

    el.workoutChipsContainer.innerHTML = '';
    sortedWorkouts.slice(0, 25).forEach(workout => {
      const chip = document.createElement('button');
      chip.className = 'filter-chip';
      chip.textContent = workout;
      chip.dataset.workout = workout;
      chip.addEventListener('click', () => {
        if (filterState.selectedWorkouts.has(workout)) {
          filterState.selectedWorkouts.delete(workout);
          chip.classList.remove('active');
        } else {
          filterState.selectedWorkouts.add(workout);
          chip.classList.add('active');
        }
        updateActiveFilterBadge();
        applyFilters();
      });
      el.workoutChipsContainer.appendChild(chip);
    });

    // Amenity Chips
    const standardAmenities = Object.keys(AMENITY_ICONS);
    el.amenityChipsContainer.innerHTML = '';
    standardAmenities.forEach(amenity => {
      const chip = document.createElement('button');
      chip.className = 'filter-chip';
      const iconClass = AMENITY_ICONS[amenity] || 'fa-solid fa-check';
      chip.innerHTML = `<i class="${iconClass}"></i><span>${amenity}</span>`;
      chip.dataset.amenity = amenity;
      chip.addEventListener('click', () => {
        if (filterState.selectedAmenities.has(amenity)) {
          filterState.selectedAmenities.delete(amenity);
          chip.classList.remove('active');
        } else {
          filterState.selectedAmenities.add(amenity);
          chip.classList.add('active');
        }
        updateActiveFilterBadge();
        applyFilters();
      });
      el.amenityChipsContainer.appendChild(chip);
    });
  }

  /**
   * Bind DOM Events
   */
  function bindEvents() {
    // Search Input
    let debounceTimer = null;
    el.searchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      const val = e.target.value.trim();
      el.clearSearchBtn.classList.toggle('visible', val.length > 0);
      debounceTimer = setTimeout(() => {
        filterState.search = val.toLowerCase();
        applyFilters();
      }, 200);
    });

    el.clearSearchBtn.addEventListener('click', () => {
      el.searchInput.value = '';
      el.clearSearchBtn.classList.remove('visible');
      filterState.search = '';
      applyFilters();
    });

    // Distance Presets Click
    el.distancePresets.addEventListener('click', (e) => {
      const pill = e.target.closest('.dist-pill');
      if (!pill) return;

      document.querySelectorAll('#distancePresets .dist-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');

      const dist = pill.dataset.distance;
      if (dist === 'all') {
        filterState.maxDistance = 99999;
        el.distanceRangeSlider.value = 50;
        el.sliderDistanceVal.textContent = 'All India';
      } else {
        const val = parseFloat(dist);
        filterState.maxDistance = val;
        el.distanceRangeSlider.value = Math.min(50, val);
        el.sliderDistanceVal.textContent = `${val} km`;
      }
      applyFilters();
    });

    // Distance Slider
    el.distanceRangeSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      filterState.maxDistance = val;
      el.sliderDistanceVal.textContent = `${val} km`;

      // Update preset pills active state
      document.querySelectorAll('#distancePresets .dist-pill').forEach(p => {
        p.classList.toggle('active', parseFloat(p.dataset.distance) === val);
      });

      applyFilters();
    });

    // Toggle Filters Drawer
    el.toggleFiltersDrawerBtn.addEventListener('click', () => {
      const isOpen = el.filtersDrawer.classList.toggle('open');
      el.toggleFiltersDrawerBtn.classList.toggle('active', isOpen);
    });

    // Quick Filter: Rating 4.0+
    el.ratingFilterBtn.addEventListener('click', () => {
      filterState.rating4Plus = !filterState.rating4Plus;
      el.ratingFilterBtn.classList.toggle('active', filterState.rating4Plus);
      updateActiveFilterBadge();
      applyFilters();
    });

    // Quick Filter: Verified Only
    el.verifiedFilterBtn.addEventListener('click', () => {
      filterState.verifiedOnly = !filterState.verifiedOnly;
      el.verifiedFilterBtn.classList.toggle('active', filterState.verifiedOnly);
      updateActiveFilterBadge();
      applyFilters();
    });

    // Quick Filter: Open Now
    el.openNowFilterBtn.addEventListener('click', () => {
      filterState.openNowOnly = !filterState.openNowOnly;
      el.openNowFilterBtn.classList.toggle('active', filterState.openNowOnly);
      updateActiveFilterBadge();
      applyFilters();
    });

    // Reset All Filters
    el.resetFiltersBtn.addEventListener('click', resetAllFilters);

    // Sort Dropdown
    el.sortSelect.addEventListener('change', (e) => {
      filterState.sortBy = e.target.value;
      applyFilters();
    });

    // Recenter buttons
    const recenterAction = () => {
      map.setView(REF_COORDS, 14, { animate: true });
      if (userMarker) userMarker.openPopup();
    };
    el.recenterBtn.addEventListener('click', recenterAction);
    el.mapCenterMeBtn.addEventListener('click', recenterAction);

    // Fit map bounds to current markers
    el.mapFitBoundsBtn.addEventListener('click', () => {
      if (markerCluster.getLayers().length > 0) {
        map.fitBounds(markerCluster.getBounds(), { padding: [40, 40], maxZoom: 16 });
      }
    });

    // Tile Layer Switcher
    el.toggleTileLayerBtn.addEventListener('click', () => {
      map.removeLayer(tileLayers[currentTileIndex]);
      currentTileIndex = (currentTileIndex + 1) % tileLayers.length;
      map.addLayer(tileLayers[currentTileIndex]);
      const currentStyle = TILE_STYLES[currentTileIndex];
      el.toggleTileLayerBtn.title = `Current Style: ${currentStyle.name} (Click to change)`;
    });

    // Mobile View Toggle
    el.mobileShowListBtn.addEventListener('click', () => {
      el.appContainer.className = 'app-container show-list';
      el.mobileShowListBtn.classList.add('active');
      el.mobileShowMapBtn.classList.remove('active');
    });

    el.mobileShowMapBtn.addEventListener('click', () => {
      el.appContainer.className = 'app-container show-map';
      el.mobileShowMapBtn.classList.add('active');
      el.mobileShowListBtn.classList.remove('active');
      setTimeout(() => map.invalidateSize(), 200);
    });

    // Modal Close
    el.modalCloseBtn.addEventListener('click', closeModal);
    el.studioModalBackdrop.addEventListener('click', (e) => {
      if (e.target === el.studioModalBackdrop) closeModal();
    });

    // Copy Address Button
    el.copyAddressBtn.addEventListener('click', () => {
      const text = el.modalAddressText.textContent;
      navigator.clipboard.writeText(text).then(() => {
        const icon = el.copyAddressBtn.querySelector('i');
        icon.className = 'fa-solid fa-check text-green-600';
        setTimeout(() => {
          icon.className = 'fa-regular fa-copy';
        }, 1500);
      });
    });

    // Keyboard ESC to close modal
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && el.studioModalBackdrop.classList.contains('open')) {
        closeModal();
      }
    });
  }

  /**
   * Reset all filters to default state
   */
  function resetAllFilters() {
    filterState.search = '';
    filterState.maxDistance = 5;
    filterState.rating4Plus = false;
    filterState.verifiedOnly = false;
    filterState.openNowOnly = false;
    filterState.selectedWorkouts.clear();
    filterState.selectedAmenities.clear();
    filterState.sortBy = 'distance_asc';

    el.searchInput.value = '';
    el.clearSearchBtn.classList.remove('visible');
    el.sortSelect.value = 'distance_asc';
    el.ratingFilterBtn.classList.remove('active');
    el.verifiedFilterBtn.classList.remove('active');
    el.openNowFilterBtn.classList.remove('active');
    el.distanceRangeSlider.value = 5;
    el.sliderDistanceVal.textContent = '5 km';

    document.querySelectorAll('#distancePresets .dist-pill').forEach(p => {
      p.classList.toggle('active', p.dataset.distance === '5');
    });

    document.querySelectorAll('#workoutChipsContainer .filter-chip').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('#amenityChipsContainer .filter-chip').forEach(c => c.classList.remove('active'));

    updateActiveFilterBadge();
    applyFilters();
  }

  /**
   * Update Badge count for active filters
   */
  function updateActiveFilterBadge() {
    let count = 0;
    if (filterState.rating4Plus) count++;
    if (filterState.verifiedOnly) count++;
    if (filterState.openNowOnly) count++;
    count += filterState.selectedWorkouts.size;
    count += filterState.selectedAmenities.size;
    if (filterState.maxDistance !== 5) count++;

    if (count > 0) {
      el.activeFilterBadge.textContent = count;
      el.activeFilterBadge.style.display = 'inline-block';
      el.resetFiltersBtn.style.display = 'inline-flex';
    } else {
      el.activeFilterBadge.style.display = 'none';
      el.resetFiltersBtn.style.display = 'none';
    }
  }

  /**
   * Check if studio is currently open based on open_time string
   */
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
        // Overnight window
        return currentMinutes >= startMin || currentMinutes <= endMin;
      }
    } catch (e) {
      return true;
    }
  }

  /**
   * Main Filter & Sort Engine
   */
  function applyFilters() {
    const query = filterState.search;

    filteredStudios = allStudios.filter(studio => {
      // Distance filter
      if (studio.distance > filterState.maxDistance) return false;

      // Rating 4.0+
      if (filterState.rating4Plus && (studio.rating || 0) < 4.0) return false;

      // Verified
      if (filterState.verifiedOnly && !studio.verified) return false;

      // Open now
      if (filterState.openNowOnly && !isStudioOpenNow(studio.open_time)) return false;

      // Text search
      if (query) {
        const nameMatch = studio.name.toLowerCase().includes(query);
        const localityMatch = (studio.locality || '').toLowerCase().includes(query);
        const addressMatch = (studio.address || '').toLowerCase().includes(query);
        const workoutMatch = (studio.workouts || []).some(w => w.toLowerCase().includes(query));
        if (!nameMatch && !localityMatch && !addressMatch && !workoutMatch) return false;
      }

      // Selected Workouts (Must offer at least one selected workout)
      if (filterState.selectedWorkouts.size > 0) {
        const studioWorkouts = new Set(studio.workouts || []);
        let hasMatch = false;
        for (const w of filterState.selectedWorkouts) {
          if (studioWorkouts.has(w)) {
            hasMatch = true;
            break;
          }
        }
        if (!hasMatch) return false;
      }

      // Selected Amenities (Must offer ALL selected amenities)
      if (filterState.selectedAmenities.size > 0) {
        const studioAmenities = new Set(studio.amenities || []);
        for (const a of filterState.selectedAmenities) {
          if (!studioAmenities.has(a)) return false;
        }
      }

      return true;
    });

    // Sorting
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

    // Update Counter Badges
    const totalCount = filteredStudios.length;
    el.resultsCountLabel.textContent = `Showing ${totalCount.toLocaleString()} gym${totalCount === 1 ? '' : 's'}`;
    el.headerCounterBadge.textContent = `${totalCount.toLocaleString()} Gyms Nearby`;
    el.mobileCount.textContent = totalCount.toLocaleString();

    // Render Markers & Cards
    renderMapMarkers();
    renderCardsList();
  }

  /**
   * Render Map Markers with Leaflet MarkerCluster
   */
  function renderMapMarkers() {
    markerCluster.clearLayers();
    studioMarkersMap.clear();

    const gymIcon = L.divIcon({
      className: 'gym-marker-icon',
      html: '<div class="gym-pin"><i class="fa-solid fa-dumbbell"></i></div>',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -30]
    });

    const newMarkers = [];

    filteredStudios.forEach(studio => {
      const marker = L.marker([studio.lat, studio.lng], { icon: gymIcon });

      const isOpen = isStudioOpenNow(studio.open_time);
      const ratingStars = studio.rating ? studio.rating.toFixed(1) : 'New';

      // Custom rich popup
      const popupHtml = `
        <div class="popup-card">
          <div class="popup-img-wrapper">
            <img class="popup-img" src="${studio.image || 'https://cdn.fitimg.in/studio-profile-6CC82C76E06C6C.jpeg'}" alt="${escapeHtml(studio.name)}" loading="lazy" onerror="this.src='https://cdn.fitimg.in/studio-profile-6CC82C76E06C6C.jpeg'">
            ${studio.logo ? `<img class="popup-logo" src="${studio.logo}" alt="Logo" onerror="this.style.display='none'">` : ''}
          </div>
          <div class="popup-body">
            <h3 class="popup-name">${escapeHtml(studio.name)}</h3>
            <div class="popup-locality">
              <i class="fa-solid fa-location-dot" style="color: var(--primary);"></i>
              ${escapeHtml(studio.locality || studio.city)} • <strong style="color: var(--primary);">${studio.distance} km</strong>
            </div>

            <div class="popup-stats">
              <div class="rating-badge">
                <i class="fa-solid fa-star"></i>
                <span>${ratingStars}</span>
                <span style="opacity: 0.7; font-weight: 500;">(${studio.rating_count})</span>
              </div>
              <div style="font-size: 11px; font-weight: 600; color: ${isOpen ? '#10B981' : '#EF4444'};">
                <i class="fa-solid fa-circle" style="font-size: 7px; vertical-align: middle;"></i> ${isOpen ? 'Open Now' : 'Closed'}
              </div>
            </div>

            <div class="popup-workouts">
              ${(studio.workouts || []).slice(0, 3).map(w => `<span class="workout-tag">${escapeHtml(w)}</span>`).join('')}
            </div>

            <button class="popup-btn" onclick="window.viewStudioDetails(${studio.id})">
              <i class="fa-solid fa-circle-info"></i> View Full Details
            </button>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, { maxWidth: 300, minWidth: 280 });

      marker.on('click', () => {
        highlightCard(studio.id);
      });

      studioMarkersMap.set(studio.id, marker);
      newMarkers.push(marker);
    });

    markerCluster.addLayers(newMarkers);
  }

  /**
   * Render Studio Cards in Sidebar (Paginated/Chunked for high performance)
   */
  function renderCardsList() {
    el.studiosList.innerHTML = '';

    if (filteredStudios.length === 0) {
      el.studiosList.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-dumbbell"></i>
          <h3>No Gyms Found</h3>
          <p>No gyms match your current filter criteria. Try expanding the distance or clearing filters.</p>
          <button class="filter-btn active" onclick="window.resetFiltersTrigger()">Reset Filters</button>
        </div>
      `;
      return;
    }

    // Render first 40 cards, then append more on scroll
    const initialBatch = filteredStudios.slice(0, 40);
    appendCards(initialBatch);

    let renderedCount = initialBatch.length;
    el.studiosList.onscroll = () => {
      if (renderedCount >= filteredStudios.length) return;
      const { scrollTop, scrollHeight, clientHeight } = el.studiosList;
      if (scrollTop + clientHeight >= scrollHeight - 300) {
        const nextBatch = filteredStudios.slice(renderedCount, renderedCount + 30);
        appendCards(nextBatch);
        renderedCount += nextBatch.length;
      }
    };
  }

  function appendCards(studios) {
    studios.forEach(studio => {
      const card = document.createElement('div');
      card.className = 'studio-card';
      card.id = `studio-card-${studio.id}`;

      const ratingStars = studio.rating ? studio.rating.toFixed(1) : 'New';
      const isOpen = isStudioOpenNow(studio.open_time);

      // Workouts preview
      const workoutsHtml = (studio.workouts || []).slice(0, 3).map(w =>
        `<span class="workout-tag">${escapeHtml(w)}</span>`
      ).join('');
      const moreWorkouts = (studio.workouts || []).length > 3 ? `<span class="workout-tag">+${studio.workouts.length - 3}</span>` : '';

      // Amenities icons preview
      const amenitiesHtml = (studio.amenities || []).slice(0, 4).map(a => {
        const icon = AMENITY_ICONS[a] || 'fa-solid fa-check';
        return `<span class="amenity-icon-item" title="${escapeHtml(a)}"><i class="${icon}"></i></span>`;
      }).join('');

      card.innerHTML = `
        <div class="studio-thumb-wrapper">
          <img class="studio-thumb" src="${studio.image || 'https://cdn.fitimg.in/studio-profile-6CC82C76E06C6C.jpeg'}" alt="${escapeHtml(studio.name)}" loading="lazy" onerror="this.src='https://cdn.fitimg.in/studio-profile-6CC82C76E06C6C.jpeg'">
          ${studio.logo ? `<img class="studio-logo-overlay" src="${studio.logo}" alt="Logo" onerror="this.style.display='none'">` : ''}
        </div>
        <div class="studio-info">
          <div>
            <div class="studio-title-row">
              <h3 class="studio-name" title="${escapeHtml(studio.name)}">${escapeHtml(studio.name)}</h3>
              ${studio.verified ? '<i class="fa-solid fa-certificate verified-icon" title="FITPASS Verified Partner"></i>' : ''}
            </div>
            <div class="studio-meta-row">
              <span class="meta-distance">${studio.distance} km away</span>
              <span>•</span>
              <span class="truncate">${escapeHtml(studio.locality || studio.city)}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; margin-top: 5px;">
              <span class="rating-badge">
                <i class="fa-solid fa-star"></i>
                ${ratingStars}
              </span>
              <span class="rating-reviews">(${studio.rating_count} reviews)</span>
              <span style="font-size: 11px; font-weight: 600; margin-left: auto; color: ${isOpen ? '#10B981' : '#94A3B8'};">
                ${isOpen ? 'Open' : 'Closed'}
              </span>
            </div>
          </div>
          <div class="studio-workouts-preview">
            ${workoutsHtml}${moreWorkouts}
          </div>
          ${amenitiesHtml ? `<div class="amenities-preview">${amenitiesHtml}</div>` : ''}
        </div>
      `;

      card.addEventListener('click', () => {
        focusStudioOnMap(studio);
      });

      card.addEventListener('dblclick', () => {
        openModal(studio);
      });

      el.studiosList.appendChild(card);
    });
  }

  /**
   * Focus studio marker on map and pan to it
   */
  function focusStudioOnMap(studio) {
    highlightCard(studio.id);

    const marker = studioMarkersMap.get(studio.id);
    if (marker) {
      markerCluster.zoomToShowLayer(marker, () => {
        map.setView([studio.lat, studio.lng], Math.max(map.getZoom(), 15), { animate: true });
        marker.openPopup();
      });
    }

    // On mobile switch to map view
    if (window.innerWidth <= 900) {
      el.appContainer.className = 'app-container show-map';
      el.mobileShowMapBtn.classList.add('active');
      el.mobileShowListBtn.classList.remove('active');
      setTimeout(() => map.invalidateSize(), 200);
    }
  }

  /**
   * Highlight Card in Sidebar
   */
  function highlightCard(studioId) {
    document.querySelectorAll('.studio-card.active').forEach(c => c.classList.remove('active'));
    const card = document.getElementById(`studio-card-${studioId}`);
    if (card) {
      card.classList.add('active');
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  /**
   * Open Studio Details Modal
   */
  function openModal(studio) {
    activeStudio = studio;

    // Header image & Logo
    el.modalBannerImg.src = studio.image || (studio.gallery && studio.gallery[0]) || 'https://cdn.fitimg.in/studio-profile-6CC82C76E06C6C.jpeg';
    el.modalLogoImg.src = studio.logo || 'https://cdn.fitimg.in/studio_logo_63AA4A977C3235.png';
    el.modalStudioName.textContent = studio.name;
    el.modalAddressText.textContent = studio.address || `${studio.locality}, ${studio.city}`;

    // Badges Row
    const isOpen = isStudioOpenNow(studio.open_time);
    el.modalBadgesRow.innerHTML = `
      <span class="stats-pill" style="background: var(--primary-light); color: var(--primary); border-color: #FECDD3;">
        <i class="fa-solid fa-location-dot"></i> ${studio.distance} km from Oberoi Mall
      </span>
      <span class="rating-badge" style="padding: 4px 10px; font-size: 12px;">
        <i class="fa-solid fa-star"></i> ${studio.rating ? studio.rating.toFixed(1) : 'New'} (${studio.rating_count} ratings)
      </span>
      <span class="stats-pill" style="background: ${isOpen ? '#ECFDF5' : '#F1F5F9'}; color: ${isOpen ? '#059669' : '#64748B'}; border-color: ${isOpen ? '#A7F3D0' : '#E2E8F0'};">
        <i class="fa-solid fa-clock"></i> ${isOpen ? 'Currently Open' : 'Closed Now'} (${studio.open_time})
      </span>
      ${studio.verified ? `
        <span class="stats-pill" style="background: #EFF6FF; color: #1D4ED8; border-color: #BFDBFE;">
          <i class="fa-solid fa-shield-halved"></i> FitPass Verified
        </span>
      ` : ''}
    `;

    // Amenities Grid
    if (studio.amenities && studio.amenities.length > 0) {
      el.modalAmenitiesSection.style.display = 'block';
      el.modalAmenitiesGrid.innerHTML = studio.amenities.map(a => {
        const icon = AMENITY_ICONS[a] || 'fa-solid fa-check';
        return `
          <div class="amenity-card">
            <i class="${icon}"></i>
            <span>${escapeHtml(a)}</span>
          </div>
        `;
      }).join('');
    } else {
      el.modalAmenitiesSection.style.display = 'none';
    }

    // Workouts List
    el.modalWorkoutsList.innerHTML = (studio.workouts || []).map(w =>
      `<span class="filter-chip active">${escapeHtml(w)}</span>`
    ).join('');

    // About Studio
    if (studio.about) {
      el.modalAboutSection.style.display = 'block';
      el.modalAboutText.textContent = studio.about;
    } else {
      el.modalAboutSection.style.display = 'none';
    }

    // Photo Gallery
    const galleryImages = (studio.gallery && studio.gallery.length > 0) ? studio.gallery : (studio.image ? [studio.image] : []);
    if (galleryImages.length > 0) {
      el.modalGallerySection.style.display = 'block';
      el.modalGalleryGrid.innerHTML = galleryImages.map(img => `
        <img class="gallery-thumb" src="${img}" alt="Gallery" loading="lazy" onclick="window.setModalBanner('${img}')">
      `).join('');
    } else {
      el.modalGallerySection.style.display = 'none';
    }

    // Reviews List
    if (studio.reviews && studio.reviews.length > 0) {
      el.modalReviewsSection.style.display = 'block';
      el.modalReviewsList.innerHTML = studio.reviews.map(rev => `
        <div class="review-item">
          <div class="review-header">
            <span class="review-author">${escapeHtml(rev.user_name || 'FitPass Member')}</span>
            <span class="rating-badge"><i class="fa-solid fa-star"></i> ${rev.star || 5}</span>
          </div>
          <p class="review-text">${escapeHtml(rev.message || 'Great facility and trainers.')}</p>
        </div>
      `).join('');
    } else {
      el.modalReviewsSection.style.display = 'none';
    }

    // Links
    el.modalFitpassLink.href = studio.url || `https://fitpass.co.in/studio/${studio.id}`;
    el.modalGoogleMapsLink.href = `https://www.google.com/maps/dir/?api=1&origin=${REF_COORDS[0]},${REF_COORDS[1]}&destination=${studio.lat},${studio.lng}`;

    // Open Modal
    el.studioModalBackdrop.classList.add('open');
  }

  function closeModal() {
    el.studioModalBackdrop.classList.remove('open');
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

  // Global triggers
  window.viewStudioDetails = function (id) {
    const studio = allStudios.find(s => s.id === id);
    if (studio) openModal(studio);
  };

  window.setModalBanner = function (src) {
    el.modalBannerImg.src = src;
  };

  window.resetFiltersTrigger = resetAllFilters;

  // Start app
  document.addEventListener('DOMContentLoaded', init);

})();
