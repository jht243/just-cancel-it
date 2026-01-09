#!/usr/bin/env node
/**
 * Inline the compiled JS bundle into the HTML template using base64 encoding
 * to avoid HTML parser issues with large bundles
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const htmlPath = path.join(__dirname, '../assets/just-cancel.html');
const jsPath = path.join(__dirname, '../assets/just-cancel.js');

console.log('[Inline Bundle] Reading files...');
const htmlContent = fs.readFileSync(htmlPath, 'utf-8');
const jsContent = fs.readFileSync(jsPath, 'utf-8');

console.log(`[Inline Bundle] JS bundle size: ${(jsContent.length / 1024).toFixed(2)} KB`);

// Base64 encode the JavaScript to avoid parser issues
const encodedJS = Buffer.from(jsContent, 'utf-8').toString('base64');
console.log(`[Inline Bundle] Encoded size: ${(encodedJS.length / 1024).toFixed(2)} KB`);

// Create a script that decodes and executes the bundle
const inlineScript = `
    <script type="module">
      // Decode and execute the base64-encoded React bundle
      const encodedScript = ${JSON.stringify(encodedJS)};
      const decodedScript = atob(encodedScript);
      const blob = new Blob([decodedScript], { type: 'text/javascript' });
      const url = URL.createObjectURL(blob);
      import(url)
        .catch(err => {
          console.error('[Just Cancel] Failed to load:', err);
          const root = document.getElementById('just-cancel-root');
          if (root) {
            root.innerHTML = '<div style="padding:20px;text-align:center;font-family:sans-serif;color:#DC2626"><h3>Failed to load subscription analyzer</h3><p>Please refresh the page.</p></div>';
          }
        });
    </script>`;

// Replace the script tag
const updatedHtml = htmlContent.replace(
  /<script type="module">[\s\S]*?<\/script>\s*<\/body>/,
  inlineScript + '\n  </body>'
);

if (updatedHtml === htmlContent) {
  console.error('[Inline Bundle] ERROR: Script tag not found or not replaced!');
  process.exit(1);
}

fs.writeFileSync(htmlPath, updatedHtml, 'utf-8');
console.log('[Inline Bundle] Successfully inlined encoded bundle into HTML');
console.log(`[Inline Bundle] Output: ${htmlPath}`);

