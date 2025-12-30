import os
import json
import uuid
from functools import wraps
from flask import Flask, request, jsonify, session, send_from_directory, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash

# Import AI Logic
from ai_engine.step1_structure import get_exam_structure
from ai_engine.step2_faculty import create_faculty_key
from ai_engine.step3_student import extract_student_answers
from ai_engine.step4_grading import grade_student_paper

# Import database functions
from database import (
    get_all_assignments, get_assignment_by_id, create_assignment,
    get_all_submissions, get_submission_by_id, get_submissions_by_assignment,
    get_submissions_by_student, create_submission, update_submission,
    get_all_papers, get_paper_by_id, get_papers_by_teacher, create_paper
)

app = Flask(__name__)

# Enable CORS for all routes
CORS(app, 
     supports_credentials=True,
     origins=['http://127.0.0.1:5500', 'http://localhost:5500', 
              'http://127.0.0.1:5000', 'http://localhost:5000',
              'http://localhost:3000'],
     allow_headers=['Content-Type', 'Authorization'],
     methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])

app.secret_key = 'super_secret_key_for_demo_change_in_production'

# Configuration
BASE_DIR = os.path.dirname(__file__)
PROJECT_ROOT = os.path.dirname(BASE_DIR)
FRONTEND_DIR = os.path.join(PROJECT_ROOT, 'frontend')
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
OUTPUT_FOLDER = os.path.join(BASE_DIR, 'outputs')
USER_DB_FILE = os.path.join(BASE_DIR, 'users.json')

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

ALLOWED_EXTENSIONS = {'pdf'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# --- USER MANAGEMENT HELPER FUNCTIONS ---
def load_users():
    if not os.path.exists(USER_DB_FILE):
        return {}
    with open(USER_DB_FILE, 'r') as f:
        return json.load(f)

def save_users(users):
    with open(USER_DB_FILE, 'w') as f:
        json.dump(users, f, indent=4)

def require_auth(required_role=None):
    """Decorator to require authentication"""
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            if 'username' not in session:
                return jsonify({"error": "Authentication required"}), 401
            if required_role and session.get('role') != required_role:
                return jsonify({"error": "Insufficient permissions"}), 403
            return f(*args, **kwargs)
        return wrapper
    return decorator

# ========== AUTHENTICATION API ==========

@app.route('/api/auth/register', methods=['POST'])
def api_register():
    """Register a new user"""
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        role = data.get('role')
        name = data.get('name', username)
        department = data.get('department', '')
        branch = data.get('branch', '')
        semester = data.get('semester', '')

        if not username or not password or not role:
            return jsonify({"success": False, "error": "Missing required fields"}), 400

        if role not in ['faculty', 'student']:
            return jsonify({"success": False, "error": "Invalid role"}), 400

        users = load_users()

        if username in users:
            return jsonify({"success": False, "error": "Username already exists"}), 400

        # Create new user
        user_id = f"u_{int(uuid.uuid4().int % 1e10)}"
        users[username] = {
            "id": user_id,
            "username": username,
            "password": generate_password_hash(password),
            "role": role,
            "name": name,
            "department": department,
            "branch": branch,
            "semester": semester
        }
        save_users(users)

        return jsonify({
            "success": True,
            "user": {
                "id": user_id,
                "username": username,
                "role": role,
                "name": name
            }
        }), 201

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/auth/login', methods=['POST'])
def api_login():
    """Login user"""
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        role = data.get('role')

        if not username or not password:
            return jsonify({"success": False, "error": "Missing credentials"}), 400

        users = load_users()

        if username not in users:
            return jsonify({"success": False, "error": "Invalid credentials"}), 401

        user = users[username]
        if not check_password_hash(user['password'], password):
            return jsonify({"success": False, "error": "Invalid credentials"}), 401

        if role and user['role'] != role:
            return jsonify({"success": False, "error": "Role mismatch"}), 401

        # Set session
        session['username'] = username
        session['user_id'] = user.get('id', username)
        session['role'] = user['role']

        return jsonify({
            "success": True,
            "user": {
                "id": user.get('id', username),
                "username": username,
                "role": user['role'],
                "name": user.get('name', username)
            }
        }), 200

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/auth/logout', methods=['POST'])
def api_logout():
    """Logout user"""
    session.clear()
    return jsonify({"success": True}), 200

@app.route('/api/auth/current', methods=['GET'])
def api_current_user():
    """Get current user"""
    if 'username' not in session:
        return jsonify({"success": False, "error": "Not authenticated"}), 401

    users = load_users()
    username = session['username']
    if username not in users:
        session.clear()
        return jsonify({"success": False, "error": "User not found"}), 404

    user = users[username]
    return jsonify({
        "success": True,
        "user": {
            "id": user.get('id', username),
            "username": username,
            "role": user['role'],
            "name": user.get('name', username)
        }
    }), 200

# ========== ASSIGNMENT API ==========

@app.route('/api/faculty/create-assignment', methods=['POST'])
@require_auth('faculty')
def api_create_assignment():
    """Create a new assignment"""
    try:
        if 'question_pdf' not in request.files or 'faculty_solution_pdf' not in request.files:
            return jsonify({"success": False, "error": "Missing PDF files"}), 400

        q_file = request.files['question_pdf']
        s_file = request.files['faculty_solution_pdf']
        title = request.form.get('title', 'Untitled Assignment')
        subject = request.form.get('subject', '')
        description = request.form.get('description', '')
        deadline = request.form.get('deadline', '')

        if not allowed_file(q_file.filename) or not allowed_file(s_file.filename):
            return jsonify({"success": False, "error": "Only PDF files allowed"}), 400

        # Save files
        assignment_id = f"asg_{int(uuid.uuid4().int % 1e10)}"
        q_filename = f"{assignment_id}_question.pdf"
        s_filename = f"{assignment_id}_solution.pdf"
        
        q_path = os.path.join(UPLOAD_FOLDER, q_filename)
        s_path = os.path.join(UPLOAD_FOLDER, s_filename)
        
        q_file.save(q_path)
        s_file.save(s_path)

        # Extract structure from question paper
        try:
            with open(q_path, "rb") as f:
                q_bytes = f.read()
            structure = get_exam_structure(q_bytes)
        except Exception as e:
            return jsonify({"success": False, "error": f"Failed to process question paper: {str(e)}"}), 500

        # Create assignment
        assignment = {
            "id": assignment_id,
            "title": title,
            "subject": subject,
            "description": description,
            "deadline": deadline,
            "teacherId": session.get('user_id', session.get('username')),
            "questionPdf": q_filename,
            "solutionPdf": s_filename,
            "structure": structure,
            "questions": structure if isinstance(structure, list) else []
        }

        created_assignment = create_assignment(assignment)

        return jsonify({
            "success": True,
            "assignment": created_assignment
        }), 201

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/assignments', methods=['GET'])
@require_auth()
def api_get_assignments():
    """Get all assignments"""
    try:
        assignments = get_all_assignments()
        return jsonify({
            "success": True,
            "assignments": assignments
        }), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/assignments/<assignment_id>', methods=['GET'])
@require_auth()
def api_get_assignment(assignment_id):
    """Get assignment by ID"""
    try:
        assignment = get_assignment_by_id(assignment_id)
        if not assignment:
            return jsonify({"success": False, "error": "Assignment not found"}), 404
        return jsonify({
            "success": True,
            "assignment": assignment
        }), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# ========== SUBMISSION API ==========

@app.route('/api/student/submit-assignment', methods=['POST'])
@require_auth('student')
def api_submit_assignment():
    """Submit an assignment"""
    try:
        if 'sub_pdf' not in request.files:
            return jsonify({"success": False, "error": "Missing submission PDF"}), 400

        sub_file = request.files['sub_pdf']
        assignment_id = request.form.get('assignment_id')
        student_id = session.get('user_id', session.get('username'))

        if not assignment_id:
            return jsonify({"success": False, "error": "Missing assignment ID"}), 400

        if not allowed_file(sub_file.filename):
            return jsonify({"success": False, "error": "Only PDF files allowed"}), 400

        # Get assignment
        assignment = get_assignment_by_id(assignment_id)
        if not assignment:
            return jsonify({"success": False, "error": "Assignment not found"}), 404

        # Save submission file
        submission_id = f"sub_{int(uuid.uuid4().int % 1e10)}"
        sub_filename = f"{submission_id}_student.pdf"
        sub_path = os.path.join(UPLOAD_FOLDER, sub_filename)
        sub_file.save(sub_path)

        # Get question paper and solution
        q_path = os.path.join(UPLOAD_FOLDER, assignment['questionPdf'])
        s_path = os.path.join(UPLOAD_FOLDER, assignment['solutionPdf'])

        if not os.path.exists(q_path) or not os.path.exists(s_path):
            return jsonify({"success": False, "error": "Assignment files not found"}), 500

        # Run AI grading
        try:
            with open(q_path, "rb") as f:
                q_bytes = f.read()
            with open(s_path, "rb") as f:
                s_bytes = f.read()
            with open(sub_path, "rb") as f:
                student_bytes = f.read()

            structure = assignment.get('structure', get_exam_structure(q_bytes))
            faculty_key = create_faculty_key(structure, s_bytes)
            student_answers = extract_student_answers(structure, student_bytes)
            grading_result = grade_student_paper(student_answers, faculty_key)

            # Calculate total marks
            total_marks = grading_result.get('total_score', 0)
            max_marks = sum(q.get('max_marks', 0) for q in structure if isinstance(q, dict))

            # Create submission record
            submission = {
                "id": submission_id,
                "assignmentId": assignment_id,
                "studentId": student_id,
                "submissionPdf": sub_filename,
                "aiResult": {
                    "totalMarks": total_marks,
                    "maxMarks": max_marks,
                    "grade": _calculate_grade(total_marks, max_marks),
                    "plagiarismPercentage": 0,  # Can be enhanced later
                    "feedback": grading_result.get('remarks', ''),
                    "detailedResults": grading_result.get('results', [])
                },
                "status": "graded"
            }

            created_submission = create_submission(submission)

            return jsonify({
                "success": True,
                "result": created_submission
            }), 201

        except Exception as e:
            import traceback
            traceback.print_exc()
            return jsonify({"success": False, "error": f"Grading failed: {str(e)}"}), 500

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/submissions', methods=['GET'])
@require_auth()
def api_get_submissions():
    """Get submissions - filtered by role"""
    try:
        role = session.get('role')
        user_id = session.get('user_id', session.get('username'))

        if role == 'student':
            submissions = get_submissions_by_student(user_id)
        elif role == 'faculty':
            # Get all submissions for assignments created by this teacher
            assignments = get_all_assignments()
            teacher_assignments = [a['id'] for a in assignments if a.get('teacherId') == user_id]
            all_subs = get_all_submissions()
            submissions = [s for s in all_subs if s.get('assignmentId') in teacher_assignments]
        else:
            submissions = []

        return jsonify({
            "success": True,
            "submissions": submissions
        }), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/submissions/<submission_id>', methods=['GET'])
@require_auth()
def api_get_submission(submission_id):
    """Get submission by ID"""
    try:
        submission = get_submission_by_id(submission_id)
        if not submission:
            return jsonify({"success": False, "error": "Submission not found"}), 404

        # Check permissions
        role = session.get('role')
        user_id = session.get('user_id', session.get('username'))
        
        if role == 'student' and submission.get('studentId') != user_id:
            return jsonify({"success": False, "error": "Access denied"}), 403

        return jsonify({
            "success": True,
            "submission": submission
        }), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/assignments/<assignment_id>/submissions', methods=['GET'])
@require_auth('faculty')
def api_get_assignment_submissions(assignment_id):
    """Get all submissions for an assignment"""
    try:
        submissions = get_submissions_by_assignment(assignment_id)
        return jsonify({
            "success": True,
            "submissions": submissions
        }), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# ========== PAPER CHECK API (Separate Feature) ==========

@app.route('/api/faculty/check-paper', methods=['POST'])
@require_auth('faculty')
def api_check_paper():
    """Check a paper (Paper Check feature - teachers only)"""
    try:
        if 'question_pdf' not in request.files or 'answer_pdf' not in request.files:
            return jsonify({"success": False, "error": "Missing PDF files"}), 400

        q_file = request.files['question_pdf']
        a_file = request.files['answer_pdf']

        if not allowed_file(q_file.filename) or not allowed_file(a_file.filename):
            return jsonify({"success": False, "error": "Only PDF files allowed"}), 400

        # Save files temporarily
        paper_id = f"paper_{int(uuid.uuid4().int % 1e10)}"
        q_filename = f"{paper_id}_question.pdf"
        a_filename = f"{paper_id}_answer.pdf"
        
        q_path = os.path.join(UPLOAD_FOLDER, q_filename)
        a_path = os.path.join(UPLOAD_FOLDER, a_filename)
        
        q_file.save(q_path)
        a_file.save(a_path)

        # Run AI grading
        try:
            with open(q_path, "rb") as f:
                q_bytes = f.read()
            with open(a_path, "rb") as f:
                a_bytes = f.read()

            structure = get_exam_structure(q_bytes)
            # For paper check, we use the answer PDF as both solution and student answer
            # The teacher provides the answer key in the answer_pdf
            faculty_key = create_faculty_key(structure, a_bytes)
            student_answers = extract_student_answers(structure, a_bytes)
            grading_result = grade_student_paper(student_answers, faculty_key)

            # Calculate total marks
            total_marks = grading_result.get('total_score', 0)
            max_marks = sum(q.get('max_marks', 0) for q in structure if isinstance(q, dict))

            # Create paper record
            paper = {
                "id": paper_id,
                "teacherId": session.get('user_id', session.get('username')),
                "questionPdf": q_filename,
                "answerPdf": a_filename,
                "result": {
                    "totalMarks": total_marks,
                    "maxMarks": max_marks,
                    "grade": _calculate_grade(total_marks, max_marks),
                    "feedback": grading_result.get('remarks', ''),
                    "detailedResults": grading_result.get('results', [])
                }
            }

            created_paper = create_paper(paper)

            return jsonify({
                "success": True,
                "paper": created_paper
            }), 201

        except Exception as e:
            import traceback
            traceback.print_exc()
            return jsonify({"success": False, "error": f"Grading failed: {str(e)}"}), 500

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/faculty/papers', methods=['GET'])
@require_auth('faculty')
def api_get_papers():
    """Get all papers checked by teacher"""
    try:
        teacher_id = session.get('user_id', session.get('username'))
        papers = get_papers_by_teacher(teacher_id)
        return jsonify({
            "success": True,
            "papers": papers
        }), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/faculty/papers/<paper_id>', methods=['GET'])
@require_auth('faculty')
def api_get_paper(paper_id):
    """Get paper by ID"""
    try:
        paper = get_paper_by_id(paper_id)
        if not paper:
            return jsonify({"success": False, "error": "Paper not found"}), 404

        # Verify ownership
        teacher_id = session.get('user_id', session.get('username'))
        if paper.get('teacherId') != teacher_id:
            return jsonify({"success": False, "error": "Access denied"}), 403

        return jsonify({
            "success": True,
            "paper": paper
        }), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# ========== HELPER FUNCTIONS ==========

def _calculate_grade(total_marks, max_marks):
    """Calculate letter grade"""
    if max_marks == 0:
        return 'F'
    percentage = (total_marks / max_marks) * 100
    if percentage >= 90:
        return 'A'
    elif percentage >= 80:
        return 'B'
    elif percentage >= 70:
        return 'C'
    elif percentage >= 60:
        return 'D'
    else:
        return 'F'

# ========== FILE SERVING ==========

@app.route('/api/files/<filename>', methods=['GET'])
@require_auth()
def api_get_file(filename):
    """Serve uploaded files"""
    file_path = os.path.join(UPLOAD_FOLDER, filename)
    if os.path.exists(file_path) and os.path.isfile(file_path):
        return send_file(file_path, mimetype='application/pdf')
    return jsonify({"error": "File not found"}), 404

# ========== FRONTEND ROUTES ==========
# These routes must be defined AFTER all API routes to avoid conflicts

@app.route('/')
def serve_index():
    """Serve index.html"""
    return send_from_directory(FRONTEND_DIR, 'index.html')

@app.route('/<path:path>')
def serve_frontend(path):
    """Serve frontend static files and handle SPA routing"""
    # Skip API routes (shouldn't reach here, but safety check)
    if path.startswith('api/'):
        return jsonify({"error": "API endpoint not found"}), 404
    
    # Build full file path
    file_path = os.path.join(FRONTEND_DIR, path)
    
    # Check if it's a file
    if os.path.isfile(file_path):
        # Determine MIME type based on extension
        mimetype = None
        if file_path.endswith('.html'):
            mimetype = 'text/html'
        elif file_path.endswith('.css'):
            mimetype = 'text/css'
        elif file_path.endswith('.js'):
            mimetype = 'application/javascript'
        elif file_path.endswith('.json'):
            mimetype = 'application/json'
        elif file_path.endswith('.png'):
            mimetype = 'image/png'
        elif file_path.endswith(('.jpg', '.jpeg')):
            mimetype = 'image/jpeg'
        elif file_path.endswith('.svg'):
            mimetype = 'image/svg+xml'
        elif file_path.endswith('.ico'):
            mimetype = 'image/x-icon'
        elif file_path.endswith('.woff') or file_path.endswith('.woff2'):
            mimetype = 'font/woff2'
        
        return send_file(file_path, mimetype=mimetype)
    
    # Check if it's a directory with index.html
    if os.path.isdir(file_path):
        index_path = os.path.join(file_path, 'index.html')
        if os.path.exists(index_path):
            return send_file(index_path)
    
    # For SPA routing (e.g., /faculty/dashboard), serve main index.html
    # This allows frontend JavaScript routing to work
    index_path = os.path.join(FRONTEND_DIR, 'index.html')
    if os.path.exists(index_path):
        return send_file(index_path)
    
    return jsonify({"error": "File not found"}), 404

if __name__ == '__main__':
    print("=" * 60)
    print("AI-Powered Paper Grading System")
    print("=" * 60)
    print(f"Backend API: http://localhost:5000/api")
    print(f"Frontend: http://localhost:5000")
    print("=" * 60)
    print("Starting server...")
    app.run(debug=True, port=5000, host='0.0.0.0')
