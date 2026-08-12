import os
from pathlib import Path
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
import joblib
import numpy as np
import pandas as pd

# Absolute Path Resolution
BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "models" / "pipeline.pkl"
DATA_PATH = BASE_DIR / "models" / "df.pkl"

app = FastAPI(
    title="Laptop Price Prediction API",
    description="API for predicting laptop prices based on technical specifications.",
    version="1.0.0"
)

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # production mein specific frontend domain daalna better hai
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

try:
    pipe = joblib.load(MODEL_PATH)
    df = joblib.load(DATA_PATH)
    print("Model and DataFrame loaded successfully!")

except Exception as e:
    pipe = None
    df = None
    print(f"Failed to load model artifacts: {e}")


class LaptopFeatures(BaseModel):
    company: str = Field(..., example="Dell")
    type_name: str = Field(..., example="Ultrabook")
    ram: int = Field(..., example=8, description="RAM size in GB")
    weight: float = Field(..., example=2.00, description="Weight in kg")
    touchscreen: int = Field(..., example=1, description="1 if Touchscreen, else 0")
    ips: int = Field(..., example=0, description="1 if IPS display, else 0")
    screen_size: float = Field(..., example=15.6, description="Screen size in inches")
    resolution: str = Field(..., example="1920x1080", description="WidthxHeight resolution")
    cpu: str = Field(..., example="Intel Core i7")
    hdd: int = Field(..., example=1000, description="HDD size in GB")
    ssd: int = Field(..., example=256, description="SSD size in GB")
    gpu: str = Field(..., example="Intel")
    os: str = Field(..., example="Mac")


@app.get("/")
def home():
    return {
        "status": "Online",
        "message": "Laptop Price Prediction API is operational."
    }


@app.get("/metadata")
def get_metadata():
    """Returns unique values from dataset for dynamic UI dropdowns."""
    if df is None:
        raise HTTPException(status_code=500, detail="DataFrame metadata is not loaded.")
    
    return {
        "companies": sorted(df['Company'].unique().tolist()) if 'Company' in df else [],
        "type_names": sorted(df['TypeName'].unique().tolist()) if 'TypeName' in df else [],
        "ram_options": sorted(df['Ram'].unique().tolist()) if 'Ram' in df else [],
        "cpus": sorted(df['Brand_Name'].unique().tolist()) if 'Brand_Name' in df else [],
        "gpus": sorted(df['Gpu_BrandName'].unique().tolist()) if 'Gpu_BrandName' in df else [],
        "op_systems": sorted(df['OpSys_Name'].unique().tolist()) if 'OpSys_Name' in df else []
    }


@app.post("/predict")
def predict_price(payload: LaptopFeatures):
    if pipe is None:
        raise HTTPException(
            status_code=500, 
            detail="ML Pipeline model is not loaded. Ensure pipeline.pkl exists inside the 'models/' folder."
        )

    try:
        # Calculate PPI from resolution and screen size
        x_res, y_res = map(int, payload.resolution.split('x'))
        ppi = ((x_res ** 2) + (y_res ** 2)) ** 0.5 / payload.screen_size

        query_df = pd.DataFrame([{
            'Company': payload.company,
            'TypeName': payload.type_name,
            'Ram': payload.ram,
            'Weight': payload.weight,
            'Touchscreen': payload.touchscreen,
            'IPS_Panel': payload.ips,
            'PPI': ppi,
            'Brand_Name': payload.cpu,
            'HDD': payload.hdd,
            'SSD': payload.ssd,
            'Gpu_BrandName': payload.gpu,
            'OpSys_Name': payload.os
        }])

        predicted_log_price = pipe.predict(query_df)[0]
        predicted_price = float(np.exp(predicted_log_price))

        return {
            "status": "success",
            "predicted_price": round(predicted_price, 2),
            "currency": "INR"
        }

    except Exception as err:
        raise HTTPException(
            status_code=400, detail=f"Prediction processing error: {str(err)}"
            )