import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = path.join(__dirname, 'data.json');

function readData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (e) {
    console.error('读取数据失败:', e);
  }
  return { cases: [] };
}

function writeData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('保存数据失败:', e);
  }
}

async function start() {
  const vite = await createViteServer({
    server: {
      host: '0.0.0.0',
      port: 5173,
    },
    plugins: [
      {
        name: 'api-handler',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url === '/api/cases' && req.method === 'GET') {
              const data = readData();
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(data.cases));
              return;
            }
            
            if (req.url === '/api/cases' && req.method === 'POST') {
              let body = '';
              req.on('data', chunk => { body += chunk; });
              req.on('end', () => {
                const newCase = JSON.parse(body);
                const data = readData();
                data.cases.unshift(newCase);
                writeData(data);
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(newCase));
              });
              return;
            }
            
            if (req.url?.startsWith('/api/cases/') && req.method === 'PUT') {
              const id = req.url.split('/')[3];
              let body = '';
              req.on('data', chunk => { body += chunk; });
              req.on('end', () => {
                const update = JSON.parse(body);
                const data = readData();
                const index = data.cases.findIndex(c => c.id === id);
                if (index !== -1) {
                  data.cases[index] = { ...data.cases[index], ...update };
                  writeData(data);
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify(data.cases[index]));
                } else {
                  res.statusCode = 404;
                  res.end(JSON.stringify({ error: '案例不存在' }));
                }
              });
              return;
            }
            
            if (req.url?.startsWith('/api/cases/') && req.method === 'DELETE') {
              const id = req.url.split('/')[3];
              const data = readData();
              data.cases = data.cases.filter(c => c.id !== id);
              writeData(data);
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true }));
              return;
            }
            
            next();
          });
        }
      }
    ]
  });

  await vite.listen();
  
  console.log('=====================================');
  console.log('🚀 服务器已启动');
  console.log('');
  console.log('本机访问: http://localhost:5173');
  console.log('数据迁移: http://localhost:5173/migrate');
  
  const os = await import('os');
  const interfaces = os.networkInterfaces();
  Object.keys(interfaces).forEach(key => {
    interfaces[key].forEach(iface => {
      if (iface.family === 'IPv4' && !iface.internal) {
        console.log(`局域网访问: http://${iface.address}:5173`);
      }
    });
  });
  
  console.log('');
  console.log('按 Ctrl+C 停止服务器');
  console.log('=====================================');
}

start();
