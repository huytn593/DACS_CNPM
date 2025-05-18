from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
import uvicorn
from app.backend.utils.db_init import create_indexes
from app.backend.routes import auth, review, report, cart, comparison, stock_alert
from app.backend.utils.database import connect_to_mongo, close_mongo_connection
from app.config import settings


# Define a single lifespan context manager that handles both operations
@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Startup: connect to database
    await connect_to_mongo()

    # Create database indexes
    await create_indexes()

    yield

    # Shutdown: close database connection
    await close_mongo_connection()


app = FastAPI(lifespan=lifespan)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routes
app.include_router(auth.router, prefix="/api")
app.include_router(review.router, prefix="/api")
app.include_router(report.router, prefix="/api")
app.include_router(cart.router, prefix="/api")
app.include_router(comparison.router, prefix="/api")
app.include_router(stock_alert.router, prefix="/api")

# Optional routers
try:
    from app.backend.routes import users

    app.include_router(users.router, prefix="/api")
except ImportError:
    users = None

try:
    from app.backend.routes import products

    app.include_router(products.router, prefix="/api")
except ImportError:
    products = None

try:
    from app.backend.routes import categories

    app.include_router(categories.router, prefix="/api")
except ImportError:
    categories = None

try:
    from app.backend.routes import cart

    app.include_router(cart.router, prefix="/api")
except ImportError:
    cart = None

try:
    from app.backend.routes import orders

    app.include_router(orders.router, prefix="/api")
except ImportError:
    orders = None

try:
    from app.backend.routes import reviews

    app.include_router(reviews.router, prefix="/api")
except ImportError:
    reviews = None

try:
    from app.backend.routes import wishlist

    app.include_router(wishlist.router, prefix="/api")
except ImportError:
    wishlist = None

try:
    from app.backend.routes import admin

    app.include_router(admin.router, prefix="/api")
except ImportError:
    admin = None

try:
    from app.backend.routes import seller

    app.include_router(seller.router, prefix="/api")
except ImportError:
    seller = None

try:
    from app.backend.routes import payment

    app.include_router(payment.router, prefix="/api")
except ImportError:
    payment = None

# Mount static files for media uploads
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/media", StaticFiles(directory=settings.UPLOAD_DIR), name="media")


# Serve frontend in production
@app.get("/{_full_path:path}")
async def serve_frontend(_full_path: str):
    # Fallback to frontend (for SPA routing)
    return {"frontend": "This would serve the frontend in production"}


if __name__ == "__main__":
    # Run the application when the script is executed directly
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)