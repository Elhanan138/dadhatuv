/**
 * Renders the app icon set from a single vector source.
 *
 *   node scripts/generate-icons.mjs
 *
 * The mark is a fasting ring: an open arc with a bright cap at its leading edge.
 * It is drawn as pure geometry so rendering never depends on a Hebrew font being
 * installed on whatever machine regenerates the icons.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = join(root, "public");

const GREEN_DEEP = "#0F5F44";
const GREEN = "#1D8660";
const GREEN_LIGHT = "#2FB182";
const AMBER = "#EB910A";

/**
 * @param {object} o
 * @param {number} o.size      canvas size in px
 * @param {number} o.inset     fraction of the canvas kept clear around the mark
 * @param {number} o.radius    corner radius as a fraction of the canvas (0 = square)
 */
function svg({ size, inset, radius }) {
  const c = size / 2;
  // the ring lives inside the safe area left by `inset`
  const r = c * (1 - inset) * 0.62;
  const stroke = r * 0.42;
  const circumference = 2 * Math.PI * r;
  const openFraction = 0.26; // the eating window: the part of the day left open
  const dash = circumference * (1 - openFraction);
  const gap = circumference * openFraction;

  // leading cap sits at the end of the drawn arc, measured from 12 o'clock going clockwise
  const capAngle = -Math.PI / 2 + 2 * Math.PI * (1 - openFraction);
  const capX = c + r * Math.cos(capAngle);
  const capY = c + r * Math.sin(capAngle);

  const rx = radius > 0 ? size * radius : 0;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${GREEN_LIGHT}"/>
      <stop offset="55%" stop-color="${GREEN}"/>
      <stop offset="100%" stop-color="${GREEN_DEEP}"/>
    </linearGradient>
    <linearGradient id="arc" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.82"/>
      <stop offset="100%" stop-color="#FFFFFF"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${rx}" ry="${rx}" fill="url(#bg)"/>
  <circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="#FFFFFF" stroke-opacity="0.18" stroke-width="${stroke}"/>
  <circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="url(#arc)" stroke-width="${stroke}"
          stroke-linecap="round" stroke-dasharray="${dash} ${gap}"
          transform="rotate(-90 ${c} ${c})"/>
  <circle cx="${capX}" cy="${capY}" r="${stroke * 0.34}" fill="${AMBER}"/>
</svg>`;
}

/** @type {{file: string, size: number, inset: number, radius: number, flatten?: boolean}[]} */
const TARGETS = [
  { file: "icon-192.png", size: 192, inset: 0.1, radius: 0.22 },
  { file: "icon-512.png", size: 512, inset: 0.1, radius: 0.22 },
  // maskable icons get cropped to a circle on some launchers, so the mark needs a wider margin
  { file: "icon-maskable-192.png", size: 192, inset: 0.3, radius: 0 },
  { file: "icon-maskable-512.png", size: 512, inset: 0.3, radius: 0 },
  // iOS applies its own mask and dislikes transparency
  { file: "apple-touch-icon.png", size: 180, inset: 0.12, radius: 0, flatten: true },
];

await mkdir(publicDir, { recursive: true });

for (const t of TARGETS) {
  let pipeline = sharp(Buffer.from(svg(t)));
  if (t.flatten) pipeline = pipeline.flatten({ background: GREEN_DEEP });
  await pipeline.png({ compressionLevel: 9 }).toFile(join(publicDir, t.file));
  console.log(`  ${t.file}  ${t.size}x${t.size}`);
}

// the browser tab favicon stays vector: Next serves src/app/icon.svg automatically
await writeFile(join(root, "src", "app", "icon.svg"), svg({ size: 64, inset: 0.06, radius: 0.22 }), "utf8");
console.log("  src/app/icon.svg");
