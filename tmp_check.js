const fs = require('fs');
const s = fs.readFileSync('frontend/public/src/app.js','utf8');
new Function(s);
console.log('OK');
