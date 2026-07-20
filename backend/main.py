from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, status
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict
import json
from bson import ObjectId
from database import menu_collection, orders_collection, feedback_collection
from models import MenuItem, Order, FeedbackSubmit
from datetime import datetime

app = FastAPI(title="Table Ready - Restaurant Automation API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# WebSocket Connection Manager for Kitchen Dashboard
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: Dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                # Connection might be closed, disconnect will handle it or we ignore
                pass

manager = ConnectionManager()

# Default Seed Menu Data
SEED_MENU = [
    # Mains | Veg |
    {
        "name": "Corn, potato & broccoli in hot garlic sauce",
        "category": "Mains | Veg |",
        "description": "Cubes of potatoes, broccoli and golden corn in hot garlic sauce",
        "is_multi_price": False,
        "price": 495.0
    },
    {
        "name": "Wok-tossed vegetables - choice of sauce",
        "category": "Mains | Veg |",
        "description": "Hot garlic / Chilli soya / Chilli basil / White garlic",
        "is_multi_price": False,
        "price": 495.0
    },
    {
        "name": "Babycorn, mushroom & broccoli in aromatic sauce",
        "category": "Mains | Veg |",
        "description": "Babycorn, mushroom & broccoli cooked in flavorful aromatic sauce",
        "is_multi_price": False,
        "price": 495.0
    },
    {
        "name": "Cottage cheese - choice of sauce",
        "category": "Mains | Veg |",
        "description": "Chilli soya / Sichuan chilli / Chilli basil",
        "is_multi_price": False,
        "price": 495.0
    },
    {
        "name": "Cauliflower manchurian style",
        "category": "Mains | Veg |",
        "description": "Crispy cauliflower tossed in spicy, tangy manchurian sauce",
        "is_multi_price": False,
        "price": 495.0
    },
    {
        "name": "Veg manchurian",
        "category": "Mains | Veg |",
        "description": "Crispy veg balls tossed in spicy, tangy manchurian sauce",
        "is_multi_price": False,
        "price": 495.0
    },

    # Mains | Non Veg |
    {
        "name": "Prawn in choice of sauce",
        "category": "Mains | Non Veg |",
        "description": "Oyster / Sichuan / Black pepper / Chilli soya",
        "is_multi_price": False,
        "price": 695.0
    },
    {
        "name": "Soft-shell crab - choice of sauce",
        "category": "Mains | Non Veg |",
        "description": "Oyster / Sichuan / Black pepper / Chilli soya",
        "is_multi_price": False,
        "price": 995.0
    },
    {
        "name": "pomfret - choice of sauce",
        "category": "Mains | Non Veg |",
        "description": "Sichuan / Black pepper / Chilli soya",
        "is_multi_price": False,
        "price": 995.0
    },
    {
        "name": "Ikan bakar",
        "category": "Mains | Non Veg |",
        "description": "Grilled Indonesian-style fish with sizzling spices on a sizzler platter",
        "is_multi_price": False,
        "price": 695.0
    },
    {
        "name": "Roast lamb - choice of sauce",
        "category": "Mains | Non Veg |",
        "description": "Chilli bean / Devils / Basil chilli / Malak",
        "is_multi_price": False,
        "price": 725.0
    },
    {
        "name": "Sliced fish - choice of sauce (basa / bekti)",
        "category": "Mains | Non Veg |",
        "description": "Chilli basil / Smoked chilli / Chilli bean",
        "is_multi_price": True,
        "prices": {
            "Basa": 495.0,
            "Bekti": 695.0
        }
    },
    {
        "name": "Steamed whole bekti with lemongrass",
        "category": "Mains | Non Veg |",
        "description": "Kolkata bekti cooked in a lemongrass-flavoured broth",
        "is_multi_price": False,
        "price": 1095.0
    },
    {
        "name": "Sliced chicken - choice of sauce",
        "category": "Mains | Non Veg |",
        "description": "Chilli basil / Sichuan / Oyster / Orange sauce / Cantonese / Kung pao",
        "is_multi_price": False,
        "price": 495.0
    },
    {
        "name": "Sliced chicken in smoke sauce",
        "category": "Mains | Non Veg |",
        "description": "Sliced chicken cooked in spicy smoked sauce",
        "is_multi_price": False,
        "price": 495.0
    },
    {
        "name": "Duck - choice of sauce",
        "category": "Mains | Non Veg |",
        "description": "Tsinghoi / Sichuan chilli / Chilli oyster",
        "is_multi_price": False,
        "price": 695.0
    },

    # Thai Selection
    {
        "name": "Thai Green Curry",
        "category": "Thai Selection",
        "description": "Veg / Chicken / Prawn",
        "is_multi_price": True,
        "prices": {
            "Veg": 495.0,
            "Chicken": 595.0,
            "Prawn": 695.0
        }
    },
    {
        "name": "Thai Red Curry",
        "category": "Thai Selection",
        "description": "Veg / Chicken / Prawn",
        "is_multi_price": True,
        "prices": {
            "Veg": 495.0,
            "Chicken": 595.0,
            "Prawn": 695.0
        }
    },
    {
        "name": "Massaman Curry",
        "category": "Thai Selection",
        "description": "Veg / Chicken / Prawn",
        "is_multi_price": True,
        "prices": {
            "Veg": 495.0,
            "Chicken": 595.0,
            "Prawn": 695.0
        }
    },
    {
        "name": "Penang Curry",
        "category": "Thai Selection",
        "description": "Veg / Chicken / Prawn",
        "is_multi_price": True,
        "prices": {
            "Veg": 495.0,
            "Chicken": 595.0,
            "Prawn": 695.0
        }
    },
    {
        "name": "Burmese Khao Suey",
        "category": "Thai Selection",
        "description": "Veg / Chicken / Prawn",
        "is_multi_price": True,
        "prices": {
            "Veg": 495.0,
            "Chicken": 595.0,
            "Prawn": 695.0
        }
    },

    # Rice & Noodles
    {
        "name": "Udon noodles",
        "category": "Rice & Noodles",
        "description": "Seafood / Chicken / Vegetable",
        "is_multi_price": True,
        "prices": {
            "Seafood": 495.0,
            "Chicken": 465.0,
            "Vegetable": 425.0
        }
    },
    {
        "name": "Stir-fried hakka noodles",
        "category": "Rice & Noodles",
        "description": "Seafood / Chicken / Vegetable",
        "is_multi_price": True,
        "prices": {
            "Seafood": 395.0,
            "Chicken": 355.0,
            "Vegetable": 325.0
        }
    },
    {
        "name": "Singapore / Cantonese rice noodles",
        "category": "Rice & Noodles",
        "description": "Seafood / Chicken / Vegetable",
        "is_multi_price": True,
        "prices": {
            "Seafood": 395.0,
            "Chicken": 355.0,
            "Vegetable": 325.0
        }
    },
    {
        "name": "Chilli garlic noodles",
        "category": "Rice & Noodles",
        "description": "Seafood / Chicken / Vegetable",
        "is_multi_price": True,
        "prices": {
            "Seafood": 395.0,
            "Chicken": 355.0,
            "Vegetable": 325.0
        }
    },
    {
        "name": "Double pan-fried noodles",
        "category": "Rice & Noodles",
        "description": "Seafood / Chicken / Vegetable",
        "is_multi_price": True,
        "prices": {
            "Seafood": 395.0,
            "Chicken": 355.0,
            "Vegetable": 325.0
        }
    },
    {
        "name": "Pad Thai",
        "category": "Rice & Noodles",
        "description": "Seafood / Chicken / Vegetable",
        "is_multi_price": True,
        "prices": {
            "Seafood": 395.0,
            "Chicken": 355.0,
            "Vegetable": 325.0
        }
    },
    {
        "name": "Fried rice",
        "category": "Rice & Noodles",
        "description": "Seafood / Chicken / Vegetable",
        "is_multi_price": True,
        "prices": {
            "Seafood": 395.0,
            "Chicken": 355.0,
            "Vegetable": 325.0
        }
    },
    {
        "name": "Sichuan fried rice",
        "category": "Rice & Noodles",
        "description": "Seafood / Chicken / Vegetable",
        "is_multi_price": True,
        "prices": {
            "Seafood": 395.0,
            "Chicken": 355.0,
            "Vegetable": 325.0
        }
    },
    {
        "name": "Khao padh",
        "category": "Rice & Noodles",
        "description": "Seafood / Chicken / Vegetable",
        "is_multi_price": True,
        "prices": {
            "Seafood": 395.0,
            "Chicken": 355.0,
            "Vegetable": 325.0
        }
    },
    {
        "name": "Special duck meat fried rice",
        "category": "Rice & Noodles",
        "description": "Wok-fried rice with flavorful duck meat",
        "is_multi_price": False,
        "price": 495.0
    },
    {
        "name": "Jasmine rice",
        "category": "Rice & Noodles",
        "description": "Aromatic steamed jasmine rice",
        "is_multi_price": False,
        "price": 325.0
    },
    {
        "name": "Steamed basmati",
        "category": "Rice & Noodles",
        "description": "Plain steamed premium basmati rice",
        "is_multi_price": False,
        "price": 285.0
    }
]

# Helper to serialize MongoDB documents
def serialize_doc(doc) -> Dict:
    if not doc:
        return {}
    new_doc = doc.copy()
    new_doc["_id"] = str(new_doc["_id"])
    return new_doc

# ----------------- Endpoints -----------------

@app.post("/api/menu/seed", status_code=status.HTTP_201_CREATED)
async def seed_menu():
    # Clear existing menu
    await menu_collection.delete_many({})
    # Insert new menu
    result = await menu_collection.insert_many(SEED_MENU)
    return {"message": "Menu seeded successfully", "inserted_count": len(result.inserted_ids)}

@app.get("/api/menu", response_model=List[MenuItem])
async def get_menu():
    menu_items = []
    async for item in menu_collection.find():
        menu_items.append(serialize_doc(item))
    
    # If DB is empty, auto-seed and retrieve
    if not menu_items:
        await seed_menu()
        async for item in menu_collection.find():
            menu_items.append(serialize_doc(item))
            
    return menu_items

@app.post("/api/orders", response_model=Dict, status_code=status.HTTP_201_CREATED)
async def create_order(order: Order):
    order_dict = order.dict(by_alias=True, exclude_none=True)
    if "_id" in order_dict:
        del order_dict["_id"]
        
    order_dict["created_at"] = datetime.utcnow()
    order_dict["status"] = "Preparing"
    
    # Save to MongoDB
    result = await orders_collection.insert_one(order_dict)
    order_dict["_id"] = str(result.inserted_id)
    order_dict["created_at"] = order_dict["created_at"].isoformat()
    
    # Broadcast to WebSockets
    await manager.broadcast({
        "event": "new_order",
        "order": order_dict
    })
    
    return order_dict

@app.get("/api/orders", response_model=List[Dict])
async def get_all_orders():
    orders = []
    async for order in orders_collection.find().sort("created_at", -1):
        orders.append(serialize_doc(order))
    return orders

@app.get("/api/orders/active", response_model=List[Dict])
async def get_active_orders():
    active_orders = []
    # Find orders that are NOT yet 'Delivered'
    async for order in orders_collection.find({"status": {"$ne": "Delivered"}}).sort("created_at", 1):
        active_orders.append(serialize_doc(order))
    return active_orders

@app.get("/api/orders/table/{table_id}", response_model=List[Dict])
async def get_table_orders(table_id: str):
    orders = []
    async for order in orders_collection.find({"table_id": table_id}).sort("created_at", 1):
        orders.append(serialize_doc(order))
    return orders

@app.put("/api/orders/{order_id}/status", response_model=Dict)
async def update_order_status(order_id: str, payload: Dict):
    new_status = payload.get("status")
    if new_status not in ["Preparing", "Ready for Delivery", "Delivered"]:
        raise HTTPException(status_code=400, detail="Invalid order status")
        
    # Update document
    result = await orders_collection.update_one(
        {"_id": ObjectId(order_id)},
        {"$set": {"status": new_status}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
        
    # Get updated order
    updated_order = await orders_collection.find_one({"_id": ObjectId(order_id)})
    serialized = serialize_doc(updated_order)
    
    # Broadcast update
    await manager.broadcast({
        "event": "order_updated",
        "order": serialized
    })
    
    return serialized

@app.post("/api/feedback", status_code=status.HTTP_201_CREATED)
async def submit_feedback(feedback: FeedbackSubmit):
    feedback_dict = feedback.dict(exclude_none=True)
    feedback_dict["created_at"] = datetime.utcnow()
    
    # Save feedback
    await feedback_collection.insert_one(feedback_dict)
    
    # Optionally, we can also update the order document to note that feedback has been submitted
    await orders_collection.update_one(
        {"_id": ObjectId(feedback.order_id)},
        {"$set": {"feedback_submitted": True}}
    )
    
    return {"message": "Feedback submitted successfully"}

# ----------------- WebSockets -----------------

@app.websocket("/ws/orders")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive; can receive heartbeats if needed
            data = await websocket.receive_text()
            # Send message back or ignore
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)
