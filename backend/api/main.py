import os
import re
from functools import lru_cache
from pathlib import Path
import json
import httpx
from typing import Literal, Optional, List
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from traffic.data_adapter import (
    build_scenario,
    load_traffic_data,
    row_to_traffic_observation,
)
from traffic.impact import estimate_impact
from traffic.optimizer import optimize_signal
from traffic.model import TrafficObservation

# Load environment variables
dotenv_path = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(dotenv_path=dotenv_path if dotenv_path.exists() else Path(__file__).resolve().parents[1] / ".env")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_PATH = Path(__file__).resolve().parents[1] / "data" / "traffic_dataset.csv"

import asyncio

# MongoDB Database Connection
db_client = None
db_instance = None

def get_database():
    global db_client, db_instance
    uri = os.getenv("MONGODB_URI")
    if not uri:
        return None
    
    try:
        current_loop = asyncio.get_running_loop()
    except RuntimeError:
        current_loop = None

    if db_client is None or getattr(db_client, "_io_loop", None) != current_loop:
        try:
            db_client = AsyncIOMotorClient(uri)
            try:
                db_instance = db_client.get_default_database()
            except Exception:
                db_instance = db_client["hackathon_db"]
        except Exception as e:
            print(f"MongoDB connection error: {e}")
            return None
    return db_instance


# User & Alert Data Models
class UserRegisterRequest(BaseModel):
    username: str
    password: str
    phone: Optional[str] = "Not set"
    dob: Optional[str] = "Not set"

class UserLoginRequest(BaseModel):
    username: str
    password: str

class UserProfileUpdateRequest(BaseModel):
    username: str
    phone: Optional[str] = None
    dob: Optional[str] = None
    avatar: Optional[str] = None

class UserAlertRequest(BaseModel):
    username: Optional[str] = "Anonymous"
    text: str
    type: Optional[str] = "alert"
    location: Optional[str] = None
    timestamp: Optional[str] = None


# The dataset has no directional demand, so the direction scenario is an explicit
# SIMULATION ASSUMPTION: (north_south_share, east_west_share).
DIRECTION_SPLITS = {
    "balanced": (0.50, 0.50),
    "north_south_heavy": (0.60, 0.40),
    "east_west_heavy": (0.40, 0.60),
}

# Message raised by optimize_signal() when every candidate is oversaturated.
NO_FEASIBLE_PLAN_MESSAGE = "No feasible signal plan found"


class AnalyzeRequest(BaseModel):
    timestamp: Optional[str] = None
    direction_scenario: Optional[
        Literal["balanced", "north_south_heavy", "east_west_heavy"]
    ] = "balanced"
    vehicle_count: Optional[int] = None
    avg_speed: Optional[float] = None
    vehicle_density: Optional[float] = None
    free_flow_speed: Optional[float] = 40.0
    saturation_flow_rate: Optional[float] = 1800.0
    north_south_split: Optional[float] = None
    east_west_split: Optional[float] = None


# Backward compatibility alias
TrafficRequest = AnalyzeRequest


# --------------------------------------------------------------------------- #
# Dataset lookup
# --------------------------------------------------------------------------- #

_TIMESTAMP_PATTERN = re.compile(r"^\s*(\d{1,3}):(\d{2})(?::(\d{2}))?\s*$")


def _canonical_timestamp(value: str) -> Optional[str]:
    """
    '08:17:00', '8:17:00' and '8:17' all become '8:17:00' (the CSV's own style),
    so the request and the CSV are compared on the same footing.
    Returns None if the value is not a valid H:MM[:SS] timestamp.
    """
    match = _TIMESTAMP_PATTERN.match(str(value))
    if match is None:
        return None
    hours = int(match.group(1))
    minutes = int(match.group(2))
    seconds = int(match.group(3) or 0)
    if minutes > 59 or seconds > 59:
        return None
    return f"{hours}:{minutes:02d}:{seconds:02d}"


@lru_cache(maxsize=1)
def _load_dataset():
    """Read the CSV once and index its rows by canonical timestamp."""
    df = load_traffic_data(str(DATA_PATH))
    index = {}
    for position, raw_timestamp in enumerate(df["Timestamp"]):
        key = _canonical_timestamp(raw_timestamp)
        if key is not None:
            index.setdefault(key, position)  # first occurrence wins
    return df, index


def _observation_summary(observation, timestamp: str) -> dict:
    return {
        "timestamp": timestamp,
        "vehicle_count": observation.vehicle_count,
        "avg_speed": observation.avg_speed,
        "vehicle_density": observation.vehicle_density,
        "congestion_level": observation.congestion_level,
    }


# --------------------------------------------------------------------------- #
# MongoDB User & Auth Endpoints
# --------------------------------------------------------------------------- #

@app.post("/api/auth/register")
async def register_user(req: UserRegisterRequest):
    database = get_database()
    if database is None:
        raise HTTPException(status_code=500, detail="Database connection unavailable")

    username_clean = req.username.strip()
    if not username_clean:
        raise HTTPException(status_code=400, detail="Username cannot be empty")

    existing_user = await database.users.find_one({"username": username_clean})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username is already taken")

    avatar_seed = re.sub(r"[^a-zA-Z0-9]", "", username_clean) or "default"
    avatar_url = f"https://api.dicebear.com/7.x/adventurer/png?seed={avatar_seed}&backgroundColor=b6e3f4"

    user_doc = {
        "username": username_clean,
        "password": req.password,
        "phone": req.phone or "Not set",
        "dob": req.dob or "Not set",
        "avatar": avatar_url,
    }

    await database.users.insert_one(user_doc)

    return {
        "status": "success",
        "message": "User registered successfully",
        "user": {
            "username": user_doc["username"],
            "phone": user_doc["phone"],
            "dob": user_doc["dob"],
            "avatar": user_doc["avatar"],
        },
    }


@app.post("/api/auth/login")
async def login_user(req: UserLoginRequest):
    database = get_database()
    if database is None:
        raise HTTPException(status_code=500, detail="Database connection unavailable")

    username_clean = req.username.strip()
    avatar_seed = re.sub(r"[^a-zA-Z0-9]", "", username_clean) or "default"
    bitmoji_avatar = f"https://api.dicebear.com/7.x/adventurer/png?seed={avatar_seed}&backgroundColor=b6e3f4"

    user = await database.users.find_one({"username": username_clean})
    if not user:
        # For seamless demo experience: auto-register new username if not found
        user = {
            "username": username_clean,
            "password": req.password,
            "phone": "Not set",
            "dob": "Not set",
            "avatar": bitmoji_avatar,
        }
        await database.users.insert_one(user)

    elif user.get("password") != req.password:
        raise HTTPException(status_code=401, detail="Invalid password")

    # If avatar is missing or old SVG bottts, upgrade to Bitmoji
    current_avatar = user.get("avatar")
    if not current_avatar or "bottts" in current_avatar or current_avatar.endswith(".svg"):
        current_avatar = bitmoji_avatar
        await database.users.update_one({"username": username_clean}, {"$set": {"avatar": bitmoji_avatar}})

    return {
        "status": "success",
        "message": "Logged in successfully",
        "user": {
            "username": user["username"],
            "phone": user.get("phone", "Not set"),
            "dob": user.get("dob", "Not set"),
            "avatar": current_avatar,
        },
    }


@app.get("/api/user/profile")
async def get_user_profile(username: str):
    database = get_database()
    if database is None:
        raise HTTPException(status_code=500, detail="Database connection unavailable")

    username_clean = username.strip()
    user = await database.users.find_one({"username": username_clean})
    if not user:
        raise HTTPException(status_code=404, detail="User profile not found")

    avatar_seed = re.sub(r"[^a-zA-Z0-9]", "", username_clean) or "default"
    bitmoji_avatar = f"https://api.dicebear.com/7.x/adventurer/png?seed={avatar_seed}&backgroundColor=b6e3f4"

    current_avatar = user.get("avatar")
    if not current_avatar or "bottts" in current_avatar or current_avatar.endswith(".svg"):
        current_avatar = bitmoji_avatar

    return {
        "status": "success",
        "user": {
            "username": user["username"],
            "phone": user.get("phone", "Not set"),
            "dob": user.get("dob", "Not set"),
            "avatar": current_avatar,
        },
    }


@app.post("/api/user/profile")
async def update_user_profile(req: UserProfileUpdateRequest):
    database = get_database()
    if database is None:
        raise HTTPException(status_code=500, detail="Database connection unavailable")

    username_clean = req.username.strip()
    update_fields = {}
    if req.phone is not None:
        update_fields["phone"] = req.phone
    if req.dob is not None:
        update_fields["dob"] = req.dob
    if req.avatar is not None:
        update_fields["avatar"] = req.avatar

    if not update_fields:
        raise HTTPException(status_code=400, detail="No fields provided to update")

    await database.users.update_one(
        {"username": username_clean},
        {"$set": update_fields},
        upsert=True,
    )

    updated_user = await database.users.find_one({"username": username_clean})

    return {
        "status": "success",
        "message": "Profile updated in MongoDB successfully",
        "user": {
            "username": updated_user["username"],
            "phone": updated_user.get("phone", "Not set"),
            "dob": updated_user.get("dob", "Not set"),
            "avatar": updated_user.get("avatar"),
        },
    }


@app.get("/api/alerts")
async def get_alerts():
    database = get_database()
    if database is None:
        return {"status": "success", "alerts": []}

    cursor = database.alerts.find().sort("_id", -1).limit(50)
    alerts = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        alerts.append(doc)
    return {"status": "success", "alerts": alerts}


@app.post("/api/alerts")
async def create_alert(req: UserAlertRequest):
    database = get_database()
    if database is None:
        raise HTTPException(status_code=500, detail="Database connection unavailable")

    alert_doc = {
        "user": req.username or "Anonymous",
        "text": req.text,
        "type": req.type or "alert",
        "location": req.location,
        "time": req.timestamp or "Just now",
    }

    res = await database.alerts.insert_one(alert_doc)
    alert_doc["_id"] = str(res.inserted_id)
    return {"status": "success", "alert": alert_doc}


# --------------------------------------------------------------------------- #
# Endpoints
# --------------------------------------------------------------------------- #

@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "database": "connected" if get_database() is not None else "disconnected"
    }



@app.post("/api/analyze")
def analyze_traffic(request: AnalyzeRequest):

    # 1. Determine phase splits
    if request.north_south_split is not None and request.east_west_split is not None:
        phase_split = (request.north_south_split, request.east_west_split)
    else:
        scenario_key = request.direction_scenario or "balanced"
        phase_split = DIRECTION_SPLITS.get(scenario_key, (0.50, 0.50))

    # 2. Extract or lookup TrafficObservation
    if (
        request.vehicle_count is not None
        and request.avg_speed is not None
        and request.vehicle_density is not None
    ):
        timestamp_str = request.timestamp or "08:17:00"
        density = request.vehicle_density
        density_pct = density * 100.0 if density <= 1.0 else density
        density_ratio = density / 100.0 if density > 1.0 else density

        congestion_level = (
            "High"
            if density_ratio > 0.6
            else ("Medium" if density_ratio > 0.3 else "Low")
        )

        observation = TrafficObservation(
            timestamp=timestamp_str,
            vehicle_count=int(request.vehicle_count),
            avg_speed=float(request.avg_speed),
            vehicle_density=float(density_pct),
            saturation_flow_rate=float(request.saturation_flow_rate or 1800.0),
            free_flow_speed=float(request.free_flow_speed or 40.0),
            congestion_level=congestion_level,
            ir_presence=[1, 1, 1, 1],
        )
        observation_info = {
            "timestamp": timestamp_str,
            "vehicle_count": observation.vehicle_count,
            "avg_speed": observation.avg_speed,
            "vehicle_density": observation.vehicle_density,
            "congestion_level": observation.congestion_level,
        }
    else:
        target_ts = request.timestamp or "08:17:00"
        key = _canonical_timestamp(target_ts)
        if key is None:
            raise HTTPException(
                status_code=422,
                detail=(
                    f"Invalid timestamp {target_ts!r}; "
                    "expected H:MM:SS (for example '08:17:00')."
                ),
            )

        try:
            df, index = _load_dataset()
        except FileNotFoundError:
            raise HTTPException(
                status_code=500,
                detail=f"Traffic dataset not found at {DATA_PATH}",
            )

        if key not in index:
            raise HTTPException(
                status_code=404,
                detail=f"No observation with timestamp {target_ts!r} in the dataset.",
            )

        observation = row_to_traffic_observation(df.iloc[index[key]])
        observation_info = _observation_summary(observation, target_ts)

    # 3. Build scenario
    scenario = build_scenario(observation, phase_split=phase_split)

    # 4. Optimise the signal plan
    try:
        optimization = optimize_signal(scenario)
    except ValueError as error:
        if str(error) != NO_FEASIBLE_PLAN_MESSAGE:
            raise
        direction_name = request.direction_scenario or "custom"
        raise HTTPException(
            status_code=422,
            detail={
                "error": "no_feasible_plan",
                "message": (
                    "Demand at this timestamp exceeds what this intersection can "
                    f"serve under any signal timing for the '{direction_name}' direction scenario."
                ),
                "observation": observation_info,
            },
        )

    # 5. Impact
    delay_reduction = optimization["delay_reduction"]
    impact = (
        estimate_impact(delay_reduction)
        if delay_reduction is not None
        else None
    )

    return {
        "observation": observation_info,
        "baseline": {
            "north_south_green": scenario.green_times["north"],
            "east_west_green": scenario.green_times["east"],
            "delay": optimization["baseline_delay"],
        },
        "optimized": {
            "north_south_green": optimization["optimized"].green_times["north"],
            "east_west_green": optimization["optimized"].green_times["east"],
            "delay": optimization["optimized_delay"],
            "delay_reduction": delay_reduction,
        },
        "impact": impact,
    }


# --------------------------------------------------------------------------- #
# AI Traffic Chatbot Endpoint (OpenRouter Powered)
# --------------------------------------------------------------------------- #

class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    context: Optional[dict] = None


@app.post("/api/chat")
async def chat_with_ai(req: ChatRequest):
    openrouter_key = os.getenv("OPENROUTER_API_KEY")
    if not openrouter_key:
        return {
            "reply": (
                "FlowSync AI requires an OpenRouter API key. "
                "Please configure OPENROUTER_API_KEY in your .env file."
            ),
            "status": "fallback",
            "detail": "OPENROUTER_API_KEY environment variable is not set.",
        }

    system_content = (
        "You are FlowSync AI, an expert traffic engineering and urban mobility assistant embedded in the FlowSync platform. "
        "Your mission is to help commuters, urban planners, and drivers understand intersection traffic telemetry, "
        "adaptive signal timing (Webster's method), delay reduction, and sustainability metrics (idle fuel burn and avoided CO2 emissions). "
        "Keep your explanations concise, professional, friendly, and practical. "
        "Format replies cleanly using short paragraphs or bullet points."
    )

    if req.context:
        system_content += f"\n\nCURRENT INTERSECTION TELEMETRY & OPTIMIZATION CONTEXT:\n{json.dumps(req.context, indent=2)}"

    payload_messages = [{"role": "system", "content": system_content}]
    for m in req.messages:
        payload_messages.append({"role": m.role, "content": m.content})

    models_to_try = ["openai/gpt-4o-mini", "qwen/qwen-2.5-72b-instruct"]
    headers = {
        "Authorization": f"Bearer {openrouter_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://flowsync.ai",
        "X-Title": "FlowSync Traffic Assistant",
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        last_error = None
        for model in models_to_try:
            try:
                res = await client.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers=headers,
                    json={
                        "model": model,
                        "messages": payload_messages,
                        "temperature": 0.7,
                        "max_tokens": 600,
                    },
                )
                if res.status_code == 200:
                    data = res.json()
                    reply = data["choices"][0]["message"]["content"]
                    return {"reply": reply, "model": model, "status": "success"}
                else:
                    last_error = res.text
            except Exception as e:
                last_error = str(e)

    # Fallback response if external API temporarily fails
    return {
        "reply": (
            "I'm currently unable to reach the AI engine, but based on your corridor telemetry, "
            "FlowSync's adaptive signal optimizer is actively reallocating green splits to minimize commute delays "
            "and reduce CO2 emissions."
        ),
        "status": "fallback",
        "detail": last_error,
    }