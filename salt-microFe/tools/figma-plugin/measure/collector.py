# Storybook DOM 측정값 수집기. 브라우저가 POST한 JSON을 파일로 저장한다.
# 측정 데이터가 모델 컨텍스트를 거치지 않고 바로 디스크로 간다.
import http.server, json, os, urllib.parse, pathlib

OUT = pathlib.Path(__file__).parent / "measured"
OUT.mkdir(exist_ok=True)

class H(http.server.BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def do_OPTIONS(self):
        self.send_response(204); self._cors(); self.end_headers()

    def do_GET(self):
        # 추출 스크립트를 서빙한다. 페이지에서 한 줄로 불러 쓰기 위한 것.
        if "props" in self.path: which = "props-matrix.js"
        elif "all" in self.path: which = "extract-all.js"
        else: which = "extract.js"
        src = (pathlib.Path(__file__).parent / which).read_bytes()
        self.send_response(200); self._cors()
        self.send_header("Content-Type", "application/javascript")
        self.end_headers(); self.wfile.write(src)

    def do_POST(self):
        q = urllib.parse.urlparse(self.path)
        name = urllib.parse.parse_qs(q.query).get("name", ["unnamed"])[0]
        safe = "".join(ch for ch in name if ch.isalnum() or ch in "-_.")[:120]
        n = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(n)
        (OUT / (safe + ".json")).write_bytes(body)
        self.send_response(200); self._cors()
        self.send_header("Content-Type", "text/plain")
        self.end_headers()
        self.wfile.write(("saved %s (%d bytes)" % (safe, len(body))).encode())

    def log_message(self, *a):
        pass

http.server.ThreadingHTTPServer(("127.0.0.1", 6100), H).serve_forever()
