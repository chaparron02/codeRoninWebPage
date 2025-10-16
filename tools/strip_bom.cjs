const fs=require('fs');
let buf=fs.readFileSync('frontend/public/src/app.js');
if (buf[0]===0xEF && buf[1]===0xBB && buf[2]===0xBF){ buf=buf.slice(3); }
fs.writeFileSync('frontend/public/src/app.js', buf);
console.log('stripped BOM');
