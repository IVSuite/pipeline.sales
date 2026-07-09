import sharp from "sharp";
import { readFileSync } from "node:fs";
import path from "node:path";

const svg = readFileSync(path.join(process.cwd(), "public/icons/icon-source.svg"));

const targets = [
  { file: "public/icons/icon-192.png", size: 192 },
  { file: "public/icons/icon-512.png", size: 512 },
  { file: "public/icons/apple-touch-icon.png", size: 180 },
  { file: "public/icons/maskable-512.png", size: 512 },
];

for (const { file, size } of targets) {
  await sharp(svg).resize(size, size).png().toFile(path.join(process.cwd(), file));
  console.log(`Wrote ${file} (${size}x${size})`);
}
