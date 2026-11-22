import { db } from "../src/lib/db";

/**
 * Professional English course seed.
 *
 * Creates REAL, purchasable courses — not marketing pages. Pricing, teacher
 * and cover image are copied from existing active courses of the same level,
 * so nothing is invented. Re-running is safe: courses are matched by title and
 * modules/lessons are only created once.
 *
 * Usage:
 *   DATABASE_URL=... bun prisma/seed-courses.ts
 *   bun prisma/seed-courses.ts --dry-run
 *
 * Optional: SHEEGOW_COURSE_PRICE overrides every price (useful for dry runs).
 * The DATABASE_URL is never printed.
 */

import { COURSES, type CourseSpec } from "./course-specs";

async function referenceFor(level: CourseSpec["level"]) {
  const byLevel = await db.course.findFirst({
    where: { isActive: true, level },
    orderBy: { createdAt: "asc" },
  });
  if (byLevel) return byLevel;
  return db.course.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
  });
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const override = Number(process.env.SHEEGOW_COURSE_PRICE || 0);
  const created: string[] = [];
  const updated: string[] = [];

  if (dryRun) console.log("DRY RUN — no database writes.");

  for (const spec of COURSES) {
    const ref = override > 0 ? null : await referenceFor(spec.level);
    if (!ref && override <= 0) {
      throw new Error(
        `No active reference course found for level ${spec.level}. Set SHEEGOW_COURSE_PRICE to continue.`
      );
    }
    const price = override > 0 ? override : Number(ref!.price);
    if (!Number.isFinite(price) || price <= 0) {
      throw new Error(
        `Reference course for ${spec.level} has no valid price. Set SHEEGOW_COURSE_PRICE.`
      );
    }
    const teacherId = override > 0 ? null : ref!.teacherId;
    const image = override > 0 ? null : ref!.image;

    if (dryRun) {
      console.log(
        `[dry] ${spec.title} | level=${spec.level} | weeks=${spec.duration} | price=${price} | lessons=${spec.outline.reduce((n, m) => n + m.lessons.length, 0)}`
      );
      continue;
    }

    const existing = await db.course.findFirst({ where: { title: spec.title } });
    const data = {
      title: spec.title,
      description: spec.description,
      level: spec.level,
      price,
      duration: spec.duration,
      image,
      teacherId,
      whatYouLearn: spec.learn.join("\n"),
      isActive: true,
    };

    const course = existing
      ? await db.course.update({ where: { id: existing.id }, data })
      : await db.course.create({ data });

    if (existing) updated.push(spec.title);
    else created.push(spec.title);

    const moduleCount = await db.module.count({ where: { courseId: course.id } });
    if (moduleCount === 0) {
      for (let i = 0; i < spec.outline.length; i++) {
        const mod = await db.module.create({
          data: {
            courseId: course.id,
            title: spec.outline[i].title,
            order: i + 1,
            isPublished: true,
          },
        });
        for (let j = 0; j < spec.outline[i].lessons.length; j++) {
          const lesson = spec.outline[i].lessons[j];
          await db.lesson.create({
            data: {
              moduleId: mod.id,
              title: lesson.title,
              type: "text",
              order: j + 1,
              body: lesson.body,
              isPreview: i === 0 && j === 0,
              isPublished: true,
            },
          });
        }
      }
    }
  }

  console.log(`Created: ${created.length} | Updated: ${updated.length}`);
  for (const t of created) console.log(`  + ${t}`);
  for (const t of updated) console.log(`  ~ ${t}`);
  if (dryRun) return;
  const titles = COURSES.map((c) => c.title);
  console.log(
    `Verified in DB: ${await db.course.count({ where: { title: { in: titles } } })}/${titles.length} courses`
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
