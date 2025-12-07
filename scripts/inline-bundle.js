#!/usr/bin/env node
/**
 * Inline the compiled JS bundle into the HTML template
 * This matches the reference project pattern where all JS is inline
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const htmlPath = path.join(__dirname, '../assets/portfolio-optimizer.html');
const jsPath = path.join(__dirname, '../assets/portfolio-optimizer.js');

console.log('[Inline Bundle] Reading files...');
const htmlContent = fs.readFileSync(htmlPath, 'utf-8');
let jsContent = fs.readFileSync(jsPath, 'utf-8');

console.log(`[Inline Bundle] JS bundle size: ${(jsContent.length / 1024).toFixed(2)} KB`);

// Escape </script> tags within the JavaScript to prevent premature script closure
// Replace </script with <\/script (escape the forward slash)
jsContent = jsContent.replace(/<\/script/g, '<\\/script');
console.log('[Inline Bundle] Escaped script tags in JS content');

// Replace the external script tag with an inline one
const updatedHtml = htmlContent.replace(
  /<script type="module" src="\/assets\/portfolio-optimizer\.js"><\/script>/,
  `<script type="module">\n${jsContent}\n</script>`
);

if (updatedHtml === htmlContent) {
  console.error('[Inline Bundle] ERROR: Script tag not found or not replaced!');
  process.exit(1);
}

fs.writeFileSync(htmlPath, updatedHtml, 'utf-8');
console.log('[Inline Bundle] Successfully inlined bundle into HTML');
console.log(`[Inline Bundle] Output: ${htmlPath}`);

