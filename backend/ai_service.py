import random

class AIService:
    def __init__(self):
        # Placeholder for Gemini API Key
        self.model_ready = True

    async def get_triage(self, description: str):
        """
        Analyzes complaint description to suggest category and priority.
        """
        desc = description.lower()
        
        # Simple heuristic-based 'AI' for initial setup
        category = "Water"
        priority = "Medium"
        
        if any(word in desc for word in ["wire", "electricity", "power", "shock"]):
            category = "Electricity"
            priority = "High"
        elif any(word in desc for word in ["flood", "leak", "pipe", "sewage"]):
            category = "Water"
            priority = "High"
        elif any(word in desc for word in ["pothole", "road", "bridge"]):
            category = "Road"
            priority = "Medium"
            
        return {"suggestedCategory": category, "suggestedPriority": priority}

    async def generate_chat_response(self, message: str):
        # Simulated Gemini Response
        responses = [
            f"Based on historical data for '{message}', there is a 15% increase in resource demand in the northern sector.",
            "I recommend dispatching a secondary inspection team to validate the infrastructure integrity.",
            "Comparing this to the Q3 report, the resolution time for similar cases has improved by 4 hours."
        ]
        return random.choice(responses)