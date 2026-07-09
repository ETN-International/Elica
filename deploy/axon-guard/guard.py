#!/usr/bin/env python3
"""
Guardia di Axon Brain — gira SULLO Spark, su 127.0.0.1:8091.

Espone il modello (llama.cpp su :8088) al mondo SOLO attraverso il Tailscale
Funnel, ma protetto: accetta la richiesta solo se arriva con
`Authorization: Bearer <SPARK_KEY>` (la Edge Function Supabase lo manda; il
browser non conosce mai il token). Toglie il prefisso di percorso /axon e inoltra
a llama.cpp. Gli utenti locali che parlano diretto a :8088 non sono toccati.

Avvio: SPARK_KEY=... python3 guard.py   (vedi README.md per il servizio systemd)
"""
import os
import urllib.request
import urllib.error
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

KEY = os.environ.get("SPARK_KEY", "")
UPSTREAM = os.environ.get("UPSTREAM", "http://127.0.0.1:8088").rstrip("/")
PREFIX = os.environ.get("PREFIX", "/axon")
PORT = int(os.environ.get("PORT", "8091"))


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def _authed(self) -> bool:
        return bool(KEY) and self.headers.get("Authorization", "") == f"Bearer {KEY}"

    def _target(self) -> str:
        path = self.path
        # Tolgo il prefisso /axon se presente (robusto sia che il Funnel lo tolga sia no).
        if path.startswith(PREFIX):
            path = path[len(PREFIX):] or "/"
        return UPSTREAM + path

    def _send(self, status: int, body: bytes, ctype: str = "application/json") -> None:
        self.send_response(status)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _proxy(self, method: str) -> None:
        if not self._authed():
            self._send(401, b'{"error":"unauthorized"}')
            return
        length = int(self.headers.get("Content-Length", 0) or 0)
        data = self.rfile.read(length) if length else None
        req = urllib.request.Request(self._target(), data=data, method=method)
        req.add_header("Content-Type", self.headers.get("Content-Type", "application/json"))
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
                self._send(r.status, r.read(), r.headers.get("Content-Type", "application/json"))
        except urllib.error.HTTPError as e:
            self._send(e.code, e.read(), "application/json")
        except Exception as e:  # noqa: BLE001
            self._send(502, ('{"error":"guard: %s"}' % str(e)).encode())

    def do_POST(self) -> None:  # noqa: N802
        self._proxy("POST")

    def do_GET(self) -> None:  # noqa: N802
        self._proxy("GET")

    def log_message(self, *args) -> None:  # silenzioso
        pass


if __name__ == "__main__":
    if not KEY:
        raise SystemExit("SPARK_KEY non impostata: rifiuto di partire senza protezione.")
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
