import asyncio

from notes_builder import NotesCreator
from notes_builder import (ImageTextExtractor, McpNotionConnector,
                           DraftEnhancer)


async def main():
    image_text_extractor = ImageTextExtractor("./notes_pictures")
    notion_connexion = McpNotionConnector()
    draft_enhancer = DraftEnhancer()
    try:
        await NotesCreator(notion_connexion, draft_enhancer,
                           image_text_extractor).notes_creation()
    finally:
        await notion_connexion.cleanup()


if __name__ == "__main__":
    asyncio.run(main())
