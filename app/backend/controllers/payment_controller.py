# app/backend/controllers/payment_controller.py
from fastapi import HTTPException, status
from datetime import datetime, UTC
import uuid
from typing import Dict, Any
import hmac
import hashlib
from urllib.parse import urlencode

from ..models.order import OrderStatus, OrderUpdate
from ..utils.database import get_db
from ..controllers import order_controller


# Mock payment gateway for demonstration
async def create_payment_intent(order_id: str, amount: float, payment_method: str) -> Dict[str, Any]:
    db = get_db()

    # Get the order
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )

    # Create payment intent
    payment_intent = {
        "id": str(uuid.uuid4()),
        "order_id": order_id,
        "amount": amount,
        "payment_method": payment_method,
        "status": "created",
        "created_at": datetime.now(UTC),
        "updated_at": datetime.now(UTC)
    }

    await db.payment_intents.insert_one(payment_intent)

    # Generate client secret for the frontend
    client_secret = hmac.new(
        b"payment_secret_key",
        f"{payment_intent['id']}:{order_id}:{amount}".encode('utf-8'),
        hashlib.sha256
    ).hexdigest()

    payment_intent["client_secret"] = client_secret

    return payment_intent


async def process_payment(payment_intent_id: str, payment_method_id: str) -> Dict[str, Any]:
    db = get_db()

    # Get the payment intent
    payment_intent = await db.payment_intents.find_one({"id": payment_intent_id})
    if not payment_intent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment intent not found"
        )

    # In a real implementation, you would call a payment provider API here
    # This is a mock implementation that always succeeds

    # Update payment intent
    payment_intent["status"] = "succeeded"
    payment_intent["payment_method_id"] = payment_method_id
    payment_intent["updated_at"] = datetime.now(UTC)

    await db.payment_intents.update_one(
        {"id": payment_intent_id},
        {"$set": payment_intent}
    )

    # Update order status
    order_update = OrderUpdate(status=OrderStatus.shipped)
    await order_controller.update_order(payment_intent["order_id"], order_update)

    return payment_intent


# For VNPay integration example
async def create_vnpay_url(order_id: str, amount: float, ip_addr: str, return_url: str) -> str:
    db = get_db()

    # Get the order
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )

    # VNPay configuration (these would be environment variables in production)
    vnp_tmn_code = "YOUR_MERCHANT_CODE"
    vnp_hash_secret = "YOUR_SECRET_KEY"
    vnp_url = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html"

    # Payment data
    vnp_params = {
        "vnp_Version": "2.1.0",
        "vnp_Command": "pay",
        "vnp_TmnCode": vnp_tmn_code,
        "vnp_Amount": int(amount * 100),  # VNPay requires amount in smallest currency unit (VND)
        "vnp_CurrCode": "VND",
        "vnp_TxnRef": order_id,
        "vnp_OrderInfo": f"Payment for order {order_id}",
        "vnp_OrderType": "billpayment",
        "vnp_Locale": "vn",
        "vnp_ReturnUrl": return_url,
        "vnp_IpAddr": ip_addr,
        "vnp_CreateDate": datetime.now().strftime('%Y%m%d%H%M%S')
    }

    # Sort parameters alphabetically by key
    sorted_params = sorted(vnp_params.items())

    # Create query string
    query_string = ""
    for key, value in sorted_params:
        if query_string:
            query_string += "&" + urlencode({key: value})
        else:
            query_string = urlencode({key: value})

    # Create signature
    signature = hmac.new(
        vnp_hash_secret.encode('utf-8'),
        query_string.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()

    # Add signature to parameters
    vnp_params["vnp_SecureHash"] = signature

    # Create payment URL
    payment_url = f"{vnp_url}?{urlencode(vnp_params)}"

    # Save payment information to database
    payment_record = {
        "id": str(uuid.uuid4()),
        "order_id": order_id,
        "amount": amount,
        "payment_method": "vnpay",
        "status": "pending",
        "transaction_ref": order_id,
        "created_at": datetime.now(UTC),
        "updated_at": datetime.now(UTC)
    }

    await db.payments.insert_one(payment_record)

    return payment_url


async def process_vnpay_return(params: Dict[str, str]) -> Dict[str, Any]:
    # Verify VNPay return data
    vnp_secure_hash = params.get("vnp_SecureHash")
    if not vnp_secure_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid payment data"
        )

    # Remove vnp_SecureHash and vnp_SecureHashType from params
    verify_params = params.copy()
    if "vnp_SecureHash" in verify_params:
        del verify_params["vnp_SecureHash"]
    if "vnp_SecureHashType" in verify_params:
        del verify_params["vnp_SecureHashType"]

    # Sort parameters alphabetically by key
    sorted_params = sorted(verify_params.items())

    # Create query string
    query_string = ""
    for key, value in sorted_params:
        if query_string:
            query_string += "&" + urlencode({key: value})
        else:
            query_string = urlencode({key: value})

    # VNPay secret key (this would be an environment variable in production)
    vnp_hash_secret = "YOUR_SECRET_KEY"

    # Create signature
    calculated_signature = hmac.new(
        vnp_hash_secret.encode('utf-8'),
        query_string.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()

    # Verify signature
    if vnp_secure_hash != calculated_signature:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid signature"
        )

    # Check payment status
    vnp_response_code = params.get("vnp_ResponseCode")
    vnp_txn_ref = params.get("vnp_TxnRef")  # This is our order_id

    db = get_db()

    # Get payment record
    payment = await db.payments.find_one({
        "transaction_ref": vnp_txn_ref,
        "payment_method": "vnpay"
    })

    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment record not found"
        )

    # Update payment status based on VNPay response
    if vnp_response_code == "00":
        payment["status"] = "succeeded"

        # Update order status
        order_update = OrderUpdate(status=OrderStatus.shipped)
        await order_controller.update_order(payment["order_id"], order_update)
    else:
        payment["status"] = "failed"

    payment["response_code"] = vnp_response_code
    payment["updated_at"] = datetime.now(UTC)

    await db.payments.update_one(
        {"id": payment["id"]},
        {"$set": payment}
    )

    return {
        "order_id": payment["order_id"],
        "status": payment["status"],
        "message": "Payment processed successfully" if payment["status"] == "succeeded" else "Payment failed"
    }