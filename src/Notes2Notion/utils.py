import os
from pathlib import Path


def get_file_paths(directory):
    """
    Get a list of all file paths in the specified directory and its subdirectories.

    Args:
        directory (str): Path to the directory to search in

    Returns:
        list: List of absolute file paths

    Raises:
        FileNotFoundError: If the directory does not exist
    """
    file_paths = []

    # Convert to Path object if it's a string
    directory = Path(directory)

    # Check if directory exists
    if not directory.exists():
        raise FileNotFoundError(f"Directory '{directory}' does not exist.")
    
    # Walk through the directory
    for root, _, files in os.walk(directory):
        for file in files:
            # Get the full path of the file
            file_path = Path(root) / file
            file_paths.append(str(file_path.absolute()))
    
    return file_paths


def extract_text_from_file(file_path):
    try:
        # Open the file in read mode
        with open(file_path, 'r', encoding='utf-8') as file:
            # Read the entire content of the file
            content = file.read()
        return content
    except FileNotFoundError:
        return "Error: The file was not found."
    except Exception as e:
        return f"An error occurred: {str(e)}"
