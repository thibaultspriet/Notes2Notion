"""
Database models for Notes2Notion OAuth integration.

This module defines the SQLAlchemy models for storing user OAuth tokens
and workspace information for Notion integration.
"""

from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

Base = declarative_base()


class User(Base):
    """
    User model for storing Notion OAuth credentials and workspace information.

    Each user represents a unique Notion workspace connection authenticated via OAuth.
    """
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, autoincrement=True)

    # Notion OAuth identifiers
    bot_id = Column(String(255), unique=True, nullable=False, index=True)
    workspace_id = Column(String(255), nullable=False)
    workspace_name = Column(String(500))

    # OAuth tokens
    access_token = Column(String(1000), nullable=False)
    refresh_token = Column(String(1000))

    # User's preferred Notion page for notes
    # This is where the user's handwritten notes will be created
    notion_page_id = Column(String(255))

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<User(bot_id='{self.bot_id}', workspace_name='{self.workspace_name}')>"


# Database setup
def get_database_url():
    """
    Get database URL from environment variable or use default SQLite.

    Returns:
        str: Database connection URL
    """
    return os.getenv('DATABASE_URL')


def init_db():
    """
    Initialize the database by creating all tables.

    This function should be called when the application starts.
    """
    engine = create_engine(get_database_url(), echo=False)
    Base.metadata.create_all(engine)
    return engine


def get_session():
    """
    Create and return a new database session.

    Returns:
        Session: SQLAlchemy session object
    """
    engine = create_engine(get_database_url(), echo=False)
    Session = sessionmaker(bind=engine)
    return Session()


def get_user_by_bot_id(bot_id: str):
    """
    Retrieve a user by their Notion bot_id.

    Args:
        bot_id: Notion bot identifier from OAuth response

    Returns:
        User: User object if found, None otherwise
    """
    session = get_session()
    try:
        user = session.query(User).filter_by(bot_id=bot_id).first()
        return user
    finally:
        session.close()


def create_or_update_user(
    bot_id: str,
    workspace_id: str,
    access_token: str,
    workspace_name: str = None,
    refresh_token: str = None,
    notion_page_id: str = None
):
    """
    Create a new user or update existing user with OAuth tokens.

    Args:
        bot_id: Notion bot identifier (unique per integration per workspace)
        workspace_id: Notion workspace identifier
        access_token: OAuth access token
        workspace_name: Human-readable workspace name (optional)
        refresh_token: OAuth refresh token (optional)
        notion_page_id: Default page ID for creating notes (optional)

    Returns:
        User: Created or updated user object
    """
    session = get_session()
    try:
        user = session.query(User).filter_by(bot_id=bot_id).first()

        if user:
            # Update existing user
            user.access_token = access_token
            user.workspace_id = workspace_id
            if workspace_name:
                user.workspace_name = workspace_name
            if refresh_token:
                user.refresh_token = refresh_token
            if notion_page_id:
                user.notion_page_id = notion_page_id
            user.updated_at = datetime.utcnow()
        else:
            # Create new user
            user = User(
                bot_id=bot_id,
                workspace_id=workspace_id,
                workspace_name=workspace_name,
                access_token=access_token,
                refresh_token=refresh_token,
                notion_page_id=notion_page_id
            )
            session.add(user)

        session.commit()
        session.refresh(user)
        return user
    except Exception as e:
        session.rollback()
        raise e
    finally:
        session.close()


def update_user_notion_page(bot_id: str, notion_page_id: str):
    """
    Update the default Notion page ID for a user.

    Args:
        bot_id: User's bot identifier
        notion_page_id: New Notion page ID for creating notes

    Returns:
        User: Updated user object, or None if user not found
    """
    session = get_session()
    try:
        user = session.query(User).filter_by(bot_id=bot_id).first()
        if user:
            user.notion_page_id = notion_page_id
            user.updated_at = datetime.utcnow()
            session.commit()
            session.refresh(user)
        return user
    except Exception as e:
        session.rollback()
        raise e
    finally:
        session.close()
