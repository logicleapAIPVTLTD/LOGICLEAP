#main.py
import logging
from fastapi import FastAPI, UploadFile, File, Form, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import traceback

from services.boq_service import BOQService
from services.wbs_service import WBSService
from services.bom_service import BOMService
from services.cost_service import CostService

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
    x_gemini_model: str = Header("gemini-2.5-flash-lite"), # Default model
    project_name: str = Form(...),
    project_type: str = Form(...),
    location: str = Form(...),
    file: UploadFile = File(None),
    text_input: str = Form(None)
):
    try:
        logger.info(f"🚀 Starting BOQ Gen | Model: {x_gemini_model} | Project: {project_name}")
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
        service = WBSService(api_key=x_gemini_api_key, model_name=x_gemini_model)
        return service.process(request_data)
    except Exception as e:
        logger.error(f"❌ Error in WBS: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-bom")
async def generate_bom(
    request_data: List[dict],
    x_gemini_api_key: str = Header(...),
    x_gemini_model: str = Header("gemini-2.5-flash-lite")
):
    try:
        logger.info(f"🚀 Starting BOM Gen | Model: {x_gemini_model}")
        service = BOMService(api_key=x_gemini_api_key, model_name=x_gemini_model)
        return service.process(request_data)
    except Exception as e:
        logger.error(f"❌ Error in BOM: {str(e)}")
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
        service = CostService(api_key=x_gemini_api_key, model_name=x_gemini_model)
        return service.process(request_data, city_tier)
    except Exception as e:
        logger.error(f"❌ Error in Cost: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))