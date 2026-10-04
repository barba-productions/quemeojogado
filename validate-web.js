const fs = require('fs');
const path = require('path');

const webRoot = path.join(__dirname, 'web');
const htmlFiles = fs.readdirSync(webRoot).filter((file) => file.endsWith('.html'));
const missing = [];

for (const file of htmlFiles) {
  const html = fs.readFileSync(path.join(webRoot, file), 'utf8');
  for (const match of html.matchAll(/(?:href|src)="([^"#]+)"/g)) {
    const reference = match[1];
    if (/^(https?:|data:)/.test(reference)) continue;
    if (!fs.existsSync(path.resolve(webRoot, reference))) missing.push(`${file}: ${reference}`);
  }
}

if (missing.length) {
  console.error(missing.join('\n'));
  process.exitCode = 1;
} else {
  JSON.parse(fs.readFileSync(path.join(webRoot, 'manifest.webmanifest'), 'utf8'));
  console.log(`Validated ${htmlFiles.length} HTML files and manifest.`);
}
