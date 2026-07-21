// One-off generator, not run at build/deploy time — produces the static
// dot-grid asset the WorldMap component renders. Re-run manually only if the
// projection or resolution ever needs to change:
//   node scripts/generate-world-dot-map.mjs
//
// Samples a lat/long grid and keeps only points that fall on land (per
// world-atlas's pre-merged landmass polygon), then projects each surviving
// point with the same plain equirectangular formula WorldMap.tsx uses for
// its live traffic markers, so the two line up without either one needing
// a heavier real-time projection library at runtime.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { feature } from "topojson-client";
import { geoContains } from "d3-geo";
import world from "world-atlas/land-110m.json" with { type: "json" };

const __dirname = dirname(fileURLToPath(import.meta.url));

const WIDTH = 960;
const HEIGHT = 480;
const STEP_DEGREES = 1.2;

function project(lon, lat) {
  const x = ((lon + 180) / 360) * WIDTH;
  const y = ((90 - lat) / 180) * HEIGHT;
  return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
}

const land = feature(world, world.objects.land);

const dots = [];
for (let lat = -89; lat <= 89; lat += STEP_DEGREES) {
  for (let lon = -180; lon <= 180; lon += STEP_DEGREES) {
    if (geoContains(land, [lon, lat])) dots.push(project(lon, lat));
  }
}

const outPath = join(__dirname, "..", "lib", "analytics", "worldDotMap.json");
writeFileSync(outPath, JSON.stringify({ width: WIDTH, height: HEIGHT, dots }));
console.log(`Wrote ${dots.length} dots to ${outPath}`);
