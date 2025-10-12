import base64
import os
import json
from openai import OpenAI
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from contextlib import AsyncExitStack
from typing import Optional

from Notes2Notion import utils


class ImageTextExtractor:
    def __init__(self, repo_path: str):
        self.client = OpenAI()
        self.repo_path = repo_path
        self.text = ""

    def extract_text(self) -> str:
        images_path = utils.get_file_paths(self.repo_path)
        for image_path in images_path:
            with open(image_path, "rb") as f:
                image_base64 = base64.b64encode(f.read()).decode("utf-8")

            prompt_text = ("Extract all text from the provided image."
                           " The text is handwritten and may contain "
                           "abbreviations or imperfect handwriting."
                           "Accurately transcribe what is written."
                           "Expand common abbreviations if you are confident "
                           "about their meaning."
                           "Return only the extracted text, no commentary.")

            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": prompt_text
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/png;base64,{image_base64}"
                                },
                            },
                        ],
                    }
                ],
            )
            self.text = self.text + response.choices[0].message.content
        return self.text


class McpNotionConnector:
    def __init__(self):
        # Initialize session and client objects
        self.session: Optional[ClientSession] = None
        self.exit_stack = AsyncExitStack()

    async def connect_to_server(self):
        notion_token = os.getenv("NOTION_TOKEN")
        if not notion_token:
            raise EnvironmentError(
                "NOTION_TOKEN environment variable not set.")

        headers = json.dumps({
            "Authorization": f"Bearer {notion_token}",
            "Notion-Version": "2022-06-28"
        })

        server_params = StdioServerParameters(
            command="docker",
            args=[
                "run", "--rm", "-i",
                "-e", f"OPENAPI_MCP_HEADERS={headers}",
                "mcp/notion"
            ],
            env=None
        )

        # Store session in self
        stdio, write = await self.exit_stack.enter_async_context(
            stdio_client(server_params))
        self.session = await self.exit_stack.enter_async_context(
            ClientSession(stdio, write))
        await self.session.initialize()

        tools = await self.session.list_tools()
        print("Available tools:", [tool.name for tool in tools.tools])

    async def cleanup(self):
        """Clean up resources"""
        await self.exit_stack.aclose()

