import motor.motor_asyncio

MONGO_DETAILS = "mongodb+srv://sidharthpyspark_db_user:xuUZrN0aD45e679z@cluster0.kht5tri.mongodb.net/"
DATABASE_NAME = "table-ready"
COLLECTION_NAME = "table_for_you"

# Connect to client
client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_DETAILS)

# Reference database
database = client[DATABASE_NAME]

# Collections
menu_collection = database[COLLECTION_NAME]
orders_collection = database["orders"]
feedback_collection = database["feedback"]
