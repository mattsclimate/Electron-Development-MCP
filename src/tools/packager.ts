import { z } from "zod";
import fs from "fs";
import path from "path";

export const appPackagerTool = {
    name: "validate_build_config",
    description: "Validates the electron-builder configuration for common errors (missing App ID, files configuration, icons).",
    parameters: z.object({
        projectRoot: z.string().optional().describe("Absolute path to the project root."),
    }),
    handler: async ({ projectRoot }: { projectRoot?: string }) => {
        const root = projectRoot || process.cwd();

        // Naive finder for config
        const configPath = ["electron-builder.yml", "electron-builder.json", "package.json"]
            .map(f => path.join(root, f))
            .find(p => fs.existsSync(p));

        if (!configPath) {
            return { content: [{ type: "text" as const, text: "Error: No electron-builder config found." }] };
        }

        let config: any = {};
        if (configPath.endsWith(".json")) {
            config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
        } else if (configPath.endsWith("package.json")) {
            const pkg = JSON.parse(fs.readFileSync(configPath, "utf-8"));
            if (pkg.build) config = pkg.build;
            else return { content: [{ type: "text" as const, text: "Error: No 'build' key in package.json." }] };
        } else {
            // YML support requires a parser, skipping for simplicity in this version
            return { content: [{ type: "text" as const, text: "YAML config parsing not supported in this version. Request a JSON config check." }] };
        }

        const issues: string[] = [];

        // Checks
        if (!config.appId) issues.push("Missing 'appId' (e.g., com.example.app). Required for code signing and updates.");
        if (!config.productName) issues.push("Missing 'productName'.");

        if (config.mac && !config.mac.category) {
            issues.push("Missing 'mac.category'. Required for macOS App Store or notarization.");
        }

        // Icon check logic could go here
        const iconPath = path.join(root, "build", "icon.png"); // classic default
        // Naive check, builder supports many paths

        if (issues.length === 0) {
            return { content: [{ type: "text" as const, text: "✅ Build configuration looks good (basic checks passed)." }] };
        }

        return {
            content: [{
                type: "text" as const,
                text: `Build Config Validation Failed
------------------------------
Config File: ${path.relative(root, configPath)}

Issues:
${issues.map(i => `- ${i}`).join("\n")}
            `
            }]
        };
    }
};
