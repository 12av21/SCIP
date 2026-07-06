from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class UserBase(BaseModel):
    email: str
    full_name: str
    role: str

class ComplaintBase(BaseModel):
    title: str
    description: str
    location: str
    category: str

class ComplaintCreate(ComplaintBase):
    pass

class PriorityInfo(BaseModel):
    score: int
    level: str

class Complaint(ComplaintBase):
    id: str
    status: str = "Pending"
    createdAt: datetime
    priority: Optional[PriorityInfo] = None

    class Config:
        from_attributes = True

class AIRequest(BaseModel):
    message: str
    context: Optional[List[dict]] = None

class TriageResponse(BaseModel):
    suggestedCategory: str
    suggestedPriority: str