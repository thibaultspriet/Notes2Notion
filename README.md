# Notes2Notion

Take your handwritten notes and push them directly to Notion — effortlessly.

## 🚀 Installation  
Make sure you have uv
 installed.  
Then install the dependencies:

pip install uv  
uv pip install -r pyproject.toml

## 🧠 MCP Server for Notion  
You’ll need to run the MCP Notion server.  
You can use the official Docker image:  
🔗 https://hub.docker.com/r/mcp/notion

## 🧪 Running Tests  
Run the unit tests with:
PYTHONPATH=src pytest -v

## ▶️ Running the App  
Launch the MCP Notion server

Set the following environment variables in your .env file:    
NOTION_TOKEN=<your_notion_token>
NOTION_PAGE_ID=<your_page_id>

Run the main script:  
python main.py

## 💡 Example Workflow  
Write your handy notes  
Take pictures and upload them in "notes_pictures" repo
Launch the main.py script  

## 🧰 Tech Stack  
🐍 Python  
🤖 OpenAI API  
🧱 Notion MCP Server  
🧪 Pytest for testing  