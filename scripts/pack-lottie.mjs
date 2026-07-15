import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const JSZip = require("jszip");

const zip = new JSZip();
zip.file("manifest.json", fs.readFileSync("./.tmp-lottie/manifest.json"));
zip.file(
  "animations/12345.json",
  fs.readFileSync("./.tmp-lottie/animations/12345.json"),
);

const buf = await zip.generateAsync({
  type: "nodebuffer",
  compression: "DEFLATE",
});
fs.writeFileSync("./public/6m48HPX6Np.lottie", buf);
console.log("packed", buf.length, "bytes");
