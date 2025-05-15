from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import os
from .routes import user, product, order, seller, admin, review, report, stats
from .utils.database import check_connection

app = FastAPI(title="E-commerce API")

# Serve static files
app.mount("/static", StaticFiles(directory="frontend/static"), name="static")

# Cấu hình CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Trong môi trường production, hạn chế domain cụ thể
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Đăng ký các router
app.include_router(user.router)
app.include_router(product.router)
app.include_router(order.router)
app.include_router(seller.router)
app.include_router(admin.router)
app.include_router(review.router)
app.include_router(report.router)
app.include_router(stats.router)

@app.get("/")
async def root():
    return FileResponse("frontend/templates/index.html")


@app.get("/login.html")
async def login_page():
    return FileResponse("frontend/templates/login.html")


@app.get("/register.html")
async def register_page():
    return FileResponse("frontend/templates/register.html")


@app.get("/product_detail.html")
async def product_detail_page():
    return FileResponse("frontend/templates/product_detail.html")


@app.get("/cart.html")
async def cart_page():
    return FileResponse("frontend/templates/cart.html")


@app.get("/checkout.html")
async def checkout_page():
    return FileResponse("frontend/templates/checkout.html")


@app.get("/profile.html")
async def profile_page():
    return FileResponse("frontend/templates/profile.html")


@app.get("/seller_dashboard.html")
async def seller_dashboard_page():
    return FileResponse("frontend/templates/seller_dashboard.html")


@app.get("/admin_dashboard.html")
async def admin_dashboard_page():
    return FileResponse("frontend/templates/admin_dashboard.html")


@app.get("/health")
async def health_check():
    """Kiểm tra kết nối đến MongoDB"""
    is_connected = await check_connection()

    if not is_connected:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection failed"
        )

    return {"status": "healthy", "database_connected": True}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)