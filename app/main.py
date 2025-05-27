from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
import uvicorn
from app.backend.utils.db_init import create_indexes
from app.backend.routes import (
    auth, review, report, cart, comparison, stock_alert, user, product
)
from app.backend.utils.database import connect_to_mongo, close_mongo_connection
from app.config import settings

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
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routes - Primary routers
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(review.router, prefix="/api/reviews", tags=["reviews"])
app.include_router(report.router, prefix="/api/reports", tags=["reports"])
app.include_router(cart.router, prefix="/api/cart", tags=["cart"])
app.include_router(comparison.router, prefix="/api/comparison", tags=["comparison"])
app.include_router(stock_alert.router, prefix="/api/stock-alerts", tags=["stock-alerts"])
app.include_router(user.router, prefix="/api/user", tags=["users"])
app.include_router(product.router, prefix="/api/products", tags=["products"])

additional_routers = {
    "category": "/api",
    "order": "/api",
    "wishlist": "/api",
    "admin": "/api",
    "seller": "/api",
    "payment": "/api"
}

for router_name, prefix in additional_routers.items():
    try:
        module = __import__(f"app.backend.routes.{router_name}", fromlist=["router"])
        app.include_router(module.router, prefix=prefix)
        print(f"Successfully included router: {router_name}")
    except ImportError as e:
        print(f"Router not found or failed to import: {router_name} - {e}")
    except AttributeError as e:
        print(f"Router missing required attribute: {router_name} - {e}")

# Mount static files for media uploads
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/media", StaticFiles(directory=settings.UPLOAD_DIR), name="media")

# Add debug route to list all available endpoints
@app.get("/api/debug/routes")
async def debug_routes():
    routes = []
    for route in app.routes:
        if hasattr(route, "path") and "debug" not in route.path:
            routes.append({
                "path": route.path,
                "name": route.name,
                "methods": [method for method in route.methods] if hasattr(route, "methods") else None
            })
    return {"routes": routes}

# Serve frontend in production
@app.get("/{_full_path:path}")
async def serve_frontend(_full_path: str):
    # Fallback to frontend (for SPA routing)
    # Don't serve for API routes
    if _full_path.startswith("api/"):
        return {"detail": "Not Found"}
    return {"frontend": "This would serve the frontend in production"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)