# Kore Essentials — FastAPI Chatbot Backend

A lightweight, resilient FastAPI backend for the **Kore Essentials** customer support chatbot powered by the Groq API.

## Features

- **FastAPI & Uvicorn**: High-performance asynchronous API server.
- **Model Fallback Chain**: Automatically cascades through models to guarantee uptime:
  1. `llama-3.3-70b-versatile` (Primary)
  2. `openai/gpt-oss-20b` (First Backup)
  3. `qwen/qwen3.6-27b` (Second Backup)
  - If all fail, gracefully responds with: `"Our support system is currently offline. Please try again later."`
- **Injected Knowledge (Mock Database & Rules)**:
  - 14-day return window.
  - Free shipping over £50 (£5 standard, 3-5 days).
  - Exact order tracking: `#1024` (Out for delivery today), `#1025` (Processing), `#1026` (Delivered Oct 10).
  - Strict guardrails: Never invents order statuses and declines unrelated inquiries.
- **CORS Configured**: Permits all origins (`*`) for frictionless React frontend communication.

## Quickstart

### 1. Install Dependencies
```bash
pip install -r backend/requirements.txt
```

### 2. Start the Server
```bash
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```
Or directly:
```bash
python backend/main.py
```

The API will be available at:
- Documentation: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/health`
- Chat endpoint: `http://localhost:8000/api/chat`

### 3. Test with cURL
```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is the status of my order #1024?"}'
```
