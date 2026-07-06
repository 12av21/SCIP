from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

# This model represents the structure of a User as stored in the database
# In a real MongoDB integration, this might be a Pydantic model
# that inherits from a Mongo ODM model (e.g., Beanie, MongoEngine)
class User(BaseModel):
    id: str # Unique identifier for the user (e.g., MongoDB ObjectId as string)
    name: str
    email: EmailStr
    hashed_password: str # Storing hashed password
    isVerified: bool = False
    role: str = "citizen" # 'citizen', 'admin', 'super_admin'
    createdAt: datetime = datetime.utcnow()
    updatedAt: datetime = datetime.utcnow()
    # Add other fields as needed, e.g., profile picture, address, etc.
    