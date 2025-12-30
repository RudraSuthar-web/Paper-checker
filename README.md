# AI-Powered Paper Grading System

An integrated web application for automated paper grading using AI (Google Gemini API). The system supports two main features: **Assignment Check** (for students) and **Paper Check** (for teachers).

## Features

### Assignment Check Feature
- Teachers create assignments with question papers and solution keys
- Students submit answer papers
- AI automatically grades submissions
- Both students and teachers can view results
- Teachers can manually review submissions

### Paper Check Feature
- Teachers can quickly check and grade papers
- Upload question paper and answer paper
- AI automatically grades the paper
- Only teachers can view the results
- Results are stored for future reference

### Core Features
- User authentication (signup/login) with role-based access
- Faculty and Student dashboards
- PDF upload and processing
- AI-driven 4-step grading pipeline
- Dynamic frontend-backend integration
- RESTful API architecture

## Project Structure

```
paper_checker/
├── README.md
├── INTEGRATION_DOCS.md          # Detailed integration documentation
├── requirements.txt              # Python dependencies
├── backend/
│   ├── app.py                   # Flask API server (main entry point)
│   ├── config.py               # Gemini API configuration
│   ├── database.py             # JSON-based database functions
│   ├── main.py                 # Standalone grading script
│   ├── users.json              # User database (JSON)
│   ├── ai_engine/
│   │   ├── step1_structure.py  # Exam structure extraction
│   │   ├── step2_faculty.py    # Faculty key creation
│   │   ├── step3_student.py    # Student answer extraction
│   │   └── step4_grading.py    # Grading logic
│   ├── uploads/                # Uploaded PDF files
│   ├── database/               # JSON database files
│   │   ├── assignments.json
│   │   ├── submissions.json
│   │   └── papers.json
│   └── outputs/                # Generated outputs (legacy)
└── frontend/
    ├── index.html              # Home/redirect page
    ├── login.html              # Login page
    ├── register.html           # Registration page
    ├── css/
    │   └── styles.css          # Main stylesheet
    ├── js/
    │   ├── data.js             # API client (all backend communication)
    │   ├── auth.js             # Authentication handlers
    │   ├── faculty.js          # Faculty dashboard logic
    │   ├── student.js          # Student dashboard logic
    │   └── sidebar.js          # Sidebar navigation
    ├── faculty/
    │   ├── faculty-dashboard.html
    │   ├── create-assignment.html
    │   ├── check-paper.html    # Paper check feature
    │   └── paper-result.html   # Paper result display
    └── student/
        ├── student-dashboard.html
        ├── view-assignments.html
        ├── submit-assignment.html
        └── ai-result.html      # Submission result display
```

## Installation

### Prerequisites
- Python 3.8+
- Google Gemini API key
- Web browser

### Setup

1. **Clone or navigate to the project directory:**
   ```bash
   cd paper_checker
   ```

2. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up Gemini API key:**
   ```bash
   export GEMINI_API_KEY=your_api_key_here
   ```
   Or edit `backend/config.py` directly (not recommended for production).

4. **Start the application:**
   ```bash
   cd backend
   python app.py
   ```
   
   This single command starts both the backend API and serves the frontend!
   
   The application will be available at:
   - **Main Application**: `http://localhost:5000`
   - **Backend API**: `http://localhost:5000/api`

5. **Access the application:**
   Open your browser and navigate to `http://localhost:5000`
   
   The Flask server automatically serves:
   - All frontend HTML, CSS, and JavaScript files
   - Backend API endpoints
   - Uploaded files and resources

## Usage

### For Teachers (Faculty)

1. **Register/Login** as Faculty
2. **Create Assignment**:
   - Go to "Create Assignment"
   - Upload question paper PDF
   - Upload solution PDF
   - Fill in assignment details
   - AI will extract structure automatically
3. **Check Paper** (Paper Check Feature):
   - Go to "Check Paper"
   - Upload question paper and answer paper
   - View automatic grading results
4. **View Submissions**:
   - See all student submissions
   - Review grades and feedback
   - Manual review option available

### For Students

1. **Register/Login** as Student
2. **View Assignments**:
   - See all available assignments
   - Check deadlines and details
3. **Submit Assignment**:
   - Select an assignment
   - Upload answer PDF
   - AI automatically grades
   - View results immediately
4. **View Results**:
   - See grade, score, and feedback
   - Both student and teacher can view

## API Documentation

See `INTEGRATION_DOCS.md` for complete API documentation including:
- All available endpoints
- Request/response formats
- Database structures
- Authentication flow
- Error handling

## How It Works

### AI Grading Pipeline

The system uses a 4-step AI grading process:

1. **Structure Extraction**: Analyzes question paper to extract question structure and marks
2. **Faculty Key Creation**: Processes solution PDF to create grading key with keywords
3. **Answer Extraction**: Extracts student answers from submitted PDF
4. **Grading**: Compares answers with key, assigns marks, generates feedback

### Technology Stack

- **Backend**: Flask (Python)
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **AI**: Google Gemini API
- **Database**: JSON files (can be migrated to SQL)
- **Authentication**: Session-based with password hashing

## Configuration

### Backend Configuration
- Edit `backend/config.py` for API settings
- Edit `backend/app.py` for CORS origins if needed
- Default port: 5000

### Frontend Configuration
- Edit `frontend/js/data.js` to change `API_BASE_URL` if backend runs on different port
- Default: `http://localhost:5000/api`

## Troubleshooting

### Common Issues

1. **CORS Errors**:
   - Ensure backend CORS origins include your frontend URL
   - Check browser console for specific errors

2. **API Connection Failed**:
   - Verify backend is running: `http://localhost:5000`
   - Check `API_BASE_URL` in `frontend/js/data.js`
   - Ensure no firewall blocking

3. **File Upload Issues**:
   - Max file size: 16MB
   - Only PDF files accepted
   - Check `backend/uploads/` folder permissions

4. **Authentication Issues**:
   - Clear browser cookies/localStorage
   - Check `backend/users.json` exists
   - Verify session configuration

### Debug Mode

Backend runs in debug mode by default. Check terminal for:
- API request logs
- Error traces
- AI processing steps

## Development

### Adding New Features

1. **Backend**: Add routes in `backend/app.py`
2. **Frontend**: Add API calls in `frontend/js/data.js`
3. **UI**: Create HTML pages in appropriate folders
4. **Logic**: Add JavaScript in `frontend/js/`

### Database Migration

Currently uses JSON files. To migrate to SQL:
1. Create database schema
2. Update `backend/database.py` functions
3. Migrate existing data
4. Update API endpoints if needed

## Security Notes

- Change `app.secret_key` in production
- Use environment variables for API keys
- Implement HTTPS in production
- Add rate limiting for API endpoints
- Consider JWT tokens instead of sessions

## Future Enhancements

- [ ] SQL database migration
- [ ] JWT authentication
- [ ] Real-time notifications
- [ ] Batch paper checking
- [ ] Advanced plagiarism detection
- [ ] Export results (Excel/PDF)
- [ ] Student progress tracking
- [ ] Analytics dashboard
- [ ] Mobile responsive improvements

## Contributing

Feel free to submit issues and pull requests.

## License

[Add your license here]

## Support

For detailed integration documentation, see `INTEGRATION_DOCS.md`.

For issues:
1. Check backend terminal logs
2. Check browser console
3. Check network tab for API requests
4. Review `INTEGRATION_DOCS.md` troubleshooting section
