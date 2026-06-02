import { z } from "zod";
import fs from "fs";
import { readFile } from "fs/promises";
import path from "path";

import { glob } from "glob";

// Simple regex to catch common patterns. Not perfect, but good enough for a "living skill".
const MAIN_HANDLERS = /ipcMain\.(handle|on)\s*\(\s*['"](.+?)['"]/g;
const RENDERER_INVOKES = /ipcRenderer\.(invoke|send)\s*\(\s*['"](.+?)['"]/g;

export const ipcAuditorTool = {
    name: "analyze_ipc_channels",
    description: "Scans the source code for IPC usage (ipcMain.handle/on vs ipcRenderer.invoke/send) to find channel mismatches or missing handlers.",
    parameters: z.object({
        projectRoot: z.string().optional().describe("Absolute path to the project root. Defaults to current working directory."),
    }),
    handler: async ({ projectRoot }: { projectRoot?: string }) => {
        const root = projectRoot || process.cwd();
        const srcDir = path.join(root, "src");

        if (!fs.existsSync(srcDir)) {
            return { content: [{ type: "text" as const, text: "Error: 'src' directory not found. Please run this tool from the project root." }] };
        }

        // Find all TS/JS files in src
        const files = await glob("**/*.{ts,js,tsx,jsx}", { cwd: srcDir, absolute: true });

        const mainChannels = new Set<string>();
        const rendererChannels = new Set<string>();

        const fileMap: Record<string, string[]> = {}; // Map channel -> file paths

        // Parallelize file reading
        await Promise.all(files.map(async (file) => {
            const content = await readFile(file, "utf-8");

            let match;
            // Reset regex state since we are reusing globals (should ideally not use global regexes with state if parallel, or use .matchAll)
            // Actually, MAIN_HANDLERS is global. Re-executing it in parallel on different content is fine if we use a local copy or stick to .matchAll

            // Refactor: Use .matchAll to be safe with parallel execution
            const mainMatches = content.matchAll(MAIN_HANDLERS);
            for (const match of mainMatches) {
                const channel = match[2];
                mainChannels.add(channel);
                if (!fileMap[channel]) fileMap[channel] = [];
                fileMap[channel].push(`Main: ${path.relative(root, file)}`);
            }

            const rendererMatches = content.matchAll(RENDERER_INVOKES);
            for (const match of rendererMatches) {
                const channel = match[2];
                rendererChannels.add(channel);
                if (!fileMap[channel]) fileMap[channel] = [];
                fileMap[channel].push(`Renderer: ${path.relative(root, file)}`);
            }
        }));


        const missingHandlers = [...rendererChannels].filter(c => !mainChannels.has(c));
        const unusedHandlers = [...mainChannels].filter(c => !rendererChannels.has(c));
        const validChannels = [...mainChannels].filter(c => rendererChannels.has(c));

        return {
            content: [{
                type: "text" as const,
                text: `IPC Analysis Report for ${root}

## Summary
- Total Channels Detected: ${mainChannels.size + rendererChannels.size}
- Valid Pairs: ${validChannels.length}
- Missing Handlers (Renderer asks, Main ignores): ${missingHandlers.length}
- Unused Handlers (Main listens, Renderer silent): ${unusedHandlers.length}

## Missing Handlers (Critical)
${missingHandlers.map(c => `- '${c}' (used in ${fileMap[c]?.join(", ")})`).join("\n") || "None"}

## Unused Handlers (Warning)
${unusedHandlers.map(c => `- '${c}' (defined in ${fileMap[c]?.join(", ")})`).join("\n") || "None"}

## Valid Channels
${validChannels.map(c => `- '${c}'`).join("\n")}
        `
            }]
        };
    }
};
