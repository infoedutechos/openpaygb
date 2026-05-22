/**
 * Infers and writes `durationYears` / `semestersPerYear` on existing programmes that
 * currently leave these fields blank (null/0), using their fee rows as the source of truth.
 *
 * Safe to run multiple times: only programmes with at least one missing duration field are
 * touched, and a programme with NO fee rows is left untouched so admins can set explicit
 * values manually.
 *
 * Usage:
 *   npm run db:backfill:programme-duration            # write inferred values
 *   npm run db:backfill:programme-duration -- --dry   # preview without writing
 *   npm run db:backfill:programme-duration -- --force # overwrite even when values are set
 */

require("./load-env.cjs");
const { MongoClient, ObjectId } = require("mongodb");

const DRY = process.argv.includes("--dry");
const FORCE = process.argv.includes("--force");

function inferDuration(fees) {
  let maxYear = 0;
  let maxSemester = 0;
  for (const fee of fees) {
    const year = Number(fee.year);
    const semester = Number(fee.semester);
    if (Number.isFinite(year) && year > maxYear) maxYear = year;
    if (Number.isFinite(semester) && semester > maxSemester) maxSemester = semester;
  }
  if (maxYear <= 0) return null;
  return {
    durationYears: maxYear,
    semestersPerYear: maxSemester > 0 ? maxSemester : 3,
  };
}

function needsUpdate(programme) {
  if (FORCE) return true;
  const years = programme.durationYears;
  const sems = programme.semestersPerYear;
  return (
    years === null || years === undefined || years === 0 ||
    sems === null || sems === undefined || sems === 0
  );
}

async function main() {
  const url = process.env.DATABASE_URL?.trim() || process.env.MONGODB_URI?.trim();
  if (!url) {
    console.error("Missing DATABASE_URL or MONGODB_URI");
    process.exit(1);
  }

  const client = new MongoClient(url);
  await client.connect();
  try {
    const db = client.db();
    const programmesCol = db.collection("programmes");
    const feesCol = db.collection("programmefees");

    const programmes = await programmesCol.find({}).toArray();
    if (programmes.length === 0) {
      console.log("[backfill-programme-duration] No programmes found.");
      return;
    }

    let scanned = 0;
    let written = 0;
    let skippedFullySet = 0;
    let skippedNoFees = 0;

    for (const programme of programmes) {
      scanned++;
      if (!needsUpdate(programme)) {
        skippedFullySet++;
        continue;
      }

      const fees = await feesCol.find({ programmeId: new ObjectId(programme._id) }).toArray();
      const inferred = inferDuration(fees);
      if (!inferred) {
        skippedNoFees++;
        console.log(
          `[skip:no-fees] ${programme.code} (${programme._id}) — set Years / Semesters explicitly from the admin UI.`,
        );
        continue;
      }

      const nextYears = programme.durationYears && !FORCE ? programme.durationYears : inferred.durationYears;
      const nextSems = programme.semestersPerYear && !FORCE ? programme.semestersPerYear : inferred.semestersPerYear;

      if (nextYears === programme.durationYears && nextSems === programme.semestersPerYear) {
        skippedFullySet++;
        continue;
      }

      const action = DRY ? "[dry]" : "[write]";
      console.log(
        `${action} ${programme.code} (${programme._id}) → durationYears=${nextYears} · semestersPerYear=${nextSems}`,
      );

      if (!DRY) {
        await programmesCol.updateOne(
          { _id: programme._id },
          { $set: { durationYears: nextYears, semestersPerYear: nextSems, updatedAt: new Date() } },
        );
      }
      written++;
    }

    console.log(
      `[backfill-programme-duration] Scanned ${scanned}, ${DRY ? "would update" : "updated"} ${written}, ` +
        `skipped (already set): ${skippedFullySet}, skipped (no fees): ${skippedNoFees}.`,
    );
    if (DRY) {
      console.log("Re-run without --dry to apply these changes.");
    }
  } finally {
    await client.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
