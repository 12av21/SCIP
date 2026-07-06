from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import uuid
from typing import List

from .schemas import Complaint, ComplaintCreate, TriageResponse, AIRequest
from .schemas import Complaint, ComplaintCreate, TriageResponse, AIRequest, AreaRiskRow, CommunityAnalysisData, RecommendationsData
from .ai_service import AIService

app = FastAPI(title="SCIP API")
ai_service = AIService()

# Enable CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory database for demo
complaints_db: List[Complaint] = [
    Complaint(
        id=str(uuid.uuid4()),
        title="Street light broken",
        description="Major street light flickering at main junction",
        category="Electricity",
        location="Sector 4",
        status="Pending",
        createdAt=datetime.now(),
        priority={"score": 75, "level": "High"}
    )
]

@app.get("/api/complaints", response_model=List[Complaint])
async def get_complaints():
    return complaints_db

@app.post("/api/complaints", response_model=Complaint)
async def create_complaint(complaint: ComplaintCreate):
    new_complaint = Complaint(
        id=str(uuid.uuid4()),
        **complaint.dict(),
        status="Pending",
        createdAt=datetime.now()
    )
    # Auto-triage if priority isn't set
    triage = await ai_service.get_triage(complaint.description)
    new_complaint.priority = {"score": 50, "level": triage["suggestedPriority"]}
    
    complaints_db.append(new_complaint)
    return new_complaint

@app.patch("/api/complaints/{id}/status")
async def update_status(id: str, status_update: dict = Body(...)):
    for c in complaints_db:
        if c.id == id:
            c.status = status_update.get("status", c.status)
            return c
    raise HTTPException(status_code=404, detail="Complaint not found")

@app.post("/api/ai/triage", response_model=TriageResponse)
async def ai_triage(payload: dict = Body(...)):
    description = payload.get("description", "")
    return await ai_service.get_triage(description)

@app.post("/api/ai/chat")
async def ai_chat(request: AIRequest):
    reply = await ai_service.generate_chat_response(request.message)
    return {"reply": reply}

@app.get("/api/risk", response_model=List[AreaRiskRow])
async def get_risk():
    return await ai_service.get_community_risk()

@app.get("/api/community-analysis", response_model=CommunityAnalysisData)
async def get_analysis():
    return await ai_service.get_community_analysis()

@app.get("/api/recommendations", response_model=RecommendationsData)
async def get_recommendations():
    return await ai_service.get_recommendations()

@app.get("/api/gemini-analysis")
async def get_gemini_analysis():
    return await ai_service.get_gemini_analysis()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)