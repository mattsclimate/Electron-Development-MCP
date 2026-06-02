import { z } from "zod";
import fs from "fs";
import path from "path";
import { glob } from "glob";

// Theme compliance checks
const THEME_CHECKS = [
    {
        name: "Main Process Native Theme Listener",
        regex: /nativeTheme\.on\s*\(\s*['"]updated['"]/,
        message: "Main process should listen for 'nativeTheme.updated' to notify renderer or update native UI elements (tray, menu)."
    },
    {
        name: "CSS Dark Mode Media Query",
        regex: /@media\s*\(\s*prefers-color-scheme\s*:\s*dark\s*\)/,
        message: "CSS should use '@media (prefers-color-scheme: dark)' to automatically adapt to system theme."
    },
    {
        name: "Vibrancy/Acrylic (Optional)",
        regex: /(vibrancy|backgroundMaterial)\s*:/,
        message: "Consider using 'vibrancy' (macOS) or 'backgroundMaterial' (Windows) for a native feel."
    },
    {
        name: "Traffic Light Positioning",
        regex: /(titleBarStyle|trafficLightPosition)/,
        message: "Custom title bars often require tweaking 'trafficLightPosition' to align with custom headers."
    }
];

export const themeComplianceTool = {
    name: "check_theme_compliance",
    description: "Checks if the app properly handles system theme changes (Dark/Light mode) in both Main and Renderer processes.",
    parameters: z.object({
        projectRoot: z.string().optional().describe("Absolute path to the project root."),
    }),
    handler: async ({ projectRoot }: { projectRoot?: string }) => {
        const root = projectRoot || process.cwd();

        const srcDir = path.join(root, "src");

        if (!fs.existsSync(srcDir)) {
            return { content: [{ type: "text" as const, text: "Error: src directory not found." }] };
        }

        const files = await glob("**/*.{ts,js,css,scss,less,html}", { cwd: root, absolute: true, ignore: "node_modules/**" });
        const warnings: string[] = [];
        const passes: string[] = [];

        // Check 1: CSS Support
        let hasCssDarkMode = false;
        // Check 2: Main Process Listeners
        let hasMainListener = false;

        for (const file of files) {
            const content = fs.readFileSync(file, "utf-8");

            if (file.match(/\.(css|scss|less)$/)) {
                if (content.includes("prefers-color-scheme: dark")) hasCssDarkMode = true;
            }

            if (file.match(/\.(ts|js)$/) && content.includes("nativeTheme.on")) {
                hasMainListener = true;
            }
        }

        if (!hasCssDarkMode) {
            warnings.push("❌ No CSS '@media (prefers-color-scheme: dark)' found. Your app won't adapt to system theme changes automatically.");
        } else {
            passes.push("✅ CSS Dark Mode support detected.");
        }

        if (!hasMainListener) {
            warnings.push("⚠️ No 'nativeTheme.on(\"updated\")' found in Main process. You might need this to update Tray icons or Menus when theme changes.");
        } else {
            passes.push("✅ Main process theme listener detected.");
        }

        return {
            content: [{
                type: "text" as const,
                text: `Theme Compliance Report
-----------------------
${passes.join("\n")}

${warnings.length > 0 ? "Issues Found:" : "Excellent! Your app appears theme-aware."}
${warnings.join("\n")}

Tip: Test your app by toggling your OS theme while the app is running.
            `
            }]
        };
    }
};
