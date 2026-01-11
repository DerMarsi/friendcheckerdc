import { build } from "bun";

const result = await build({
    entrypoints: ["src/index.ts"],
    outdir: "..", // Output to root directory
    target: "browser", // React Native environment is closer to browser for bundling purposes
    format: "esm",
    minify: true,
    naming: "index.js", // Force output filename to index.js
});

if (result.success) {
    console.log("Build successful!");

    // Compatibility for Gradle/CI (which looks in build/revenge)
    const fs = require('fs');
    const path = require('path');

    const targetDir = path.join(__dirname, '..', 'build', 'revenge'); // js/build/revenge
    const rootDir = path.join(__dirname, '..', '..'); // root of project

    try {
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        // Copy index.js (from root, where bun outputs it now)
        fs.copyFileSync(path.join(rootDir, 'index.js'), path.join(targetDir, 'index.js'));

        // Copy manifest.json (from root)
        fs.copyFileSync(path.join(rootDir, 'manifest.json'), path.join(targetDir, 'manifest.json'));

        console.log(`Artifacts copied to ${targetDir} for Gradle build.`);
    } catch (e) {
        console.error("Failed to copy artifacts for Gradle:", e);
        // Don't fail the build, just warn
    }

} else {
    console.error("Build failed!");
    for (const message of result.logs) {
        console.error(message);
    }
}
