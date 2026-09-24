from fastapi import FastAPI
from dotenv import load_dotenv
import os

# Load environment variables from the root .env file
load_dotenv(dotenv_path="../.env")

app = FastAPI()

MONGODB_URI = os.getenv("MONGODB_URI")
API_KEY = os.getenv("API_KEY")

@app.get("/")
def read_root():
    return {"Hello": "World", "MongoDB_URI_Loaded": bool(MONGODB_URI)}
