import json
from google.genai import types
from config import client, MODEL_NAME

def extract_student_answers(exam_structure, student_pdf_bytes):
    print("--- Step 3: Extracting Student Answers ---")

    prompt = f"""
    You are an Answer Extractor.
    Exam Structure: {json.dumps(exam_structure)}

    Task:
    1. Extract student text for each Question ID.
    2. If skipped, set "status": "unanswered".
    3. If answered, put text in "extracted_text".

    Return JSON filled with student data.
    """

    response = client.models.generate_content(
        model=MODEL_NAME,
        contents=[
            types.Part.from_bytes(data=student_pdf_bytes, mime_type="application/pdf"),
            prompt
        ],
        config={"response_mime_type": "application/json"}
    )
    
    return json.loads(response.text)