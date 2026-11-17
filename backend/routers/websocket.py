from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from backend.services.job_manager import connection_manager

router = APIRouter(tags=["websocket"])

@router.websocket("/ws/projects/{project_id}")
async def websocket_project_logs(websocket: WebSocket, project_id: str):
    await connection_manager.connect(project_id, websocket)
    try:
        while True:
            # Keep connection open and accept client messages if any (ping/pong)
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        connection_manager.disconnect(project_id, websocket)
    except Exception:
        connection_manager.disconnect(project_id, websocket)
