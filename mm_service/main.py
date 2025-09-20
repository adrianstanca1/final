from fastapi import FastAPI, UploadFile, Form
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import io, base64

app = FastAPI(title="MM Preprocess Service")

# Allow local dev UIs and serverless functions to call this service
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    return {"ok": True}

@app.post("/mm/preprocess")
async def preprocess(file: UploadFile, prompt: str = Form(...)):
    raw = await file.read()
    img = Image.open(io.BytesIO(raw)).convert("RGB")
    img.thumbnail((1024, 1024))
    buff = io.BytesIO()
    img.save(buff, format="JPEG", quality=90)
    b64 = base64.b64encode(buff.getvalue()).decode("utf-8")
    return JSONResponse({"prompt": prompt, "mimeType": "image/jpeg", "data": b64})
