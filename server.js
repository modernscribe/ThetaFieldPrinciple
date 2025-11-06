// server.js
import express from 'express';
import compression from 'compression';
import helmet from 'helmet';
import cors from 'cors';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = parseInt(process.env.PORT || '8080', 10);
const app = express();

// #security
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "default-src": ["'self'"],
      "img-src": ["'self'","data:"],
      "script-src": ["'self'"],
      "style-src": ["'self'","'unsafe-inline'"],
      "connect-src": ["'self'"],
      "frame-ancestors": ["'none'"]
    }
  },
  referrerPolicy: { policy: "no-referrer" },
  crossOriginOpenerPolicy: { policy: "same-origin" },
  crossOriginResourcePolicy: { policy: "same-origin" }
}));
app.use(cors());
app.use(compression());

// #paths - Updated for your structure
const publicDir = path.join(__dirname, 'ThetaFieldPrincipleVisualizer');
const dataDir = path.join(__dirname, 'ThetaFieldPrincipleVisualizer', 'data');

// #helpers
function inferType(name) {
  const ext = path.extname(name).toLowerCase();
  if (['.png','.jpg','.jpeg','.gif','.webp','.bmp','.svg'].includes(ext)) return 'image';
  if (['.json','.txt','.csv','.obj','.mtl','.gltf','.glsl','.md','.log'].includes(ext)) return 'text';
  return 'binary';
}

// #api
app.get('/api/manifest', async (_req, res) => {
  try {
    const entries = await fs.readdir(dataDir, { withFileTypes: true });
    const files = [];
    for (const e of entries) {
      if (!e.isFile()) continue;
      const name = e.name;
      const fp = path.join(dataDir, name);
      const st = await fs.stat(fp);
      files.push({
        name,
        type: inferType(name),
        size: st.size,
        mtime: st.mtimeMs,
        url: `/data/${encodeURIComponent(name)}`
      });
    }
    files.sort((a,b)=>a.name.localeCompare(b.name));
    res.json({ files });
  } catch (err) {
    if (err.code === 'ENOENT') return res.json({ files: [] });
    res.status(500).json({ error: 'manifest_error' });
  }
});


// #static - Serve ThetaFieldPrincipleVisualizer as root
app.use('/', express.static(publicDir, { maxAge: '5m', etag: true }));

// #start
app.listen(PORT, () => {
  process.stdout.write(`[OK] http://localhost:${PORT}\n`);
});
