/**
 * AI Assignment Grading System - API Data Layer
 * Handles all API communication with backend
 */

// Use relative URL when served from same server, or absolute when served separately
const API_BASE_URL = window.location.origin + '/api';

// Data Store Class
class DataStore {
    constructor() {
        this.currentUser = null;
        this.loadCurrentUser();
    }

    loadCurrentUser() {
        const stored = localStorage.getItem('current_user');
        if (stored) {
            try {
                this.currentUser = JSON.parse(stored);
            } catch (e) {
                this.currentUser = null;
            }
        }
    }

    saveCurrentUser(user) {
        this.currentUser = user;
        if (user) {
            localStorage.setItem('current_user', JSON.stringify(user));
        } else {
            localStorage.removeItem('current_user');
        }
    }

    // ========== AUTHENTICATION ==========

    async login(username, password, role) {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ username, password, role })
            });

            const data = await response.json();

            if (data.success) {
                this.saveCurrentUser(data.user);
                return { success: true, user: data.user };
            } else {
                return { success: false, message: data.error || 'Login failed' };
            }
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, message: 'Network error. Please check if backend is running.' };
        }
    }

    async registerUser(name, username, password, role, department, branch, semester) {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ name, username, password, role, department, branch, semester })
            });

            const data = await response.json();

            if (data.success) {
                return { success: true, user: data.user };
            } else {
                return { success: false, message: data.error || 'Registration failed' };
            }
        } catch (error) {
            console.error('Registration error:', error);
            return { success: false, message: 'Network error. Please check if backend is running.' };
        }
    }

    logout() {
        fetch(`${API_BASE_URL}/auth/logout`, {
            method: 'POST',
            credentials: 'include'
        }).catch(err => console.error('Logout error:', err));
        
        this.saveCurrentUser(null);
        window.location.href = '../login.html';
    }

    getCurrentUser() {
        return this.currentUser;
    }

    async requireAuth(allowedRole = null) {
        if (!this.currentUser) {
            window.location.href = '../login.html';
            return null;
        }

        // Verify with backend
        try {
            const response = await fetch(`${API_BASE_URL}/auth/current`, {
                method: 'GET',
                credentials: 'include'
            });

            const data = await response.json();
            if (!data.success) {
                this.saveCurrentUser(null);
                window.location.href = '../login.html';
                return null;
            }

            this.saveCurrentUser(data.user);
        } catch (error) {
            console.error('Auth check error:', error);
        }

        if (allowedRole && this.currentUser.role !== allowedRole) {
            alert('Unauthorized access');
            window.location.href = this.currentUser.role === 'faculty' 
                ? '../faculty/faculty-dashboard.html' 
                : '../student/student-dashboard.html';
            return null;
        }

        return this.currentUser;
    }

    // ========== ASSIGNMENTS ==========

    async getAssignments() {
        try {
            const response = await fetch(`${API_BASE_URL}/assignments`, {
                method: 'GET',
                credentials: 'include'
            });

            const data = await response.json();
            if (data.success) {
                return data.assignments || [];
            }
            return [];
        } catch (error) {
            console.error('Get assignments error:', error);
            return [];
        }
    }

    async getAssignmentById(id) {
        try {
            const response = await fetch(`${API_BASE_URL}/assignments/${id}`, {
                method: 'GET',
                credentials: 'include'
            });

            const data = await response.json();
            if (data.success) {
                return data.assignment;
            }
            return null;
        } catch (error) {
            console.error('Get assignment error:', error);
            return null;
        }
    }

    async createAssignment(title, subject, description, deadline, qFile, sFile) {
        const formData = new FormData();
        formData.append('title', title);
        formData.append('subject', subject);
        formData.append('description', description);
        formData.append('deadline', deadline);
        formData.append('question_pdf', qFile);
        formData.append('faculty_solution_pdf', sFile);

        try {
            const response = await fetch(`${API_BASE_URL}/faculty/create-assignment`, {
                method: 'POST',
                credentials: 'include',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                return { success: true, assignment: data.assignment };
            } else {
                return { success: false, error: data.error || 'Failed to create assignment' };
            }
        } catch (error) {
            console.error('Create assignment error:', error);
            return { success: false, error: 'Network error. Please check if backend is running.' };
        }
    }

    // ========== SUBMISSIONS ==========

    async getSubmissions() {
        try {
            const response = await fetch(`${API_BASE_URL}/submissions`, {
                method: 'GET',
                credentials: 'include'
            });

            const data = await response.json();
            if (data.success) {
                return data.submissions || [];
            }
            return [];
        } catch (error) {
            console.error('Get submissions error:', error);
            return [];
        }
    }

    async getSubmissionById(id) {
        try {
            const response = await fetch(`${API_BASE_URL}/submissions/${id}`, {
                method: 'GET',
                credentials: 'include'
            });

            const data = await response.json();
            if (data.success) {
                return data.submission;
            }
            return null;
        } catch (error) {
            console.error('Get submission error:', error);
            return null;
        }
    }

    async submitAssignment(assignmentId, studentId, studentPdfFile) {
        const formData = new FormData();
        formData.append('assignment_id', assignmentId);
        formData.append('student_id', studentId);
        formData.append('sub_pdf', studentPdfFile);

        try {
            const response = await fetch(`${API_BASE_URL}/student/submit-assignment`, {
                method: 'POST',
                credentials: 'include',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                return { success: true, result: data.result };
            } else {
                return { success: false, error: data.error || 'Submission failed' };
            }
        } catch (error) {
            console.error('Submit assignment error:', error);
            return { success: false, error: 'Network error. Please check if backend is running.' };
        }
    }

    async getStudentSubmissions(studentId) {
        const submissions = await this.getSubmissions();
        return submissions.filter(s => s.studentId === studentId);
    }

    async getAssignmentSubmissions(assignmentId) {
        try {
            const response = await fetch(`${API_BASE_URL}/assignments/${assignmentId}/submissions`, {
                method: 'GET',
                credentials: 'include'
            });

            const data = await response.json();
            if (data.success) {
                return data.submissions || [];
            }
            return [];
        } catch (error) {
            console.error('Get assignment submissions error:', error);
            return [];
        }
    }

    // ========== PAPER CHECK (Teachers Only) ==========

    async checkPaper(questionPdf, answerPdf) {
        const formData = new FormData();
        formData.append('question_pdf', questionPdf);
        formData.append('answer_pdf', answerPdf);

        try {
            const response = await fetch(`${API_BASE_URL}/faculty/check-paper`, {
                method: 'POST',
                credentials: 'include',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                return { success: true, paper: data.paper };
            } else {
                return { success: false, error: data.error || 'Paper check failed' };
            }
        } catch (error) {
            console.error('Check paper error:', error);
            return { success: false, error: 'Network error. Please check if backend is running.' };
        }
    }

    async getPapers() {
        try {
            const response = await fetch(`${API_BASE_URL}/faculty/papers`, {
                method: 'GET',
                credentials: 'include'
            });

            const data = await response.json();
            if (data.success) {
                return data.papers || [];
            }
            return [];
        } catch (error) {
            console.error('Get papers error:', error);
            return [];
        }
    }

    async getPaperById(id) {
        try {
            const response = await fetch(`${API_BASE_URL}/faculty/papers/${id}`, {
                method: 'GET',
                credentials: 'include'
            });

            const data = await response.json();
            if (data.success) {
                return data.paper;
            }
            return null;
        } catch (error) {
            console.error('Get paper error:', error);
            return null;
        }
    }

    // ========== FILE URL HELPERS ==========

    getFileUrl(filename) {
        return `${API_BASE_URL}/files/${filename}`;
    }
}

// Global instance
const db = new DataStore();
