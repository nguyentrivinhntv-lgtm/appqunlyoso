const fs = require('fs');
const http = require('http');
const path = require('path');

const dbPath = path.join(__dirname, 'db.json');

// --- TẠO DATABASE MẶC ĐỊNH NẾU CHƯA CÓ ---
if (!fs.existsSync(dbPath)) {
  fs.writeFileSync(dbPath, JSON.stringify({ students: [] }, null, 2));
}

// --- SERVER API CHÍNH (Cổng 5000) ---
const jsonServerProcess = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  try {
    const getDb = () => JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    
    const sendJSON = (data, statusCode = 200) => {
      res.writeHead(statusCode, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    };

    const getBody = async () => {
      return new Promise((resolve) => {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => resolve(JSON.parse(body || '{}')));
      });
    };

    const urlParts = req.url.split('?')[0].split('/').filter(Boolean);
    const resource = urlParts[0]; 
    const id = urlParts[1];

    if (!resource) {
      return sendJSON({ message: 'Backend API is running!' });
    }

    if (req.method === 'GET') {
      const db = getDb();
      if (!db[resource]) db[resource] = [];
      if (id) {
        const item = db[resource].find(i => i.id === id);
        if (item) sendJSON(item);
        else sendJSON({ error: 'Not found' }, 404);
      } else {
        sendJSON(db[resource]);
      }
    } 
    else if (req.method === 'POST') {
      getBody().then(body => {
        const db = getDb();
        if (!db[resource]) db[resource] = [];
        const newItem = { ...body, id: Date.now().toString() + Math.random().toString(36).substring(7) };
        db[resource].push(newItem);
        fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
        sendJSON(newItem, 201);
      });
    }
    else if (req.method === 'PUT') {
      if (!id) return sendJSON({ error: 'ID required' }, 400);
      getBody().then(body => {
        const db = getDb();
        if (!db[resource]) db[resource] = [];
        const index = db[resource].findIndex(i => i.id === id);
        if (index !== -1) {
          db[resource][index] = { ...db[resource][index], ...body, id };
          fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
          sendJSON(db[resource][index]);
        } else {
          sendJSON({ error: 'Not found' }, 404);
        }
      });
    }
    else if (req.method === 'DELETE') {
      if (!id) return sendJSON({ error: 'ID required' }, 400);
      const db = getDb();
      if (!db[resource]) db[resource] = [];
      const index = db[resource].findIndex(i => i.id === id);
      if (index !== -1) {
        db[resource].splice(index, 1);
        fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
        sendJSON({});
      } else {
        sendJSON({ error: 'Not found' }, 404);
      }
    }
    else {
      sendJSON({ error: 'Method not allowed' }, 405);
    }
  } catch (e) {
    console.error('API error:', e);
    res.writeHead(500);
    res.end(JSON.stringify({ error: e.message }));
  }
});

const PORT = process.env.PORT || 5000;
jsonServerProcess.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend API Server listening on port ${PORT}`);
});
