import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Optional

import uvicorn
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq
from pydantic import BaseModel, Field

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("kore-backend")

# Initialize FastAPI application
app = FastAPI(
    title="Kore Essentials Support API",
    description="FastAPI chatbot backend with Groq API integration and model fallback",
    version="1.0.0",
)

# CORS Setup: Allow all origins (*) as required
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Groq API Configuration
def _load_api_key() -> str:
    env_key = os.getenv("GROQ_API_KEY")
    if env_key:
        return env_key
    env_file = Path(__file__).with_name(".env")
    if env_file.is_file():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            if line.startswith("GROQ_API_KEY="):
                return line.split("=", 1)[1].strip()
    return ""


GROQ_API_KEY = _load_api_key()
client = Groq(api_key=GROQ_API_KEY)

# Ordered Model Fallback List (Crucial)
MODELS: List[str] = [
    "llama-3.3-70b-versatile",  # Primary
    "openai/gpt-oss-20b",       # First Backup
    "qwen/qwen3.6-27b",         # Second Backup
]

# System Prompt (Mock Database & Policy)
SYSTEM_PROMPT: str = (
    "You are the customer support assistant for 'Kore Essentials', a premium tech accessory brand. Be brief and helpful.\n"
    "Policies: 14-day returns. Free shipping over £50; standard is £5 (3-5 days).\n"
    "Orders: #1024 (Out for delivery today), #1025 (Processing), #1026 (Delivered Oct 10).\n"
    "Rules: Only reference this exact order data. Never invent statuses. Decline unrelated questions."
)

OFFLINE_FALLBACK_REPLY: Dict[str, str] = {
    "reply": "Our support system is currently offline. Please try again later."
}


class ChatRequest(BaseModel):
    message: Optional[str] = Field(None, description="The customer's message")
    prompt: Optional[str] = Field(None, description="Alternative field for customer prompt")
    messages: Optional[List[Dict[str, Any]]] = Field(
        None, description="Optional conversation history"
    )


class ChatResponse(BaseModel):
    reply: str
    model_used: Optional[str] = None


@app.get("/")
def root():
    return {
        "status": "online",
        "service": "Kore Essentials Customer Support API",
        "endpoints": ["/api/chat", "/health"],
    }


@app.get("/health")
@app.get("/api/health")
def health_check():
    return {"status": "healthy"}



@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    # Extract the customer input
    user_prompt = request.message or request.prompt

    # Build the messages payload with the system prompt injected first
    if request.messages and len(request.messages) > 0:
        # Exclude any existing system message from the client to enforce mock DB rules
        conversation = [m for m in request.messages if m.get("role") != "system"]
        # If user_prompt was not separately passed, use the last customer message
        if not user_prompt:
            for m in reversed(conversation):
                if m.get("role") == "user":
                    user_prompt = m.get("content", "")
                    break
        messages_payload = [{"role": "system", "content": SYSTEM_PROMPT}] + conversation
    else:
        if not user_prompt:
            user_prompt = ""
        messages_payload = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ]

    # Model fallback loop (Iterate through MODELS list in order)
    for model_name in MODELS:
        try:
            logger.info("Attempting completion with model: %s", model_name)
            completion = client.chat.completions.create(
                model=model_name,
                messages=messages_payload,
                temperature=0.3,
            )
            response_text = (completion.choices[0].message.content or "").strip()
            if not response_text:
                raise ValueError("empty completion")
            logger.info("Model %s succeeded (%s chars)", model_name, len(response_text))
            return ChatResponse(reply=response_text, model_used=model_name)
        except Exception as exc:
            logger.warning("Model '%s' failed with error: %s. Proceeding to next backup...", model_name, exc)
            continue

    # If all models in the fallback chain fail:
    logger.error("All models in the fallback chain failed.")
    return ChatResponse(
        reply="Our support system is currently offline. Please try again later.",
        model_used=None,
    )


if __name__ == "__main__":
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8001, reload=True)
