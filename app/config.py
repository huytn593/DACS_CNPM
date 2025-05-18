# app/backend/config.py
import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # MongoDB settings
    MONGODB_URL: str = os.getenv(
        "MONGODB_URL",
        "mongodb+srv://admin:admin@ecommerce.hvapw5i.mongodb.net/ecommerce?retryWrites=true&w=majority"
    )

    # JWT settings
    SECRET_KEY: str = os.getenv("SECRET_KEY", "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

    # CORS settings
    CORS_ORIGINS: list = [
        "http://localhost",
        "http://localhost:8000",
        "http://localhost:3000",
        "https://ecommerce-app.example.com"
    ]

    # File upload settings
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "uploads")
    MAX_UPLOAD_SIZE: int = int(os.getenv("MAX_UPLOAD_SIZE", "10485760"))  # 10MB

    # Payment settings
    VNPAY_TMN_CODE: str = os.getenv("VNPAY_TMN_CODE", "YOUR_MERCHANT_CODE")
    VNPAY_HASH_SECRET_KEY: str = os.getenv("VNPAY_HASH_SECRET_KEY", "YOUR_SECRET_KEY")
    VNPAY_PAYMENT_URL: str = os.getenv(
        "VNPAY_PAYMENT_URL",
        "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html"
    )

    # Email settings
    EMAIL_HOST: str = os.getenv("EMAIL_HOST", "smtp.gmail.com")
    EMAIL_PORT: int = int(os.getenv("EMAIL_PORT", "587"))
    EMAIL_USERNAME: str = os.getenv("EMAIL_USERNAME", "")
    EMAIL_PASSWORD: str = os.getenv("EMAIL_PASSWORD", "")
    EMAIL_FROM: str = os.getenv("EMAIL_FROM", "noreply@example.com")

    class Config:
        env_file = ".env"


settings = Settings()