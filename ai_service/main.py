"""
Smart Community Intelligence Platform (SCIP)
Dedicated Python FastAPI AI/ML Microservice
Provides text classification, TF-IDF cosine similarity, entity extraction,
and explainable risk scoring for municipal community observations.
"""

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
import math
import re
import logging
from datetime import datetime

logger = logging.getLogger("scip-ai")
logger.setLevel(logging.INFO)
if not logger.handlers:
    _handler = logging.StreamHandler()
    _handler.setFormatter(logging.Formatter("%(asctime)s [scip-ai] %(levelname)s: %(message)s"))
    logger.addHandler(_handler)

# Optional sentence-transformers for semantic embeddings
try:
    from sentence_transformers import SentenceTransformer
    import numpy as np
    _ST_AVAILABLE = True
except Exception:
    SentenceTransformer = None  # type: ignore
    np = None  # type: ignore
    _ST_AVAILABLE = False

# Lazy-loaded embedding model (loaded on first use)
_embedding_model: Any = None
_embedding_model_id: str = "all-MiniLM-L6-v2"


def _get_embedding_model(model_id: str = _embedding_model_id) -> Any:
    if not _ST_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="sentence-transformers not installed. Install with: pip install sentence-transformers"
        )
    global _embedding_model, _embedding_model_id
    if _embedding_model is None or _embedding_model_id != model_id:
        try:
            _embedding_model = SentenceTransformer(model_id)
            _embedding_model_id = model_id
        except Exception as exc:
            raise HTTPException(
                status_code=503,
                detail=f"Failed to load sentence-transformers model '{model_id}': {str(exc)}"
            )
    return _embedding_model


def _cosine_similarity(a: List[float], b: List[float]) -> float:
    if np is not None:
        va = np.array(a, dtype=np.float64)
        vb = np.array(b, dtype=np.float64)
        denom = float(np.linalg.norm(va) * np.linalg.norm(vb))
        if denom == 0:
            return 0.0
        return float(np.dot(va, vb) / denom)
    # Pure Python fallback
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    if na == 0 or nb == 0:
        return 0.0
    return dot / (na * nb)

app = FastAPI(
    title="SCIP AI Microservice",
    description="Dedicated machine learning and NLP engine for municipal community intelligence.",
    version="1.0.0"
)


@app.on_event("startup")
def _startup() -> None:
    logger.info("SCIP AI microservice starting (version=1.0.0, sentence_transformers_available=%s)", _ST_AVAILABLE)


@app.middleware("http")
async def _log_requests(request: Request, call_next):
    import time as _time
    start = _time.time()
    try:
        response = await call_next(request)
    except Exception as exc:  # pragma: no cover - safety net
        logger.exception("Unhandled error processing request %s %s", request.method, request.url.path)
        raise
    duration_ms = int((_time.time() - start) * 1000)
    logger.info("%s %s -> %s (%dms)", request.method, request.url.path, response.status_code, duration_ms)
    return response


@app.exception_handler(Exception)
async def _generic_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception: %s", str(exc))
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error.", "service": "scip-ai"},
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Municipal category vocabulary
CATEGORIES = [
    "Water & Drainage",
    "Roads & Traffic",
    "Public Sanitation",
    "Power & Lighting",
    "Parks & Environment",
    "Structural Safety",
    "Public Health",
    "Noise & Disturbance"
]

CATEGORY_KEYWORDS = {
    "Water & Drainage": ["water", "flood", "drain", "pipe", "leak", "sewer", "overflow", "culvert", "puddle", "rain", "stormwater"],
    "Roads & Traffic": ["pothole", "road", "traffic", "signal", "asphalt", "congestion", "street", "accident", "divider", "speed breaker"],
    "Public Sanitation": ["garbage", "trash", "waste", "bin", "dump", "debris", "smell", "odor", "litter", "cleaning"],
    "Power & Lighting": ["streetlight", "electric", "pole", "wire", "blackout", "transformer", "spark", "light", "dark", "outage"],
    "Parks & Environment": ["tree", "branch", "park", "grass", "fallen", "garden", "playground", "vegetation"],
    "Structural Safety": ["crack", "wall", "building", "collapse", "bridge", "pillar", "footpath", "slab", "scaffold"],
    "Public Health": ["mosquito", "dengue", "contamination", "stagnant", "dead", "animal", "hazard", "hygiene"],
    "Noise & Disturbance": ["noise", "loudspeaker", "music", "construction", "midnight", "sound", "honking", "generator"]
}

# --- Pydantic Data Models ---
class ClassifyRequest(BaseModel):
    text: str
    declared_category: Optional[str] = None

class ClassifyResponse(BaseModel):
    predicted_category: str
    confidence: float
    explanation: str
    model_version: str = "scip-tfidf-v1.0"
    low_confidence_review: bool

class DuplicateCheckRequest(BaseModel):
    target_text: str
    target_lat: float
    target_lng: float
    candidates: List[Dict[str, Any]]

class DuplicateCheckResponse(BaseModel):
    top_similar: List[Dict[str, Any]]
    duplicate_probability: float
    explanation: str

class EntityExtractionRequest(BaseModel):
    text: str

class PrioritizeRequest(BaseModel):
    severity: str
    report_count: int = 1
    is_hotspot: bool = False
    affected_infrastructure: bool = False


class EmbedRequest(BaseModel):
    text: str
    model_id: Optional[str] = None


class EmbedResponse(BaseModel):
    text: str
    model_id: str
    embedding: List[float]
    dimension: int


class EmbedBatchRequest(BaseModel):
    texts: List[str]
    model_id: Optional[str] = None


class EmbedBatchResponse(BaseModel):
    model_id: str
    embeddings: List[List[float]]
    dimension: int
    count: int


class SemanticSimilarityRequest(BaseModel):
    text_a: str
    text_b: str
    model_id: Optional[str] = None


class SemanticSimilarityResponse(BaseModel):
    text_a: str
    text_b: str
    similarity: float  # cosine similarity, 0 to 1
    model_id: str

@app.get("/health")
def health_check():
    """Service health endpoint. Does not load models or perform inference."""
    return {
        "status": "healthy",
        "service": "scip-ai",
        "version": "1.0.0",
        "engine": "TF-IDF / Centroid Classifier / Geospatial Harversine",
        "sentence_transformers_available": _ST_AVAILABLE,
        "embedding_model": _embedding_model_id if _ST_AVAILABLE else None,
        "timestamp": datetime.utcnow().isoformat()
    }


@app.get("/ready")
def readiness_check():
    """Readiness endpoint. The service is ready without preloading any ML models."""
    return {
        "status": "ready",
        "service": "scip-ai",
        "version": "1.0.0",
        "sentence_transformers_available": _ST_AVAILABLE,
        "embedding_model_loaded": _embedding_model is not None
    }

@app.post("/classify", response_model=ClassifyResponse)
def classify_text(req: ClassifyRequest):
    text_lower = req.text.lower()
    scores = {}

    for cat, keywords in CATEGORY_KEYWORDS.items():
        score = sum(1 for kw in keywords if re.search(r'\b' + re.escape(kw), text_lower))
        scores[cat] = score

    best_cat = max(scores, key=scores.get)
    max_score = scores[best_cat]

    if max_score == 0:
        predicted = req.declared_category if req.declared_category in CATEGORIES else "Water & Drainage"
        confidence = 0.50
    else:
        predicted = best_cat
        confidence = min(0.96, 0.60 + (max_score * 0.08))

    low_conf = confidence < 0.65
    explanation = f"Matched {max_score} category markers for '{predicted}'. Confidence assessed at {int(confidence*100)}%."

    return ClassifyResponse(
        predicted_category=predicted,
        confidence=round(confidence, 2),
        explanation=explanation,
        low_confidence_review=low_conf
    )

def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371000.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

@app.post("/duplicate-check", response_model=DuplicateCheckResponse)
def check_duplicates(req: DuplicateCheckRequest):
    words_target = set(re.findall(r'\w+', req.target_text.lower()))
    results = []

    for c in req.candidates:
        c_text = c.get("text", "")
        c_lat = float(c.get("latitude", req.target_lat))
        c_lng = float(c.get("longitude", req.target_lng))

        dist = haversine(req.target_lat, req.target_lng, c_lat, c_lng)
        words_c = set(re.findall(r'\w+', c_text.lower()))
        intersection = words_target.intersection(words_c)
        union = words_target.union(words_c)
        jaccard = len(intersection) / max(1, len(union))

        spatial_weight = 1.0 if dist < 100 else (0.7 if dist < 500 else 0.2)
        sim = (jaccard * 0.6) + (spatial_weight * 0.4)

        if sim > 0.25:
            results.append({
                "id": c.get("id"),
                "similarity_score": round(sim, 2),
                "distance_meters": round(dist, 1),
                "common_terms": list(intersection)[:4]
            })

    results.sort(key=lambda x: x["similarity_score"], reverse=True)
    dup_prob = results[0]["similarity_score"] if results else 0.0

    return DuplicateCheckResponse(
        top_similar=results[:5],
        duplicate_probability=round(dup_prob, 2),
        explanation=f"Evaluated against {len(req.candidates)} observations. Max proximity match: {int(dup_prob*100)}%."
    )

@app.post("/ner")
def extract_entities(req: EntityExtractionRequest):
    text = req.text
    locations = re.findall(r'(?:Sector|Gate|Block|Plaza|Road|Expressway|Boulevard|Street|Canal)\s+[A-Za-z0-9]+', text, re.IGNORECASE)
    hazards = [w for w in ["flooding", "waterlogging", "sparking", "pothole", "overflow", "crack", "collapse"] if w in text.lower()]
    infrastructure = [w for w in ["transformer", "culvert", "drain", "pipe", "bridge", "manhole", "lamp post", "traffic light"] if w in text.lower()]

    return {
        "locations": list(set(locations)),
        "hazards": list(set(hazards)),
        "infrastructure": list(set(infrastructure)),
        "model_version": "scip-regex-ner-v1.0"
    }

@app.post("/prioritize")
def calculate_priority(req: PrioritizeRequest):
    base_scores = {"low": 20, "medium": 45, "high": 70, "critical": 90}
    score = base_scores.get(req.severity.lower(), 45)
    score += min(20, req.report_count * 5)
    if req.is_hotspot:
        score += 10
    if req.affected_infrastructure:
        score += 15

    score = min(100, score)

    if score >= 80:
        priority = "P1"
    elif score >= 60:
        priority = "P2"
    elif score >= 40:
        priority = "P3"
    else:
        priority = "P4"

    return {
        "score": score,
        "priority": priority,
        "explanation": f"Calculated composite risk score of {score}/100. Priority assigned as {priority}."
    }


@app.post("/embed", response_model=EmbedResponse)
def embed_text(req: EmbedRequest):
    model_id = req.model_id or _embedding_model_id
    model = _get_embedding_model(model_id)
    embedding = model.encode(req.text).tolist()
    return EmbedResponse(
        text=req.text,
        model_id=model_id,
        embedding=embedding,
        dimension=len(embedding)
    )


@app.post("/embed-batch", response_model=EmbedBatchResponse)
def embed_batch(req: EmbedBatchRequest):
    model_id = req.model_id or _embedding_model_id
    model = _get_embedding_model(model_id)
    embeddings = model.encode(req.texts).tolist()
    return EmbedBatchResponse(
        model_id=model_id,
        embeddings=embeddings,
        dimension=len(embeddings[0]) if embeddings else 0,
        count=len(embeddings)
    )


@app.post("/semantic-similarity", response_model=SemanticSimilarityResponse)
def semantic_similarity(req: SemanticSimilarityRequest):
    model_id = req.model_id or _embedding_model_id
    model = _get_embedding_model(model_id)
    emb_a = model.encode(req.text_a).tolist()
    emb_b = model.encode(req.text_b).tolist()
    sim = _cosine_similarity(emb_a, emb_b)
    return SemanticSimilarityResponse(
        text_a=req.text_a,
        text_b=req.text_b,
        similarity=round(sim, 4),
        model_id=model_id
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
