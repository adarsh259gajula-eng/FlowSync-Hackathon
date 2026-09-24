import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv(dotenv_path="../.env")

async def create_db():
    uri = os.getenv("MONGODB_URI")
    if not uri:
        print("Error: MONGODB_URI is not set in the .env file")
        return

    print(f"Connecting to MongoDB...")
    client = AsyncIOMotorClient(uri)
    
    try:
        # Access the database (motor gets it from the URI)
        db = client.get_default_database()
        
        # Insert a dummy document to ensure the database and collection are created
        collection = db["init_collection"]
        result = await collection.insert_one({"message": "Database initialized successfully!"})
        
        print(f"Successfully connected to MongoDB!")
        print(f"Database Name: {db.name}")
        print(f"Inserted dummy document with ID: {result.inserted_id}")
    except Exception as e:
        print(f"Failed to connect to MongoDB: {e}")

if __name__ == "__main__":
    asyncio.run(create_db())
