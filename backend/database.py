"""
Database management for assignments, submissions, and papers
Uses JSON files for data persistence
"""
import os
import json
from datetime import datetime
from typing import Dict, List, Optional

BASE_DIR = os.path.dirname(__file__)
DB_FOLDER = os.path.join(BASE_DIR, 'database')
ASSIGNMENTS_FILE = os.path.join(DB_FOLDER, 'assignments.json')
SUBMISSIONS_FILE = os.path.join(DB_FOLDER, 'submissions.json')
PAPERS_FILE = os.path.join(DB_FOLDER, 'papers.json')

# Ensure database folder exists
os.makedirs(DB_FOLDER, exist_ok=True)

def load_json_file(filepath: str, default: List = None) -> List:
    """Load JSON file, return default if doesn't exist"""
    if default is None:
        default = []
    if not os.path.exists(filepath):
        return default
    try:
        with open(filepath, 'r') as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return default

def save_json_file(filepath: str, data: List):
    """Save data to JSON file"""
    with open(filepath, 'w') as f:
        json.dump(data, f, indent=2)

# ========== ASSIGNMENTS ==========
def get_all_assignments() -> List[Dict]:
    """Get all assignments"""
    return load_json_file(ASSIGNMENTS_FILE, [])

def get_assignment_by_id(assignment_id: str) -> Optional[Dict]:
    """Get assignment by ID"""
    assignments = get_all_assignments()
    return next((a for a in assignments if a.get('id') == assignment_id), None)

def create_assignment(assignment_data: Dict) -> Dict:
    """Create a new assignment"""
    assignments = get_all_assignments()
    assignment_data['id'] = f"asg_{int(datetime.now().timestamp() * 1000)}"
    assignment_data['createdAt'] = datetime.now().isoformat()
    assignments.append(assignment_data)
    save_json_file(ASSIGNMENTS_FILE, assignments)
    return assignment_data

def update_assignment(assignment_id: str, updates: Dict) -> Optional[Dict]:
    """Update an assignment"""
    assignments = get_all_assignments()
    for i, assignment in enumerate(assignments):
        if assignment.get('id') == assignment_id:
            assignments[i].update(updates)
            save_json_file(ASSIGNMENTS_FILE, assignments)
            return assignments[i]
    return None

# ========== SUBMISSIONS ==========
def get_all_submissions() -> List[Dict]:
    """Get all submissions"""
    return load_json_file(SUBMISSIONS_FILE, [])

def get_submission_by_id(submission_id: str) -> Optional[Dict]:
    """Get submission by ID"""
    submissions = get_all_submissions()
    return next((s for s in submissions if s.get('id') == submission_id), None)

def get_submissions_by_assignment(assignment_id: str) -> List[Dict]:
    """Get all submissions for an assignment"""
    submissions = get_all_submissions()
    return [s for s in submissions if s.get('assignmentId') == assignment_id]

def get_submissions_by_student(student_id: str) -> List[Dict]:
    """Get all submissions by a student"""
    submissions = get_all_submissions()
    return [s for s in submissions if s.get('studentId') == student_id]

def create_submission(submission_data: Dict) -> Dict:
    """Create a new submission"""
    submissions = get_all_submissions()
    submission_data['id'] = f"sub_{int(datetime.now().timestamp() * 1000)}"
    submission_data['submittedAt'] = datetime.now().isoformat()
    submissions.append(submission_data)
    save_json_file(SUBMISSIONS_FILE, submissions)
    return submission_data

def update_submission(submission_id: str, updates: Dict) -> Optional[Dict]:
    """Update a submission"""
    submissions = get_all_submissions()
    for i, submission in enumerate(submissions):
        if submission.get('id') == submission_id:
            submissions[i].update(updates)
            save_json_file(SUBMISSIONS_FILE, submissions)
            return submissions[i]
    return None

# ========== PAPERS (Paper Check Feature) ==========
def get_all_papers() -> List[Dict]:
    """Get all papers (for paper check feature)"""
    return load_json_file(PAPERS_FILE, [])

def get_paper_by_id(paper_id: str) -> Optional[Dict]:
    """Get paper by ID"""
    papers = get_all_papers()
    return next((p for p in papers if p.get('id') == paper_id), None)

def get_papers_by_teacher(teacher_id: str) -> List[Dict]:
    """Get all papers checked by a teacher"""
    papers = get_all_papers()
    return [p for p in papers if p.get('teacherId') == teacher_id]

def create_paper(paper_data: Dict) -> Dict:
    """Create a new paper check record"""
    papers = get_all_papers()
    paper_data['id'] = f"paper_{int(datetime.now().timestamp() * 1000)}"
    paper_data['createdAt'] = datetime.now().isoformat()
    papers.append(paper_data)
    save_json_file(PAPERS_FILE, papers)
    return paper_data

def update_paper(paper_id: str, updates: Dict) -> Optional[Dict]:
    """Update a paper"""
    papers = get_all_papers()
    for i, paper in enumerate(papers):
        if paper.get('id') == paper_id:
            papers[i].update(updates)
            save_json_file(PAPERS_FILE, papers)
            return papers[i]
    return None
