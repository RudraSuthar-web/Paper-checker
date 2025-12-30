import json
import typing_extensions as typing
from config import client, MODEL_NAME

# Define the Output Schema strictly for the AI
class QuestionResult(typing.TypedDict):
    question_id: str
    marks_obtained: float
    max_marks: int
    feedback: str 

class FinalReportCard(typing.TypedDict):
    student_name: str
    results: list[QuestionResult]
    total_score: float
    remarks: str

def grade_student_paper(student_data, faculty_data):
    print("--- Step 4: Grading Paper ---")

    prompt = f"""
    You are a strict Professor.
    Student Answers: {json.dumps(student_data)}
    Faculty Key: {json.dumps(faculty_data)}

    Grading Rules:
    1. Use max_marks from the structure.
    2. Check for keywords and conceptual clarity.
    3. If description matches diagram requirements, give marks.
    
    Return the Final Report Card JSON.
    """

    response = client.models.generate_content(
        model=MODEL_NAME,
        contents=prompt,
        config={
            "response_mime_type": "application/json",
            "response_schema": FinalReportCard
        }
    )
    
    return json.loads(response.text)