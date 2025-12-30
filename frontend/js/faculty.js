document.addEventListener('DOMContentLoaded', async () => {
    // Ensure user is faculty
    const user = await db.requireAuth('faculty');
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

    // --- Dashboard Logic ---
    const dashboardStats = document.getElementById('dashboardStats');
    if (dashboardStats) {
        await renderDashboard();
    }

    // --- Create Assignment Logic ---
    const createAssignmentForm = document.getElementById('createAssignmentForm');
    if (createAssignmentForm) {
        setupCreateAssignment();
    }

    // --- Paper Check Logic ---
    const paperCheckForm = document.getElementById('paperCheckForm');
    if (paperCheckForm) {
        setupPaperCheck();
    }

    // --- View Papers Logic ---
    const papersList = document.getElementById('papersList');
    if (papersList) {
        await renderPapers();
    }
});

async function renderDashboard() {
    const assignments = await db.getAssignments();
    const submissions = await db.getSubmissions();

    // Update Stats
    const totalAssignmentsEl = document.getElementById('totalAssignments');
    if (totalAssignmentsEl) {
        totalAssignmentsEl.textContent = assignments.length;
    }

    // Render Recent Assignments
    const listContainer = document.getElementById('recentAssignments');
    if (!listContainer) return;

    listContainer.innerHTML = '';

    if (assignments.length === 0) {
        listContainer.innerHTML = '<p>No assignments created yet.</p>';
        return;
    }

    assignments.slice(0, 5).forEach(asg => {
        const subCount = submissions.filter(s => s.assignmentId === asg.id).length;
        const questionsCount = asg.questions ? asg.questions.length : 0;
        const item = document.createElement('div');
        item.className = 'assignment-item';
        item.innerHTML = `
            <div class="assignment-info">
                <h3>${asg.title}</h3>
                <p>${asg.description || ''}</p>
                <div class="assignment-meta">
                    <span>Deadline: ${asg.deadline || 'N/A'}</span> • 
                    <span>Questions: ${questionsCount}</span>
                </div>
            </div>
            <div style="display: flex; gap: 1rem; align-items: center;">
                 <span class="badge badge-blue">Active</span>
                 <button class="btn btn-secondary btn-sm" onclick="viewSubmissions('${asg.id}', '${asg.title.replace(/'/g, "\\'")}')">
                    View Submissions (${subCount})
                 </button>
            </div>
        `;
        listContainer.appendChild(item);
    });

    // Modal Close
    const closeBtn = document.getElementById('closeModal');
    if (closeBtn) {
        closeBtn.onclick = () => {
            const modal = document.getElementById('submissionsModal');
            if (modal) modal.style.display = 'none';
        };
    }

    // Close on click outside
    window.onclick = function (event) {
        const modal = document.getElementById('submissionsModal');
        if (event.target == modal && modal) {
            modal.style.display = 'none';
        }
    }
}

window.viewSubmissions = async function (assignmentId, title) {
    const modal = document.getElementById('submissionsModal');
    const titleEl = document.getElementById('modalTitle');
    const content = document.getElementById('submissionsContent');
    
    if (!modal || !titleEl || !content) return;

    const submissions = await db.getAssignmentSubmissions(assignmentId);

    titleEl.textContent = `Submissions: ${title}`;
    modal.style.display = 'flex';

    if (submissions.length === 0) {
        content.innerHTML = '<p class="text-muted" style="text-align: center; padding: 2rem;">No submissions yet.</p>';
        return;
    }

    let html = `
        <table class="table">
            <thead>
                <tr>
                    <th>Student ID</th>
                    <th>Date</th>
                    <th>Grade</th>
                    <th>Score</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;

    submissions.forEach(sub => {
        const studentId = sub.studentId || 'Unknown';
        const date = sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString() : 'N/A';
        const aiResult = sub.aiResult || {};
        const score = aiResult.totalMarks !== undefined ? aiResult.totalMarks : '-';
        const maxMarks = aiResult.maxMarks !== undefined ? aiResult.maxMarks : 100;
        const grade = aiResult.grade || '-';

        html += `
            <tr>
                <td style="font-weight: 500;">${studentId}</td>
                <td>${date}</td>
                <td><span class="badge badge-${grade === 'A' || grade === 'B' ? 'green' : grade === 'C' ? 'yellow' : 'red'}">${grade}</span></td>
                <td>${score}/${maxMarks}</td>
                <td>
                    ${sub.submissionPdf ? `<a href="${db.getFileUrl(sub.submissionPdf)}" target="_blank" class="btn btn-sm btn-secondary">View PDF</a>` : '-'}
                </td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    content.innerHTML = html;
}

function setupCreateAssignment() {
    const questionsContainer = document.getElementById('questionsContainer');
    const addQuestionBtn = document.getElementById('addQuestionBtn');
    
    if (!questionsContainer || !addQuestionBtn) return;

    let questionCount = 0;

    // Add Question Handler
    addQuestionBtn.addEventListener('click', () => {
        questionCount++;
        const qDiv = document.createElement('div');
        qDiv.className = 'question-container';
        qDiv.id = `q_block_${questionCount}`;
        qDiv.innerHTML = `
             <div class="remove-question-btn" onclick="removeQuestion(${questionCount})">Remove</div>
             <div class="form-group">
                <label class="form-label">Question Text</label>
                <textarea class="form-control question-text" required placeholder="Enter question..."></textarea>
            </div>
            <div class="form-group">
                <label class="form-label">Marks</label>
                <input type="number" class="form-control question-marks" required min="1" placeholder="10">
            </div>
        `;
        questionsContainer.appendChild(qDiv);
    });

    // Initial Question (optional - can be removed if not needed)
    // addQuestionBtn.click();

    // Form Submission
    const form = document.getElementById('createAssignmentForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Creating...';
        }

        const title = document.getElementById('asgTitle').value;
        const subject = document.getElementById('asgSubject').value;
        const description = document.getElementById('asgDesc').value;
        const deadline = document.getElementById('asgDeadline').value;

        const qPdfInput = document.getElementById('asgPdf');
        const sPdfInput = document.getElementById('asgSolPdf');

        if (!qPdfInput || !qPdfInput.files[0] || !sPdfInput || !sPdfInput.files[0]) {
            alert("Please upload both Question PDF and Solution PDF.");
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Create Assignment';
            }
            return;
        }

        const result = await db.createAssignment(
            title,
            subject,
            description,
            deadline,
            qPdfInput.files[0],
            sPdfInput.files[0]
        );

        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Create Assignment';
        }

        if (result.success) {
            alert('Assignment published successfully!');
            // Refresh sidebar before redirect
            if (window.refreshSidebar) {
                await window.refreshSidebar();
            }
            window.location.href = 'faculty-dashboard.html';
        } else {
            alert('Error publishing assignment: ' + (result.error || 'Unknown error'));
        }
    });
}

function setupPaperCheck() {
    const form = document.getElementById('paperCheckForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Checking Paper...';
        }

        const qPdfInput = document.getElementById('paperQuestionPdf');
        const aPdfInput = document.getElementById('paperAnswerPdf');

        if (!qPdfInput || !qPdfInput.files[0] || !aPdfInput || !aPdfInput.files[0]) {
            alert("Please upload both Question PDF and Answer PDF.");
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Check Paper';
            }
            return;
        }

        const result = await db.checkPaper(
            qPdfInput.files[0],
            aPdfInput.files[0]
        );

        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Check Paper';
        }

        if (result.success) {
            alert('Paper checked successfully!');
            // Redirect to paper result page or show result
            window.location.href = `paper-result.html?id=${result.paper.id}`;
        } else {
            alert('Error checking paper: ' + (result.error || 'Unknown error'));
        }
    });
}

async function renderPapers() {
    const papers = await db.getPapers();
    const listContainer = document.getElementById('papersList');
    
    if (!listContainer) return;

    listContainer.innerHTML = '';

    if (papers.length === 0) {
        listContainer.innerHTML = '<p>No papers checked yet.</p>';
        return;
    }

    papers.forEach(paper => {
        const result = paper.result || {};
        const totalMarks = result.totalMarks !== undefined ? result.totalMarks : 0;
        const maxMarks = result.maxMarks !== undefined ? result.maxMarks : 100;
        const grade = result.grade || '-';
        const date = paper.createdAt ? new Date(paper.createdAt).toLocaleDateString() : 'N/A';

        const item = document.createElement('div');
        item.className = 'assignment-item';
        item.innerHTML = `
            <div class="assignment-info">
                <h3>Paper Check #${paper.id.slice(-6)}</h3>
                <p>Checked on: ${date}</p>
                <div class="assignment-meta">
                    <span>Score: ${totalMarks}/${maxMarks}</span> • 
                    <span>Grade: ${grade}</span>
                </div>
            </div>
            <div style="display: flex; gap: 1rem; align-items: center;">
                <span class="badge badge-${grade === 'A' || grade === 'B' ? 'green' : grade === 'C' ? 'yellow' : 'red'}">${grade}</span>
                <a href="paper-result.html?id=${paper.id}" class="btn btn-secondary btn-sm">View Details</a>
            </div>
        `;
        listContainer.appendChild(item);
    });
}

// Global scope for onclick handler
window.removeQuestion = function (id) {
    const el = document.getElementById(`q_block_${id}`);
    if (el) el.remove();
}
