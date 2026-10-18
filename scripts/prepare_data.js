const fs = require('fs');
const path = require('path');

const ENRICHED_FILE = path.join(__dirname, '..', 'data_enriched.json');
const RAW_FILE = path.join(__dirname, '..', 'data_raw.json');
const JS_OUTPUT = path.join(__dirname, '..', 'studios_data.js');
const JSON_OUTPUT = path.join(__dirname, '..', 'studios_data.json');

const REF_LAT = 19.1742;
const REF_LNG = 72.86041;

function run() {
  console.log("=== Preparing Production Studios Dataset ===");
  const sourcePath = fs.existsSync(ENRICHED_FILE) ? ENRICHED_FILE : (fs.existsSync(RAW_FILE) ? RAW_FILE : path.join(__dirname, '..', 'studios_enriched.json'));
  
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`No data file found to prepare at ${sourcePath}`);
  }

  console.log(`Reading from ${sourcePath}...`);
  const raw = JSON.parse(fs.readFileSync(sourcePath, 'utf-8'));
  const studios = raw.studios;
  const activities = raw.activities || [];

  const cleanedStudios = [];
  for (const s of studios) {
    const lat = parseFloat(s.latitude || 0);
    const lng = parseFloat(s.longitude || 0);
    if (!lat || !lng) continue;

    let about = s.about_studio || '';
    about = about.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

    let amenities = Array.isArray(s.amenities) ? s.amenities.map(a => String(a).trim()).filter(Boolean) : [];
    let gallery = Array.isArray(s.gallery) ? s.gallery : [];
    if (gallery.length === 0 && s.studio_profile_image) {
      gallery = [s.studio_profile_image];
    }

    let workouts = Array.isArray(s.workout_name) ? s.workout_name : (s.workout_name ? [s.workout_name] : []);

    const addr1 = (s.address_line_1 || '').trim();
    const addr2 = (s.address_line_2 || '').trim();
    const fullAddr = [addr1, addr2, s.studio_locality, s.studio_city].filter(Boolean).join(', ');

    cleanedStudios.push({
      id: s.studio_id,
      name: s.studio_name || 'Fitness Studio',
      locality: s.studio_locality || '',
      city: s.studio_city || 'Mumbai',
      distance: Math.round(parseFloat(s.distance || 0) * 100) / 100,
      lat,
      lng,
      rating: parseFloat(s.studio_rating || 0),
      rating_count: parseInt(s.studio_rating_count || 0, 10),
      verified: Boolean(s.studio_verified || s.verified_studio),
      open_time: s.open_time || '06:00-22:00',
      address: fullAddr,
      workouts,
      amenities,
      about,
      logo: s.studio_logo || '',
      image: s.studio_profile_image || '',
      gallery: gallery.slice(0, 8),
      url: s.public_url || `https://fitpass.co.in/studio/${s.studio_id}`,
      reviews: Array.isArray(s.reviews) ? s.reviews : []
    });
  }

  // Sort by distance ascending
  cleanedStudios.sort((a, b) => a.distance - b.distance);

  const allWorkouts = Array.from(new Set(cleanedStudios.flatMap(s => s.workouts))).sort();
  const allAmenities = Array.from(new Set(cleanedStudios.flatMap(s => s.amenities))).sort();
  const nearbyLocalities = Array.from(new Set(cleanedStudios.filter(s => s.distance <= 25 && s.locality).map(s => s.locality))).sort();

  const packageData = {
    referenceLocation: {
      name: "Oberoi Mall, Goregaon East, Mumbai",
      lat: REF_LAT,
      lng: REF_LNG
    },
    metadata: {
      totalStudios: cleanedStudios.length,
      within5km: cleanedStudios.filter(s => s.distance <= 5).length,
      within10km: cleanedStudios.filter(s => s.distance <= 10).length,
      within25km: cleanedStudios.filter(s => s.distance <= 25).length,
      workouts: allWorkouts,
      amenities: allAmenities,
      localities: nearbyLocalities
    },
    studios: cleanedStudios
  };

  const jsonStr = JSON.stringify(packageData);
  fs.writeFileSync(JSON_OUTPUT, jsonStr, 'utf-8');
  fs.writeFileSync(JS_OUTPUT, `window.FITPASS_DATA = ${jsonStr};\n`, 'utf-8');

  console.log(`Successfully generated:\n - ${JSON_OUTPUT}\n - ${JS_OUTPUT}\nTotal studios: ${cleanedStudios.length}`);
}

if (require.main === module) {
  run();
}

module.exports = { run };
