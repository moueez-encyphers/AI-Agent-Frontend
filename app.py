import os
import uuid
from datetime import datetime, timedelta
from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from livekit.api.access_token import AccessToken, VideoGrants

load_dotenv()

# LiveKit configuration
LIVEKIT_URL = os.getenv("LIVEKIT_URL")
LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET")
SECRET_KEY = os.getenv("SECRET_KEY")
ALLOWED_ORIGINS = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "").split(",") if o.strip()]
print(f"Allowed Origins: {ALLOWED_ORIGINS}")

app = Flask(__name__)

# Enable CORS for all routes - CRITICAL for widget embedding
CORS(app, resources={
    r"/*": {
        "origins": ALLOWED_ORIGINS,
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type"]
    }
})
# "origins": ["https://pink-raccoon-371159.hostingersite.com", "http://127.0.0.1:5010"]


def make_token(identity: str, room: str, permissions: dict = None) -> str:
    """Generate a LiveKit access token"""
    if not LIVEKIT_API_KEY or not LIVEKIT_API_SECRET:
        raise ValueError("LiveKit API key and secret are required")

    token = AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
    token.with_identity(identity).with_name(identity)

    # Set expiration
    token.with_ttl(timedelta(hours=6))

    # Configure permissions
    default_permissions = {
        'room_join': True,
        'can_publish': True,
        'can_subscribe': True,
        'can_publish_data': True,
        'room_admin': False,
        'room_create': False
    }

    if permissions:
        default_permissions.update(permissions)

    grants = VideoGrants(
        room=room,
        room_join=default_permissions['room_join'],
        can_publish=default_permissions['can_publish'],
        can_subscribe=default_permissions['can_subscribe'],
        can_publish_data=default_permissions['can_publish_data'],
        room_admin=default_permissions['room_admin'],
        room_create=default_permissions['room_create']
    )

    token.with_grants(grants)
    return token.to_jwt()


@app.route("/")
def index():
    """Serve the demo page with embedded widget"""
    return send_from_directory('templates', 'index.html')


@app.route("/widget.js")
def widget():
    """Serve the widget JavaScript file with proper headers"""
    try:
        response = send_from_directory('static', 'widget.js')
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Content-Type'] = 'application/javascript'
        response.headers['Cache-Control'] = 'public, max-age=3600'
        return response
    except Exception as e:
        return jsonify({"error": str(e)}), 404


@app.route("/get_token", methods=['GET', 'OPTIONS'])
def get_token():
    """Generate a token for widget users"""

    # Handle preflight CORS request
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
        return response, 200

    origin = request.headers.get("Origin")
    api_key = request.headers.get("X-API-Key")
    # host = request.headers.get("Host")
    # user_agent = request.headers.get("User-Agent", "").lower()

    # allowed_hosts = [
    #     "ai-agent-frontend-coral.vercel.app",
    # ]

    # is_browser = bool(origin) or ("mozilla" in user_agent or "chrome" in user_agent)

    # if (
    #     # Case 1: Allowed production Origin (e.g. your WordPress site)
    #     (origin in ALLOWED_ORIGINS)
    #     # Case 2: Allowed Host (your Vercel app)
    #     or (not origin and host in allowed_hosts and is_browser)
    #     # Case 3: Local development (when no Origin header)
    #     or (not origin and (request.host.startswith("127.0.0.1")))
    #     # Case 4: Postman or backend requests with API key
    #     or (api_key == SECRET_KEY)
    # ):
    #     print(f"✅ Authorized | Origin: {origin} | Host: {host}")
    # else:
    #     print(f"❌ Unauthorized | Origin: {origin} | Host: {host} | API: {api_key}")
    #     return jsonify({"error": "Unauthorized origin or missing API key"}), 403

    # 1️ Allow calls from trusted browser origins
    allowed = False
    if origin in ALLOWED_ORIGINS:
        allowed = True

    # 2️ Allow Postman/curl only if they include a valid key
    elif api_key == SECRET_KEY:
        allowed = True

    # Allow local development calls (no origin header)
    elif (not origin and (request.host.startswith("127.0.0.1"))):
        allowed = True

    if not allowed:
        print(f"❌ Unauthorized request | Origin: {origin} | API Key: {api_key} | Host: {request.host}")
        return jsonify({
            "success": False,
            "error": f"Unauthorized request | Origin: {origin} | API Key: {api_key} | Host: {request.host}"
        }), 403

    try:
        # Get parameters
        room = request.args.get('room', f'widget-room-{uuid.uuid4().hex[:8]}')
        identity = request.args.get('identity', f"user-{uuid.uuid4().hex[:6]}")

        # Generate token
        token = make_token(identity, room)

        response_data = {
            "success": True,
            "url": LIVEKIT_URL,
            "token": token,
            "room": room,
            "identity": identity,
            "expires_in": "6 hours",
            "generated_at": datetime.now().isoformat()
        }

        print(f"🎫 Token generated: {identity} -> {room}")

        response = jsonify(response_data)
        # response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        return response

    except Exception as e:
        print(f"❌ Error generating token: {str(e)}")
        error_response = jsonify({
            "success": False,
            "error": str(e),
            "message": "Failed to generate token"
        })
        # error_response.headers['Access-Control-Allow-Origin'] = '*'
        return error_response, 500


@app.route("/health", methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "livekit_url": LIVEKIT_URL,
        "api_configured": bool(LIVEKIT_API_KEY and LIVEKIT_API_SECRET),
        "timestamp": datetime.now().isoformat()
    })


# Error handlers with CORS headers
@app.errorhandler(404)
def not_found(e):
    response = jsonify({'error': 'Not found'})
    # response.headers['Access-Control-Allow-Origin'] = '*'
    return response, 404


@app.errorhandler(500)
def internal_error(e):
    response = jsonify({'error': 'Internal server error'})
    # response.headers['Access-Control-Allow-Origin'] = '*'
    return response, 500


if __name__ == "__main__":
    print("🚀 LiveKit Voice Agent Widget Server")
    print(f"🔗 LiveKit URL: {LIVEKIT_URL}")
    print(f"🔑 API Key: {'✅ Configured' if LIVEKIT_API_KEY else '❌ Missing'}")
    print(f"🔐 API Secret: {'✅ Configured' if LIVEKIT_API_SECRET else '❌ Missing'}")
    print("-" * 50)

    if not LIVEKIT_API_KEY or not LIVEKIT_API_SECRET:
        print("⚠️  WARNING: LiveKit credentials not configured!")
        print("Set LIVEKIT_API_KEY and LIVEKIT_API_SECRET in your .env file")

    app.run(host="0.0.0.0", port=5030)
