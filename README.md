# Notes2Notion

Take your handwritten notes and push them directly to Notion — effortlessly.

## 📋 Prerequisites

Before you begin, ensure you have the following:

- **[uv](https://docs.astral.sh/uv/getting-started/installation/)** - Python package and project manager
- **[Docker](https://www.docker.com/)** - For running the MCP Notion server
- **OpenAI Account** - With an active API key ([Get one here](https://platform.openai.com/api-keys))
- **Azure Account with Azure AI Foundry** - You need to deploy an LLM with the deployment name `gpt-4-32k-last`
  - ⚠️ **Important**: The original deployment used the `gpt-4-32k` model, which may no longer be available for new deployments. You can deploy any model from the GPT-4 family, but **must keep the deployment name as `gpt-4-32k-last`** for the application to work correctly.
- **Notion Account** - With an internal integration created:
  1. Go to [Notion Integrations](https://www.notion.so/my-integrations)
  2. Create a new internal integration
  3. Copy the **Integration Token** (you'll need this for `NOTION_TOKEN`)
  4. Share the target Notion page with your integration
  5. Copy the **Page ID** from the page URL (you'll need this for `NOTION_PAGE_ID`)

## 🚀 Installation

1. **Pull the MCP Notion Docker image**:
   ```bash
   docker pull mcp/notion
   ```
   Note: You don't need to run a container manually — the application handles this automatically.

2. **Create your virtual environment with uv**:
   ```bash
   uv init
   ```

3. **Install the dependencies**:
   ```bash
   uv pip install -r pyproject.toml
   ```

## ⚙️ Configuration

Create a `.env` file at the root of the project (same level as `.env.example`) with the following variables:

```env
# Notion Configuration
NOTION_TOKEN=your_notion_integration_token
NOTION_PAGE_ID=your_target_page_id

# Azure OpenAI Configuration
AZURE_OPENAI_API_KEY=your_azure_openai_api_key
AZURE_OPENAI_ENDPOINT=your_azure_openai_endpoint

# OpenAI Configuration (for image text extraction)
OPENAI_API_KEY=your_openai_api_key
```

**Variable Details**:
- `NOTION_TOKEN`: The integration token from your Notion internal integration
- `NOTION_PAGE_ID`: The ID of the parent Notion page where notes will be created (found in the page URL)
- `AZURE_OPENAI_API_KEY`: Your Azure OpenAI service API key
- `AZURE_OPENAI_ENDPOINT`: Your Azure OpenAI endpoint URL (e.g., `https://your-resource.openai.azure.com/`)
- `OPENAI_API_KEY`: Your OpenAI API key for the vision model (GPT-4o-mini)

## 🧪 Running Tests

Run the unit tests with (from root of project):
```bash
PYTHONPATH=src uv run pytest -v
```

## ▶️ Running the App

### Test Mode (No LLM Calls) 🧪

**Perfect for development and testing without incurring LLM costs!**

Run the application with mock data instead of real LLM calls:

```bash
PYTHONPATH=src uv run python src/Notes2Notion/main.py --test-mode
```

**What happens in test mode:**
- ✅ Detects images in `notes_pictures/`
- ✅ Generates structured mock content (no GPT-4o-mini calls)
- ✅ Simulates the enhancement workflow (no Azure OpenAI calls)
- ✅ **Actually uploads to Notion** (tests the real Notion integration)
- 💰 **Cost: $0** (zero LLM API calls)

### Normal mode

1. **Add your handwritten notes images**:
   - Place your photos in the `src/Notes2Notion/notes_pictures/` directory
   - Supported formats: PNG, JPG, JPEG

2. **Run the application**:
   ```bash
   PYTHONPATH=src uv run python src/Notes2Notion/main.py
   ```

The application will:
- Extract text from all images in the `notes_pictures` folder
- Structure and enhance the content using AI
- Create a new Notion page with the formatted notes

## 💡 Example Workflow

1. Write your handwritten notes
2. Take photos of your notes
3. Upload the photos to `src/Notes2Notion/notes_pictures/`
4. Run `PYTHONPATH=src uv run python src/Notes2Notion/main.py` from the project root
5. Check your Notion page for the newly created structured notes!

## 🧰 Tech Stack

- 🐍 Python 3.12+
- 🤖 OpenAI API (GPT-4o-mini for vision)
- ☁️ Azure OpenAI (GPT-4 for text processing)
- 🔗 LangChain & LangGraph
- 🧱 Notion MCP Server
- 🧪 Pytest for testing  