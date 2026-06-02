import { z } from "zod";
import fs from "fs";
import { readFile } from "fs/promises";
import path from "path";

import { glob } from "glob";

const SECURITY_CHECKS = [
    {
        name: "Node Integration Enabled",
        regex: /nodeIntegration\s*:\s*true/g,
        severity: "CRITICAL",
        message: "Enabling nodeIntegration in standard windows allows remote content to execute system commands."
    },
    {
        name: "Context Isolation Disabled",
        regex: /contextIsolation\s*:\s*false/g,
        severity: "CRITICAL",
        message: "Disabling contextIsolation allows preload scripts to leak privileged APIs to the renderer."
    },
    {
        name: "Sandbox Disabled",
        regex: /sandbox\s*:\s*false/g,
        severity: "HIGH",
        message: "Disabling sandbox reduces security boundaries for the renderer process."
    },
    {
        name: "Remote Module Used",
        regex: /enableRemoteModule\s*:\s*true/g,
        severity: "CRITICAL",
        message: "The 'remote' module is deprecated and insecure. Use IPC instead."
    },
    {
        name: "Insecure Content Security Policy",
        regex: /<meta http-equiv="Content-Security-Policy"/g, // Naive check for existence
        severity: "INFO",
        message: "Ensure you have a strict CSP defined in your HTML files."
    },
    {
        name: "shell.openExternal without validation",
        regex: /shell\.openExternal\s*\(\s*[a-zA-Z0-9_]+\s*\)/g, // Detects variable usage specifically
        severity: "WARNING",
        message: "Ensure URLs passed to shell.openExternal are validated to prevent arbitrary protocol execution."
    }
];

export const securitySentinelTool = {
    name: "scan_security_risks",
    description: "Scans source code for common Electron security vulnerabilities (e.g., nodeIntegration: true, missing CSP).",
    parameters: z.object({
        projectRoot: z.string().optional().describe("Absolute path to the project root."),
    }),
    handler: async ({ projectRoot }: { projectRoot?: string }) => {
        const root = projectRoot || process.cwd();
        const srcDir = path.join(root, "src"); // Most logic is here

        // Scan src for JS/TS
        const codeFiles = await glob("**/*.{ts,js,tsx,jsx}", { cwd: srcDir, absolute: true });
        // Scan public/static for HTML (CSP)
        const htmlFiles = await glob("**/*.html", { cwd: root, absolute: true });

        const allFiles = [...codeFiles, ...htmlFiles];
        const issues: any[] = [];

        await Promise.all(allFiles.map(async (file) => {

            const content = await readFile(file, "utf-8");
            const relativePath = path.relative(root, file);

            for (const check of SECURITY_CHECKS) {
                // Use matchAll to avoid state issues with global regex in parallel
                const matches = content.matchAll(check.regex);
                for (const _ of matches) {
                    issues.push({
                        file: relativePath,
                        check: check.name,
                        severity: check.severity,
                        message: check.message
                    });
                    break; // Only flag once per file per check
                }
            }

            // Special check for MISSING CSP in HTML files
            if (file.endsWith(".html")) {
                if (!content.includes("Content-Security-Policy")) {
                    issues.push({
                        file: relativePath,
                        check: "Missing CSP",
                        severity: "HIGH",
                        message: "No Content-Security-Policy meta tag found in this HTML file."
                    });
                }
            }
        }));


        if (issues.length === 0) {
            return { content: [{ type: "text" as const, text: "✅ No obvious security issues found." }] };
        }

        return {
            content: [{
                type: "text" as const,
                text: `Security Scan Report

${issues.map(i => `[${i.severity}] ${i.check} -> ${i.file}\n   Reason: ${i.message}`).join("\n\n")}
            `
            }]
        };
    }
};
