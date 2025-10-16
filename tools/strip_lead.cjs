const fs=require('fs');
let buf=fs.readFileSync('frontend/public/src/app.js');
while (buf.length && (buf[0]===0xFF || buf[0]===0xFE)) { buf=buf.slice(1); }
fs.writeFileSync('frontend/public/src/app.js', buf);
console.log('stripped leading FF/FE');
