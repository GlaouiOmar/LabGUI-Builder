"""
LabGUI Preview Backend — FastAPI server for live tkinter preview.
Supports both REST API and WebSocket streaming.
"""

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
import uvicorn
import json
import base64
import asyncio

from preview_engine import render_preview

app = FastAPI(title="LabGUI Preview Backend", version="1.1.0")

# CORS: allow the frontend to call us
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class PreviewRequest(BaseModel):
    code: str


@app.get("/health")
def health():
    return {"status": "ok", "service": "labgui-preview", "websocket": True}


@app.post("/api/preview")
def preview(req: PreviewRequest):
    """
    Receive generated tkinter Python code, run it, and return a PNG screenshot.
    """
    result = render_preview(req.code, timeout=5.0)

    if "error" in result:
        return JSONResponse(
            status_code=500,
            content={"error": result["error"]},
        )

    image_bytes = result["image"]
    return StreamingResponse(
        iter([image_bytes]),
        media_type="image/png",
        headers={"Content-Length": str(len(image_bytes))},
    )


@app.post("/api/preview/check")
def preview_check(req: PreviewRequest):
    """
    Validate that the generated code is syntactically correct.
    """
    import ast
    try:
        ast.parse(req.code)
        return {"valid": True, "error": None}
    except SyntaxError as e:
        return {"valid": False, "error": f"Line {e.lineno}: {e.msg}"}


@app.websocket("/ws/preview")
async def websocket_preview(websocket: WebSocket):
    """
    WebSocket endpoint for streaming preview frames.
    Client sends: {"type": "render", "code": "..."}
    Server sends: {"type": "frame", "image_base64": "..."} or {"type": "error", "message": "..."}
    """
    await websocket.accept()
    try:
        while True:
            message = await websocket.receive_text()
            try:
                data = json.loads(message)
            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "message": "Invalid JSON"})
                continue

            msg_type = data.get("type")

            if msg_type == "ping":
                await websocket.send_json({"type": "pong"})
                continue

            if msg_type == "render":
                code = data.get("code", "")
                if not code:
                    await websocket.send_json({"type": "error", "message": "Empty code"})
                    continue

                # Run preview in thread pool to avoid blocking event loop
                loop = asyncio.get_event_loop()
                result = await loop.run_in_executor(None, render_preview, code, 5.0)

                if "error" in result:
                    await websocket.send_json({"type": "error", "message": result["error"]})
                else:
                    image_b64 = base64.b64encode(result["image"]).decode("utf-8")
                    await websocket.send_json({
                        "type": "frame",
                        "image_base64": image_b64,
                    })
                continue

            await websocket.send_json({"type": "error", "message": f"Unknown type: {msg_type}"})

    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8765)
