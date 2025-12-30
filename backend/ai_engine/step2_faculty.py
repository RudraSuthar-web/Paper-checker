import json
from google.genai import types
from config import client, MODEL_NAME

def create_faculty_key(exam_structure, solution_pdf_bytes):
    print("--- Step 2: Creating Faculty Key ---")

    prompt = f"""
    You are an Academic Expert.
    Exam Structure: {json.dumps(exam_structure)}

    Task:
    1. Analyze the Faculty Solution PDF.
    2. Map solutions to the Question IDs in the structure.
    3. Include "keywords" (3-5 critical terms).
    4. If a diagram is needed, add text: "[DIAGRAM REQUIRED: description]".

    Return a JSON list matching the exam structure.
    """

    response = client.models.generate_content(
        model=MODEL_NAME,
        contents=[
            types.Part.from_bytes(data=solution_pdf_bytes, mime_type="application/pdf"),
            prompt
        ],
        config={"response_mime_type": "application/json"}
    )
    
    return json.loads(response.text)