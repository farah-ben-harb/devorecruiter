import sys
import os

from dotenv import load_dotenv

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import router

def _csv_env(name: str, default: str) -> list[str]:
    return [
        item.strip()
        for item in os.getenv(name, default).split(",")
        if item.strip()
    ]

app = FastAPI(title="API Chatbot RH", version="1.0")
app.include_router(router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_csv_env(
        "ALLOWED_ORIGINS",
        "http://localhost:3000,http://localhost:4200",
    ),
    allow_methods=["*"],
    allow_headers=["*"],
)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
