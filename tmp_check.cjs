const fs = require('fs');
const s = fs.readFileSync('frontend/public/src/app.js','utf8');
try { new Function(s); console.log('SYNTAX_OK'); }
catch (e) { console.error('SYNTAX_ERROR:', e.message); process.exit(1); }
