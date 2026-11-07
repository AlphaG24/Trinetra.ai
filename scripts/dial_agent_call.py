"""
Trinetra AI - Real Call Diagnostic & Dialing Utility
Place real voice calls to test agent features, VAD, latency, tools, and audio quality.

Modes supported:
1. --mobile : Generates a mobile link with terminal QR code to test on your real smartphone hardware.
2. --sip    : Rings a free SIP softphone (e.g. Zoiper, Linphone on your phone) via LiveKit SIP.
3. --phone  : Dials a real telephone number via configured telephony provider (Twilio / Exotel / Sarvam).
"""

import os
import sys
import argparse
import socket
import json
import asyncio
from dotenv import load_dotenv

# Load environment configs
load_dotenv('backend/.env')
load_dotenv('frontend/.env.local')
load_dotenv('.env')

def get_local_ip() -> str:
    """Find the local machine IP on Wi-Fi/LAN so your smartphone can open it."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

def print_ascii_qr(url: str):
    """Prints a terminal QR code if qrcode package is available, or instructions."""
    try:
        import qrcode
        qr = qrcode.QRCode(border=1)
        qr.add_data(url)
        qr.make(fit=True)
        qr.print_ascii(invert=True)
    except ImportError:
        print(f"  [Tip] Install qrcode (`pip install qrcode`) to see a scannable QR code right in your terminal.")

async def run_sip_call(sip_uri: str, agent_id: str, room_name: str | None = None):
    """Initiates a SIP call to ring a softphone app (Zoiper/Linphone) via LiveKit SIP."""
    from livekit import api
    from livekit.protocol.sip import CreateSIPParticipantRequest

    lk_url = os.getenv("LIVEKIT_URL")
    lk_key = os.getenv("LIVEKIT_API_KEY")
    lk_sec = os.getenv("LIVEKIT_API_SECRET")
    trunk_id = os.getenv("LIVEKIT_SIP_TRUNK_ID")

    if not lk_url or not lk_key or not lk_sec:
        print("❌ Error: Missing LIVEKIT_URL, LIVEKIT_API_KEY, or LIVEKIT_API_SECRET in backend/.env")
        return

    room = room_name or f"room-sip-{int(asyncio.get_event_loop().time())}"
    print(f"\n📡 Connecting LiveKit SIP to '{sip_uri}'...")
    print(f"   Room Name : {room}")
    print(f"   Agent ID  : {agent_id}")

    try:
        lk = api.LiveKitAPI(lk_url, lk_key, lk_sec)
        # Check if SIP trunk is defined
        if trunk_id:
            req = CreateSIPParticipantRequest(
                sip_trunk_id=trunk_id,
                sip_call_to=sip_uri,
                room_name=room,
                participant_identity=f"caller_{sip_uri.replace('@', '_')}",
                participant_name="SIP Caller"
            )
            await lk.sip.create_sip_participant(req)
            print(f"✅ SIP participant created! Your phone softphone should be ringing now.")
        else:
            print("⚠️ LIVEKIT_SIP_TRUNK_ID is not configured in backend/.env.")
            print("   To ring a SIP phone directly, create an outbound trunk in LiveKit Cloud console.")
        await lk.aclose()
    except Exception as e:
        print(f"❌ Failed to dispatch SIP call: {e}")

async def run_phone_call(phone_number: str, agent_id: str):
    """Attempts to dial a real PSTN number via Twilio, Exotel, or Sarvam."""
    print(f"\n📞 Checking telephony providers for dialing {phone_number}...")

    # 1. Check Twilio
    tw_sid = os.getenv("TWILIO_ACCOUNT_SID")
    tw_tok = os.getenv("TWILIO_AUTH_TOKEN")
    tw_from = os.getenv("TWILIO_PHONE_NUMBER")
    if tw_sid and tw_tok and tw_from:
        print("   Found active Twilio credentials. Dispatching call...")
        from app.services.telephony.twilio import TwilioProvider
        provider = TwilioProvider()
        res = await provider.make_call(phone_number, tw_from, agent_id=agent_id)
        print("   Twilio call initiated:", res)
        return

    # 2. Check Exotel
    exo_sid = os.getenv("EXOTEL_ACCOUNT_SID")
    exo_key = os.getenv("EXOTEL_API_KEY")
    exo_tok = os.getenv("EXOTEL_API_TOKEN")
    if exo_sid and exo_key and exo_tok:
        print("   Found active Exotel credentials. Dispatching call...")
        from app.services.telephony.exotel_adapter import ExotelAdapter
        provider = ExotelAdapter()
        res = await provider.make_call(phone_number, os.getenv("EXOTEL_VIRTUAL_NUMBER", ""), agent_id=agent_id)
        print("   Exotel call initiated:", res)
        return

    # 3. Check Sarvam Outbound
    sarvam_key = os.getenv("SARVAM_API_KEY")
    if sarvam_key:
        print("   Notice: Sarvam API Key is present for TTS/STT, but PSTN dialing requires Sarvam Outbound Campaign service or an Indian SIP gateway.")

    print("\n❌ No active telephony carrier configured (Twilio, Exotel, or SIP Trunk).")
    print("   To test real voice interactions without credit cards or company registration:")
    print("   👉 Run: python scripts/dial_agent_call.py --mobile")
    print("      This opens your running agent directly on your smartphone over 4G/Wi-Fi.")

def main():
    parser = argparse.ArgumentParser(description="Trinetra Voice Agent Real Call Diagnostic Utility")
    parser.add_argument("--mobile", action="store_true", help="Generate real smartphone WebRTC test link (no carrier needed)")
    parser.add_argument("--sip", type=str, help="Dial a SIP address / softphone app on your phone (e.g. user@linphone.org)")
    parser.add_argument("--phone", type=str, help="Dial a real mobile/landline number via telephony gateway")
    parser.add_argument("--agent", type=str, default="dd4da4c1-9deb-4047-8927-5e12402e6b1f", help="Agent UUID (defaults to Shubh)")
    args = parser.parse_args()

    local_ip = get_local_ip()
    mobile_url = f"http://{local_ip}:3000/dashboard/agents/{args.agent}"

    if args.sip:
        asyncio.run(run_sip_call(args.sip, args.agent))
    elif args.phone:
        asyncio.run(run_phone_call(args.phone, args.agent))
    else:
        # Default or --mobile mode
        print("\n" + "=" * 65)
        print("📲 REAL SMARTPHONE VOICE AGENT TESTING (₹0, NO KYC, NO CARRIER)")
        print("=" * 65)
        print(f"\n1. Make sure your smartphone is connected to the same Wi-Fi / Hotspot.")
        print(f"2. Open your smartphone browser (Chrome on Android / Safari on iPhone):")
        print(f"\n   👉 \033[1;36m{mobile_url}\033[0m\n")
        print_ascii_qr(mobile_url)
        print(f"3. Tap 'Call Agent':")
        print(f"   - Tests your phone's real microphone, noise cancellation, and speaker.")
        print(f"   - Tests real mobile acoustic latency, VAD, and voice clarity.")
        print(f"   - Full brain RAG, database booking, leads, and transcripts work live.\n")
        print("=" * 65)

if __name__ == "__main__":
    main()

