import esbuild from "esbuild";
import path from "path";
import { readdirSync, copyFileSync, mkdirSync } from "fs";

const entryPoints = ["src/background.ts", "src/contentScript.ts"];
const outdir = path.join(process.cwd(), "dist");

async function build(watch = false) {
  const config: esbuild.BuildOptions = {
    entryPoints,
    bundle: true,
    format: "esm",
    outdir,
    target: "chrome120",
    sourcemap: true,
    loader: { ".css": "text" }
  };

  if (watch) {
    const ctx = await esbuild.context(config);
    await ctx.watch();
  } else {
    await esbuild.build(config);
  }
  copyStatic();
  console.log(`Built to ${outdir}`);
}

function copyStatic() {
  mkdirSync(outdir, { recursive: true });
  const staticFiles = readdirSync(process.cwd()).filter((f) => f.startsWith("icon-"));
  for (const file of staticFiles) {
    copyFileSync(path.join(process.cwd(), file), path.join(outdir, file));
  }
}

const watch = process.argv.includes("--watch");
build(watch);
