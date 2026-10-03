const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const files=new Set(['index.html','betting-journal.html','manifest.webmanifest','sw.js','icons/icon.svg','icons/icon-192.png','icons/icon-512.png','icons/icon-maskable-512.png','icons/apple-touch-icon.png']);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png'};
http.createServer((req,res)=>{
 let name;try{name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1)||'index.html';}catch{res.writeHead(400);return res.end();}
 if(!files.has(name)){res.writeHead(404);return res.end();}
 const file=path.resolve(root,name);
 fs.readFile(file,(error,data)=>{
  if(error){res.writeHead(404);return res.end();}
  res.setHeader('Content-Type',mime[path.extname(name)]||'application/octet-stream');
  res.setHeader('Cache-Control','no-cache');
  res.end(data);
 });
}).listen(4173,'127.0.0.1',()=>console.log('Edgebook preview: http://127.0.0.1:4173/betting-journal.html'));
