import smtplib
from email.message import EmailMessage

from flask import current_app


def send_password_reset_email(to_email: str, reset_url: str) -> None:
    host = current_app.config.get("SMTP_HOST")
    if not host:
        current_app.logger.info("Password reset link for %s: %s", to_email, reset_url)
        return

    message = EmailMessage()
    message["Subject"] = "Reset your Webmius password"
    message["From"] = current_app.config["SMTP_FROM_ADDRESS"]
    message["To"] = to_email
    message.set_content(
        "A password reset was requested for your Webmius account.\n\n"
        f"Reset your password: {reset_url}\n\n"
        "This link expires in 60 minutes. If you didn't request this, you can ignore this email."
    )

    with smtplib.SMTP(host, current_app.config["SMTP_PORT"]) as server:
        if current_app.config.get("SMTP_USE_TLS", True):
            server.starttls()
        username = current_app.config.get("SMTP_USERNAME")
        if username:
            server.login(username, current_app.config["SMTP_PASSWORD"])
        server.send_message(message)
