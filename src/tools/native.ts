import { z } from "zod";
import fs from "fs";
import path from "path";

// List of common native modules that often require recompilation
const KNOWN_NATIVE_MODULES = [
    "sqlite3",
    "better-sqlite3",
    "serialport",
    "ffi-napi",
    "ref-napi",
    "usb",
    "node-hid",
    "leveldown",
    "rocksdb",
    "canvas",
    "microtime"
];

export const nativeModuleDoctorTool = {
    name: "check_native_modules",
    description: "Checks for native modules (like sqlite3, serialport) derived from package.json and suggests the correct electron-rebuild command if needed.",
    parameters: z.object({
        projectRoot: z.string().optional().describe("Absolute path to the project root."),
    }),
    handler: async ({ projectRoot }: { projectRoot?: string }) => {
        const root = projectRoot || process.cwd();
        const packageJsonPath = path.join(root, "package.json");

        if (!fs.existsSync(packageJsonPath)) {
            return { content: [{ type: "text" as const, text: "Error: package.json not found in root." }] };
        }

        const packageInfo = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
        const allDeps = {
            ...packageInfo.dependencies,
            ...packageInfo.devDependencies
        };

        const foundNativeModules = Object.keys(allDeps).filter(dep => KNOWN_NATIVE_MODULES.includes(dep));

        if (foundNativeModules.length === 0) {
            return { content: [{ type: "text" as const, text: "✅ No common native modules detected. You likely don't need to run electron-rebuild." }] };
        }

        const hasElectronBuilder = !!allDeps["electron-builder"];
        const hasElectronRebuild = !!allDeps["electron-rebuild"] || !!allDeps["@electron/rebuild"];
        const electronVersion = allDeps["electron"] || "unknown";

        let advice = "";
        if (hasElectronBuilder) {
            advice = "Since you are using electron-builder, it handles native deps automatically during the `install-app-deps` step. Ensure you run `npm run postinstall` if defined.";
        } else if (hasElectronRebuild) {
            advice = "You have electron-rebuild installed. Run `npx electron-rebuild` after every npm install.";
        } else {
            advice = "⚠️ You have native modules but no rebuilder detected. You should install `@electron/rebuild` and run it after install.";
        }

        return {
            content: [{
                type: "text" as const,
                text: `Native Module Report
--------------------
Detected Native Modules: ${foundNativeModules.join(", ")}
Electron Version: ${electronVersion}

Advice:
${advice}

Recommended Command (if seeing DLL errors):
npx electron-rebuild -f -w ${foundNativeModules.join(",")}
            `
            }]
        };
    }
};
