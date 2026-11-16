/**
 * Multi-Platform Gym Deduplication and Normalization Pipeline
 * Merges FitPass, FitSquare, and future platform datasets into a unified schema.
 */

const fs = require('fs');
const path = require('path');

const FITPASS_DATA_FILE = fs.existsSync(path.join(__dirname, '..', 'data_fitpass_raw.json'))
  ? path.join(__dirname, '..', 'data_fitpass_raw.json')
  : path.join(__dirname, '..', 'data_raw.json');
const FITSQUARE_DATA_FILE = path.join(__dirname, '..', 'data_fitsquare_raw.json');
const OUTPUT_JSON = path.join(__dirname, '..', 'studios_data.json');
const OUTPUT_JS = path.join(__dirname, '..', 'studios_data.js');

// 1. Canonical Amenity Normalization Dictionary
const AMENITY_SYNONYM_MAP = {
  'ac': 'Air Conditioning',
  'air conditioner': 'Air Conditioning',
  'air conditioning': 'Air Conditioning',
  'wifi': 'Free Wi-Fi',
  'free wifi': 'Free Wi-Fi',
  'wi-fi': 'Free Wi-Fi',
  'parking': 'Parking',
  'bike parking': 'Bike Parking',
  'car parking': 'Car Parking',
  'valet parking': 'Valet Parking',
  'water cooler': 'Drinking Water',
  'drinking water': 'Drinking Water',
  'shower': 'Showers',
  'showers': 'Showers',
  'changing room': 'Changing Room',
  'changing rooms': 'Changing Room',
  'locker': 'Lockers',
  'lockers': 'Lockers',
  'cctv': 'CCTV Surveillance',
  'security guard': 'Security',
  'cafeteria': 'Cafeteria / Juice Bar',
  'juice bar cafe': 'Cafeteria / Juice Bar',
  'first aid box': 'First Aid',
  'first aid': 'First Aid',
  'steam': 'Steam Bath',
  'steam room': 'Steam Bath',
  'sauna': 'Sauna',
  'shoe rack': 'Shoe Rack',
  'towel service': 'Towel Service',
  'personal trainer': 'Personal Training',
  'lounge area': 'Lounge Area',
  'seperate washroom': 'Restrooms',
  'washroom': 'Restrooms',
  'female washroom': 'Restrooms (Women)',
  'male washroom': 'Restrooms (Men)',
  'unisex washroom': 'Restrooms'
};

function normalizeAmenity(rawAmenity) {
  if (!rawAmenity) return null;
  const key = rawAmenity.trim().toLowerCase();
  return AMENITY_SYNONYM_MAP[key] || rawAmenity.trim();
}

function cleanUrl(url) {
  if (!url || typeof url !== 'string') return '';
  return url.replace(/[\\]+$/g, '').replace(/[\\"'}\]]+$/g, '').trim();
}

// 2. Haversine Distance (in meters)
function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// 3. String Cleaning and Token Matching
const NOISE_TOKENS = new Set([
  'gym', 'fitness', 'studio', 'club', 'centre', 'center',
  'unisex', 'pvt', 'ltd', 'crossfit', 'workout', 'hub', 'health', 'the', 'and', '&'
]);

function cleanNameForMatch(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !NOISE_TOKENS.has(t))
    .sort();
}

function calculateTokenSimilarity(nameA, nameB) {
  const tokensA = cleanNameForMatch(nameA);
  const tokensB = cleanNameForMatch(nameB);

  if (tokensA.length === 0 || tokensB.length === 0) {
    const simpleA = nameA.toLowerCase().replace(/[^a-z0-9]/g, '');
    const simpleB = nameB.toLowerCase().replace(/[^a-z0-9]/g, '');
    return simpleA === simpleB ? 1.0 : 0.0;
  }

  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  let intersection = 0;
  for (const t of setA) {
    if (setB.has(t)) intersection++;
  }

  const union = new Set([...tokensA, ...tokensB]).size;
  return intersection / union;
}

// 4. Weighted Bayesian Rating Aggregator (Zero-Review Guard)
function calculateWeightedRating(platforms) {
  let weightedSum = 0;
  let totalReviews = 0;

  for (const p of platforms) {
    if (p.rating > 0 && p.rating_count > 0) {
      weightedSum += p.rating * p.rating_count;
      totalReviews += p.rating_count;
    }
  }

  if (totalReviews === 0) {
    for (const p of platforms) {
      if (p.rating > 0) return { rating: p.rating, count: p.rating_count || 0 };
    }
    return { rating: 0.0, count: 0 };
  }

  const avg = weightedSum / totalReviews;
  return {
    rating: parseFloat(avg.toFixed(1)),
    count: totalReviews
  };
}

// 5. Main Merger
function mergePlatforms() {
  console.log('[Merger] Reading existing datasets...');
  let fitpassStudios = [];
  if (fs.existsSync(FITPASS_DATA_FILE)) {
    const raw = JSON.parse(fs.readFileSync(FITPASS_DATA_FILE, 'utf-8'));
    fitpassStudios = Array.isArray(raw) ? raw : raw.studios || [];
    console.log(`[Merger] Loaded ${fitpassStudios.length} FitPass studios.`);
  }

  let fitsquareStudios = [];
  if (fs.existsSync(FITSQUARE_DATA_FILE)) {
    fitsquareStudios = JSON.parse(fs.readFileSync(FITSQUARE_DATA_FILE, 'utf-8'));
    console.log(`[Merger] Loaded ${fitsquareStudios.length} FitSquare studios.`);
  }

  const unifiedStudios = [];
  const matchedFitSquareIndices = new Set();
  let matchCount = 0;
  const discoveredTiers = new Set();

  for (const fp of fitpassStudios) {
    const fpLat = parseFloat(fp.lat);
    const fpLng = parseFloat(fp.lng);

    let bestFsMatch = null;
    let bestFsIndex = -1;
    let bestFsDist = 0;
    let highestSim = 0;

    if (!isNaN(fpLat) && !isNaN(fpLng)) {
      for (let j = 0; j < fitsquareStudios.length; j++) {
        if (matchedFitSquareIndices.has(j)) continue;
        const fsGym = fitsquareStudios[j];
        const dist = getDistanceMeters(fpLat, fpLng, fsGym.lat, fsGym.lng);

        if (dist <= 250) {
          const sim = calculateTokenSimilarity(fp.name, fsGym.name);
          if (sim >= 0.5 && sim > highestSim) {
            highestSim = sim;
            bestFsMatch = fsGym;
            bestFsIndex = j;
            bestFsDist = dist;
          }
        }
      }
    }

    if (bestFsMatch) {
      matchCount++;
      matchedFitSquareIndices.add(bestFsIndex);
      if (bestFsMatch.tier) discoveredTiers.add(bestFsMatch.tier);

      const combinedAmenities = new Set();
      (fp.amenities || []).forEach((a) => {
        const n = normalizeAmenity(a);
        if (n) combinedAmenities.add(n);
      });
      (bestFsMatch.amenities || []).forEach((a) => {
        const n = normalizeAmenity(a);
        if (n) combinedAmenities.add(n);
      });

      const ratingInfo = calculateWeightedRating([
        { rating: fp.rating || 0, rating_count: fp.rating_count || 0 },
        { rating: bestFsMatch.rating || 0, rating_count: bestFsMatch.rating_count || 0 }
      ]);

      const seenUrls = new Set();
      const galleryWithSource = [];
      (fp.gallery || []).forEach((rawUrl) => {
        const clean = cleanUrl(rawUrl);
        if (clean && !seenUrls.has(clean)) {
          seenUrls.add(clean);
          galleryWithSource.push({ url: clean, platform: 'fitpass' });
        }
      });
      (bestFsMatch.gallery || []).forEach((rawUrl) => {
        const clean = cleanUrl(rawUrl);
        if (clean && !seenUrls.has(clean)) {
          seenUrls.add(clean);
          galleryWithSource.push({ url: clean, platform: 'fitsquare' });
        }
      });

      unifiedStudios.push({
        id: `m-fp-${fp.id}_fs-${bestFsMatch.slug}`,
        name: fp.name,
        locality: fp.locality || bestFsMatch.locality || '',
        city: fp.city || bestFsMatch.city || '',
        address: bestFsMatch.address || fp.address || '',
        lat: fpLat,
        lng: fpLng,
        rating: ratingInfo.rating,
        rating_count: ratingInfo.count,
        image: cleanUrl(fp.image) || cleanUrl(bestFsMatch.image) || (galleryWithSource[0] ? galleryWithSource[0].url : ''),
        gallery: galleryWithSource.map((g) => g.url),
        gallery_detailed: galleryWithSource,
        amenities: Array.from(combinedAmenities),
        workouts: fp.workouts || ['Gym Workout'],
        platforms: ['fitpass', 'fitsquare'],
        platform_details: {
          fitpass: {
            id: fp.id,
            name: fp.name,
            address: fp.address || '',
            lat: fpLat,
            lng: fpLng,
            url: fp.url,
            rating: fp.rating,
            rating_count: fp.rating_count,
            membership: 'All-Inclusive Pass',
            verified: fp.verified ?? true
          },
          fitsquare: {
            slug: bestFsMatch.slug,
            name: bestFsMatch.name,
            address: bestFsMatch.address || '',
            lat: bestFsMatch.lat,
            lng: bestFsMatch.lng,
            coord_delta_meters: Math.round(bestFsDist),
            url: bestFsMatch.url,
            tier: bestFsMatch.tier || 'Standard',
            membership: `Session Pack (${bestFsMatch.tier || 'Standard'})`,
            rating: bestFsMatch.rating,
            rating_count: bestFsMatch.rating_count,
            telephone: bestFsMatch.telephone,
            email: bestFsMatch.email,
            opening_hours: bestFsMatch.opening_hours
          }
        }
      });
    } else {
      const normAmenities = new Set();
      (fp.amenities || []).forEach((a) => {
        const n = normalizeAmenity(a);
        if (n) normAmenities.add(n);
      });

      const cleanGallery = (fp.gallery || []).map(cleanUrl).filter(Boolean);

      unifiedStudios.push({
        id: `fp-${fp.id}`,
        name: fp.name,
        locality: fp.locality || '',
        city: fp.city || '',
        address: fp.address || '',
        lat: fpLat,
        lng: fpLng,
        rating: fp.rating || 0,
        rating_count: fp.rating_count || 0,
        image: cleanUrl(fp.image) || '',
        gallery: cleanGallery,
        gallery_detailed: cleanGallery.map((url) => ({ url, platform: 'fitpass' })),
        amenities: Array.from(normAmenities),
        workouts: fp.workouts || ['Gym Workout'],
        platforms: ['fitpass'],
        platform_details: {
          fitpass: {
            id: fp.id,
            name: fp.name,
            url: fp.url,
            rating: fp.rating,
            rating_count: fp.rating_count,
            membership: 'All-Inclusive Pass',
            verified: fp.verified ?? true
          }
        }
      });
    }
  }

  let fsStandaloneCount = 0;
  for (let j = 0; j < fitsquareStudios.length; j++) {
    if (matchedFitSquareIndices.has(j)) continue;
    const fsGym = fitsquareStudios[j];
    fsStandaloneCount++;
    if (fsGym.tier) discoveredTiers.add(fsGym.tier);

    const normAmenities = new Set();
    (fsGym.amenities || []).forEach((a) => {
      const n = normalizeAmenity(a);
      if (n) normAmenities.add(n);
    });

    const cleanGallery = (fsGym.gallery || []).map(cleanUrl).filter(Boolean);

    unifiedStudios.push({
      id: `fs-${fsGym.slug}`,
      name: fsGym.name,
      locality: fsGym.locality || '',
      city: fsGym.city || '',
      address: fsGym.address || '',
      lat: fsGym.lat,
      lng: fsGym.lng,
      rating: fsGym.rating || 0,
      rating_count: fsGym.rating_count || 0,
      image: cleanUrl(fsGym.image) || (cleanGallery[0] || ''),
      gallery: cleanGallery,
      gallery_detailed: cleanGallery.map((url) => ({ url, platform: 'fitsquare' })),
      amenities: Array.from(normAmenities),
      workouts: ['Gym Workout'],
      platforms: ['fitsquare'],
      platform_details: {
        fitsquare: {
          slug: fsGym.slug,
          name: fsGym.name,
          url: fsGym.url,
          tier: fsGym.tier || 'Standard',
          membership: `Session Pack (${fsGym.tier || 'Standard'})`,
          rating: fsGym.rating,
          rating_count: fsGym.rating_count,
          telephone: fsGym.telephone,
          email: fsGym.email,
          opening_hours: fsGym.opening_hours
        }
      }
    });
  }

  console.log(`[Merger] Merge Complete!`);
  console.log(`  - Total Unified Gyms: ${unifiedStudios.length}`);
  console.log(`  - Matched (Both FitPass & FitSquare): ${matchCount}`);
  console.log(`  - FitPass Standalone: ${fitpassStudios.length - matchCount}`);
  console.log(`  - FitSquare Standalone: ${fsStandaloneCount}`);
  console.log(`  - Discovered Membership Tiers:`, Array.from(discoveredTiers));

  const allWorkouts = new Set();
  const allAmenities = new Set();
  unifiedStudios.forEach((s) => {
    (s.workouts || []).forEach((w) => allWorkouts.add(w));
    (s.amenities || []).forEach((a) => allAmenities.add(a));
  });

  const outputPayload = {
    metadata: {
      totalStudios: unifiedStudios.length,
      platformCounts: {
        fitpass: unifiedStudios.filter((s) => s.platforms.includes('fitpass')).length,
        fitsquare: unifiedStudios.filter((s) => s.platforms.includes('fitsquare')).length,
        both: unifiedStudios.filter((s) => s.platforms.length > 1).length
      },
      tiers: Array.from(discoveredTiers).sort(),
      workouts: Array.from(allWorkouts).sort(),
      amenities: Array.from(allAmenities).sort(),
      updatedAt: new Date().toISOString()
    },
    studios: unifiedStudios
  };

  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(outputPayload, null, 2), 'utf-8');
  console.log(`[Merger] Written ${OUTPUT_JSON}`);

  const jsContent = `/**
 * Multi-Platform Gym Explorer Dataset
 * Auto-generated by scripts/merge_platforms.js
 * Updated: ${outputPayload.metadata.updatedAt}
 */
window.STUDIOS_DATA = ${JSON.stringify(outputPayload, null, 2)};
`;
  fs.writeFileSync(OUTPUT_JS, jsContent, 'utf-8');
  console.log(`[Merger] Written ${OUTPUT_JS}`);

  return outputPayload;
}

if (require.main === module) {
  mergePlatforms();
}

module.exports = { mergePlatforms };
