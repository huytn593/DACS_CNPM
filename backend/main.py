from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .routes import user, product, order, seller, admin
from .utils.auth import get_current_user

app = FastAPI(title="E-commerce API")

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
app.include_router(seller.router)  # Router này đã có Depends(seller_required)
app.include_router(admin.router)   # Router này đã có Depends(admin_required)

@app.get("/")
async def root():
    return {"message": "Welcome to E-commerce API"}