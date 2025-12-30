document.addEventListener('DOMContentLoaded', async () => {
    await initSidebar();
});

async function initSidebar() {
    // 1. Check if sidebar already exists (avoid duplicates)
    if (document.getElementById('sidebar')) return;

    // 2. Wrap existing content to push it right
    document.body.classList.add('with-sidebar');

    // 3. Get current user (async check)
    const user = db.getCurrentUser();
    if (!user) {
        // Try to get from backend if not in localStorage
        try {
            const response = await fetch(`${window.location.origin}/api/auth/current`, {
                method: 'GET',
                credentials: 'include'
            });
            const data = await response.json();
            if (data.success) {
                db.saveCurrentUser(data.user);
                // Retry initialization with user
                await initSidebar();
                return;
            }
        } catch (e) {
            // Not authenticated, don't show sidebar
            return;
        }
        return; // No user found
    }

    // 4. Create Sidebar Elements
    const sidebar = document.createElement('aside');
    sidebar.id = 'sidebar';
    sidebar.className = 'sidebar';

    // 5. Hamburger Button (Mobile)
    if (!document.querySelector('.hamburger-btn')) {
        const hamburger = document.createElement('button');
        hamburger.className = 'hamburger-btn';
        hamburger.innerHTML = '☰';
        hamburger.onclick = () => {
            sidebar.classList.toggle('open');
        };
        document.body.appendChild(hamburger);
    }

    // Header (User Profile)
    const header = document.createElement('div');
    header.className = 'sidebar-header';
    header.innerHTML = `
        <div class="user-profile">
            <div class="user-avatar">${(user.name || user.username).charAt(0).toUpperCase()}</div>
            <div class="user-info">
                <div class="user-name">${user.name || user.username}</div>
                <div class="user-role">${user.role.charAt(0).toUpperCase() + user.role.slice(1)}</div>
            </div>
        </div>
    `;
    sidebar.appendChild(header);

    // Menu Content (Scrollable)
    const menu = document.createElement('div');
    menu.className = 'sidebar-menu';
    menu.id = 'sidebarMenuContent';

    // Generate Tree based on Role (async)
    await renderSidebarTree(menu, user);

    sidebar.appendChild(menu);

    // Footer (Logout)
    const footer = document.createElement('div');
    footer.className = 'sidebar-footer';
    footer.innerHTML = `
        <button class="btn-logout" onclick="db.logout()">
            <span>Logout</span>
        </button>
    `;
    sidebar.appendChild(footer);

    // Inject into DOM
    document.body.prepend(sidebar);

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768) {
            if (!sidebar.contains(e.target) && !e.target.classList.contains('hamburger-btn')) {
                sidebar.classList.remove('open');
            }
        }
    });
}

// Global Filter Function
window.filterSidebarBySubject = async function (subject) {
    const user = db.getCurrentUser();
    const menu = document.getElementById('sidebarMenuContent');
    if (!user || !menu) return;
    await renderSidebarTree(menu, user, subject);
};

// Refresh sidebar (useful after data changes)
window.refreshSidebar = async function () {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) {
        await initSidebar();
        return;
    }
    
    const menu = document.getElementById('sidebarMenuContent');
    const user = db.getCurrentUser();
    if (menu && user) {
        await renderSidebarTree(menu, user);
    }
};

async function renderSidebarTree(container, user, subjectFilter = null) {
    container.innerHTML = '<div style="padding: 1rem; color: #6b7280;">Loading...</div>';
    
    if (user.role === 'faculty') {
        const tree = await buildFacultyTree(user, subjectFilter);
        container.innerHTML = '';
        container.appendChild(tree);
    } else {
        const tree = await buildStudentTree(user, subjectFilter);
        container.innerHTML = '';
        container.appendChild(tree);
    }
}

// --- Hierarchy Builders ---

async function buildFacultyTree(user, subjectFilter = null) {
    const container = document.createElement('div');
    let assignments = await db.getAssignments();

    if (subjectFilter) {
        assignments = assignments.filter(asg => asg.subject === subjectFilter);
    }

    // Root: Faculty Name -> Branch -> Semester
    const rootUl = document.createElement('ul');
    rootUl.className = 'tree-root';

    // 1. Branch Node
    const userBranch = user.branch || 'CSE Dept';
    const displayBranch = subjectFilter ? `${userBranch} (${subjectFilter})` : userBranch;
    const branchNode = createTreeNode(displayBranch, true);
    const branchUl = document.createElement('ul');

    // 2. Semester Node
    const userSem = user.semester ? `Semester ${user.semester}` : 'Semester 5';
    const semNode = createTreeNode(userSem, true);
    const semUl = document.createElement('ul');

    // 3. Assignments Root
    const asgRootNode = createTreeNode('Assignments', true);
    const asgRootUl = document.createElement('ul');

    // 4. Assigned Folder
    const assignedNode = createTreeNode('Assigned', true);
    const assignedUl = document.createElement('ul');

    if (assignments.length === 0) {
        const emptyNode = createTreeNode('No assignments', false);
        emptyNode.querySelector('.tree-label').style.color = 'var(--text-muted)';
        assignedUl.appendChild(emptyNode);
    } else {
        assignments.forEach(asg => {
            const asgNode = createTreeNode(asg.title, false, () => {
                if (window.viewSubmissions) {
                    window.viewSubmissions(asg.id, asg.title);
                } else {
                    window.location.href = `faculty/faculty-dashboard.html`;
                }
            });
            assignedUl.appendChild(asgNode);
        });
    }

    assignedNode.appendChild(assignedUl);
    asgRootUl.appendChild(assignedNode);
    asgRootNode.appendChild(asgRootUl);

    semUl.appendChild(asgRootNode);
    semNode.appendChild(semUl);
    branchUl.appendChild(semNode);
    branchNode.appendChild(branchUl);
    rootUl.appendChild(branchNode);

    container.appendChild(rootUl);
    return container;
}

async function buildStudentTree(user, subjectFilter = null) {
    const container = document.createElement('div');
    const assignments = await db.getAssignments();
    const submissions = await db.getStudentSubmissions(user.id);

    // Identify Pending vs Completed
    const pending = [];
    const completed = [];

    assignments.forEach(asg => {
        const isSubmitted = submissions.find(s => s.assignmentId === asg.id);
        if (isSubmitted) {
            completed.push({ asg, sub: isSubmitted });
        } else {
            pending.push(asg);
        }
    });

    const rootUl = document.createElement('ul');
    rootUl.className = 'tree-root';

    // 1. Branch/Sem (Dynamic)
    const branchLabel = (user.branch && user.semester) ? `${user.branch} - Sem ${user.semester}` : 'CSE - Sem 5';
    const displayBranch = subjectFilter ? `${branchLabel} (${subjectFilter})` : branchLabel;

    const branchNode = createTreeNode(displayBranch, true);
    const branchUl = document.createElement('ul');

    // 2. Assignments Root
    const asgRootNode = createTreeNode('Assignments', true);
    const asgRootUl = document.createElement('ul');

    // 3A. Pending Folder
    const pendingNode = createTreeNode('Pending', true);
    const pendingUl = document.createElement('ul');

    if (pending.length === 0) {
        const emptyNode = createTreeNode('No pending work', false);
        emptyNode.querySelector('.tree-label').style.color = 'var(--text-muted)';
        pendingUl.appendChild(emptyNode);
    } else {
        pending.forEach(asg => {
            const asgNode = createTreeNode(asg.title, false, () => {
                window.location.href = `submit-assignment.html?id=${asg.id}`;
            }, 'status-pending');
            pendingUl.appendChild(asgNode);
        });
    }
    pendingNode.appendChild(pendingUl);

    // 3B. Completed Folder
    const completedNode = createTreeNode('Completed', true);
    const completedUl = document.createElement('ul');

    if (completed.length === 0) {
        const emptyNode = createTreeNode('No completed work', false);
        emptyNode.querySelector('.tree-label').style.color = 'var(--text-muted)';
        completedUl.appendChild(emptyNode);
    } else {
        completed.forEach(item => {
            const asgNode = createTreeNode(item.asg.title, false, () => {
                window.location.href = `ai-result.html?submissionId=${item.sub.id}`;
            }, 'status-done');
            completedUl.appendChild(asgNode);
        });
    }
    completedNode.appendChild(completedUl);

    asgRootUl.appendChild(pendingNode);
    asgRootUl.appendChild(completedNode);
    asgRootNode.appendChild(asgRootUl);

    branchUl.appendChild(asgRootNode);
    branchNode.appendChild(branchUl);
    rootUl.appendChild(branchNode);
    container.appendChild(rootUl);

    return container;
}

// Helper to create tree nodes
function createTreeNode(text, isFolder, onClick = null, extraClass = '') {
    const li = document.createElement('li');
    li.className = 'tree-item';

    const div = document.createElement('div');
    div.className = `tree-label ${extraClass}`;

    // Icon
    const icon = document.createElement('span');
    icon.className = 'tree-icon';
    icon.innerHTML = isFolder ? '▶' : '•';
    icon.style.display = 'inline-block';
    icon.style.width = '20px';
    icon.style.fontSize = '12px';
    icon.style.transition = 'transform 0.2s';

    const span = document.createElement('span');
    span.textContent = text;

    div.appendChild(icon);
    div.appendChild(span);

    li.appendChild(div);

    if (isFolder) {
        div.style.fontWeight = '600';
        div.style.cursor = 'pointer';

        let isOpen = true; // Default open
        icon.style.transform = 'rotate(90deg)';

        div.onclick = (e) => {
            e.stopPropagation();
            isOpen = !isOpen;
            // Toggle visibility of children (ul)
            const childrenUl = li.querySelector('ul');
            if (childrenUl) {
                childrenUl.style.display = isOpen ? 'block' : 'none';
                icon.style.transform = isOpen ? 'rotate(90deg)' : 'rotate(0deg)';
            }
        };
    } else {
        div.style.cursor = 'pointer';
        div.onclick = (e) => {
            e.stopPropagation();
            // Click Highlight
            document.querySelectorAll('.tree-label').forEach(el => el.classList.remove('active'));
            div.classList.add('active');
            if (onClick) onClick();
        };
    }

    return li;
}
