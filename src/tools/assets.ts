import { z } from "zod";
import fs from "fs";
import path from "path";
import { glob } from "glob";

const LARGE_FILE_THRESHOLD = 500 * 1024; // 500KB

export const assetOptimizerTool = {
    name: "optimize_ui_assets",
    description: "Scans the assets directory for unoptimized images and missing icon formats (.icns, .ico).",
    parameters: z.object({
        projectRoot: z.string().optional().describe("Absolute path to the project root."),
    }),
    handler: async ({ projectRoot }: { projectRoot?: string }) => {
        const root = projectRoot || process.cwd();
        // Try to find assets folder in common locations
        const possibleAssets = ["assets", "public", "resources", "static"].map(d => path.join(root, d));
        const assetsDir = possibleAssets.find(d => fs.existsSync(d));

        if (!assetsDir) {
            return { content: [{ type: "text" as const, text: "Wait: Could not locate 'assets', 'public', or 'resources' directory." }] };
        }

        const images = await glob("**/*.{png,jpg,jpeg,svg,icns,ico}", { cwd: assetsDir, absolute: true });
        const issues: string[] = [];

        // Check for App Icons
        const hasIcns = images.some((f: string) => f.endsWith(".icns"));
        const hasIco = images.some((f: string) => f.endsWith(".ico"));

        if (!hasIcns) issues.push("Missing .icns file. Needed for macOS app icon.");
        if (!hasIco) issues.push("Missing .ico file. Needed for Windows app icon.");

        // Check sizes
        for (const image of images) {
            const stats = fs.statSync(image);
            if (stats.size > LARGE_FILE_THRESHOLD) {
                const kb = Math.round(stats.size / 1024);
                issues.push(`Large Asset: ${path.relative(assetsDir, image)} is ${kb}KB. Consider compressing or converting to WebP/SVG.`);
            }
        }

        if (issues.length === 0) {
            return { content: [{ type: "text" as const, text: "✅ Assets look optimized. Icons present and files are small." }] };
        }

        return {
            content: [{
                type: "text" as const,
                text: `Asset Optimization Report
-------------------------
Directory Scanned: ${path.relative(root, assetsDir)}

Issues:
${issues.map(i => `- ${i}`).join("\n")}
            `
            }]
        };
    }
};
