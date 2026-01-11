import { build } from "bun";

const result = await build({
    entrypoints: ["src/index.ts"],
    outdir: "../build", // Output to a build directory up one level or in js/dist
    target: "browser", // React Native environment is closer to browser for bundling purposes
    format: "esm",
    minify: true,
});

if (result.success) {
    console.log("Build successful!");

    // Copy manifest.json to build folder
    const fs = require('fs');
    const path = require('path');
    try {
        fs.copyFileSync('manifest.json', '../build/manifest.json');
        console.log("Manifest copied successfully!");
    } catch (e) {
        console.error("Failed to copy manifest:", e);
    }
} else {
    console.error("Build failed!");
    for (const message of result.logs) {
        console.error(message);
    }
}
