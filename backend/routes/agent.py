"""SSE endpoint for the agentic chat."""

import json
from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from agent.agent import run_agent

router = APIRouter(tags=["agent"])


class AgentChatRequest(BaseModel):
    messages: list[dict]
    business_type: str | None = None


@router.post("/agent/chat")
async def agent_chat(req: AgentChatRequest, user_id: str = Query(...)):
    async def event_stream():
        async for event in run_agent(
            user_id=user_id,
            messages=req.messages,
            business_type=req.business_type,
        ):
            event_type = event["event"]
            event_data = json.dumps(event["data"])
            yield f"event: {event_type}\ndata: {event_data}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
