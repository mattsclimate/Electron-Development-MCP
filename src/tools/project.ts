import { z } from "zod";
import fs from "fs";
import path from "path";

// Configuration for context tool
const SERVER_NAME = 'electron-development-mcp';
const SERVER_VERSION = '1.0.0';


export const projectWatchtowerTool = {
    name: "read_project_config",
    description: "Reads package.json and electron-builder.yml (or json) to understand the project context, dependencies, and build configuration.",
    parameters: z.object({
        projectRoot: z.string().optional().describe("Absolute path to the project root. Defaults to current working directory if not provided."),
    }),
    handler: async ({ projectRoot }: { projectRoot?: string }) => {
        // Default to a safe inference if no path provided, but in MCP context, agents should usually provide this.
        // Use process.cwd() as a fallback, though it might be the server's own dir.
        const root = projectRoot || process.cwd();

        const packageJsonPath = path.join(root, "package.json");
        let packageInfo: any = {};
        let buildConfig: any = {};
        let error = null;

        // 1. Read package.json
        if (fs.existsSync(packageJsonPath)) {
            try {
                packageInfo = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
            } catch (e: any) {
                error = `Failed to parse package.json: ${e.message}`;
            }
        } else {
            error = "package.json not found in specified root.";
        }

        // 2. Try to find electron-builder config
        const possibleBuildConfigs = [
            "electron-builder.yml",
            "electron-builder.yaml",
            "electron-builder.json",
            "electron-builder.json5",
            "electron-builder.toml"
        ];

        for (const configFile of possibleBuildConfigs) {
            const configPath = path.join(root, configFile);
            if (fs.existsSync(configPath)) {
                try {
                    // For simplicity in this v1, just reading content. A real implementation might need YAML/TOML parsers.
                    // If it's JSON, parse it. If YAML/TOML, return raw text for the LLM to process.
                    const content = fs.readFileSync(configPath, "utf-8");
                    buildConfig = {
                        file: configFile,
                        content: configFile.endsWith(".json") ? JSON.parse(content) : content
                    };
                    break; // Found one, stop looking
                } catch (e: any) {
                    // Ignore parse errors for optional config
                }
            }
        }

        // Also check package.json for "build" key
        if (!buildConfig.file && packageInfo.build) {
            buildConfig = { source: "package.json", content: packageInfo.build };
        }

        const electronVersion = packageInfo.devDependencies?.electron || packageInfo.dependencies?.electron || "Unknown";

        return {
            content: [{
                type: "text" as const,
                text: JSON.stringify({
                    projectName: packageInfo.name || "Unknown",
                    electronVersion,
                    mainEntry: packageInfo.main || "Unknown",
                    scripts: packageInfo.scripts || {},
                    dependencies: packageInfo.dependencies || {},
                    devDependencies: packageInfo.devDependencies || {},
                    buildConfig: buildConfig,
                    error
                }, null, 2)
            }]
        };
    }
};

export const getElectronContextTool = {
    name: "get_electron_context",
    description: "Get context and configuration details about the Electron Development MCP environment.",
    parameters: z.object({}),
    handler: async () => {
        // We use process.cwd() or an environment variable
        const projectDir = process.env.ELECTRON_MCP_PROJECT_DIR || process.cwd();

        return {
            content: [{
                type: "text" as const,
                text: JSON.stringify({
                    success: true,
                    data: {
                        projectDir,
                        serverName: SERVER_NAME,
                        serverVersion: SERVER_VERSION,
                        message: 'Electron Development MCP is active.'
                    }
                }, null, 2)
            }]
        };
    }
};

