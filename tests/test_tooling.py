import pytest

from unittest.mock import AsyncMock, MagicMock, patch
from Notes2Notion.tooling import McpNotionConnector


@pytest.mark.asyncio
async def test_connect_to_server_success(monkeypatch):
    # Arrange
    connector = McpNotionConnector()

    # Mock environment variable
    monkeypatch.setenv("NOTION_TOKEN", "fake-token")

    # Prepare mocks for async context managers
    mock_client_session = AsyncMock()

    # Mock stdio_client return value
    mock_stdio_client_ctx = AsyncMock()
    mock_stdio_client_ctx.__aenter__.return_value = ("stdio", "write")

    # Mock ClientSession context manager
    mock_client_session_ctx = AsyncMock()
    mock_client_session_ctx.__aenter__.return_value = mock_client_session

    # Patch stdio_client and ClientSession
    with patch("Notes2Notion.tooling.stdio_client",
               return_value=mock_stdio_client_ctx), \
            patch("Notes2Notion.tooling.ClientSession",
                  return_value=mock_client_session_ctx):
        # Mock methods
        mock_client_session.initialize = AsyncMock()
        mock_client_session.list_tools = AsyncMock(return_value=MagicMock(tools=[MagicMock(name="tool1")]))

        # Act
        await connector.connect_to_server()

        # Assert
        mock_client_session.initialize.assert_awaited_once()
        mock_client_session.list_tools.assert_awaited_once()
        assert connector.session == mock_client_session


@pytest.mark.asyncio
async def test_connect_to_server_missing_token(monkeypatch):
    # Arrange
    connector = McpNotionConnector()

    # Ensure NOTION_TOKEN is not set
    monkeypatch.delenv("NOTION_TOKEN", raising=False)

    # Act & Assert
    with pytest.raises(EnvironmentError, match="NOTION_TOKEN environment variable not set"):
        await connector.connect_to_server()


@pytest.mark.asyncio
async def test_cleanup_calls_aclose():
    # Arrange
    connector = McpNotionConnector()
    connector.exit_stack.aclose = AsyncMock()

    # Act
    await connector.cleanup()

    # Assert
    connector.exit_stack.aclose.assert_awaited_once()
