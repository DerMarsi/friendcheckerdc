import { build } from "bun";

const result = await build({
    entrypoints: ["src/index.ts"],
    outdir: "..", // Output to root directory
    target: "browser", // React Native environment is closer to browser for    target: "browser",
    format: "esm",  // Use ESM so we have `export default`
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
        let indexJsContent = fs.readFileSync(path.join(rootDir, 'index.js'), 'utf8');

        // --- IIFE WRAPPING LOGIC ---
        // Revenge plugins often run as IIFEs. Bun ESM output has 'export default ...'.
        // We will convert this to: (function() { ... return plugin; })();

        // Simple regex replace for export default
        // Note: minified code might behave differently, but usually 'export default' is at the end.
        // If bun produces 'var ...; export default ...', we want 'var ...; return ...'

        if (indexJsContent.includes("export default")) {
            indexJsContent = indexJsContent.replace("export default", "return");
            indexJsContent = `(function() { ${indexJsContent} })();`;
            console.log("Wrapped index.js in IIFE (standard export default).");
            fs.writeFileSync(path.join(rootDir, 'index.js'), indexJsContent);
        } else if (/export\s*\{\s*(\w+)\s*as\s*default\s*\}\s*;?/.test(indexJsContent)) {
            indexJsContent = indexJsContent.replace(/export\s*\{\s*(\w+)\s*as\s*default\s*\}\s*;?/, "return $1;");
            indexJsContent = `(function() { ${indexJsContent} })();`;
            console.log("Wrapped index.js in IIFE (named export replace).");
            fs.writeFileSync(path.join(rootDir, 'index.js'), indexJsContent);
        } else {
            console.warn("Could not find 'export default' to wrap in IIFE. Plugin might fail to load.");
        }

        // 2. Calculate SHA-256 hash (of the *wrapped* content)
        // Re-read buffer from string to get correct hash
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
