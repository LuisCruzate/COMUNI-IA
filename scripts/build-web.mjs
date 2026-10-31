import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const webDirectory = path.join(projectRoot, "www");

await rm(webDirectory, { recursive: true, force: true });
await mkdir(webDirectory, { recursive: true });

for (const file of ["index.html", "manifest.webmanifest", "sw.js"]) {
  await cp(path.join(projectRoot, file), path.join(webDirectory, file));
}
await cp(path.join(projectRoot, "assets"), path.join(webDirectory, "assets"), { recursive: true });

await build({
  entryPoints: [path.join(projectRoot, "assets/js/native-speech-entry.js")],
  bundle: true,
  format: "iife",
  platform: "browser",
  target: ["es2020"],
  outfile: path.join(webDirectory, "assets/js/native-speech.bundle.js"),
});

const indexPath = path.join(webDirectory, "index.html");
const index = await readFile(indexPath, "utf8");
const translationScript = '  <script src="assets/js/translation.js" defer></script>';
if (!index.includes(translationScript)) {
  throw new Error("No se encontró el script de translation.js esperado en index.html.");
}
await writeFile(
  indexPath,
  index.replace(
    translationScript,
    '  <script src="assets/js/native-speech.bundle.js" defer></script>\n' + translationScript,
  ),
);

console.log("Aplicación Capacitor preparada en www/.");
