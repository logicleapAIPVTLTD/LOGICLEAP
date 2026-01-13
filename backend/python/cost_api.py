from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
import traceback
import uvicorn

from cost_engine import estimate_cost

app = FastAPI(
    title="AI Cost Engine",
    version="2.2",
    description="Deterministic Cost Calculation with LLM Explainability"
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
class BOMItem(BaseModel):
    item_name: str = Field(..., description="Name of the item")
    quantity: float = Field(..., gt=0, description="Quantity of the item")

class BOQItem(BaseModel):
    boq_id: str = Field(..., description="Unique identifier for BOQ")
    boq_name: str = Field(..., description="Name/description of BOQ")
    bom_items: List[BOMItem] = Field(..., min_items=1, description="List of BOM items")

class CostEstimateRequest(BaseModel):
    state_tier: str = Field(
        ...,
        description="State and tier information (e.g., 'Maharashtra-Tier1')",
        example="Maharashtra-Tier1"
    )
    boq_items: List[BOQItem] = Field(
        ...,
        min_items=1,
        description="List of BOQ items with their BOM details"
    )

    class Config:
        schema_extra = {
            "example": {
                "state_tier": "Maharashtra-Tier1",
                "boq_items": [
                    {
                        "boq_id": "BOQ-001",
                        "boq_name": "Foundation Work",
                        "bom_items": [
                            {"item_name": "Cement", "quantity": 100},
                            {"item_name": "Steel Bars", "quantity": 500},
                            {"item_name": "Mason", "quantity": 20}
                        ]
                    }
                ]
            }
        }

# ============================================================
# HEALTH & INFO
# ============================================================
@app.get("/")
def root():
    return {
        "service": "AI Cost Engine",
        "version": "2.2",
        "status": "running",
        "description": "Deterministic Cost Calculation with LLM Explainability",
        "endpoints": {
            "cost_estimate": "/cost-estimate",
            "docs": "/docs",
            "health": "/health"
        }
    }

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "cost-engine",
        "version": "2.2"
    }

# ============================================================
# COST ESTIMATION ENDPOINT
# ============================================================
@app.post("/cost-estimate")
def cost_estimate(payload: CostEstimateRequest):
    """
    Calculate cost estimate for a project based on BOQ and BOM items.
    
    Args:
        payload: CostEstimateRequest containing state_tier and boq_items
        
    Returns:
        Detailed cost breakdown with material, labour, machinery costs,
        confidence ranges (min, likely, max), and explainability metrics
        
    Raises:
        HTTPException: If validation fails or cost calculation errors occur
    """
    try:
        # Convert Pydantic model to dict for the cost engine
        payload_dict = payload.dict()
        
        # Call the cost estimation engine
        result = estimate_cost(payload_dict)
        
        return result
        
    except ValueError as e:
        # Handle validation errors from cost engine
        error_msg = str(e)
        
        if "City index not found" in error_msg:
            raise HTTPException(
                status_code=404,
                detail=f"Invalid state_tier: {error_msg}"
            )
        elif "Rate missing" in error_msg:
            raise HTTPException(
                status_code=404,
                detail=f"Rate data not found: {error_msg}"
            )
        elif "Item mapping missing" in error_msg:
            raise HTTPException(
                status_code=404,
                detail=f"Item not found in database: {error_msg}"
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=error_msg
            )
            
    except Exception as e:
        # Log the full traceback for debugging
        traceback.print_exc()
        
        # Return generic error to client
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error during cost calculation: {str(e)}"
        )

# ============================================================
# VALIDATION ENDPOINT (OPTIONAL)
# ============================================================
@app.post("/validate")
def validate_payload(payload: CostEstimateRequest):
    """
    Validate a cost estimate request without performing calculation.
    Useful for pre-flight validation.
    """
    return {
        "valid": True,
        "message": "Payload validation successful",
        "summary": {
            "state_tier": payload.state_tier,
            "total_boq_items": len(payload.boq_items),
            "total_bom_items": sum(len(boq.bom_items) for boq in payload.boq_items)
        }
    }

# ============================================================
# RUN SERVER
# ============================================================
if __name__ == "__main__":
    uvicorn.run(
        "cost_api:app",
        host="0.0.0.0",
        port=8001,  # Different port from continuous learning (8000)
        reload=True,  # Set to False in production
        log_level="info"
    )