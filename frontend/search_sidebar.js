const fs = require('fs')
const path = require('path')

function walk(dir) {
  let results = []
  const list = fs.readdirSync(dir)
  list.forEach(file => {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)
    if (stat && stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.next') {
        results = results.concat(walk(filePath))
      }
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(filePath)
      }
    }
  })
  return results
}

const files = walk(__dirname)
files.forEach(filePath => {
  const content = fs.readFileSync(filePath, 'utf8')
  const lines = content.split('\n')
  lines.forEach((line, idx) => {
    if (line.includes('components/dashboard/Sidebar') || line.includes('components/dashboard/Topbar')) {
      console.log(`${path.relative(__dirname, filePath)} [Line ${idx + 1}]: ${line.trim()}`)
    }
  })
})
