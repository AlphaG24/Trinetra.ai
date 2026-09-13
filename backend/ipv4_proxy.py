import socket
import threading
import select
import sys

def handle_client(client_socket):
    try:
        request = b""
        while b"\r\n\r\n" not in request:
            chunk = client_socket.recv(4096)
            if not chunk:
                client_socket.close()
                return
            request += chunk

        first_line = request.split(b"\r\n")[0].decode('latin1')
        parts = first_line.split()
        if len(parts) < 2 or parts[0].upper() != "CONNECT":
            client_socket.sendall(b"HTTP/1.1 405 Method Not Allowed\r\n\r\n")
            client_socket.close()
            return

        target = parts[1]
        host, port_str = target.split(":")
        port = int(port_str)

        # Force IPv4 socket connection to completely eliminate broken IPv6 route drops
        remote_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        remote_socket.settimeout(10.0)
        remote_socket.connect((host, port))
        remote_socket.settimeout(None)

        client_socket.sendall(b"HTTP/1.1 200 Connection Established\r\n\r\n")

        # Bidirectional streaming
        sockets = [client_socket, remote_socket]
        while True:
            r, _, x = select.select(sockets, [], sockets, 60.0)
            if x or not r:
                break
            for s in r:
                other = remote_socket if s is client_socket else client_socket
                data = s.recv(32768)
                if not data:
                    return
                other.sendall(data)
    except Exception:
        pass
    finally:
        try: client_socket.close()
        except: pass
        try: remote_socket.close()
        except: pass

def main():
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind(("127.0.0.1", 8888))
    server.listen(128)
    print("[IPv4 Proxy] Listening on 127.0.0.1:8888 (forcing AF_INET for all upstream connections)", flush=True)

    while True:
        client, _ = server.accept()
        t = threading.Thread(target=handle_client, args=(client,), daemon=True)
        t.start()

if __name__ == "__main__":
    main()
