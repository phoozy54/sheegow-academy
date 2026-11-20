import { readdir, stat, unlink } from "node:fs/promises";
import { join, extname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const dir = fileURLToPath(new URL("../public/images/", import.meta.url));
const files = (await readdir(dir)).filter((f) => /\.(png|jpe?g)$/i.test(f));

for (const file of files) {
  const input = join(dir, file);
  const name = basename(file, extname(file));
  const output = join(dir, `${name}.webp`);
  const info = await stat(input);

  await sharp(input)
    .webp({ quality: 78, effort: 5 })
    .toFile(output);

  const optimized = await stat(output);
  console.log(
    `${file} (${Math.round(info.size / 1024)}KB) -> ${name}.webp (${Math.round(optimized.size / 1024)}KB)`,
  );

  // Keep the original until every reference has been migrated and verified.
  // Remove this line once the DB image fields and all UI references are WebP.
  if (process.env.REMOVE_ORIGINALS === "1") await unlink(input);
}
