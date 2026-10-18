import http.server
import socketserver
import webbrowser
import sys
import os

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

def run_server():
    global PORT
    for attempt in range(10):
        try:
            with socketserver.TCPServer(("", PORT), Handler) as httpd:
                url = f"http://localhost:{PORT}"
                print("="*60)
                print(f"FitPass Map Explorer server running at: {url}")
                print(f"Serving directory: {DIRECTORY}")
                print("Press Ctrl+C to stop the server.")
                print("="*60)
                sys.stdout.flush()
                httpd.serve_forever()
        except OSError as e:
            if "address already in use" in str(e).lower() or attempt < 9:
                PORT += 1
            else:
                raise e

if __name__ == '__main__':
    run_server()
