const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");

const HOST = "0.0.0.0";
const PORT = 3210;
const ROOT = __dirname;
const allowed = new Set(["start","stop","reset","gift","like","turbo"]);
let nextId = 1;
const events = [];
const MAX_EVENTS = 200;

function send(res, status, type, body){
  const data = Buffer.from(body);
  res.writeHead(status, {
    "Content-Type": type,
    "Content-Length": data.length,
    "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  res.end(data);
}
function json(res,status,obj){ send(res,status,"application/json; charset=utf-8",Buffer.from(JSON.stringify(obj)).toString()); }

const server = http.createServer((req,res)=>{
  const parsed = url.parse(req.url,true);
  if(req.method === "OPTIONS") return send(res,204,"text/plain","");
  if(req.method === "GET" && parsed.pathname === "/health")
    return json(res,200,{ok:true,port:PORT,latest:nextId-1});
  if(req.method === "GET" && parsed.pathname === "/events"){
    if(parsed.query.init === "1") return json(res,200,{latest:nextId-1,events:[]});
    const after = Number.isFinite(Number(parsed.query.after)) ? Number(parsed.query.after) : 0;
    return json(res,200,{latest:nextId-1,events:events.filter(e=>e.id>after)});
  }
  if(req.method === "POST" && parsed.pathname === "/command"){
    let raw="";
    req.on("data",d=>raw+=d);
    req.on("end",()=>{
      try{
        const data=JSON.parse(raw||"{}");
        if(!allowed.has(data.type)) return json(res,400,{ok:false,error:"Comando no permitido"});
        const event={id:nextId++,data,ts:Date.now()/1000};
        events.push(event);
        if(events.length>MAX_EVENTS) events.splice(0,events.length-MAX_EVENTS);
        return json(res,200,{ok:true,id:event.id});
      }catch(e){ return json(res,400,{ok:false,error:"JSON inválido"}); }
    });
    return;
  }
  let filePath = parsed.pathname === "/" ? path.join(ROOT,"index.html") : path.join(ROOT,parsed.pathname.replace(/^\/+/, ""));
  if(!filePath.startsWith(ROOT)) return send(res,403,"text/plain","Forbidden");
  fs.readFile(filePath,(err,data)=>{
    if(err) return send(res,404,"text/plain","Not found");
    const ext=path.extname(filePath).toLowerCase();
    const types={".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".js":"application/javascript; charset=utf-8",".json":"application/json; charset=utf-8",".png":"image/png",".jpg":"image/jpeg",".svg":"image/svg+xml"};
    send(res,200,types[ext]||"application/octet-stream",data.toString ? data.toString() : data);
  });
});
server.listen(PORT,HOST,()=>{
  console.log("\nCARRERA TIKTOK - SERVIDOR DE CONTROL LOCAL");
  console.log("Carrera: http://127.0.0.1:"+PORT+"/");
  console.log("Control: http://127.0.0.1:"+PORT+"/control.html");
  console.log("Deja esta ventana abierta durante el LIVE.\n");
});
