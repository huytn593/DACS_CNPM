# app/backend/utils/email.py
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Optional

from app.config import settings


async def send_email(
        to_emails: List[str],
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
) -> bool:
    """
    Send an email using SMTP
    """
    if not settings.EMAIL_USERNAME or not settings.EMAIL_PASSWORD:
        # Log the error in a real application
        return False

    # Create message
    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"] = settings.EMAIL_FROM
    message["To"] = ", ".join(to_emails)

    # Add text part
    if text_content:
        text_part = MIMEText(text_content, "plain")
        message.attach(text_part)

    # Add HTML part
    html_part = MIMEText(html_content, "html")
    message.attach(html_part)

    try:
        # Connect to SMTP server
        server = smtplib.SMTP(settings.EMAIL_HOST, settings.EMAIL_PORT)
        server.starttls()
        server.login(settings.EMAIL_USERNAME, settings.EMAIL_PASSWORD)

        # Send email
        server.sendmail(settings.EMAIL_FROM, to_emails, message.as_string())
        server.quit()

        return True
    except Exception as e:
        # Log the error in a real application
        print(f"Error sending email: {e}")
        return False


async def send_password_reset_email(email: str, reset_token: str, reset_url: str) -> bool:
    """
    Send a password reset email with a token
    """
    subject = "Password Reset Request"

    # Create reset link with token
    reset_link = f"{reset_url}?token={reset_token}"

    html_content = f"""
    <html>
    <body>
        <h2>Password Reset Request</h2>
        <p>Hello,</p>
        <p>You requested a password reset for your account. Click the link below to reset your password:</p>
        <p><a href="{reset_link}">Reset Password</a></p>
        <p>If you didn't request this, you can ignore this email.</p>
        <p>The link will expire in 15 minutes.</p>
        <p>Thank you,<br>E-Commerce Team</p>
    </body>
    </html>
    """

    text_content = f"""
    Password Reset Request

    Hello,

    You requested a password reset for your account. Click the link below to reset your password:

    {reset_link}

    If you didn't request this, you can ignore this email.

    The link will expire in 15 minutes.

    Thank you,
    E-Commerce Team
    """

    return await send_email([email], subject, html_content, text_content)


async def send_order_confirmation_email(email: str, order_id: str, order_items: List[dict],
                                        total_amount: float) -> bool:
    """
    Send an order confirmation email
    """
    subject = f"Order Confirmation #{order_id}"

    # Create HTML table for order items
    items_html = ""
    for item in order_items:
        items_html += f"""
        <tr>
            <td>{item['product_name']}</td>
            <td>{item['quantity']}</td>
            <td>${item['price']:.2f}</td>
            <td>${item['quantity'] * item['price']:.2f}</td>
        </tr>
        """

    html_content = f"""
    <html>
    <body>
        <h2>Order Confirmation</h2>
        <p>Hello,</p>
        <p>Thank you for your order! Your order #{order_id} has been received and is being processed.</p>

        <h3>Order Details:</h3>
        <table border="1" cellpadding="5" cellspacing="0">
            <tr>
                <th>Product</th>
                <th>Quantity</th>
                <th>Price</th>
                <th>Subtotal</th>
            </tr>
            {items_html}
            <tr>
                <td colspan="3" align="right"><strong>Total:</strong></td>
                <td><strong>${total_amount:.2f}</strong></td>
            </tr>
        </table>

        <p>You can view your order status by logging into your account.</p>
        <p>Thank you for shopping with us!</p>
        <p>E-Commerce Team</p>
    </body>
    </html>
    """

    text_content = f"""
    Order Confirmation #{order_id}

    Hello,

    Thank you for your order! Your order #{order_id} has been received and is being processed.

    Order Details:
    """

    for item in order_items:
        text_content += f"""
    {item['product_name']} x {item['quantity']} - ${item['price']:.2f} = ${item['quantity'] * item['price']:.2f}
    """

    text_content += f"""
    Total: ${total_amount:.2f}

    You can view your order status by logging into your account.

    Thank you for shopping with us!

    E-Commerce Team
    """

    return await send_email([email], subject, html_content, text_content)