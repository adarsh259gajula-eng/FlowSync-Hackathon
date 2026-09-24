from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import os

# Load environment variables from the root .env file
load_dotenv(dotenv_path="../.env")

app = FastAPI()

# Allow CORS for frontends
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MONGODB_URI = os.getenv("MONGODB_URI")

class AnalyzeRequest(BaseModel):
    vehicle_count: int
    avg_speed: float
    vehicle_density: float
    free_flow_speed: float = 40.0
    saturation_flow_rate: float = 1800.0
    north_south_split: float = 0.5
    east_west_split: float = 0.5

@app.post("/api/analyze")
def analyze_traffic(req: AnalyzeRequest):
    return {
        "observation": {
            "timestamp": "08:17:00",
            "vehicle_count": req.vehicle_count,
            "avg_speed": req.avg_speed,
            "vehicle_density": req.vehicle_density * 100,
            "congestion_level": "High" if req.vehicle_density > 0.8 else "Medium"
        },
        "baseline": {
            "north_south_green": 41,
            "east_west_green": 41,
            "delay": 970.5
        },
        "optimized": {
            "north_south_green": int(41 * req.north_south_split * 2),
            "east_west_green": int(41 * req.east_west_split * 2),
            "delay": 930.93,
            "delay_reduction": 39.57
        },
        "impact": {
            "vehicle_hours_saved": 0.01099,
            "fuel_saved_liters": 0.00879,
            "co2_saved_kg": 0.02023
        }
    }
