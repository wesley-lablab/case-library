import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import fs from 'fs'
import Inspector from 'unplugin-vue-dev-locator/vite'
import traeBadgePlugin from 'vite-plugin-trae-solo-badge'

const DATA_FILE = path.join(__dirname, 'data.json')

function readData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8')
      return JSON.parse(content)
    }
  } catch (e) {
    console.error('读取数据失败:', e)
  }
  return { cases: [] }
}

function writeData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8')
  } catch (e) {
    console.error('保存数据失败:', e)
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: process.env.VITE_BASE_URL || './',
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  plugins: [
    vue(),
    Inspector(),
    traeBadgePlugin({
      variant: 'dark',
      position: 'bottom-right',
      prodOnly: true,
      clickable: true,
      clickUrl: 'https://www.trae.ai/solo?showJoin=1',
      autoTheme: true,
      autoThemeTarget: '#app',
    }),
    {
      name: 'api-handler',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === '/api/cases' && req.method === 'GET') {
            const data = readData()
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(data.cases))
            return
          }
          
          if (req.url === '/api/cases' && req.method === 'POST') {
            let body = ''
            req.on('data', chunk => { body += chunk })
            req.on('end', () => {
              const newCase = JSON.parse(body)
              const data = readData()
              data.cases.unshift(newCase)
              writeData(data)
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify(newCase))
            })
            return
          }
          
          if (req.url?.startsWith('/api/cases/') && req.method === 'PUT') {
            const id = req.url.split('/')[3]
            let body = ''
            req.on('data', chunk => { body += chunk })
            req.on('end', () => {
              const update = JSON.parse(body)
              const data = readData()
              const index = data.cases.findIndex(c => c.id === id)
              if (index !== -1) {
                data.cases[index] = { ...data.cases[index], ...update }
                writeData(data)
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify(data.cases[index]))
              } else {
                res.statusCode = 404
                res.end(JSON.stringify({ error: '案例不存在' }))
              }
            })
            return
          }
          
          if (req.url?.startsWith('/api/cases/') && req.method === 'DELETE') {
            const id = req.url.split('/')[3]
            const data = readData()
            data.cases = data.cases.filter(c => c.id !== id)
            writeData(data)
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ success: true }))
            return
          }
          
          next()
        })
      }
    }
  ],
  build: {
    sourcemap: 'hidden',
    target: 'esnext',
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
