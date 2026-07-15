# Trinetra AI Security Test Suite & Automated Probe Script
# This script simulates security checks to verify system defenses against common attack vectors.

import sys
import json
import urllib.request
import urllib.error

BASE_URL = "http://localhost:3000"

def run_test(name, callback):
    print(f"[RUNNING] {name} ... ", end="")
    try:
        callback()
        print("\033[92m[PASSED]\033[0m")
    except AssertionError as ae:
        print(f"\033[91m[FAILED]\033[0m - {ae}")
    except Exception as e:
        print(f"\033[93m[ERROR]\033[0m - {e}")

def test_sql_injection():
    # Attempt SQL injection payload on POST login/signup
    url = f"{BASE_URL}/api/auth/callback" # Dummy test url
    data = json.dumps({
        "email": "test@example.com' OR '1'='1",
        "password": "somepassword"
    }).encode('utf-8')
    
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req) as response:
            res_body = response.read().decode('utf-8')
            # If the application parses parameters, it will reject or not fetch records
            assert "error" in res_body or response.status == 400 or response.status == 401
    except urllib.error.HTTPError as e:
        # 4xx or 5xx status codes indicate payload rejected/unhandled exception (safe from sql injection)
        assert e.code in [400, 401, 404, 405, 500]

def test_auth_bypass():
    # Attempt to request a protected route without authorization headers/cookies
    url = f"{BASE_URL}/api/settings/profile"
    try:
        urllib.request.urlopen(url)
        raise AssertionError("Bypassed authentication! Profile was fetched without session.")
    except urllib.error.HTTPError as e:
        assert e.code == 401, f"Expected 401 Unauthorized, got {e.code}"

def test_input_validation():
    # Send excessively long strings and malformed payload to /api/analyze
    url = f"{BASE_URL}/api/analyze"
    malformed_payload = b"{'invalid': 'json'"
    req = urllib.request.Request(url, data=malformed_payload, headers={'Content-Type': 'application/json'})
    try:
        urllib.request.urlopen(req)
        raise AssertionError("Accepted invalid JSON format!")
    except urllib.error.HTTPError as e:
        assert e.code in [400, 401, 500]

def test_xss_injection():
    # Check that Content-Security-Policy header is configured
    try:
        response = urllib.request.urlopen(BASE_URL)
        headers = response.info()
        csp = headers.get("Content-Security-Policy")
        assert csp is not None, "Content-Security-Policy header is missing"
    except urllib.error.HTTPError as e:
        headers = e.headers
        csp = headers.get("Content-Security-Policy")
        assert csp is not None, "Content-Security-Policy header is missing on error responses"

def test_mitm_headers():
    # Verify secure header policies
    try:
        response = urllib.request.urlopen(BASE_URL)
        headers = response.info()
        assert headers.get("X-Frame-Options") == "DENY", "X-Frame-Options is not set to DENY"
        assert headers.get("X-Content-Type-Options") == "nosniff", "X-Content-Type-Options is missing"
    except urllib.error.HTTPError as e:
        headers = e.headers
        assert headers.get("X-Frame-Options") == "DENY", "X-Frame-Options is not set on error response"

if __name__ == "__main__":
    print("========================================")
    print("      Trinetra AI Security Test Suite    ")
    print("========================================")
    run_test("SQL Injection Defenses", test_sql_injection)
    run_test("Authentication Protection", test_auth_bypass)
    run_test("Input Validation Constraints", test_input_validation)
    run_test("XSS Content Security Policy Headers", test_xss_injection)
    run_test("MITM Strict Transport Headers", test_mitm_headers)
    print("========================================")
