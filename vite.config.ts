import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'

// Custom plugin to generate version.json
const versionGenerator = () => {
  return {
    name: 'version-generator',
    buildStart() {
      const version = {
        version: process.env.npm_package_version || '1.0.0',
        buildTime: new Date().toISOString(),
        timestamp: Date.now()
      }

      // Ensure public directory exists
      if (!fs.existsSync('public')) {
        fs.mkdirSync('public')
      }

      fs.writeFileSync(
        path.resolve('public', 'version.json'),
        JSON.stringify(version, null, 2)
      )
      console.log('✅ Generated public/version.json', version)
    }
  }
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    versionGenerator()
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
  },
})
