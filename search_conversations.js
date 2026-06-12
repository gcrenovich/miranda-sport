const fs = require('fs');
const path = require('path');

const convDir = "C:\\Users\\German A. IT\\.gemini\\antigravity-ide\\conversations";
const files = fs.readdirSync(convDir);

files.forEach(file => {
  const filePath = path.join(convDir, file);
  const stat = fs.statSync(filePath);
  if (stat.isFile() && (file.endsWith('.db') || file.endsWith('.pb'))) {
    console.log(`File: ${file} | Size: ${stat.size} | Modified: ${stat.mtime}`);
    try {
      const content = fs.readFileSync(filePath);
      // Let's do a simple regex search for strings in the buffer
      // ASCII/UTF-8 strings matching printable chars of length 15+
      const matches = content.toString('utf-8').match(/[\w\sáéíóúÁÉÍÓÚñÑüÜ¡¿.,:;\-@()\[\]"']{15,500}/g);
      if (matches) {
        console.log(`  Found ${matches.length} string candidates.`);
        // Filter out strings that contain SQL/schema words to find actual chat content
        const chatMatches = matches.filter(s => {
          const lower = s.toLowerCase();
          return !lower.includes('sqlite') && !lower.includes('table') && !lower.includes('index') &&
                 (lower.includes('miranda') || lower.includes('usuario') || lower.includes('pedido') || lower.includes('vendedor') || lower.includes('afip') || lower.includes('arca') || lower.includes('render') || lower.includes('despliegue'));
        });
        console.log(`  Filtered chat matches: ${chatMatches.length}`);
        // Show the last 10 matches
        chatMatches.slice(-10).forEach((m, idx) => {
          console.log(`    [${idx}] ${m.trim().replace(/\s+/g, ' ')}`);
        });
      }
    } catch (e) {
      console.log(`  Error reading file: ${e.message}`);
    }
  }
});
