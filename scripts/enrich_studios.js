const fs = require('fs');
const path = require('path');

const RAW_FILE = path.join(__dirname, '..', 'data_raw.json');
const ENRICHED_FILE = path.join(__dirname, '..', 'data_enriched.json');

async function fetchStudioDetails(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const html = await res.text();

    const match = html.match(/self\.__next_f\.push\(\[\d+,\s*"(.*?)"\]\)/g);
    if (!match) return null;

    let about_studio = null;
    let amenities = [];
    let gallery = [];
    let reviews = [];

    for (const m of match) {
      const inner = m.replace(/^self\.__next_f\.push\(\[\d+,\s*"/, '').replace(/"\]\)$/, '');
      try {
        const decoded = JSON.parse(`"${inner}"`);

        const aboutMatch = decoded.match(/"about_studio":\s*"([^"]+)"/);
        if (aboutMatch && !about_studio) {
          about_studio = aboutMatch[1].replace(/\\n/g, ' ').replace(/<[^>]+>/g, '').trim();
        }

        const amenMatch = decoded.match(/"amenityFeature":\s*(\[[^\]]*\])/);
        if (amenMatch && amenities.length === 0) {
          try {
            const parsed = JSON.parse(amenMatch[1]);
            amenities = parsed.map(a => a.name).filter(Boolean);
          } catch(e) {}
        }

        const galMatch = decoded.match(/"studio_gallery":\s*(\[[^\]]*\])/);
        if (galMatch && gallery.length === 0) {
          try {
            gallery = JSON.parse(galMatch[1]);
          } catch(e) {}
        }

        const revMatch = decoded.match(/"review_list":\s*(\[[^\]]*\])/);
        if (revMatch && reviews.length === 0) {
          try {
            reviews = JSON.parse(revMatch[1]);
          } catch(e) {}
        }
      } catch (e) {}
    }

    return {
      about_studio,
      amenities,
      gallery,
      reviews: reviews.slice(0, 3)
    };
  } catch (err) {
    return null;
  }
}

async function run() {
  console.log("=== Enriching Priority Nearby Studios ===");
  if (!fs.existsSync(RAW_FILE)) {
    throw new Error(`Raw data file not found at ${RAW_FILE}. Run fetch_studios.js first.`);
  }

  const data = JSON.parse(fs.readFileSync(RAW_FILE, 'utf-8'));
  const studios = data.studios;

  // Prioritize studios within 50 km (or Mumbai city)
  const targets = [];
  for (let i = 0; i < studios.length; i++) {
    const s = studios[i];
    if (s.distance <= 50 || s.studio_city === 'Mumbai' || i < 450) {
      targets.push({ index: i, studio: s });
    }
  }

  console.log(`Enriching ${targets.length} priority studios near search location...`);
  const concurrency = 12;
  let completed = 0;

  for (let i = 0; i < targets.length; i += concurrency) {
    const batch = targets.slice(i, i + concurrency);
    await Promise.all(batch.map(async item => {
      const details = await fetchStudioDetails(item.studio.public_url);
      if (details) {
        if (details.about_studio) item.studio.about_studio = details.about_studio;
        if (details.amenities && details.amenities.length > 0) item.studio.amenities = details.amenities;
        if (details.gallery && details.gallery.length > 0) item.studio.gallery = details.gallery;
        if (details.reviews && details.reviews.length > 0) item.studio.reviews = details.reviews;
      }
      completed++;
    }));

    if (completed % 60 === 0 || completed === targets.length) {
      console.log(`Enrichment progress: ${completed}/${targets.length} (${((completed/targets.length)*100).toFixed(1)}%)`);
      fs.writeFileSync(ENRICHED_FILE, JSON.stringify({ studios, activities: data.activities }, null, 2), 'utf-8');
    }

    await new Promise(r => setTimeout(r, 100));
  }

  fs.writeFileSync(ENRICHED_FILE, JSON.stringify({ studios, activities: data.activities }, null, 2), 'utf-8');
  console.log(`Enrichment complete! Saved to ${ENRICHED_FILE}`);
}

if (require.main === module) {
  run().catch(console.error);
}

module.exports = { run };
