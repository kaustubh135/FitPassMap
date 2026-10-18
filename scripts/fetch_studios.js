const fs = require('fs');
const path = require('path');
const CryptoJS = require('crypto-js');

const SECRET_KEY = "s1d2f1j4";
const OUTPUT_FILE = path.join(__dirname, '..', 'data_raw.json');

function encrypt(data) {
  const text = typeof data === 'string' ? data : JSON.stringify(data);
  return CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
}

function decrypt(cipherText) {
  const bytes = CryptoJS.AES.decrypt(cipherText, SECRET_KEY);
  return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
}

async function fetchPage(pageNumber, lat = 19.1742, lon = 72.86041) {
  const payload = {
    params: {
      request_url_string: "",
      page_number: pageNumber,
      latitude: lat,
      longitude: lon
    },
    service: "studio_listing_website",
    tracking_source: "{}",
    user_details: false,
    fitshop: false,
    headers: {
      "X-FITPASS-PAYLOAD": "960Q8XJxoh/dlIBO9Yh55Me5oTU6X5YjbE2y+DCQvSpZ2TZfPCD+tuSEKoDyO4nwNK0OZ/KsLZbaXuxKikG/5yWvawH8tQPy9Hb1RfmcyJtmOQqj3WL9MLMwolFs+FN2vnQflwxNgzgLg7ATfh5umqQ7zLmrHiUp1tepq1127JiuJqoAxZA05SwO55vBvmyouKUdCWoH4YaD039hk8fO2Qns+Zi8laGU2OsAbWsEh36bD8tpKW59eZeRHD2Ez3NqLuCguRy5GwrKAERGcKAAfKHSVxuRkW9BWdhqSxJzs7VlNeEeiMns/Rjtg/ZFArpOB902vL4DXojEEbkGBzwOkA==",
      "X-FITPASS-APP-KEY": "fhskjdhfkjsdahgkjadsfmgbasdiughdiag",
      "X-AUTH-TOKEN": "kJwPeUVPULvxWmGJsEXmnZBNdgRZlf",
      "Content-Type": "application/json",
      "X-IS-LOGIN-USER": true,
      "X-Device-Type": "web"
    }
  };

  const res = await fetch("https://fitpass.co.in/api/service", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-AUTHKEY": "3C4425E3C88F861D2DF6DC6230E5E784",
      "X-APPKEY": "62348296685DDBB064D0796B63667697",
      "X-FITPASS-PAYLOAD": "{}",
      "FITPASS-TRACEID": "web-sync-" + Date.now(),
      "TRACKING-SOURCE": "{}"
    },
    body: JSON.stringify({ json: encrypt(JSON.stringify(payload)) })
  });

  const data = await res.json();
  return decrypt(data.data);
}

async function run() {
  console.log("=== Fetching FitPass Studios Listing ===");
  let page = 1;
  const allStudios = [];
  const studioIds = new Set();
  let activities = [];

  while (true) {
    try {
      const resp = await fetchPage(page);
      if (resp.code !== 200 || !resp.result || !resp.result.studios) {
        console.log(`Reached end of listings at page ${page}.`);
        break;
      }

      if (resp.result.activities && activities.length === 0) {
        activities = resp.result.activities;
      }

      const studios = resp.result.studios;
      if (studios.length === 0) break;

      let newCount = 0;
      for (const s of studios) {
        if (!studioIds.has(s.studio_id)) {
          studioIds.add(s.studio_id);
          allStudios.push(s);
          newCount++;
        }
      }

      if (page % 10 === 0 || studios.length < 20) {
        console.log(`Page ${page}: ${allStudios.length} total unique studios collected so far...`);
      }

      if (studios.length < 20) {
        break;
      }

      page++;
      await new Promise(r => setTimeout(r, 100));
    } catch (e) {
      console.error(`Page ${page} error:`, e.message);
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  const output = { studios: allStudios, activities };
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`Successfully saved ${allStudios.length} studios to ${OUTPUT_FILE}`);
  return output;
}

if (require.main === module) {
  run().catch(console.error);
}

module.exports = { run };
