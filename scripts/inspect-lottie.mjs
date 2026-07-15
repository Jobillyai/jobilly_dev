import fs from "node:fs";

const s = fs.readFileSync("./.tmp-lottie/animations/12345.json", "utf8");
const j = JSON.parse(s);
console.log("len", s.length, "layers", j.layers?.length);

const colors = new Map();

function record(rgba, where) {
  const key = rgba
    .slice(0, 3)
    .map((v) => Math.round(v <= 1 ? v * 255 : v))
    .join(",");
  colors.set(key, (colors.get(key) ?? 0) + 1);
}

function walk(o, path) {
  if (Array.isArray(o)) {
    o.forEach((v, i) => walk(v, path + "[" + i + "]"));
    return;
  }
  if (o && typeof o === "object") {
    if ((o.ty === "fl" || o.ty === "st") && o.c) {
      const k = o.c.k;
      if (Array.isArray(k) && typeof k[0] === "number") {
        record(k, path);
      } else if (Array.isArray(k)) {
        for (const kf of k) {
          if (kf && Array.isArray(kf.s)) record(kf.s, path);
        }
      }
    }
    if (o.ty === "gf" || o.ty === "gs") {
      const stops = o.g?.k?.k;
      if (Array.isArray(stops) && typeof stops[0] === "number") {
        for (let i = 0; i + 3 < stops.length; i += 4) {
          record(stops.slice(i + 1, i + 4), path + ":grad");
        }
      }
    }
    for (const [key, v] of Object.entries(o)) walk(v, path + "." + key);
  }
}

walk(j, "$");
for (const [c, n] of colors) console.log("rgb(" + c + ") x" + n);
