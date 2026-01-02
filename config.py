import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class Config:
    """Application configuration"""
    
    # Flask Configuration
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    FLASK_ENV = os.getenv('FLASK_ENV', 'development')
    FLASK_DEBUG = os.getenv('FLASK_DEBUG', 'True') == 'True'
    
    # Gemini API Configuration
    GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', '')
    MAX_TOKENS_PER_REQUEST = int(os.getenv('MAX_TOKENS_PER_REQUEST', '30000'))
    REQUEST_TIMEOUT = int(os.getenv('REQUEST_TIMEOUT', '60'))
    
    # File Upload Configuration
    BASE_DIR = os.path.abspath(os.path.dirname(__file__))
    UPLOAD_FOLDER = os.path.join(BASE_DIR, os.getenv('UPLOAD_FOLDER', 'uploads'))
    CACHE_DIR = os.path.join(BASE_DIR, os.getenv('CACHE_DIR', 'cache'))
    EXPORT_DIR = os.path.join(BASE_DIR, os.getenv('EXPORT_DIR', 'exports'))
    MAX_FILE_SIZE_MB = int(os.getenv('MAX_FILE_SIZE_MB', '50'))
    MAX_CONTENT_LENGTH = MAX_FILE_SIZE_MB * 1024 * 1024  # Convert to bytes
    ALLOWED_EXTENSIONS = set(os.getenv('ALLOWED_EXTENSIONS', 'pdf,epub,docx,txt').split(','))
    
    # Cache Configuration
    ENABLE_CACHE = os.getenv('ENABLE_CACHE', 'True') == 'True'
    
    # Create necessary directories
    @staticmethod
    def init_app():
        """Initialize application directories"""
        for directory in [Config.UPLOAD_FOLDER, Config.CACHE_DIR, Config.EXPORT_DIR]:
            os.makedirs(directory, exist_ok=True)
            # Create .gitkeep file
            gitkeep_path = os.path.join(directory, '.gitkeep')
            if not os.path.exists(gitkeep_path):
                open(gitkeep_path, 'a').close()
