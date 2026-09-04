/**
 * Dedupe admission numbers per org and ensure every org has a unique 6-digit schoolPayCode.
 * Run: npx tsx scripts/dedupe-admission-school-codes.ts
 * Then (after review): add @@unique in schema if desired.
 */

import { prisma } from "../lib/prisma";

function randomSchoolPayCode(): string {
  return String(100_000 + Math.floor(Math.random() * 900_000));
}

async function main() {
  const orgs = await prisma.organization.findMany({ select: { id: true, slug: true, schoolPayCode: true } });
  let codesFixed = 0;
  const used = new Set(
    orgs.map((o) => o.schoolPayCode.trim()).filter((c) => /^\d{6}$/.test(c)),
  );

  for (const org of orgs) {
    const code = org.schoolPayCode.trim();
    if (/^\d{6}$/.test(code) && used.has(code)) {
      // keep first owner; regenerate duplicates below
      continue;
    }
  }

  const codeOwners = new Map<string, string>();
  for (const org of orgs) {
    let code = org.schoolPayCode.trim();
    if (!/^\d{6}$/.test(code) || (codeOwners.has(code) && codeOwners.get(code) !== org.id)) {
      for (let i = 0; i < 20; i++) {
        const next = randomSchoolPayCode();
        if (!codeOwners.has(next) && !used.has(next)) {
          code = next;
          break;
        }
      }
      await prisma.organization.update({ where: { id: org.id }, data: { schoolPayCode: code } });
      codesFixed += 1;
    }
    codeOwners.set(code, org.id);
    used.add(code);
  }

  let admissionFixed = 0;
  for (const org of orgs) {
    const students = await prisma.student.findMany({
      where: { organizationId: org.id },
      select: { id: true, admissionNo: true },
      orderBy: { createdAt: "asc" },
    });
    const seen = new Map<string, string>();
    for (const s of students) {
      const raw = (s.admissionNo || "").trim();
      if (!raw) continue;
      const key = raw.toLowerCase();
      if (!seen.has(key)) {
        seen.set(key, s.id);
        continue;
      }
      const suffix = s.id.slice(-4).toUpperCase();
      const next = `${raw}-D${suffix}`.slice(0, 32);
      await prisma.student.update({ where: { id: s.id }, data: { admissionNo: next } });
      admissionFixed += 1;
      seen.set(next.toLowerCase(), s.id);
    }
  }

  console.log(JSON.stringify({ orgs: orgs.length, codesFixed, admissionFixed }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
