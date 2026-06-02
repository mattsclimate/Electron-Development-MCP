import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { searchDocsTool } from "./tools/docs.js";
import { projectWatchtowerTool, getElectronContextTool } from "./tools/project.js";

import { ipcAuditorTool } from "./tools/ipc.js";
import { securitySentinelTool } from "./tools/security.js";
import { boilerplateSmithTool } from "./tools/scaffold.js";

import { nativeModuleDoctorTool } from "./tools/native.js";
import { appPackagerTool } from "./tools/packager.js";
import { performanceProfilerTool } from "./tools/performance.js";
import { uiInspectorTool } from "./tools/ui.js";

import { themeComplianceTool } from "./tools/theme.js";
import { windowStateTool } from "./tools/window.js";
import { menuArchitectTool } from "./tools/menu.js";
import { assetOptimizerTool } from "./tools/assets.js";

// Initialize Server
const server = new McpServer({
    name: "electron-development-mcp",
    version: "1.0.0",
});

// Register Tools
// Casting handler to any to avoid strict type mismatch with SDK's distinct Zod version or strictness
const tools = [
    getElectronContextTool,
    searchDocsTool,
    projectWatchtowerTool,
    ipcAuditorTool,
    securitySentinelTool,
    boilerplateSmithTool,
    nativeModuleDoctorTool,
    appPackagerTool,
    performanceProfilerTool,
    uiInspectorTool,
    themeComplianceTool,
    windowStateTool,
    menuArchitectTool,
    assetOptimizerTool
];

for (const tool of tools) {
    server.tool(
        tool.name,
        tool.description,
        (tool.parameters as z.ZodObject<any>).shape,
        tool.handler
    );
}

// Connect Transport
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}

main();
