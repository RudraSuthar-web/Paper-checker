document.addEventListener('DOMContentLoaded', async () => {
    // Ensure user is student
    const user = await db.requireAuth('student');
    if (!user) return;

    // Display User Name
    const userNameEl = document.getElementById('userName');
    if (userNameEl) userNameEl.textContent = user.name || user.username;

    // Logout Handler
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            db.logout();
        });
    }

    // Router-ish logic based on page presence
    if (document.getElementById('studentDashboard')) {
        await renderStudentDashboard(user.id);
    }

    if (document.getElementById('viewAssignmentsList')) {
        await renderAllAssignments(user.id);
    }

    if (document.getElementById('submissionForm')) {
        await setupSubmissionForm(user.id);
    }

    if (document.getElementById('aiResultContainer')) {
        await renderAiResult();
    }
});

/**
 * Render Student Dashboard
 * Shows pending and completed counts, and recent pending assignments.
 */
async function renderStudentDashboard(studentId) {
    const allAssignments = await db.getAssignments();
    const mySubmissions = await db.getStudentSubmissions(studentId);

    const submittedIds = new Set(mySubmissions.map(s => s.assignmentId));
    const pending = allAssignments.filter(a => !submittedIds.has(a.id));
    const completed = allAssignments.filter(a => submittedIds.has(a.id));

    // Stats
    const pendingCountEl = document.getElementById('pendingCount');
    const completedCountEl = document.getElementById('completedCount');
    if (pendingCountEl) pendingCountEl.textContent = pending.length;
    if (completedCountEl) completedCountEl.textContent = completed.length;

    // Pending List
    const listContainer = document.getElementById('pendingList');
    if (!listContainer) return;

    listContainer.innerHTML = '';

    if (pending.length === 0) {
        listContainer.innerHTML = '<p>No pending assignments. Great job!</p>';
    } else {
        pending.slice(0, 3).forEach(asg => {
            const el = document.createElement('div');
            el.className = 'assignment-item';
            el.innerHTML = `
                <div class="assignment-info">
                    <h3>${asg.title}</h3>
                    <p class="summary">${asg.description || ''}</p>
                    <div class="assignment-meta">Due: ${asg.deadline || 'N/A'}</div>
                </div>
                <a href="submit-assignment.html?id=${asg.id}" class="btn btn-primary">Start</a>
            `;
            listContainer.appendChild(el);
        });
    }
}

/**
 * Render All Assignments List (View Assignments Page)
 */
async function renderAllAssignments(studentId) {
    const listContainer = document.getElementById('viewAssignmentsList');
    if (!listContainer) return;

    const allAssignments = await db.getAssignments();
    const mySubmissions = await db.getStudentSubmissions(studentId);
    const submittedIds = new Set(mySubmissions.map(s => s.assignmentId));

    if (allAssignments.length === 0) {
        listContainer.innerHTML = '<p>No assignments available.</p>';
        return;
    }

    allAssignments.forEach(asg => {
        const isSubmitted = submittedIds.has(asg.id);
        const submission = mySubmissions.find(s => s.assignmentId === asg.id);
        const questionsCount = asg.questions ? asg.questions.length : 0;

        const actionBtn = isSubmitted && submission
            ? `<a href="ai-result.html?submissionId=${submission.id}" class="btn btn-secondary">View Result</a>`
            : `<a href="submit-assignment.html?id=${asg.id}" class="btn btn-primary">Start Assignment</a>`;

        const badge = isSubmitted
            ? `<span class="badge badge-green">Submitted</span>`
            : `<span class="badge badge-yellow">Pending</span>`;

        const el = document.createElement('div');
        el.className = 'assignment-item';
        el.innerHTML = `
             <div class="assignment-info">
                <h3>${asg.title} ${badge}</h3>
                <p>${asg.description || ''}</p>
                <div class="assignment-meta">Due: ${asg.deadline || 'N/A'} • Questions: ${questionsCount}</div>
            </div>
            <div>${actionBtn}</div>
        `;
        listContainer.appendChild(el);
    });
}

/**
 * Setup Submission Form
 */
async function setupSubmissionForm(studentId) {
    const urlParams = new URLSearchParams(window.location.search);
    const assignmentId = urlParams.get('id');

    if (!assignmentId) {
        alert('No assignment specified.');
        window.location.href = 'student-dashboard.html';
        return;
    }

    const assignment = await db.getAssignmentById(assignmentId);
    if (!assignment) {
        alert('Assignment not found.');
        window.location.href = 'student-dashboard.html';
        return;
    }

    // Render Page Header
    const asgTitleEl = document.getElementById('asgTitle');
    const asgDescEl = document.getElementById('asgDesc');
    if (asgTitleEl) asgTitleEl.textContent = assignment.title;
    if (asgDescEl) asgDescEl.textContent = assignment.description || '';

    // Render PDF Link
    if (assignment.questionPdf) {
        const pdfContainer = document.getElementById('pdfContainer');
        const pdfLink = document.getElementById('pdfLink');
        if (pdfContainer && pdfLink) {
            pdfContainer.style.display = 'block';
            pdfLink.href = db.getFileUrl(assignment.questionPdf);
            pdfLink.target = '_blank';
            pdfLink.innerHTML = `📄 View Question Paper`;
        }
    }

    // Render Questions (if available from structure)
    const questionsContainer = document.getElementById('questionsWrapper');
    if (questionsContainer) {
        const questions = assignment.questions || assignment.structure || [];
        if (questions.length > 0) {
            questions.forEach((q, index) => {
                const qDiv = document.createElement('div');
                qDiv.className = 'question-container';
                qDiv.dataset.id = q.id || `q${index + 1}`;
                const maxMarks = q.max_marks || q.marks || 0;
                qDiv.innerHTML = `
                    <div style="margin-bottom: 0.5rem; font-weight: 600;">Question ${index + 1} (${maxMarks} marks)</div>
                    <p style="margin-bottom: 1rem;">${q.id || 'Question ' + (index + 1)}</p>
                    <textarea class="form-control answer-input" rows="4" placeholder="Type your answer here..."></textarea>
                `;
                questionsContainer.appendChild(qDiv);
            });
        } else {
            questionsContainer.innerHTML = '<p>Please upload your answer PDF below.</p>';
        }
    }

    // Handle Submit
    const submissionForm = document.getElementById('submissionForm');
    if (submissionForm) {
        submissionForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (!confirm('Are you sure you want to submit? This cannot be undone.')) return;

            const fileInput = document.getElementById('solutionFile');
            if (!fileInput || !fileInput.files[0]) {
                alert('Please upload your answer PDF.');
                return;
            }

            const submitBtn = submissionForm.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Submitting...';
            }

            const result = await db.submitAssignment(assignmentId, studentId, fileInput.files[0]);

            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Submit Assignment';
            }

            if (result.success) {
                alert('Assignment submitted successfully!');
                // Refresh sidebar before redirect
                if (window.refreshSidebar) {
                    await window.refreshSidebar();
                }
                window.location.href = `ai-result.html?submissionId=${result.result.id}`;
            } else {
                alert('Error submitting assignment: ' + (result.error || 'Unknown error'));
            }
        });
    }
}

/**
 * Render AI Result Page
 */
async function renderAiResult() {
    const urlParams = new URLSearchParams(window.location.search);
    const submissionId = urlParams.get('submissionId');

    if (!submissionId) {
        const container = document.getElementById('aiResultContainer');
        if (container) container.innerHTML = '<p>No submission ID provided.</p>';
        return;
    }

    const submission = await db.getSubmissionById(submissionId);
    if (!submission) {
        const container = document.getElementById('aiResultContainer');
        if (container) container.innerHTML = '<p>Result not found.</p>';
        return;
    }

    const assignment = await db.getAssignmentById(submission.assignmentId);
    const asgTitleEl = document.getElementById('asgTitle');
    if (assignment && asgTitleEl) {
        asgTitleEl.textContent = assignment.title;
    }

    // Display Result Data
    const result = submission.aiResult || {};
    const scoreDisplayEl = document.getElementById('scoreDisplay');
    const gradeDisplayEl = document.getElementById('gradeDisplay');
    const plagiarismDisplayEl = document.getElementById('plagiarismDisplay');
    const feedbackDisplayEl = document.getElementById('feedbackDisplay');

    if (scoreDisplayEl) {
        const maxMarks = result.maxMarks !== undefined ? result.maxMarks : 100;
        scoreDisplayEl.textContent = `${result.totalMarks || 0}/${maxMarks}`;
    }
    if (gradeDisplayEl) gradeDisplayEl.textContent = result.grade || '-';
    if (plagiarismDisplayEl) plagiarismDisplayEl.textContent = `${result.plagiarismPercentage || 0}%`;
    if (feedbackDisplayEl) feedbackDisplayEl.textContent = result.feedback || 'No feedback available.';

    // Color code grade
    const circle = document.querySelector('.grade-circle');
    if (circle) {
        const grade = result.grade || 'F';
        if (grade === 'A') circle.style.background = 'linear-gradient(135deg, #10b981, #059669)'; // Green
        else if (grade === 'B') circle.style.background = 'linear-gradient(135deg, #3b82f6, #2563eb)'; // Blue
        else if (grade === 'C') circle.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)'; // Yellow
        else circle.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)'; // Red
    }
}
