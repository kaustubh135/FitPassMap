const { run: runFetch } = require('./fetch_studios');
const { run: runEnrich } = require('./enrich_studios');
const { run: runPrepare } = require('./prepare_data');

async function main() {
  console.log("=========================================");
  console.log("Starting Full FitPass Data Refresh");
  console.log("=========================================");

  await runFetch();
  await runEnrich();
  runPrepare();

  console.log("=========================================");
  console.log("Data Refresh Completed Successfully!");
  console.log("=========================================");
}

main().catch(err => {
  console.error("Pipeline failed:", err);
  process.exit(1);
});
