#!/usr/bin/env python3
import http.server, json, os, urllib.parse, threading, time

HOST = "0.0.0.0"
PORT = 3210
ROOT = os.path.dirname(os.path.abspath(__file__))

events = []
next_id = 1
lock = threading.Lock()
MAX_EVENTS = 200

class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, fmt, *args):
        print("[%s] %s" % (time.strftime("%H:%M:%S"), fmt % args))

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/health":
            self._json({"ok": True, "port": PORT, "latest": next_id - 1})
            return
        if parsed.path == "/events":
            qs = urllib.parse.parse_qs(parsed.query)
            if qs.get("init") == ["1"]:
                with lock:
                    latest = next_id - 1
                self._json({"latest": latest, "events": []})
                return
            try:
                after = int(qs.get("after", ["0"])[0])
            except ValueError:
                after = 0
            with lock:
                out = [e for e in events if e["id"] > after]
                latest = next_id - 1
            self._json({"latest": latest, "events": out})
            return
        return super().do_GET()

    def do_POST(self):
        global next_id
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path != "/command":
            self.send_error(404)
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            raw = self.rfile.read(length).decode("utf-8")
            data = json.loads(raw or "{}")
        except Exception:
            self._json({"ok": False, "error": "JSON inválido"}, 400)
            return

        allowed = {"start","stop","reset","gift","like","turbo"}
        if data.get("type") not in allowed:
            self._json({"ok": False, "error": "Comando no permitido"}, 400)
            return

        with lock:
            event = {"id": next_id, "data": data, "ts": time.time()}
            next_id += 1
            events.append(event)
            if len(events) > MAX_EVENTS:
                del events[:-MAX_EVENTS]

        self._json({"ok": True, "id": event["id"]})

    def _json(self, obj, status=200):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

os.chdir(ROOT)
print("")
print("==============================================")
print("  CARRERA TIKTOK - SERVIDOR DE CONTROL LOCAL")
print("==============================================")
print(f"  Carrera: http://127.0.0.1:{PORT}/")
print(f"  Control: http://127.0.0.1:{PORT}/control.html")
print("  Deja esta ventana abierta durante el LIVE.")
print("  Pulsa Ctrl+C para apagar.")
print("==============================================")
print("")
http.server.ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
