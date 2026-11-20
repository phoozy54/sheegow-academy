import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { COURSES } from "../prisma/course-specs";

/**
 * Seed the eight professional English courses through the authenticated API.
 *
 * Why the API? It works with the same credentials the school already uses and
 * needs no direct DATABASE_URL on this machine. Every write goes through the
 * existing admin permission checks.
 *
 * Setup (git-ignored, never printed):
 *   .env.local
 *     ADMIN_EMAIL="superadmin@example.com"
 *     ADMIN_PASSWORD="..."
 *   Optional: SHEEGOW_BASE_URL, SHEEGOW_COURSE_PRICE
 *
 * Usage:
 *   bun scripts/seed-courses-api.ts --dry-run   # login + plan, no writes
 *   bun scripts/seed-courses-api.ts             # idempotent writes
 */
type AnyRecord = Record<string, any>;

// Bun loads .env.local automatically; this keeps `node` invocations working.
const envPath = resolve(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  for (const raw of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const sep = line.indexOf("=");
    if (sep < 0) continue;
    const key = line.slice(0, sep).trim();
    if (!(key in process.env)) {
      process.env[key] = line
        .slice(sep + 1)
        .trim()
        .replace(/^["']|["']$/g, "");
    }
  }
}

const BASE = (
  process.env.SHEEGOW_BASE_URL || "https://www.sheegowacademy.com"
).replace(/\/+$/, "");
const IDENTIFIER = process.env.ADMIN_EMAIL || process.env.SHEEGOW_ADMIN_EMAIL;
const PASSWORD = process.env.ADMIN_PASSWORD || process.env.SHEEGOW_ADMIN_PASSWORD;
const DRY_RUN = process.argv.includes("--dry-run");
const PRICE_OVERRIDE = Number(process.env.SHEEGOW_COURSE_PRICE || 0);

if (!IDENTIFIER || !PASSWORD) {
  console.error("Missing ADMIN_EMAIL / ADMIN_PASSWORD in .env.local");
  process.exit(1);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function api(
  path: string,
  init: RequestInit = {},
  cookie = "",
  attempt = 0
): Promise<AnyRecord> {
  const res = await fetch(BASE + path, {
    method: init.method || "GET",
    headers: {
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
      ...(init.headers || {}),
    },
    body: init.body,
    cache: "no-store",
  });

  if (res.status === 429 && attempt < 4) {
    const retryAfter = Number(res.headers.get("retry-after") || "2");
    await sleep(Math.max(1, Number.isFinite(retryAfter) ? retryAfter : 2) * 1000);
    return api(path, init, cookie, attempt + 1);
  }

  const text = await res.text();
  let data: AnyRecord | null = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    throw new Error(`${path} -> ${res.status}: ${data?.error ?? text.slice(0, 160)}`);
  }
  return (data ?? {}) as AnyRecord;
}

async function login(): Promise<string> {
  const res = await fetch(BASE + "/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ identifier: IDENTIFIER, password: PASSWORD }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Login failed (HTTP ${res.status}). Check .env.local.`);

  const raw = res.headers.get("set-cookie") || "";
  const match = /(?:^|,)\s*sheegow_access=([^;]+)/.exec(raw);
  if (!match) throw new Error("Login did not return an access cookie");
  return `sheegow_access=${match[1]}`;
}

async function allCourses(): Promise<AnyRecord[]> {
  const items: AnyRecord[] = [];
  let page = 1;
  for (;;) {
    const data = await api(`/api/courses?page=${page}&limit=50`);
    items.push(...((data.items as AnyRecord[]) || []));
    const totalPages = Number(data.totalPages || 1);
    if (page >= totalPages) break;
    page += 1;
  }
  return items;
}

function referenceFor(courses: AnyRecord[], level: string): AnyRecord | undefined {
  const active = courses.filter((c) => c.isActive);
  const pool = active.some((c) => c.level === level)
    ? active.filter((c) => c.level === level)
    : active;
  return [...pool].sort(
    (a, b) => Date.parse(String(a.createdAt)) - Date.parse(String(b.createdAt))
  )[0];
}

async function main() {
  console.log(`Target: ${BASE}`);
  console.log(DRY_RUN ? "DRY RUN — no writes." : "LIVE RUN — writing through admin API.");

  const cookie = await login();
  const me = await api("/api/auth/me", {}, cookie);
  const role = String(me.user?.role || "");
  if (!["admin", "super_admin"].includes(role)) {
    throw new Error("The account is not an admin/super_admin. No writes performed.");
  }
  console.log(`Authenticated: role=${role}`);

  const courses = await allCourses();
  const plan = COURSES.map((spec) => {
    const ref = PRICE_OVERRIDE > 0 ? undefined : referenceFor(courses, spec.level);
    const price = PRICE_OVERRIDE > 0 ? PRICE_OVERRIDE : Number(ref?.price);
    if (!Number.isFinite(price) || price < 1) {
      throw new Error(`No valid reference price for ${spec.level}. Set SHEEGOW_COURSE_PRICE.`);
    }
    return {
      spec,
      price,
      teacherId: ref?.teacherId,
      image: ref?.image ?? null,
      existing: courses.find((c) => c.title === spec.title),
      lessons: spec.outline.reduce((n, m) => n + m.lessons.length, 0),
    };
  });

  for (const item of plan) {
    console.log(
      `${item.existing ? "~" : "+"} ${item.spec.title} | level=${item.spec.level} ` +
        `| weeks=${item.spec.duration} | price=${item.price} | lessons=${item.lessons}`
    );
  }
  if (DRY_RUN) return;

  let created = 0;
  let updated = 0;
  let modulesAdded = 0;
  let lessonsAdded = 0;

  for (const item of plan) {
    const { spec, price, teacherId, image } = item;
    const body = JSON.stringify({
      title: spec.title,
      description: spec.description,
      level: spec.level,
      price,
      duration: spec.duration,
      image,
      teacherId,
      whatYouLearn: spec.learn.join("\n"),
    });

    let courseId: string;
    if (item.existing) {
      await api(`/api/courses/${item.existing.id}`, { method: "PUT", body }, cookie);
      courseId = String(item.existing.id);
      updated += 1;
    } else {
      const made = await api(
        "/api/courses",
        { method: "POST", body },
        cookie
      );
      courseId = String(made.course.id);
      created += 1;
    }
    await sleep(300);

    const curriculum = await api(`/api/courses/${courseId}/curriculum`, {}, cookie);
    const modules = (curriculum.roadmap?.modules as AnyRecord[]) || [];

    for (let i = 0; i < spec.outline.length; i += 1) {
      const moduleSpec = spec.outline[i];
      let courseModule = modules.find((m) => m.title === moduleSpec.title);
      if (!courseModule) {
        courseModule = (
          await api(
            `/api/courses/${courseId}/curriculum`,
            {
              method: "POST",
              body: JSON.stringify({
                title: moduleSpec.title,
                order: i + 1,
                isPublished: true,
              }),
            },
            cookie
          )
        ).module as AnyRecord;
        modulesAdded += 1;
        await sleep(700);
      }

      const existingLessons = (courseModule.lessons as AnyRecord[]) || [];
      for (let j = 0; j < moduleSpec.lessons.length; j += 1) {
        const lesson = moduleSpec.lessons[j];
        if (existingLessons.some((l) => l.title === lesson.title)) continue;
        await api(
          `/api/modules/${courseModule.id}/lessons`,
          {
            method: "POST",
            body: JSON.stringify({
              title: lesson.title,
              type: "text",
              order: j + 1,
              body: lesson.body,
              isPreview: i === 0 && j === 0,
              isPublished: true,
            }),
          },
          cookie
        );
        lessonsAdded += 1;
        await sleep(700);
      }
    }
  }

  console.log(
    `Done. courses created=${created} updated=${updated} modules=${modulesAdded} lessons=${lessonsAdded}`
  );

  const finalCourses = await allCourses();
  let verified = 0;
  let totalModules = 0;
  let totalLessons = 0;
  for (const spec of COURSES) {
    const course = finalCourses.find((c) => c.title === spec.title);
    if (!course) {
      console.log(`MISSING: ${spec.title}`);
      continue;
    }
    const curriculum = await api(`/api/courses/${course.id}/curriculum`, {}, cookie);
    const modules = (curriculum.roadmap?.modules as AnyRecord[]) || [];
    const lessons = modules.reduce(
      (n, m) => n + ((m.lessons as AnyRecord[]) || []).length,
      0
    );
    totalModules += modules.length;
    totalLessons += lessons;
    verified += 1;
    console.log(
      `OK ${spec.title} | modules=${modules.length} | lessons=${lessons} | price=${course.price}`
    );
  }
  console.log(
    `Verified: ${verified}/${COURSES.length} courses, ${totalModules} modules, ${totalLessons} lessons`
  );
  if (verified !== COURSES.length || totalLessons !== 72) {
    throw new Error("Verification did not match the expected course structure");
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
