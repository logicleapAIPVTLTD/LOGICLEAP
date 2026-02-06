#main.py
import logging
from fastapi import FastAPI, UploadFile, File, Form, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import traceback

# Interior models (existing)
from services.boq_service import BOQService
from services.wbs_service import WBSService
from services.bom_service import BOMService
from services.cost_service import CostService

# Tank Cleaning models (new)
from services.tank_boq_service import TankBOQService
from services.tank_wbs_service import TankWBSService
from services.tank_bom_service import TankBOMService
from services.tank_cost_service import TankCostService

# Setup Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="LogicLeap API")

# CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def health_check():
    return {"status": "running", "message": "LogicLeap Backend is Online"}

@app.post("/generate-boq")
async def generate_boq(
    x_gemini_api_key: str = Header(...),
    x_gemini_model: str = Header("gemini-2.5-flash-lite"),
    project_name: str = Form(...),
    project_type: str = Form(...),
    location: str = Form(...),
    file: UploadFile = File(None),
    text_input: str = Form(None)
):
    try:
        logger.info(f"🚀 Starting BOQ Gen | Model: {x_gemini_model} | Project: {project_name} | Type: {project_type}")
        
        # Route to appropriate service based on project_type
        if project_type.lower() == "tank cleaning":
            service = TankBOQService(api_key=x_gemini_api_key, model_name=x_gemini_model)
        else:  # Interior or default
            service = BOQService(api_key=x_gemini_api_key, model_name=x_gemini_model)
        
        context = {"project_name": project_name, "project_type": project_type, "location": location}
        
        content = ""
        image_parts = None
        if file:
            file_bytes = await file.read()
            if file.content_type.startswith("image"):
                image_parts = [{"mime_type": file.content_type, "data": file_bytes}]
            else:
                content = service.extract_text(file_bytes, file.filename)
        elif text_input:
            content = text_input
        else:
            raise HTTPException(status_code=400, detail="No input provided (File or Text)")
        
        result = service.process(content, context, image_parts)
        
        if not result:
            logger.warning("⚠️ BOQ Generation returned empty list")
            
        return result
    except Exception as e:
        logger.error(f"❌ Error in Generate BOQ: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-wbs")
async def generate_wbs(
    request_data: List[dict],
    x_gemini_api_key: str = Header(...),
    x_gemini_model: str = Header("gemini-2.5-flash-lite")
):
    try:
        logger.info(f"🚀 Starting WBS Gen | Model: {x_gemini_model}")
        
        # Auto-detect project_type from the BOQ data
        project_type = "Interior"  # Default
        if request_data and len(request_data) > 0:
            # Check the Work field to determine project type
            first_work = request_data[0].get("Work", "").lower()
            # Tank cleaning keywords
            tank_keywords = ["tank", "cleaning", "water", "septic", "sump", "overhead", "underground", "disinfect", "chlorination"]
            if any(keyword in first_work for keyword in tank_keywords):
                project_type = "Tank Cleaning"
        
        logger.info(f"📊 Detected Project Type: {project_type}")
        
        # Route to appropriate service
        if project_type == "Tank Cleaning":
            service = TankWBSService(api_key=x_gemini_api_key, model_name=x_gemini_model)
        else:
            service = WBSService(api_key=x_gemini_api_key, model_name=x_gemini_model)
        
        return service.process(request_data)
    except Exception as e:
        logger.error(f"❌ Error in WBS: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-bom")
async def generate_bom(
    request_data: List[dict],
    x_gemini_api_key: str = Header(...),
    x_gemini_model: str = Header("gemini-2.5-flash-lite")
):
    try:
        logger.info(f"🚀 Starting BOM Gen | Model: {x_gemini_model}")
        
        # Auto-detect project_type from WBS data
        project_type = "Interior"  # Default
        if request_data and len(request_data) > 0:
            first_work = request_data[0].get("Work", "").lower()
            # Tank cleaning keywords
            tank_keywords = ["tank", "cleaning", "water", "septic", "sump", "overhead", "underground", "disinfect", "chlorination"]
            if any(keyword in first_work for keyword in tank_keywords):
                project_type = "Tank Cleaning"
        
        logger.info(f"📊 Detected Project Type: {project_type}")
        
        # Route to appropriate service
        if project_type == "Tank Cleaning":
            service = TankBOMService(api_key=x_gemini_api_key, model_name=x_gemini_model)
        else:
            service = BOMService(api_key=x_gemini_api_key, model_name=x_gemini_model)
        
        return service.process(request_data)
    except Exception as e:
        logger.error(f"❌ Error in BOM: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-cost")
async def generate_cost(
    request_data: List[dict],
    city_tier: str = "T1",
    x_gemini_api_key: str = Header(...),
    x_gemini_model: str = Header("gemini-2.5-flash-lite")
):
    try:
        logger.info(f"🚀 Starting Cost Gen | Model: {x_gemini_model}")
        
        # Auto-detect project_type from BOM data
        project_type = "Interior"  # Default
        if request_data and len(request_data) > 0:
            # Check both "Room" (Interior) and "Tank/Area" (Tank Cleaning) fields
            first_location = request_data[0].get("Room", "") or request_data[0].get("Tank/Area", "")
            first_material = request_data[0].get("Material", "").lower()
            
            # Tank cleaning keywords
            tank_keywords = ["tank", "cleaning", "water", "septic", "sump", "overhead", "underground", "disinfect", "chlorination", "sodium hypochlorite", "chlorine"]
            if any(keyword in first_location.lower() for keyword in tank_keywords) or \
               any(keyword in first_material for keyword in tank_keywords):
                project_type = "Tank Cleaning"
        
        logger.info(f"📊 Detected Project Type: {project_type}")
        
        # Route to appropriate service
        if project_type == "Tank Cleaning":
            service = TankCostService(api_key=x_gemini_api_key, model_name=x_gemini_model)
        else:
            service = CostService(api_key=x_gemini_api_key, model_name=x_gemini_model)
        
        return service.process(request_data, city_tier)
    except Exception as e:
        logger.error(f"❌ Error in Cost: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
