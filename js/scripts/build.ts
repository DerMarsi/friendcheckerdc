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
    const crypto = require('crypto');

    const targetDir = path.join(__dirname, '..', 'build', 'revenge'); // js/build/revenge
    const rootDir = path.join(__dirname, '..', '..'); // root of project

    try {
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        // 1. Read the built index.js
        const indexJsContent = fs.readFileSync(path.join(rootDir, 'index.js'));

        // 2. Calculate SHA-256 hash
        const hash = crypto.createHash('sha256').update(indexJsContent).digest('base64');
        console.log(`Calculated hash: ${hash}`);

        // 3. Read manifest.json
        const manifestPath = path.join(rootDir, 'manifest.json');
        const manifestContent = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

        // 4. Update manifest with hash and standard fields if missing
        manifestContent.hash = hash;
        manifestContent.main = "index.js";
        // Ensure authors is array if user only used string (fixing legacy format on the fly if needed, but better to fix source)

        // Write updated manifest to root (so GitHub Pages serves it with hash)
        fs.writeFileSync(manifestPath, JSON.stringify(manifestContent, null, 4));

        // Copy index.js (to build dir)
        fs.copyFileSync(path.join(rootDir, 'index.js'), path.join(targetDir, 'index.js'));

        // Copy UPDATED manifest.json (to build dir)
        fs.copyFileSync(manifestPath, path.join(targetDir, 'manifest.json'));

        console.log(`Artifacts copied to ${targetDir} for Gradle build.`);
    } catch (e) {
        console.error("Failed to post-process artifacts:", e);
        // Don't fail the build, just warn
    }

} else {
    console.error("Build failed!");
    for (const message of result.logs) {
        console.error(message);
    }
}
