import json
from google.genai import types
from config import client, MODEL_NAME

def get_exam_structure(pdf_bytes):
    print("--- Step 1: Extracting Exam Structure ---")
    
    prompt = """
    Analyze this Question Paper PDF.
    Create a structured JSON template representing the hierarchy.
    Output format must be a clean JSON list:
    [
      { "id": "Q1", "sub_parts": ["a", "b"], "max_marks": 15 },
      { "id": "Q2", "sub_parts": [], "max_marks": 5 }
    ]
    RETURN ONLY JSON.
    """

    response = client.models.generate_content(
        model=MODEL_NAME,
        contents=[
            types.Part.from_bytes(data=pdf_bytes, mime_type="application/pdf"),
            prompt
        ],
        config={"response_mime_type": "application/json"}
    )
    
    return json.loads(response.text)