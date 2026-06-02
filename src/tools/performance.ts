import { z } from "zod";
import fs from "fs";
import { readFile } from "fs/promises";
import path from "path";

import { glob } from "glob";

// Performance anti-patterns
const PERF_CHECKS = [
    {
        name: "Synchronous IPC",
        regex: /event\.returnValue\s*=/g,
        message: "Applying 'event.returnValue' blocks the renderer process. Use 'ipcMain.handle' and 'invoke' instead."
    },
    {
        name: "Sync File System in Main",
        regex: /fs\.read.*Sync\(/g,
        message: "Synchronous FS operations blocks the Main thread, freezing the entire app UI during I/O."
    },
    {
        name: "Remote Module Enablement",
        regex: /enableRemoteModule\s*:\s*true/g,
        message: "Enabling remote module relies on synchronous IPC, which is a major performance bottleneck."
    },
    {
        name: "Large Module Require",
        // Primitive check for potentially heavy requires at top level - hard to do perfectly with regex
        regex: /require\(['"](aws-sdk|googleapis|azure)['"]\)/g,
        message: "Importing massive SDKs at startup slows down launch. Use lazy loading (require inside usage function) or dynamic imports."
    }
];

export const performanceProfilerTool = {
    name: "analyze_main_process_perf",
    description: "Analyzes the Main process for performance bottlenecks like synchronous IPC or blocking I/O.",
    parameters: z.object({
        projectRoot: z.string().optional().describe("Absolute path to the project root."),
    }),
    handler: async ({ projectRoot }: { projectRoot?: string }) => {
        const root = projectRoot || process.cwd();
        const srcDir = path.join(root, "src/main"); // Assuming standard structure

        if (!fs.existsSync(srcDir)) {
            return { content: [{ type: "text" as const, text: "Error: src/main directory not found." }] };
        }

        const files = await glob("**/*.{ts,js}", { cwd: srcDir, absolute: true });
        const issues: any[] = [];

        await Promise.all(files.map(async (file) => {

            const content = await readFile(file, "utf-8");
            const relative = path.relative(root, file);

            for (const check of PERF_CHECKS) {
                if (check.regex.test(content)) {
                    issues.push({
                        file: relative,
                        check: check.name,
                        message: check.message
                    });
                }
            }
        }));


        if (issues.length === 0) {
            return { content: [{ type: "text" as const, text: "✅ No obvious Main process performance issues found." }] };
        }

        return {
            content: [{
                type: "text" as const,
                text: `Performance Report
------------------
${issues.map(i => `[${i.check}] in ${i.file}\n   Suggestion: ${i.message}`).join("\n\n")}
            `
            }]
        };
    }
};
