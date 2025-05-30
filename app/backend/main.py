from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.config import settings
from app.backend.utils.database import connect_to_mongo
from app.backend.routes import (
    auth,
    product,
    category,
    cart,
    order,
    review,
    wishlist,
    seller,
    admin,
    stock_alert,
    comparison,
    upload
)
import os

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files directory
app.mount("/uploads", StaticFiles(directory=os.path.join(os.path.dirname(__file__), "../../uploads")), name="uploads")

# Include routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(product.router, prefix=settings.API_V1_STR)
app.include_router(category.router, prefix=settings.API_V1_STR)
app.include_router(cart.router, prefix=settings.API_V1_STR)
app.include_router(order.router, prefix=settings.API_V1_STR)
app.include_router(review.router, prefix=settings.API_V1_STR)
app.include_router(wishlist.router, prefix=settings.API_V1_STR)
app.include_router(seller.router, prefix=settings.API_V1_STR)
app.include_router(admin.router, prefix=settings.API_V1_STR)
app.include_router(stock_alert.router, prefix=settings.API_V1_STR)
app.include_router(comparison.router, prefix=settings.API_V1_STR)
app.include_router(upload.router, prefix=settings.API_V1_STR)

@app.on_event("startup")
async def startup_event():
    await connect_to_mongo()

@app.get("/")
async def root():
    return {"message": "Welcome to the E-commerce API"} 