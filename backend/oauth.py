"""
OAuth utilities for Notion integration.

This module handles OAuth token exchange, validation, and session management
for the Notes2Notion application.
"""

import os
import base64
import requests
import jwt
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify
from typing import Optional, Dict, Any

from models import get_user_by_bot_id, create_or_update_user


# Notion OAuth configuration
NOTION_OAUTH_TOKEN_URL = "https://api.notion.com/v1/oauth/token"
NOTION_CLIENT_ID = os.getenv("NOTION_CLIENT_ID")
NOTION_CLIENT_SECRET = os.getenv("NOTION_CLIENT_SECRET")
NOTION_REDIRECT_URI = os.getenv("NOTION_REDIRECT_URI")

# JWT configuration for session tokens
JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24 * 7  # 1 week


def exchange_code_for_token(code: str) -> Dict[str, Any]:
    """
    Exchange authorization code for Notion access token.

    This function implements the OAuth 2.0 authorization code flow with Notion.
    It sends a POST request to Notion's token endpoint with the authorization code
    and receives access_token, refresh_token, and workspace information.

    Args:
        code: Authorization code received from Notion OAuth callback

    Returns:
        dict: Token response containing:
            - access_token: Notion API access token
            - refresh_token: Token for refreshing access
            - bot_id: Unique bot identifier
            - workspace_id: Notion workspace ID
            - workspace_name: Human-readable workspace name
            - owner: Workspace owner information

    Raises:
        Exception: If token exchange fails or Notion API returns an error
    """
    # Validate configuration
    if not NOTION_CLIENT_ID or not NOTION_CLIENT_SECRET:
        raise ValueError("NOTION_CLIENT_ID and NOTION_CLIENT_SECRET must be set")

    # Prepare Basic Authentication header
    credentials = f"{NOTION_CLIENT_ID}:{NOTION_CLIENT_SECRET}"
    encoded_credentials = base64.b64encode(credentials.encode()).decode()

    headers = {
        "Authorization": f"Basic {encoded_credentials}",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }

    payload = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": NOTION_REDIRECT_URI
    }

    # Make request to Notion OAuth endpoint
    response = requests.post(
        NOTION_OAUTH_TOKEN_URL,
        json=payload,
        headers=headers,
        timeout=10
    )

    if response.status_code != 200:
        error_data = response.json()
        raise Exception(f"Notion OAuth error: {error_data.get('error', 'Unknown error')}")

    return response.json()


def create_session_token(bot_id: str) -> str:
    """
    Create a JWT session token for authenticated users.

    This token is returned to the frontend and used for subsequent API requests.
    It contains the user's bot_id and expiration timestamp.

    Args:
        bot_id: Notion bot identifier (unique per workspace integration)

    Returns:
        str: Encoded JWT token
    """
    payload = {
        "bot_id": bot_id,
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS),
        "iat": datetime.utcnow()
    }

    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return token


def verify_session_token(token: str) -> Optional[str]:
    """
    Verify and decode a JWT session token.

    Args:
        token: JWT token string

    Returns:
        str: bot_id if token is valid, None otherwise
    """
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload.get("bot_id")
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def get_current_user_from_token(token: str):
    """
    Get user object from session token.

    Args:
        token: JWT session token

    Returns:
        User: User object if token is valid and user exists, None otherwise
    """
    bot_id = verify_session_token(token)
    if not bot_id:
        return None

    return get_user_by_bot_id(bot_id)


def require_oauth(f):
    """
    Decorator to protect Flask routes with OAuth authentication.

    This decorator replaces the old @require_access_code decorator.
    It validates the JWT session token from the Authorization header,
    retrieves the user from the database, and injects it into the route.

    Usage:
        @app.route('/api/protected')
        @require_oauth
        def protected_route(current_user):
            # current_user is automatically injected
            return jsonify({'user': current_user.workspace_name})

    The decorated function receives a 'current_user' parameter containing
    the User object from the database.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Extract token from Authorization header
        auth_header = request.headers.get('Authorization')

        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Missing or invalid authorization header'}), 401

        token = auth_header[7:]  # Remove "Bearer " prefix

        # Verify token and get user
        current_user = get_current_user_from_token(token)

        if not current_user:
            return jsonify({'error': 'Invalid or expired token'}), 401

        # Inject current_user into the route function
        kwargs['current_user'] = current_user
        return f(*args, **kwargs)

    return decorated_function


def handle_oauth_callback(code: str) -> Dict[str, Any]:
    """
    Complete OAuth flow: exchange code, store user, return session token.

    This is the main function called by the OAuth callback endpoint.
    It orchestrates the entire OAuth flow:
    1. Exchange authorization code for Notion tokens
    2. Store/update user in database
    3. Create session token for frontend

    Args:
        code: Authorization code from Notion OAuth redirect

    Returns:
        dict: Response containing:
            - session_token: JWT for subsequent API requests
            - workspace_name: User's Notion workspace name
            - bot_id: User identifier
            - needs_page_setup: Whether user needs to configure page ID

    Raises:
        Exception: If OAuth exchange or database operations fail
    """
    # Exchange code for Notion tokens
    oauth_response = exchange_code_for_token(code)

    # Extract data from Notion response
    access_token = oauth_response['access_token']
    refresh_token = oauth_response.get('refresh_token')
    bot_id = oauth_response['bot_id']
    workspace_id = oauth_response['workspace_id']
    workspace_name = oauth_response.get('workspace_name')

    # Store or update user in database
    user = create_or_update_user(
        bot_id=bot_id,
        workspace_id=workspace_id,
        access_token=access_token,
        workspace_name=workspace_name,
        refresh_token=refresh_token
    )

    # Create session token for frontend
    session_token = create_session_token(bot_id)

    return {
        'session_token': session_token,
        'workspace_name': workspace_name,
        'bot_id': bot_id,
        'needs_page_setup': user.notion_page_id is None
    }


def refresh_notion_token(user) -> str:
    """
    Refresh a Notion access token using the refresh token.

    Note: This is a placeholder for future implementation.
    Currently, Notion OAuth documentation doesn't specify token expiration,
    so this may not be immediately necessary.

    Args:
        user: User object with refresh_token

    Returns:
        str: New access token

    Raises:
        NotImplementedError: Feature not yet implemented
    """
    raise NotImplementedError("Token refresh not yet implemented")
