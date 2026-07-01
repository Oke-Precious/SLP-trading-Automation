const fs = require('fs');
const path = require('path');

const excludeDirs = ['node_modules', '.git', 'dist'];

function processDir(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    if (excludeDirs.includes(file)) continue;
    
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      processDir(fullPath);
    } else if (stat.isFile() && (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx') || fullPath.endsWith('.json'))) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let newContent = content
        .replace(/\bSMC\b/g, 'SLP')
        .replace(/\bsmc\b/g, 'slp')
        .replace(/Smart Money Concepts/ig, 'Structure, Liquidity & POI')
        .replace(/smcEngine/g, 'slpEngine')
        .replace(/smcResult/g, 'slpResult');
        
      if (newContent !== content) {
        fs.writeFileSync(fullPath, newContent, 'utf8');
        console.log('Updated:', fullPath);
      }
    }
  }
}

processDir('./src');
processDir('./autoSLP-server');
