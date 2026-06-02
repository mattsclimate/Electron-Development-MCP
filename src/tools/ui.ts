import { z } from "zod";
import fs from "fs";
import path from "path";
import { glob } from "glob";

// Naive component scanner
const COMPONENT_DEF = /(?:export\s+(?:default\s+)?)?(?:const|function|class)\s+([A-Z][a-zA-Z0-9]*)/g;

export const uiInspectorTool = {
    name: "scan_renderer_structure",
    description: "Scans the src/renderer directory to map out the UI component tree.",
    parameters: z.object({
        projectRoot: z.string().optional().describe("Absolute path to the project root."),
    }),
    handler: async ({ projectRoot }: { projectRoot?: string }) => {
        const root = projectRoot || process.cwd();
        const srcDir = path.join(root, "src/renderer"); // standard structure

        if (!fs.existsSync(srcDir)) {
            return { content: [{ type: "text" as const, text: "Error: src/renderer directory not found." }] };
        }

        const files = await glob("**/*.{tsx,jsx,vue}", { cwd: srcDir, absolute: true });

        const components: string[] = [];

        for (const file of files) {
            const content = fs.readFileSync(file, "utf-8");
            const relative = path.relative(srcDir, file);

            let match;
            while ((match = COMPONENT_DEF.exec(content)) !== null) {
                components.push(`${match[1]} (${relative})`);
            }
        }

        return {
            content: [{
                type: "text" as const,
                text: `Frontend Component Map
----------------------
Found ${components.length} components in src/renderer:

${components.map(c => `- ${c}`).join("\n")}

Success: Use this map to decide where to inject IPC listeners or state management logic.
            `
            }]
        };
    }
};
