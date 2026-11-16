const { scrapeAllGyms: scrapeFitSquare } = require('./fetch_fitsquare');
const { mergePlatforms } = require('./merge_platforms');

async function main() {
  console.log("=========================================");
  console.log("Starting Multi-Platform Data Sync");
  console.log("=========================================");

  // 1. FitSquare sync
  console.log("\n[1/3] Syncing FitSquare catalog...");
  await scrapeFitSquare();

  // 2. FitPass check (if full raw refresh needed)
  console.log("\n[2/3] Checking FitPass catalog...");
  // FitPass raw data is maintained in data_fitpass_raw.json

  // 3. Merge & Deduplicate
  console.log("\n[3/3] Merging and resolving entities across platforms...");
  mergePlatforms();

  console.log("\n=========================================");
  console.log("Multi-Platform Sync Completed Successfully!");
  console.log("=========================================");
}

if (require.main === module) {
  main().catch(err => {
    console.error("Multi-platform pipeline failed:", err);
    process.exit(1);
  });
}

module.exports = { main };
