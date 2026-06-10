import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(express.json({ limit: '50mb' }));
app.use(express.static('dist'));
app.use(express.static('public'));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

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

app.get('/api/cases', (req, res) => {
  const data = readData();
  res.json(data.cases);
});

app.post('/api/cases', (req, res) => {
  const data = readData();
  const newCase = req.body;
  data.cases.unshift(newCase);
  writeData(data);
  res.json(newCase);
});

app.put('/api/cases/:id', (req, res) => {
  const data = readData();
  const index = data.cases.findIndex(c => c.id === req.params.id);
  if (index !== -1) {
    data.cases[index] = { ...data.cases[index], ...req.body };
    writeData(data);
    res.json(data.cases[index]);
  } else {
    res.status(404).json({ error: '案例不存在' });
  }
});

app.delete('/api/cases/:id', (req, res) => {
  const data = readData();
  data.cases = data.cases.filter(c => c.id !== req.params.id);
  writeData(data);
  res.json({ success: true });
});

app.get('/migrate', (req, res) => {
  res.sendFile(path.join(__dirname, 'migrate-data.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', async () => {
  console.log('=====================================');
  console.log('🚀 服务器已启动');
  console.log('');
  console.log('本机访问: http://localhost:3000');
  
  const os = await import('os');
  const interfaces = os.networkInterfaces();
  Object.keys(interfaces).forEach(key => {
    interfaces[key].forEach(iface => {
      if (iface.family === 'IPv4' && !iface.internal) {
        console.log(`局域网访问: http://${iface.address}:3000`);
      }
    });
  });
  
  console.log('');
  console.log('按 Ctrl+C 停止服务器');
  console.log('=====================================');
});
