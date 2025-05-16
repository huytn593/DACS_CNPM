from fastapi import FastAPI, HTTPException, status
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import os
from starlette.responses import HTMLResponse

from .routes import user, product, order, seller, admin, review, report, stats, category, wishlist
from .utils.database import check_connection
from .routes.order import router as order_router


app = FastAPI(title="E-commerce API")

# Serve static files
app.mount("/frontend/static", StaticFiles(directory="frontend/static"), name="static")

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
app.include_router(order_router)
app.include_router(category.router)
app.include_router(wishlist.router)

@app.get("/", response_class=HTMLResponse)
async def read_root():
    return FileResponse("frontend/templates/index.html")

@app.get("/{html_file}.html", response_class=HTMLResponse)
async def serve_html(html_file: str):
    file_path = f"frontend/templates/{html_file}.html"
    if os.path.exists(file_path):
        return FileResponse(file_path)
    else:
        return FileResponse("frontend/templates/404.html")

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

@app.get("/wishlist.html")
async def wishlist_page():
    return FileResponse("frontend/templates/wishlist.html")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)