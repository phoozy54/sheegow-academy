/**
 * Cross-platform replacement for the POSIX-only build steps:
 *   cp -r .next/static .next/standalone/.next/ &&
 *   cp -r public .next/standalone/
 *
 * Next.js standalone output does not include static chunks or the public
 * folder. Copy them into the standalone bundle so a self-hosted server works
 * on Windows, macOS and Linux alike.
 */
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const root = process.cwd();
const standalone = join(root, ".next", "standalone");

const copies = [
  [join(root, ".next", "static"), join(standalone, ".next", "static")],
  [join(root, "public"), join(standalone, "public")],
];

for (const [from, to] of copies) {
  if (!existsSync(from)) {
    console.warn(`[build] skipping missing asset source: ${from}`);
    continue;
  }
  mkdirSync(dirname(to), { recursive: true });
  cpSync(from, to, { recursive: true, force: true });
  console.log(`[build] copied ${from} -> ${to}`);
}
