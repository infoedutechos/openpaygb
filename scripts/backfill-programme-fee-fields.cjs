/**
 * One-time Mongo backfill: legacy programme fee rows may lack `recurrence` / `feeKey`
 * after the ProgrammeFee schema change. Safe to run multiple times.
 */
require("./load-env.cjs");
const { MongoClient } = require("mongodb");

async function main() {
  const url = process.env.DATABASE_URL?.trim() || process.env.MONGODB_URI?.trim();
  if (!url) {
    console.error("Missing DATABASE_URL or MONGODB_URI");
    process.exit(1);
  }

  const client = new MongoClient(url);
  await client.connect();
  try {
    const col = client.db().collection("programmefees");
    const r1 = await col.updateMany(
      { $or: [{ recurrence: { $exists: false } }, { recurrence: null }] },
      { $set: { recurrence: "per_semester" } }
    );
    const r2 = await col.updateMany(
      { $or: [{ feeKey: { $exists: false } }, { feeKey: null }, { feeKey: "" }] },
      { $set: { feeKey: "default" } }
    );
    console.log(
      `[backfill-programme-fee-fields] recurrence set: matched ${r1.matchedCount}, modified ${r1.modifiedCount}`
    );
    console.log(
      `[backfill-programme-fee-fields] feeKey set: matched ${r2.matchedCount}, modified ${r2.modifiedCount}`
    );
  } finally {
    await client.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
