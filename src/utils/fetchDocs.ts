import fs from 'fs';
import path from 'path';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CACHE_PATH = path.join(__dirname, '..', '..', 'data', 'electron-api.json');
let memoryCache: any = null;

export async function getElectronDocs(version = 'latest') {
    // Return memory cache if exists
    if (memoryCache) {
        return memoryCache;
    }

    // Return disk cache if exists
    if (fs.existsSync(CACHE_PATH)) {
        try {
            memoryCache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'));
            return memoryCache;
        } catch (e) {
            // If corrupt, refetch
        }
    }

    // Otherwise download using native fetch (Node 18+)
    console.log(`Fetching Electron docs for version: ${version}...`);
    const url = `https://unpkg.com/electron-api-docs@${version}/electron-api.json`;
    const response = await fetch(url);
    const data = await response.json();

    // Ensure data dir exists
    fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true });
    fs.writeFileSync(CACHE_PATH, JSON.stringify(data));
    console.log('Docs cached successfully.');

    memoryCache = data;
    return data;
}
