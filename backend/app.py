import asyncio
import os
from pathlib import Path
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
from dotenv import load_dotenv
import sys
import traceback
from functools import wraps

# Load environment variables
load_dotenv(Path(__file__).parent.parent / '.env')

# Add src to path for imports
# In Docker, src is copied to /app/src, and app.py is at /app/app.py
src_path = Path(__file__).parent / "src"
sys.path.insert(0, str(src_path))

from Notes2Notion.notes_builder import NotesCreator, DraftEnhancer
from Notes2Notion.tooling import ImageTextExtractor, McpNotionConnector
from Notes2Notion.mock_components import (MockImageTextExtractor, MockDraftEnhancer,
                                          MockNotesCreator)

# Import OAuth and database modules
from oauth import require_oauth, handle_oauth_callback
from models import init_db, update_user_notion_page

app = Flask(__name__)
CORS(app)  # Enable CORS for Next.js frontend

# Initialize database
init_db()

# Configuration
UPLOAD_FOLDER = Path(__file__).parent / "uploads"
UPLOAD_FOLDER.mkdir(exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def require_access_code(f):
    """
    Decorator to require access code authentication.

    Checks for 'Authorization: Bearer <access_code>' header.
    This will be compatible with future NextAuth migration where
    the Bearer token will be a session token instead of the static access code.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Get the configured access code from environment
        access_code = os.getenv('ACCESS_CODE')

        # If no access code is configured, allow the request (backward compatibility)
        if not access_code:
            print("⚠️  WARNING: No ACCESS_CODE configured. API is unprotected!")
            return f(*args, **kwargs)

        # Get the Authorization header
        auth_header = request.headers.get('Authorization')

        if not auth_header:
            return jsonify({
                'error': 'Unauthorized',
                'message': 'Missing Authorization header'
            }), 401

        # Check format: "Bearer <code>"
        if not auth_header.startswith('Bearer '):
            return jsonify({
                'error': 'Unauthorized',
                'message': 'Invalid Authorization header format. Expected: Bearer <access_code>'
            }), 401

        # Extract the token
        provided_code = auth_header[7:]  # Remove "Bearer " prefix

        # Verify the access code
        if provided_code != access_code:
            return jsonify({
                'error': 'Unauthorized',
                'message': 'Invalid access code'
            }), 401

        # Access code is valid, proceed with the request
        return f(*args, **kwargs)

    return decorated_function


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'Notes2Notion Backend',
        'version': '2.0.0-pwa-oauth'
    })


@app.route('/api/oauth/callback', methods=['POST'])
def oauth_callback():
    """
    Handle Notion OAuth callback.

    Expects JSON body with:
    - code: Authorization code from Notion

    Returns:
    - session_token: JWT token for subsequent requests
    - workspace_name: User's Notion workspace
    - needs_page_setup: Whether user needs to configure default page
    """
    try:
        data = request.get_json()
        code = data.get('code')

        if not code:
            return jsonify({'error': 'Missing authorization code'}), 400

        # Handle OAuth flow: exchange code for token, store user, create session
        result = handle_oauth_callback(code)

        return jsonify(result), 200

    except Exception as e:
        error_trace = traceback.format_exc()
        print(f"\n❌ OAuth callback error:")
        print(error_trace)
        return jsonify({
            'error': 'OAuth authentication failed',
            'message': str(e)
        }), 500


@app.route('/api/user/page-id', methods=['POST'])
@require_oauth
def set_page_id(current_user):
    """
    Set the default Notion page ID for the authenticated user.

    This is where the user's handwritten notes will be created.

    Expects JSON body with:
    - page_id: Notion page ID

    Returns:
    - success: Boolean indicating if update succeeded
    """
    try:
        data = request.get_json()
        page_id = data.get('page_id')

        if not page_id:
            return jsonify({'error': 'Missing page_id'}), 400

        # Update user's default page ID
        update_user_notion_page(current_user.bot_id, page_id)

        return jsonify({
            'success': True,
            'message': 'Default page ID updated successfully'
        }), 200

    except Exception as e:
        error_trace = traceback.format_exc()
        print(f"\n❌ Error updating page ID:")
        print(error_trace)
        return jsonify({
            'error': 'Failed to update page ID',
            'message': str(e)
        }), 500


@app.route('/api/user/info', methods=['GET'])
@require_oauth
def get_user_info(current_user):
    """
    Get information about the authenticated user.

    Returns:
    - workspace_name: User's Notion workspace
    - has_page_id: Whether user has configured a default page
    - bot_id: User identifier
    """
    return jsonify({
        'workspace_name': current_user.workspace_name,
        'has_page_id': current_user.notion_page_id is not None,
        'bot_id': current_user.bot_id
    }), 200


@app.route('/api/notion/search', methods=['POST'])
@require_oauth
def search_notion_pages(current_user):
    """
    Search Notion pages accessible to the user.

    Expects JSON body with:
    - query: Search term (optional, returns all pages if empty)

    Returns:
    - pages: List of pages with id, title, and icon
    """
    try:
        import requests

        data = request.get_json()
        query = data.get('query', '')

        # Prepare request to Notion API
        headers = {
            'Authorization': f'Bearer {current_user.access_token}',
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json'
        }

        body = {
            'filter': {
                'property': 'object',
                'value': 'page'
            }
        }

        if query:
            body['query'] = query

        # Call Notion Search API
        response = requests.post(
            'https://api.notion.com/v1/search',
            headers=headers,
            json=body
        )

        if not response.ok:
            print(f"❌ Notion API error: {response.status_code} - {response.text}")
            return jsonify({
                'error': 'Failed to search Notion pages',
                'message': response.text
            }), response.status_code

        results = response.json()

        # Helper function to normalize Notion IDs (remove dashes for comparison)
        def normalize_id(notion_id):
            if not notion_id:
                return None
            return notion_id.replace('-', '')

        # Format results to return only necessary information
        pages = []
        page_map = {}  # Map of page_id -> page data for parent lookup

        for result in results.get('results', []):
            if result.get('object') == 'page':
                # Extract page title
                title = 'Untitled'
                properties = result.get('properties', {})

                # Try to get title from various possible properties
                for prop_name, prop_value in properties.items():
                    if prop_value.get('type') == 'title':
                        title_array = prop_value.get('title', [])
                        if title_array and len(title_array) > 0:
                            title = title_array[0].get('plain_text', 'Untitled')
                            break

                # Extract icon if present
                icon = None
                if result.get('icon'):
                    if result['icon'].get('type') == 'emoji':
                        icon = result['icon'].get('emoji')
                    elif result['icon'].get('type') == 'external':
                        icon = result['icon'].get('external', {}).get('url')
                    elif result['icon'].get('type') == 'file':
                        icon = result['icon'].get('file', {}).get('url')

                # Extract parent information
                parent_info = result.get('parent', {})
                parent_type = parent_info.get('type')
                parent_id = None

                if parent_type == 'page_id':
                    parent_id = parent_info.get('page_id')
                elif parent_type == 'database_id':
                    parent_id = parent_info.get('database_id')

                page_data = {
                    'id': result.get('id'),
                    'title': title,
                    'icon': icon,
                    'parent_type': parent_type,
                    'parent_id': parent_id
                }

                pages.append(page_data)
                # Store in map with normalized ID for reliable lookup
                page_map[normalize_id(result.get('id'))] = page_data

        # Second pass: resolve parent titles for pages whose parent is in the results
        for page in pages:
            if page['parent_id']:
                # Try to find parent using normalized IDs
                normalized_parent_id = normalize_id(page['parent_id'])
                if normalized_parent_id in page_map:
                    page['parent_title'] = page_map[normalized_parent_id]['title']
                else:
                    page['parent_title'] = None
            else:
                page['parent_title'] = None

        return jsonify({
            'pages': pages,
            'has_more': results.get('has_more', False)
        }), 200

    except Exception as e:
        error_trace = traceback.format_exc()
        print(f"\n❌ Error searching Notion pages:")
        print(error_trace)
        return jsonify({
            'error': 'Failed to search pages',
            'message': str(e)
        }), 500


@app.route('/api/upload', methods=['POST'])
@require_oauth
def upload_file(current_user):
    """
    Upload and process an image to create a Notion page.

    Requires OAuth authentication.
    The authenticated user's Notion token will be used to create the page.

    Form data:
    - photo: The image file
    - test_mode: 'true' or 'false' (optional, default: false)
    """
    # Check if user has configured a default page ID
    if not current_user.notion_page_id:
        return jsonify({
            'error': 'No default page configured',
            'message': 'Please configure a default Notion page via /api/user/page-id'
        }), 400

    # Validate file presence
    if 'photo' not in request.files:
        return jsonify({'error': 'No file part'}), 400

    file = request.files['photo']

    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    # Get test_mode parameter
    test_mode = request.form.get('test_mode', 'false').lower() == 'true'

    if file and allowed_file(file.filename):
        # Create user-specific upload folder to handle concurrency
        user_upload_folder = UPLOAD_FOLDER / current_user.bot_id
        user_upload_folder.mkdir(exist_ok=True)

        # Clean user's upload folder
        for old_file in user_upload_folder.glob('*'):
            if old_file.is_file():
                old_file.unlink()

        # Save new file
        filename = secure_filename(file.filename)
        filepath = user_upload_folder / filename
        file.save(filepath)

        # Process the image and upload to Notion
        try:
            print(f"\n{'='*60}")
            print(f"👤 User: {current_user.workspace_name} (bot_id: {current_user.bot_id})")
            print(f"📸 Processing file: {filepath}")
            print(f"🧪 Test mode: {test_mode}")
            print(f"📄 Target page: {current_user.notion_page_id}")
            print(f"{'='*60}\n")

            result = asyncio.run(
                process_and_upload(
                    str(user_upload_folder),
                    test_mode,
                    current_user.access_token,
                    current_user.notion_page_id
                )
            )

            print(f"\n✅ Processing completed successfully!")

            return jsonify({
                'success': True,
                'message': 'Photo uploaded and processed successfully!',
                'details': result,
                'test_mode': test_mode
            })
        except Exception as e:
            error_trace = traceback.format_exc()
            print(f"\n❌ ERROR during processing:")
            print(error_trace)
            return jsonify({
                'success': False,
                'error': str(e),
                'trace': error_trace
            }), 500

    return jsonify({'error': 'Invalid file type. Allowed: PNG, JPG, JPEG, GIF'}), 400


async def process_and_upload(
    folder_path: str,
    test_mode: bool,
    user_notion_token: str,
    user_notion_page_id: str
):
    """
    Process the uploaded image and create Notion page.

    Args:
        folder_path: Path to the folder containing the image
        test_mode: If True, uses mock components (no LLM calls)
        user_notion_token: User's Notion OAuth access token
        user_notion_page_id: User's default Notion page ID for notes

    Returns:
        Success message string
    """
    notion_connector = McpNotionConnector()

    try:
        if test_mode:
            print("🧪 TEST MODE - Using mock components (zero LLM calls)")
            image_text_extractor = MockImageTextExtractor(folder_path)
            draft_enhancer = MockDraftEnhancer()
            notes_creator = MockNotesCreator(
                notion_connector,
                draft_enhancer,
                image_text_extractor
            )
        else:
            print("🚀 PRODUCTION MODE - Using real LLM components")
            image_text_extractor = ImageTextExtractor(folder_path)
            draft_enhancer = DraftEnhancer()
            notes_creator = NotesCreator(
                notion_connector,
                draft_enhancer,
                image_text_extractor
            )

        await notes_creator.notes_creation(
            user_notion_token=user_notion_token,
            user_notion_page_id=user_notion_page_id
        )

        mode_label = "TEST MODE" if test_mode else "PRODUCTION MODE"
        return f"Successfully created Notion page! ({mode_label})"

    finally:
        await notion_connector.cleanup()


if __name__ == '__main__':
    # Verify OAuth configuration
    required_oauth_vars = ['NOTION_CLIENT_ID', 'NOTION_CLIENT_SECRET']
    missing_oauth_vars = [var for var in required_oauth_vars if not os.getenv(var)]

    if missing_oauth_vars:
        print(f"\n❌ ERROR: Missing OAuth environment variables: {', '.join(missing_oauth_vars)}")
        print("Please check your .env file and configure Notion OAuth credentials")
        sys.exit(1)

    # Check OpenAI configuration
    has_openai = os.getenv('OPENAI_API_KEY')
    has_azure = os.getenv('AZURE_OPENAI_API_KEY') and os.getenv('AZURE_OPENAI_ENDPOINT')

    if not has_openai and not has_azure:
        print("\n❌ ERROR: No OpenAI configuration found")
        print("Please set either OPENAI_API_KEY or (AZURE_OPENAI_API_KEY + AZURE_OPENAI_ENDPOINT)")
        sys.exit(1)

    port = int(os.getenv('BACKEND_PORT', 5001))

    print(f"\n{'='*60}")
    print(f"  Notes2Notion Backend API (OAuth)")
    print(f"{'='*60}")
    print(f"\nAPI Endpoints:")
    print(f"  - GET  http://localhost:{port}/api/health")
    print(f"  - POST http://localhost:{port}/api/oauth/callback")
    print(f"  - GET  http://localhost:{port}/api/user/info")
    print(f"  - POST http://localhost:{port}/api/user/page-id")
    print(f"  - POST http://localhost:{port}/api/notion/search")
    print(f"  - POST http://localhost:{port}/api/upload")
    print(f"\nAuthentication:")
    print(f"  - Method: OAuth 2.0 (Notion)")
    print(f"  - Client ID: {os.getenv('NOTION_CLIENT_ID')}")
    print(f"\nEnvironment:")
    print(f"  - OpenAI: {'✅ Azure' if has_azure else '✅ OpenAI'}")
    print(f"  - Database: ✅ Initialized")
    print(f"  - Upload folder: {UPLOAD_FOLDER}")
    print(f"\n{'='*60}\n")

    app.run(host='0.0.0.0', port=port, debug=True)
