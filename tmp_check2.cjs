const fs = require('fs');
const s = fs.readFileSync('frontend/public/src/app.js','utf8');
for (let i=0;i<s.length;i++){
  const code = s.charCodeAt(i);
  if (code>127) {
    const ctx = s.slice(Math.max(0,i-20), Math.min(s.length,i+20));
    console.log('NON_ASCII', i, code, JSON.stringify(ctx));
    if (i>2000) break;
  }
}
try { new Function(s); console.log('SYNTAX_OK'); }
catch(e){ console.log('ERR_AT', e.message); }
