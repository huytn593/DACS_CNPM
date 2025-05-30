from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.routing import APIRoute
import os
import uvicorn
from app.backend.utils.db_init import create_indexes
from app.backend.routes import auth, review, report, cart, comparison, stock_alert, user
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
    allow_origins=["http://localhost:3000", "http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routes - Primary routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(review.router, prefix=settings.API_V1_STR)
app.include_router(report.router, prefix=settings.API_V1_STR)
app.include_router(cart.router, prefix=settings.API_V1_STR)
app.include_router(comparison.router, prefix=settings.API_V1_STR)
app.include_router(stock_alert.router, prefix=settings.API_V1_STR)
app.include_router(user.router, prefix=f"{settings.API_V1_STR}/user", tags=["users"])

# Additional routers - Map to the correct file names that exist in your project
additional_routers = {
    "product": settings.API_V1_STR,
    "category": settings.API_V1_STR,
    "order": settings.API_V1_STR,
    "wishlist": settings.API_V1_STR,
    "admin": settings.API_V1_STR,
    "seller": settings.API_V1_STR,
    "payment": settings.API_V1_STR
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

# Mount placeholder image
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Mount product images with date-based structure
products_dir = os.path.join(settings.UPLOAD_DIR, "products")
os.makedirs(products_dir, exist_ok=True)

# Mount each date folder in products directory
for date_folder in os.listdir(products_dir):
    date_path = os.path.join(products_dir, date_folder)
    if os.path.isdir(date_path):
        app.mount(f"/uploads/products/{date_folder}", StaticFiles(directory=date_path), name=f"products_{date_folder}")

# Add debug route to list all available endpoints
@app.get("/api/debug/routes")
async def debug_routes():
    routes = []
    for route in app.routes:
        if isinstance(route, APIRoute) and "debug" not in route.path:
            route_info = {
                "path": str(route.path),
                "name": str(route.name),
                "methods": list(route.methods)
            }
            routes.append(route_info)
    return {"routes": routes}

# Serve frontend in production
@app.get("/{_full_path:path}")
async def serve_frontend(_full_path: str):
    # Fallback to frontend(for SPA routing)
    # Don't serve for API routes
    if _full_path.startswith("api/"):
        return {"detail": "Not Found"}
    return {"frontend": "This would serve the frontend in production"}


if __name__ == "__main__":
    # Run the application when the script is executed directly
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)