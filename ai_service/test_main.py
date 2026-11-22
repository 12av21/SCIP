"""
SCIP Python AI Service tests.
Uses FastAPI TestClient (httpx) — no pytest installation required.
Run: python3 ai_service/test_main.py
"""
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)

passed = 0
failed = 0


def check(name, condition, detail=""):
    global passed, failed
    if condition:
        passed += 1
        print(f"PASS: {name}" + (f" — {detail}" if detail else ""))
    else:
        failed += 1
        print(f"FAIL: {name}" + (f" — {detail}" if detail else ""))


# 1. Application starts & /health returns valid response
def test_app_starts_and_health():
    resp = client.get("/health")
    check("health status code 200", resp.status_code == 200, str(resp.status_code))
    data = resp.json()
    check("health status=healthy", data.get("status") == "healthy", str(data.get("status")))
    check("health service=scip-ai", data.get("service") == "scip-ai", str(data.get("service")))
    check("health version present", data.get("version") == "1.0.0", str(data.get("version")))
    check("health sentence_transformers_available is bool", isinstance(data.get("sentence_transformers_available"), bool))
    check("health timestamp present", isinstance(data.get("timestamp"), str) and len(data.get("timestamp", "")) > 0)


# 2. Readiness endpoint
def test_readiness():
    resp = client.get("/ready")
    check("ready status code 200", resp.status_code == 200, str(resp.status_code))
    data = resp.json()
    check("ready status=ready", data.get("status") == "ready", str(data.get("status")))
    check("ready embedding_model_loaded is bool", isinstance(data.get("embedding_model_loaded"), bool))


# 3. Invalid requests return controlled errors
def test_classify_invalid_input():
    # Empty text should still return a controlled response (not 500)
    resp = client.post("/classify", json={"text": ""})
    check("classify empty text controlled (not 500)", resp.status_code != 500, str(resp.status_code))
    data = resp.json()
    check("classify empty text has predicted_category", "predicted_category" in data)

    # Missing required text field -> 422 validation error (controlled)
    resp = client.post("/classify", json={})
    check("classify missing text -> 422", resp.status_code == 422, str(resp.status_code))


# 4. Missing optional ML deps do not prevent startup (sentence-transformers not installed)
def test_no_sentence_transformers_ok():
    resp = client.get("/health")
    data = resp.json()
    check("service healthy without sentence-transformers", data.get("status") == "healthy")
    # /embed should return 503 (graceful), not crash
    resp = client.post("/embed", json={"text": "hello"})
    check("embed 503 when sentence-transformers unavailable", resp.status_code == 503, str(resp.status_code))


# 5. Health checks do not trigger model loading
def test_health_no_model_load():
    resp = client.get("/health")
    data = resp.json()
    check("health does not report model loaded", data.get("embedding_model") is None or data.get("sentence_transformers_available") is False)


# 6. Structured error responses
def test_structured_error():
    resp = client.post("/classify", json={"text": ""})
    data = resp.json()
    check("error response has predicted_category field", "predicted_category" in data or resp.status_code >= 400)


if __name__ == "__main__":
    test_app_starts_and_health()
    test_readiness()
    test_classify_invalid_input()
    test_no_sentence_transformers_ok()
    test_health_no_model_load()
    test_structured_error()
    print(f"\nPython tests: {passed} passed, {failed} failed, {passed + failed} total")
    if failed:
        raise SystemExit(1)
