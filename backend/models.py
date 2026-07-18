from pydantic import BaseModel, Field, BeforeValidator
from typing import List, Optional, Dict, Annotated
from datetime import datetime

# Custom validator to treat MongoDB ObjectIds as strings
PyObjectId = Annotated[str, BeforeValidator(str)]

class MenuItem(BaseModel):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    name: str
    category: str
    description: Optional[str] = ""
    is_multi_price: bool = False
    price: Optional[float] = None
    prices: Optional[Dict[str, float]] = None  # e.g. {"Veg": 300, "Chicken": 350, "Prawns": 400}

    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "name": "Green Curry",
                "category": "Thai Selection",
                "is_multi_price": True,
                "prices": {"Veg": 300.0, "Chicken": 350.0, "Prawns": 400.0}
            }
        }

class OrderItem(BaseModel):
    item_id: str
    name: str
    quantity: int
    selected_variant: Optional[str] = None
    price: float

class Order(BaseModel):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    table_id: str
    items: List[OrderItem]
    status: str = "Preparing"  # Preparing, Ready for Delivery, Delivered
    created_at: datetime = Field(default_factory=datetime.utcnow)
    total_amount: float

    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "table_id": "table_1",
                "items": [
                    {"item_id": "60c72b2f9b1d8b2d1c8b4567", "name": "Pad Thai", "quantity": 2, "selected_variant": "Chicken", "price": 330.0}
                ],
                "status": "Preparing",
                "total_amount": 660.0
            }
        }

class FeedbackItem(BaseModel):
    item_id: str
    item_name: str
    rating: int = Field(..., ge=1, le=5)
    comments: Optional[str] = ""

class FeedbackSubmit(BaseModel):
    order_id: str
    waiter_rating: int = Field(..., ge=1, le=5)
    items_feedback: List[FeedbackItem]
    overall_comments: Optional[str] = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)
