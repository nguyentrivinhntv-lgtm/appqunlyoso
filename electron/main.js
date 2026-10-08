const { app, BrowserWindow, ipcMain, dialog, utilityProcess } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const os = require('os');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
try {
  if (require('electron-squirrel-startup')) app.quit();
} catch (e) { /* not installed */ }

let mainWindow;
let jsonServerProcess;

function mergeDatabases(localDbPath, bundledDbPath) {
  try {
    const localData = JSON.parse(fs.readFileSync(localDbPath, 'utf8'));
    const bundledData = JSON.parse(fs.readFileSync(bundledDbPath, 'utf8'));
    let changed = false;

    // Các bảng dữ liệu chính cần gộp (Merge)
    const arrayKeys = [
      'students', 'processedProfiles', 'printQueue', 'documentDistribution', 
      'loanDistribution', 'users', 'activityLogs', 'xacNhanSVDistribution', 
      'xacNhanHoanThanhDistribution', 'documentRouting'
    ];

    for (const key of arrayKeys) {
      if (Array.isArray(bundledData[key])) {
        if (!Array.isArray(localData[key])) {
          localData[key] = [];
        }
        
        const localMap = new Map();
        localData[key].forEach(item => {
          if (item && item.id) localMap.set(item.id, item);
        });

        // Chỉ thêm những ID mới chưa có trên máy đích (để không đè mất chỉnh sửa của máy đích)
        for (const bundledItem of bundledData[key]) {
          if (bundledItem && bundledItem.id) {
            let isDuplicate = localMap.has(bundledItem.id);
            
            // Đối với danh sách sinh viên, kiểm tra thêm trùng mã sinh viên (studentId)
            if (!isDuplicate && key === 'students' && bundledItem.studentId) {
              const studentId = bundledItem.studentId.trim();
              if (studentId !== '') {
                isDuplicate = localData.students.some(s => s.studentId === studentId);
              }
            }

            if (!isDuplicate) {
              localData[key].push(bundledItem);
              localMap.set(bundledItem.id, bundledItem); // Cập nhật map để tránh trùng trong chính bundledData
              changed = true;
            }
          }
        }
      }
    }

    // Gộp các key khác (nếu có key mới)
    for (const key in bundledData) {
      if (!arrayKeys.includes(key) && key !== '$schema') {
        if (localData[key] === undefined) {
          localData[key] = bundledData[key];
          changed = true;
        }
      }
    }

    if (changed) {
      fs.writeFileSync(localDbPath, JSON.stringify(localData, null, 2));
      console.log('Đã gộp dữ liệu từ app mới vào dữ liệu cũ thành công!');
    }
  } catch (err) {
    console.error('Lỗi khi gộp dữ liệu:', err);
  }
}

// Determine the correct path for db.json
function getDbPath() {
  // In production, use the app's user data directory
  if (app.isPackaged) {
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'db.json');
    const defaultDb = path.join(process.resourcesPath, 'db.json');
    
    // If db.json doesn't exist in userData, copy the default one
    if (!fs.existsSync(dbPath)) {
      if (fs.existsSync(defaultDb)) {
        fs.copyFileSync(defaultDb, dbPath);
      } else {
        // Create a default empty database
        fs.writeFileSync(dbPath, JSON.stringify({ students: [] }, null, 2));
      }
    } else {
      // Dữ liệu cũ đã tồn tại, ta tiến hành gộp dữ liệu mới vào
      if (fs.existsSync(defaultDb)) {
        mergeDatabases(dbPath, defaultDb);
      }
    }
    return dbPath;
  } else {
    // In development, use the project root (parent of electron/)
    return path.join(__dirname, '..', 'db.json');
  }
}

function startJsonServer() {
  const dbPath = getDbPath();
  console.log('Starting built-in REST API on port 5000 with db:', dbPath);

  jsonServerProcess = http.createServer((req, res) => {
    // Enable CORS
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

      // Handle routes
      const urlParts = req.url.split('?')[0].split('/').filter(Boolean);
      const resource = urlParts[0]; // 'students' or 'processedProfiles'
      const id = urlParts[1];

      if (!resource) {
        return sendJSON({ message: 'Built-in API running' });
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
      console.error('Built-in API error:', e);
      res.writeHead(500);
      res.end(JSON.stringify({ error: e.message }));
    }
  });

  jsonServerProcess.listen(5000, '0.0.0.0', () => {
    console.log('Built-in API server listening on 0.0.0.0:5000 (accessible from LAN)');
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log('Port 5000 is already in use, assuming dev json-server is running.');
    } else {
      console.error('Built-in API server error:', err);
    }
  });
}

function stopJsonServer() {
  if (jsonServerProcess && jsonServerProcess.close) {
    jsonServerProcess.close();
    jsonServerProcess = null;
  }
}

let helperServer;
function startHelperServer() {
  const dbPath = getDbPath();
  helperServer = http.createServer((req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    if (req.method === 'POST' && req.url === '/bulk-students') {
      let body = '';
      req.on('data', chunk => body += chunk.toString());
      req.on('end', () => {
        try {
          const newStudents = JSON.parse(body);
          const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
          
          // Add IDs
          const added = newStudents.map(s => ({...s, id: Date.now().toString() + Math.random().toString(36).substring(7)}));
          
          if (!db.students) db.students = [];
          
          const finalAdded = [];
          added.forEach(student => {
            let isDuplicate = false;
            // Chỉ kiểm tra MSSV
            if (student.studentId && student.studentId.trim() !== '') {
              if (db.students.some(s => s.studentId === student.studentId)) isDuplicate = true;
            }
            
            if (!isDuplicate) {
              finalAdded.push(student);
              db.students.push(student); // push to db immediately so subsequent loop iterations see it
            }
          });
          
          
          fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, count: finalAdded.length }));
        } catch (e) {
          res.writeHead(500);
          res.end(JSON.stringify({ error: e.message }));
        }
      });
    } else if (req.method === 'POST' && req.url === '/bulk-delete') {
      try {
        const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
        db.students = [];
        fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: e.message }));
      }
    } else if (req.method === 'POST' && req.url.startsWith('/replace-queue')) {
      let body = '';
      req.on('data', chunk => body += chunk.toString());
      req.on('end', () => {
        try {
          const newQueue = JSON.parse(body || '[]');
          const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
          db.printQueue = newQueue;
          fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, count: newQueue.length }));
        } catch (e) {
          res.writeHead(500);
          res.end(JSON.stringify({ error: e.message }));
        }
      });
    } else if (req.method === 'POST' && req.url === '/fetch-student-web') {
      let body = '';
      req.on('data', chunk => body += chunk.toString());
      req.on('end', () => {
        try {
          const payload = JSON.parse(body || '{}');
          const studentId = payload.studentId;
          
          if (!studentId) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Missing studentId' }));
            return;
          }

          const postData = `ur=${encodeURIComponent(studentId)}&sm=Xem`;
          const options = {
            hostname: '115.74.232.210',
            port: 8081,
            path: '/default.asp',
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Content-Length': Buffer.byteLength(postData)
            }
          };

          const webReq = http.request(options, (webRes) => {
            if (webRes.statusCode === 302 || webRes.statusCode === 301) {
              const cookies = webRes.headers['set-cookie'];
              const redirectUrl = webRes.headers.location;
              const getOptions = {
                hostname: '115.74.232.210',
                port: 8081,
                path: redirectUrl.startsWith('/') ? redirectUrl : '/' + redirectUrl,
                method: 'GET',
                headers: {}
              };
              if (cookies) getOptions.headers['Cookie'] = cookies.join(';');
              webRes.resume(); // Consume response data to free up memory
              const getReq = http.request(getOptions, (getRes) => {
                let htmlData = '';
                getRes.setEncoding('utf8');
                getRes.on('data', (chunk) => { htmlData += chunk; });
                getRes.on('end', () => {
                  if (!res.headersSent) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, html: htmlData }));
                  }
                });
              });
              getReq.on('error', (e) => {
                if (!res.headersSent) {
                  res.writeHead(500);
                  res.end(JSON.stringify({ error: e.message }));
                }
              });
              getReq.end();
            } else {
              let htmlData = '';
              webRes.setEncoding('utf8');
              webRes.on('data', (chunk) => {
                htmlData += chunk;
              });
              webRes.on('end', () => {
                if (!res.headersSent) {
                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ success: true, html: htmlData }));
                }
              });
            }
          });

          webReq.on('error', (e) => {
            if (!res.headersSent) {
              res.writeHead(500);
              res.end(JSON.stringify({ error: e.message }));
            }
          });

          webReq.write(postData);
          webReq.end();
        } catch (e) {
          if (!res.headersSent) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: e.message }));
          }
        }
      });
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  helperServer.listen(5001, '0.0.0.0', () => {
    console.log('Helper server listening on 0.0.0.0:5001 (accessible from LAN)');
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log('Port 5001 is already in use, assuming helper server is already running.');
    } else {
      console.error('Helper server error:', err);
    }
  });
}

function stopHelperServer() {
  if (helperServer) {
    helperServer.close();
    helperServer = null;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'Quản Lý Hồ Sơ Đào Tạo',
    icon: path.join(__dirname, '..', 'public', 'vite.svg'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    autoHideMenuBar: true,
    show: false,
  });

  // In development, load from Vite dev server
  // In production, load the built files
  if (!app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173');
    // Open DevTools in development
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// === IPC: Print to PDF with custom orientation ===
ipcMain.handle('print-to-pdf', async (event, options) => {
  const { landscape = false, fileName = 'output.pdf' } = options || {};
  try {
    const win = BrowserWindow.fromWebContents(event.sender);
    const pdfData = await win.webContents.printToPDF({
      landscape: landscape,
      pageSize: 'A4',
      margins: { top: 0.39, bottom: 0.39, left: 0.39, right: 0.39 }, // ~10mm in inches
      printBackground: true,
    });

    // Show save dialog
    const { filePath } = await dialog.showSaveDialog(win, {
      defaultPath: fileName,
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    });

    if (filePath) {
      fs.writeFileSync(filePath, pdfData);
      return { success: true, filePath };
    }
    return { success: false, cancelled: true };
  } catch (err) {
    console.error('Print to PDF error:', err);
    return { success: false, error: err.message };
  }
});

// === IPC: Get local IP addresses for network sharing ===
ipcMain.handle('get-local-ips', async () => {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal (loopback) and non-IPv4
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push({ name, address: iface.address });
      }
    }
  }
  return ips;
});

app.whenReady().then(() => {
  // Always start helper server (dev + prod)
  startHelperServer();
  
  // Always start json-server and helper server
  startJsonServer();
  
  // Give json-server a moment to start (in production)
  setTimeout(() => {
    createWindow();
  }, app.isPackaged ? 1500 : 500);
});

app.on('window-all-closed', () => {
  stopJsonServer();
  stopHelperServer();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  stopJsonServer();
  stopHelperServer();
});
