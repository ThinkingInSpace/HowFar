// Only runtime assets belong in the public deployment artifact.
import { cp, mkdir, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'dist');
const files = ['index.html', 'about.html', 'favicon.svg', 'style.css', 'app.js',
    'game.js', 'questions.js', 'results.js', 'globe.js', 'globe-fallback.js', 'cities.json',
    'vendor/globe.gl.min.js', 'vendor/earth-blue-marble.jpg', 'vendor/LICENSE.globe-gl.txt',
    'vendor/THIRD-PARTY-NOTICES.txt'];
const allowed = new Set(files);
async function checkExisting(directory, prefix = '') {
    for (const entry of await readdir(directory, { withFileTypes: true }).catch(error => {
        if (error.code === 'ENOENT') return [];
        throw error;
    })) {
        const relative = prefix + entry.name;
        if (entry.isDirectory() && files.some(file => file.startsWith(relative + '/'))) {
            await checkExisting(path.join(directory, entry.name), relative + '/');
        } else if (!entry.isFile() || !allowed.has(relative)) {
            throw new Error(`Unexpected deployment file: ${relative}. Review and remove it before building.`);
        }
    }
}
await checkExisting(output);
for (const file of files) {
    const target = path.join(output, file);
    await mkdir(path.dirname(target), { recursive: true });
    await cp(path.join(root, file), target);
}
console.log(`Prepared ${files.length} public assets in dist/. Deploy only this directory.`);
