import os
from utils import save_json, load_json
from steps.step1_structure import get_exam_structure
from steps.step2_faculty import create_faculty_key
from steps.step3_student import extract_student_answers
from steps.step4_grading import grade_student_paper

def main():
    # --- SIMULATING FRONTEND INPUTS ---
    # In a real app, these paths would come from user uploads
    question_pdf_path = "dbms-4-que.pdf"
    faculty_pdf_path = "faculty_sol.pdf"
    student_pdf_path = "dbms-sol-4.pdf"

    # Load Files as Bytes (Binary)
    try:
        with open(question_pdf_path, "rb") as f: q_bytes = f.read()
        with open(faculty_pdf_path, "rb") as f: f_bytes = f.read()
        with open(student_pdf_path, "rb") as f: s_bytes = f.read()
    except FileNotFoundError as e:
        print(f"❌ Error loading files: {e}")
        return

    # --- EXECUTE PIPELINE ---

    # 1. Get Structure
    structure = get_exam_structure(q_bytes)
    save_json(structure, "output_1_structure.json")

    # 2. Create Key
    faculty_key = create_faculty_key(structure, f_bytes)
    save_json(faculty_key, "output_2_faculty_key.json")

    # 3. Extract Student Answers
    student_answers = extract_student_answers(structure, s_bytes)
    save_json(student_answers, "output_3_student_extracted.json")

    # 4. Grade It
    final_report = grade_student_paper(student_answers, faculty_key)
    save_json(final_report, "output_4_FINAL_REPORT.json")

    print("\n✅ Grading Complete! Check output_4_FINAL_REPORT.json")

if __name__ == "__main__":
    main()