import os
import sys
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from database import supabase_admin

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

# Load SMTP configs from env variables
SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SMTP_FROM = os.getenv("SMTP_FROM", "no-reply@trinetraedu-ai.com")

def send_warning_email(email, last_sign_in_at):
    subject = "Action Required: Your Trinetra AI account will be deleted in 30 days due to inactivity"
    body = f"""Hi there,

We noticed you haven't logged into your Trinetra AI account since {last_sign_in_at}.

In compliance with our data protection policies (under the DPDP Act 2023), accounts that are inactive for more than 12 months are automatically deleted to safeguard personal data.

To prevent your account, profile data, and AI training models from being permanently deleted, please log into your dashboard within the next 30 days:
https://trinetraedu-ai.com/login

If you log in, your account status will automatically return to active standing.

If you have any questions or require assistance, please reach out to support@trinetraedu-ai.com.

Best regards,
The Trinetra AI Security & Compliance Team
"""
    if SMTP_HOST and SMTP_USER and SMTP_PASSWORD:
        try:
            msg = MIMEMultipart()
            msg['From'] = SMTP_FROM
            msg['To'] = email
            msg['Subject'] = subject
            msg.attach(MIMEText(body, 'plain'))
            
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
                server.starttls()
                server.login(SMTP_USER, SMTP_PASSWORD)
                server.send_message(msg)
            logging.info(f"Successfully sent inactivity warning email to {email}")
            return True
        except Exception as e:
            logging.error(f"Failed to send email to {email} via SMTP: {e}")
            return False
    else:
        # Fallback simulation logging
        log_dir = os.path.join(os.path.dirname(__file__), "..", ".gemini", "logs")
        os.makedirs(log_dir, exist_ok=True)
        log_file = os.path.join(log_dir, "inactivity_warnings_sent.log")
        
        with open(log_file, "a", encoding="utf-8") as f:
            f.write(f"--- WARNING EMAIL SIMULATION: {email} ---\nDate: {last_sign_in_at}\nSubject: {subject}\n{body}\n-------------------------------------------\n")
        
        logging.info(f"[SIMULATED] Email sent to {email}. Simulated dispatch logged to: {log_file}")
        return True

def main():
    logging.info("Checking for inactive users to warn...")
    try:
        res = supabase_admin.rpc("get_inactive_users_to_warn").execute()
        users = res.data or []
        
        if not users:
            logging.info("No inactive users require warning at this time.")
            return
            
        logging.info(f"Found {len(users)} inactive user(s) to warn.")
        for user in users:
            uid = user.get("user_id")
            email = user.get("email")
            last_login = user.get("last_sign_in_at")
            
            logging.info(f"Processing user {email} (UID: {uid}, Last Login: {last_login})")
            if send_warning_email(email, last_login):
                # Mark warning sent in the DB
                supabase_admin.rpc("mark_user_inactivity_warning_sent", {"p_user_id": uid}).execute()
                logging.info(f"Successfully marked warning as sent in database for {email}")
                
    except Exception as e:
        logging.error(f"Error during inactive users warning process: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
