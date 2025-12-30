# Integration Documentation

## Overview

This document describes the integration of the frontend and backend for the AI-Powered Paper Grading System. The application has been fully integrated to work dynamically with a RESTful API backend, replacing the previous localStorage-based approach.

## Architecture

### Backend (Flask API)
- **Location**: `/backend/`
- **Main File**: `app.py`
- **Database**: JSON-based file storage (`database.py`)
- **AI Engine**: Google Gemini API integration
- **Port**: 5000

### Frontend (Static HTML/JS)
- **Location**: `/frontend/`
- **API Client**: `js/data.js` (handles all API communication)
- **Port**: Served via file system or any static server

## Key Features

### 1. Assignment Check Feature
- **Purpose**: For students to submit assignments and get auto-graded
- **Flow**:
  1. Teacher creates assignment with question paper and solution PDF
  2. AI extracts structure from question paper
  3. Student uploads answer PDF
  4. AI grades the submission automatically
  5. Both student and teacher can see results
  6. Teacher can manually review

### 2. Paper Check Feature
- **Purpose**: For teachers to quickly check and grade papers
- **Flow**:
  1. Teacher uploads question paper and answer paper
  2. AI automatically grades the paper
  3. Only teacher can see the results
  4. Results are stored for future reference

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/current` - Get current user

### Assignments
- `POST /api/faculty/create-assignment` - Create new assignment (Faculty only)
- `GET /api/assignments` - Get all assignments
- `GET /api/assignments/<id>` - Get assignment by ID

### Submissions
- `POST /api/student/submit-assignment` - Submit assignment (Student only)
- `GET /api/submissions` - Get submissions (filtered by role)
- `GET /api/submissions/<id>` - Get submission by ID
- `GET /api/assignments/<id>/submissions` - Get submissions for assignment (Faculty only)

### Paper Check
- `POST /api/faculty/check-paper` - Check a paper (Faculty only)
- `GET /api/faculty/papers` - Get all papers checked by teacher
- `GET /api/faculty/papers/<id>` - Get paper by ID

### Files
- `GET /api/files/<filename>` - Serve uploaded PDF files

## Database Structure

### Users (`users.json`)
```json
{
  "username": {
    "id": "u_1234567890",
    "username": "username",
    "password": "hashed_password",
    "role": "faculty|student",
    "name": "Full Name",
    "department": "Department",
    "branch": "Branch",
    "semester": "Semester"
  }
}
```

### Assignments (`database/assignments.json`)
```json
[
  {
    "id": "asg_1234567890",
    "title": "Assignment Title",
    "subject": "Subject",
    "description": "Description",
    "deadline": "2025-12-31",
    "teacherId": "u_1234567890",
    "questionPdf": "asg_1234567890_question.pdf",
    "solutionPdf": "asg_1234567890_solution.pdf",
    "structure": [...],
    "questions": [...],
    "createdAt": "2025-01-01T00:00:00"
  }
]
```

### Submissions (`database/submissions.json`)
```json
[
  {
    "id": "sub_1234567890",
    "assignmentId": "asg_1234567890",
    "studentId": "u_1234567890",
    "submissionPdf": "sub_1234567890_student.pdf",
    "aiResult": {
      "totalMarks": 85,
      "maxMarks": 100,
      "grade": "B",
      "plagiarismPercentage": 0,
      "feedback": "Good work!",
      "detailedResults": [...]
    },
    "status": "graded",
    "submittedAt": "2025-01-01T00:00:00"
  }
]
```

### Papers (`database/papers.json`)
```json
[
  {
    "id": "paper_1234567890",
    "teacherId": "u_1234567890",
    "questionPdf": "paper_1234567890_question.pdf",
    "answerPdf": "paper_1234567890_answer.pdf",
    "result": {
      "totalMarks": 90,
      "maxMarks": 100,
      "grade": "A",
      "feedback": "Excellent!",
      "detailedResults": [...]
    },
    "createdAt": "2025-01-01T00:00:00"
  }
]
```

## Frontend Changes

### Data Layer (`js/data.js`)
- **Before**: Used localStorage for all data operations
- **After**: All operations use API calls to backend
- **Key Methods**:
  - `login()`, `registerUser()`, `logout()` - Authentication
  - `getAssignments()`, `createAssignment()` - Assignment management
  - `submitAssignment()`, `getSubmissions()` - Submission management
  - `checkPaper()`, `getPapers()` - Paper check feature

### Authentication (`js/auth.js`)
- Updated to use async/await with API calls
- Shows loading states during authentication

### Faculty Module (`js/faculty.js`)
- All data fetching is now async
- Added Paper Check functionality
- Dashboard loads assignments and submissions dynamically

### Student Module (`js/student.js`)
- All data fetching is now async
- Submission form uploads PDF to backend
- Results page displays AI grading results

## Setup Instructions

### Single Command Setup (Recommended)

The application now runs entirely from a single Flask server that serves both the backend API and frontend files:

```bash
cd backend
pip install -r ../requirements.txt
export GEMINI_API_KEY=your_api_key_here
python app.py
```

This single command:
- Starts the Flask backend API server
- Serves all frontend HTML, CSS, and JavaScript files
- Handles file uploads and downloads
- Provides complete application functionality

### Access the Application

Once running, open your browser to:
- **Main Application**: `http://localhost:5000`
- **Backend API**: `http://localhost:5000/api`

### Configuration

- The frontend automatically uses the same origin for API calls (no configuration needed)
- CORS is configured in `backend/app.py` for development
- API base URL is dynamically set in `frontend/js/data.js` using `window.location.origin`

### Alternative Setup (Separate Servers)

If you prefer to run frontend and backend separately:

1. **Backend**: Run `python backend/app.py` (port 5000)
2. **Frontend**: Use any static server:
   - Python: `cd frontend && python -m http.server 8000`
   - Node.js: `cd frontend && npx http-server`
   - VS Code Live Server extension
3. **Update API URL**: Change `API_BASE_URL` in `frontend/js/data.js` to `http://localhost:5000/api`

## How It Works

### Assignment Check Flow

1. **Teacher Creates Assignment**:
   - Uploads question paper PDF
   - Uploads solution PDF
   - AI extracts structure from question paper
   - Assignment is saved to database

2. **Student Submits Assignment**:
   - Views assignment details
   - Uploads answer PDF
   - Backend processes:
     - Extracts exam structure
     - Creates faculty key from solution
     - Extracts student answers
     - Grades using AI
   - Results saved to database

3. **View Results**:
   - Student can see their grade and feedback
   - Teacher can see all submissions
   - Teacher can manually review

### Paper Check Flow

1. **Teacher Checks Paper**:
   - Uploads question paper PDF
   - Uploads answer paper PDF
   - Backend processes:
     - Extracts exam structure
     - Creates faculty key
     - Extracts answers
     - Grades using AI
   - Results saved (only visible to teacher)

2. **View Paper Results**:
   - Teacher can view all checked papers
   - Detailed results with feedback
   - Grade and score display

## AI Grading Pipeline

The AI grading uses a 4-step process:

1. **Step 1 - Structure Extraction** (`step1_structure.py`):
   - Analyzes question paper PDF
   - Extracts question structure and marks distribution
   - Returns JSON structure

2. **Step 2 - Faculty Key Creation** (`step2_faculty.py`):
   - Analyzes solution PDF
   - Maps solutions to question IDs
   - Extracts keywords and important concepts

3. **Step 3 - Student Answer Extraction** (`step3_student.py`):
   - Analyzes student answer PDF
   - Extracts answers for each question
   - Maps to question structure

4. **Step 4 - Grading** (`step4_grading.py`):
   - Compares student answers with faculty key
   - Assigns marks based on keywords and concepts
   - Generates feedback and final grade

## Security Considerations

- Passwords are hashed using Werkzeug's password hashing
- Session-based authentication
- Role-based access control (RBAC)
- File upload validation (PDF only, size limits)
- CORS configured for specific origins

## File Storage

- **Uploads**: Stored in `backend/uploads/`
- **Database**: JSON files in `backend/database/`
- **Outputs**: Grading results in `backend/outputs/` (legacy)

## Error Handling

- All API endpoints return consistent JSON responses:
  ```json
  {
    "success": true/false,
    "data": {...} or "error": "error message"
  }
  ```
- Frontend handles errors gracefully with user-friendly messages
- Network errors are caught and displayed

## Testing

### Manual Testing Steps

1. **Registration & Login**:
   - Register as faculty and student
   - Login with both roles
   - Verify session persistence

2. **Assignment Flow**:
   - Create assignment as faculty
   - View assignments as student
   - Submit assignment as student
   - View results as both student and faculty

3. **Paper Check Flow**:
   - Check paper as faculty
   - View paper results
   - Verify only faculty can access

## Future Enhancements

- Database migration to SQLite/PostgreSQL
- JWT token-based authentication
- Real-time notifications
- Batch paper checking
- Advanced plagiarism detection
- Export results to Excel/PDF
- Student progress tracking
- Analytics dashboard

## Troubleshooting

### Common Issues

1. **CORS Errors**:
   - Ensure backend CORS origins include frontend URL
   - Check browser console for specific errors

2. **API Connection Failed**:
   - Verify backend is running on port 5000
   - Check `API_BASE_URL` in `data.js`
   - Ensure no firewall blocking

3. **File Upload Issues**:
   - Check file size (max 16MB)
   - Ensure PDF format
   - Verify uploads folder permissions

4. **Authentication Issues**:
   - Clear browser cookies/localStorage
   - Check session configuration
   - Verify user exists in `users.json`

## Contact & Support

For issues or questions, check:
- Backend logs in terminal
- Browser console for frontend errors
- Network tab for API request/response details
