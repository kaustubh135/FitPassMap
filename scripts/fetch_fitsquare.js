/**
 * FitSquare Harvester
 * Fetches all gyms from FitSquare using the public XML sitemap and JSON-LD structured data.
 */

const fs = require('fs');
const path = require('path');

const SITEMAP_URL = 'https://fitsquare.in/sitemaps/main.xml';
const OUTPUT_FILE = path.join(__dirname, '..', 'data_fitsquare_raw.json');
const CONCURRENCY_LIMIT = 6;
const DELAY_BETWEEN_BATCHES_MS = 200;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      return await res.text();
    } catch (err) {
      if (i === retries - 1) throw err;
      await sleep(1000 * (i + 1));
    }
  }
}

async function getGymUrlsFromSitemap() {
  console.log(`[FitSquare] Fetching sitemap from ${SITEMAP_URL}...`);
  const xml = await fetchWithRetry(SITEMAP_URL);
  const regex = /<loc>(https:\/\/fitsquare\.in\/gym\/[^<]+)<\/loc>/g;
  const urls = [];
  let match;
  while ((match = regex.exec(xml)) !== null) {
    urls.push(match[1]);
  }
  console.log(`[FitSquare] Found ${urls.length} gym URLs in sitemap.`);
  return urls;
}

function cleanImageUrl(rawUrl) {
  if (!rawUrl) return '';
  return rawUrl
    .replace(/\\u0026/g, '&')
    .replace(/&amp;/g, '&')
    .replace(/[\\"'}\]]+$/g, '')
    .trim();
}

function parseGymPage(html, url) {
  try {
    // 1. Extract JSON-LD SportsActivityLocation
    const jsonLdMatches = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);
    let gymData = null;

    if (jsonLdMatches) {
      for (const block of jsonLdMatches) {
        const rawJson = block.replace(/<\/?script[^>]*>/g, '').trim();
        try {
          const parsed = JSON.parse(rawJson);
          if (Array.isArray(parsed)) {
            gymData = parsed.find(
              (item) => item['@type'] === 'SportsActivityLocation' || item['@type'] === 'ExerciseGym'
            );
          } else if (parsed['@type'] === 'SportsActivityLocation' || parsed['@type'] === 'ExerciseGym') {
            gymData = parsed;
          }
          if (gymData) break;
        } catch {
          // ignore
        }
      }
    }

    if (!gymData) {
      return null;
    }

    // 2. Extract membership tier (Basic / Premium / Elite)
    // IMPORTANT: "Category: <tier>" in the gym's own meta description identifies THIS gym,
    // while "data-category=..." can match the suggested gyms carousel at the bottom of the page.
    let tier = 'Standard';
    const tierMatch =
      html.match(/Category:\s*([a-zA-Z]+)/i) ||
      html.match(/data-category="([A-Z]+)"/i);

    if (tierMatch && tierMatch[1]) {
      const val = tierMatch[1].trim().toUpperCase();
      if (val === 'BASIC') tier = 'Basic';
      else if (val === 'PREMIUM') tier = 'Premium';
      else if (val === 'ELITE') tier = 'Elite';
      else tier = val.charAt(0).toUpperCase() + val.slice(1).toLowerCase();
    }

    // 3. Extract gallery images
    const gallery = [];
    if (gymData.image) {
      const c = cleanImageUrl(gymData.image);
      if (c) gallery.push(c);
    }
    const imgMatches = html.match(/https:\/\/s3\.ap-south-1\.amazonaws\.com\/ft\.square\/[^\s"'>]+/g);
    if (imgMatches) {
      for (const img of imgMatches) {
        const clean = cleanImageUrl(img);
        if (clean && !gallery.includes(clean)) {
          gallery.push(clean);
        }
      }
    }

    // 4. Extract amenities
    const amenities = [];
    if (Array.isArray(gymData.amenityFeature)) {
      for (const a of gymData.amenityFeature) {
        if (a && a.name && !amenities.includes(a.name.trim())) {
          amenities.push(a.name.trim());
        }
      }
    }
    const amenMatch = html.match(/Amenities:\s*([^.]+)\./i);
    if (amenMatch && amenMatch[1]) {
      const list = amenMatch[1].split(',').map(s => s.trim()).filter(Boolean);
      for (const item of list) {
        if (!amenities.includes(item)) {
          amenities.push(item);
        }
      }
    }

    // 5. Extract slug
    const slugMatch = url.match(/\/gym\/([^/?#]+)/);
    const slug = slugMatch ? slugMatch[1] : '';

    return {
      slug,
      url,
      name: gymData.name || '',
      description: gymData.description || '',
      tier,
      telephone: gymData.telephone || '',
      email: gymData.email || '',
      lat: gymData.geo ? parseFloat(gymData.geo.latitude) : null,
      lng: gymData.geo ? parseFloat(gymData.geo.longitude) : null,
      address: gymData.address?.streetAddress || '',
      locality: gymData.address?.addressLocality || '',
      city: gymData.address?.addressRegion || gymData.address?.addressLocality || '',
      postalCode: gymData.address?.postalCode || '',
      rating: gymData.aggregateRating ? parseFloat(gymData.aggregateRating.ratingValue) || 0 : 0,
      rating_count: gymData.aggregateRating ? parseInt(gymData.aggregateRating.reviewCount, 10) || 0 : 0,
      image: gallery.length > 0 ? gallery[0] : (gymData.image ? cleanImageUrl(gymData.image) : ''),
      gallery,
      amenities,
      opening_hours: gymData.openingHoursSpecification || []
    };
  } catch (err) {
    console.error(`[FitSquare] Error parsing ${url}:`, err.message);
    return null;
  }
}

async function scrapeAllGyms() {
  const urls = await getGymUrlsFromSitemap();
  const results = [];
  let processed = 0;

  console.log(`[FitSquare] Starting scrape of ${urls.length} gyms with concurrency ${CONCURRENCY_LIMIT}...`);

  for (let i = 0; i < urls.length; i += CONCURRENCY_LIMIT) {
    const chunk = urls.slice(i, i + CONCURRENCY_LIMIT);
    const chunkPromises = chunk.map(async (url) => {
      try {
        const html = await fetchWithRetry(url);
        return parseGymPage(html, url);
      } catch (err) {
        console.warn(`[FitSquare] Failed to fetch ${url}:`, err.message);
        return null;
      }
    });

    const chunkResults = await Promise.all(chunkPromises);
    for (const item of chunkResults) {
      if (item && item.lat && item.lng) {
        results.push(item);
      }
    }

    processed += chunk.length;
    if (processed % 30 === 0 || processed === urls.length) {
      console.log(`[FitSquare] Scraped ${processed}/${urls.length} gyms... (Valid: ${results.length})`);
    }

    await sleep(DELAY_BETWEEN_BATCHES_MS);
  }

  console.log(`[FitSquare] Finished. Total valid gyms scraped: ${results.length}`);
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`[FitSquare] Saved to ${OUTPUT_FILE}`);
  return results;
}

if (require.main === module) {
  scrapeAllGyms().catch((err) => {
    console.error('[FitSquare] Fatal error:', err);
    process.exit(1);
  });
}

module.exports = { scrapeAllGyms };
