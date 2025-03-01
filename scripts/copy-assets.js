/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs')
const path = require('path')

const sourceDir = path.join(__dirname, 'src', 'assets')
const targetDir = path.join(__dirname, 'dist', 'assets')

function copyDir(src, dest) {
  // Create the destination directory if it doesn't exist
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true })
  }

  // Read the contents of the source directory
  const entries = fs.readdirSync(src, { withFileTypes: true })

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)

    if (entry.isDirectory()) {
      // Recursively copy subdirectories
      copyDir(srcPath, destPath)
    } else {
      // Copy files
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

try {
  copyDir(sourceDir, targetDir)
  console.log('Assets copied successfully!')
} catch (error) {
  console.error('Error copying assets:', error)
  process.exit(1)
}
