const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../app/partners/dashboard/components');

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace purple classes with amber classes
  content = content.replace(/purple-500\/15/g, 'amber-500/15');
  content = content.replace(/purple-500\/10/g, 'amber-500/10');
  content = content.replace(/purple-500\/20/g, 'amber-500/20');
  content = content.replace(/purple-500\/40/g, 'amber-500/40');
  content = content.replace(/purple-500\/50/g, 'amber-500/50');
  
  // Replace purple hex with amber hex
  content = content.replace(/#7c3aed/g, '#f5c518');
  
  // Replace specific bg colors containing purple
  content = content.replace(/rgba\(124,58,237,0\.18\)/g, 'rgba(245,197,24,0.18)');
  content = content.replace(/rgba\(139,\s*92,\s*246,(\s*[0-9.]+)\)/g, 'rgba(245, 197, 24,$1)');

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Updated ' + path.basename(filePath));
}

function processDirectory(directory) {
  const files = fs.readdirSync(directory);
  for (const file of files) {
    const fullPath = path.join(directory, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      replaceInFile(fullPath);
    }
  }
}

processDirectory(dir);
console.log('Theme replacement complete.');
