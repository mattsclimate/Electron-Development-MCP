import { z } from "zod";
import Fuse from "fuse.js";
import { getElectronDocs } from "../utils/fetchDocs.js";

let fuseIndex: Fuse<any> | null = null;

// Define the Tool Interface
export const searchDocsTool = {
    name: "search_electron_docs",
    description: "Search official Electron documentation for API methods, events, and properties.",
    parameters: z.object({
        query: z.string().describe("The search term (e.g., 'BrowserWindow', 'ipcMain', 'dialog')"),
    }),
    handler: async ({ query }: { query: string }) => {
        const docs = await getElectronDocs();

        if (!fuseIndex) {
            // Flatten docs for better searchability
            const flatDocs = docs.map((item: any) => ({
                name: item.name,
                description: item.description,
                type: item.type,
                methods: item.methods || [],
                properties: item.properties || []
            }));

            fuseIndex = new Fuse(flatDocs, { keys: ["name", "methods.name"], threshold: 0.3 });
        }

        const results = fuseIndex.search(query, { limit: 1 });

        if (!results.length) return { content: [{ type: "text" as const, text: "No results found." }] };

        const match = results[0].item as any;

        // Format output for the LLM
        return {
            content: [{
                type: "text" as const,
                text: `
# ${match.name} (${match.type})
${match.description}

## Top Methods
${match.methods.slice(0, 5).map((m: any) => `- ${m.name}(${m.parameters?.map((p: any) => p.name).join(", ")})`).join("\n")}

[More Info](https://www.electronjs.org/docs/api/${match.name.toLowerCase()})
        `
            }]
        };
    }
};
