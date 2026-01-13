from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import traceback
import uvicorn

from continuous_learning import (
    ingest_feedback,
    fetch_all_feedback,
    dashboard_metrics_active,
    retraining_decision_active
)

app = FastAPI(
    title="DS-2.2 Continuous Learning API",
    version="1.0.0",
    description="Continuous Learning Service for Cost Prediction Models"
)

# ============================================================
# CORS CONFIGURATION
# ============================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update with specific origins in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# REQUEST MODELS
# ============================================================
class FeedbackRequest(BaseModel):
    boq_id: str

# ============================================================
# HEALTH
# ============================================================
@app.get("/")
def health():
    return {
        "status": "API is running",
        "service": "Continuous Learning",
        "version": "1.0.0"
    }

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "continuous-learning"
    }

# ============================================================
# FEEDBACK (INPUT: boq_id ONLY)
# ============================================================
@app.post("/feedback")
def submit_feedback(payload: FeedbackRequest):
    """
    Submit feedback for a BOQ to track prediction accuracy
    
    Args:
        payload: FeedbackRequest containing boq_id
        
    Returns:
        Feedback record with errors, bias flags, and confidence metrics
    """
    try:
        return ingest_feedback(payload.boq_id)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================
# VERIFY
# ============================================================
@app.get("/feedback/all")
def get_feedback(limit: int = 100):
    """
    Retrieve all feedback records
    
    Args:
        limit: Maximum number of records to return (default: 100)
        
    Returns:
        List of feedback records
    """
    try:
        return fetch_all_feedback(limit)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================
# DASHBOARD (ACTIVE MODEL)
# ============================================================
@app.get("/dashboard")
def dashboard():
    """
    Get dashboard metrics for the active model
    
    Returns:
        Accuracy metrics, bias detection, and drift analysis
    """
    try:
        return dashboard_metrics_active()
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================
# RETRAIN (ACTIVE MODEL)
# ============================================================
@app.get("/retrain")
def retrain():
    """
    Get retraining decision for the active model
    
    Returns:
        Whether retraining is required and schedule if applicable
    """
    try:
        return retraining_decision_active()
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================
# RUN SERVER
# ============================================================
if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,  # Set to False in production
        log_level="info"
    )