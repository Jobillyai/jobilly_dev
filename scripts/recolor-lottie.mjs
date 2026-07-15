import fs from "node:fs";

const path = "./.tmp-lottie/animations/12345.json";
const j = JSON.parse(fs.readFileSync(path, "utf8"));

// Brand blues from the logo: #5170ff -> #38b6ff, blended across the 4 dots.
const from = [0x51 / 255, 0x70 / 255, 0xff / 255];
const to = [0x38 / 255, 0xb6 / 255, 0xff / 255];

function mix(t) {
  return from.map((v, i) => v + (to[i] - v) * t);
}

function recolor(o, rgb) {
  if (Array.isArray(o)) {
    o.forEach((v) => recolor(v, rgb));
    return;
  }
  if (o && typeof o === "object") {
    if ((o.ty === "fl" || o.ty === "st") && o.c) {
      const k = o.c.k;
      if (Array.isArray(k) && typeof k[0] === "number") {
        o.c.k = [...rgb, k[3] ?? 1];
      } else if (Array.isArray(k)) {
        for (const kf of k) {
          if (kf && Array.isArray(kf.s)) {
            kf.s = [...rgb, kf.s[3] ?? 1];
          }
        }
      }
    }
    Object.values(o).forEach((v) => recolor(v, rgb));
  }
}

// Layers are ordered Shape Layer 4..1; dot order left-to-right is layer 3..0.
const count = j.layers.length;
j.layers.forEach((layer, i) => {
  const t = count > 1 ? (count - 1 - i) / (count - 1) : 0;
  recolor(layer, mix(t));
});

fs.writeFileSync(path, JSON.stringify(j));
console.log("recolored", count, "layers");
