const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
for (const file of ['index.html', 'app.js', 'styles.css']) fs.copyFileSync(path.join(root, 'frontend', file), path.join(root, 'dist', file));
console.log('Static assets copied to dist; backend API required');
