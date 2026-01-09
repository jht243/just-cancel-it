import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const SOURCE = path.join(ROOT_DIR, 'web', 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.mjs');
const DEST_DIR = path.join(ROOT_DIR, 'assets');
const DEST = path.join(DEST_DIR, 'pdf.worker.min.mjs');

if (!fs.existsSync(DEST_DIR)) {
    fs.mkdirSync(DEST_DIR, { recursive: true });
}

if (fs.existsSync(SOURCE)) {
    fs.copyFileSync(SOURCE, DEST);
    console.log(`[Copy Worker] Successfully copied to ${DEST}`);
} else {
    console.error(`[Copy Worker] Source not found: ${SOURCE}`);
    process.exit(1);
}
