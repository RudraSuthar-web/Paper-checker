import os
from google import genai

# Setup API Key (Best practice: use environment variables, but this works for now)
API_KEY = os.getenv("GEMINI_API_KEY", "AIzaSyDB64I194gsLOpL-Jc9FMPK_pT7n6VVdaM")

# Initialize Client once here to import elsewhere
client = genai.Client(api_key=API_KEY)

# Model configuration
MODEL_NAME = "gemini-2.5-flash" # Upgraded to 2.0 Flash (faster/better)