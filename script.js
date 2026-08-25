// --- State Management ---
let tasks = JSON.parse(localStorage.getItem('studyTasks')) || [];
let currentTheme = localStorage.getItem('studyTheme') || 'light';
let isEditing = false;
let editingId = null;

// Timer State
let timerInterval;
let timeLeft = 25 * 60; // 25 minutes in seconds
let isTimerRunning = false;
let isStudyMode = true;

// --- DOM Elements ---
const themeToggle = document.getElementById('theme-toggle');
const navLinks = document.querySelectorAll('.nav-links li');
const views = document.querySelectorAll('.view');
const modalOverlay = document.getElementById('task-modal');
const taskForm = document.getElementById('task-form');

// --- Initialization ---
function init() {
    // Apply saved theme
    document.documentElement.setAttribute('data-theme', currentTheme);
    
    // Set dynamic date in dashboard greeting
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('current-date').innerText = `Today is ${new Date().toLocaleDateString(undefined, dateOptions)}`;
    
    // Set up event listeners
    setupEventListeners();
    
    // Initial Render
    updateUI();
}

// --- Event Listeners ---
function setupEventListeners() {
    // Theme Toggle
    themeToggle.addEventListener('click', () => {
        currentTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', currentTheme);
        localStorage.setItem('studyTheme', currentTheme);
    });

    // Navigation Switching
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            // Remove active classes
            navLinks.forEach(n => n.classList.remove('active'));
            views.forEach(v => v.classList.remove('active'));
            
            // Add active to clicked
            link.classList.add('active');
            const targetId = link.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');
        });
    });

    // Form Submission for Tasks
    taskForm.addEventListener('submit', handleTaskSubmit);

    // Search and Filter Listeners
    document.getElementById('search-task').addEventListener('input', renderTasksView);
    document.getElementById('filter-task').addEventListener('change', renderTasksView);

    // Timer Controls
    document.getElementById('btn-start').addEventListener('click', startTimer);
    document.getElementById('btn-pause').addEventListener('click', pauseTimer);
    document.getElementById('btn-reset').addEventListener('click', resetTimer);
    
    document.getElementById('mode-pomodoro').addEventListener('click', () => switchTimerMode(true));
    document.getElementById('mode-break').addEventListener('click', () => switchTimerMode(false));
}

// --- Task Management Functions ---

function handleTaskSubmit(e) {
    e.preventDefault(); // Prevent page reload
    
    const title = document.getElementById('task-title').value.trim();
    const subject = document.getElementById('task-subject').value.trim();
    const priority = document.getElementById('task-priority').value;

    if (!title || !subject) return;

    if (isEditing) {
        // Update existing task
        const taskIndex = tasks.findIndex(t => t.id === editingId);
        tasks[taskIndex] = { ...tasks[taskIndex], title, subject, priority };
    } else {
        // Add new task
        const newTask = {
            id: Date.now(),
            title,
            subject,
            priority,
            completed: false
        };
        tasks.push(newTask);
    }

    saveTasks();
    closeModal();
    updateUI();
}

function toggleTaskStatus(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        saveTasks();
        updateUI();
    }
}

function deleteTask(id) {
    if (confirm("Are you sure you want to delete this task?")) {
        tasks = tasks.filter(t => t.id !== id);
        saveTasks();
        updateUI();
    }
}

function editTask(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    
    document.getElementById('task-title').value = task.title;
    document.getElementById('task-subject').value = task.subject;
    document.getElementById('task-priority').value = task.priority;
    
    isEditing = true;
    editingId = id;
    document.getElementById('modal-title').innerText = "Edit Task";
    modalOverlay.classList.add('active');
}

function saveTasks() {
    localStorage.setItem('studyTasks', JSON.stringify(tasks));
}

// --- UI Rendering ---

// Master render function calling sub-renders
function updateUI() {
    renderDashboard();
    renderTasksView();
    renderProgress();
}

function renderDashboard() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const remaining = total - completed;
    const progressPercent = total === 0 ? 0 : Math.round((completed / total) * 100);

    // Update Stats
    document.getElementById('dash-completed').innerText = completed;
    document.getElementById('dash-remaining').innerText = remaining;
    document.getElementById('dash-progress-text').innerText = `${progressPercent}%`;
    document.getElementById('dash-progress-bar').style.width = `${progressPercent}%`;

    // Render Recent/Incomplete tasks on dashboard (Max 4)
    const dashboardList = document.getElementById('dashboard-task-list');
    const priorityTasks = tasks.filter(t => !t.completed).slice(0, 4);
    
    if (priorityTasks.length === 0) {
        dashboardList.innerHTML = `<div class="empty-state">All caught up! Take a break or add a new task.</div>`;
    } else {
        dashboardList.innerHTML = priorityTasks.map(createTaskHTML).join('');
    }
}

function renderTasksView() {
    const list = document.getElementById('main-task-list');
    const searchTerm = document.getElementById('search-task').value.toLowerCase();
    const filterValue = document.getElementById('filter-task').value;

    let filteredTasks = tasks.filter(task => {
        const matchesSearch = task.title.toLowerCase().includes(searchTerm) || task.subject.toLowerCase().includes(searchTerm);
        const matchesFilter = filterValue === 'all' ? true : 
                              filterValue === 'completed' ? task.completed : !task.completed;
        return matchesSearch && matchesFilter;
    });

    if (filteredTasks.length === 0) {
        list.innerHTML = `<div class="empty-state">No tasks found.</div>`;
    } else {
        list.innerHTML = filteredTasks.map(createTaskHTML).join('');
    }
}

function renderProgress() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const progressPercent = total === 0 ? 0 : Math.round((completed / total) * 100);

    document.getElementById('prog-total').innerText = total;
    document.getElementById('prog-completed').innerText = completed;
    document.getElementById('prog-rate-text').innerText = `${progressPercent}%`;
    document.getElementById('prog-rate-bar').style.width = `${progressPercent}%`;

    // Render Subject Chart using raw HTML/CSS
    const chartContainer = document.getElementById('subject-chart');
    if (total === 0) {
        chartContainer.innerHTML = '<div class="empty-state">Add tasks to see your subject breakdown.</div>';
        return;
    }

    // Group tasks by subject
    const subjectCounts = {};
    tasks.forEach(t => {
        subjectCounts[t.subject] = (subjectCounts[t.subject] || 0) + 1;
    });

    // Create chart HTML dynamically
    let chartHTML = '';
    for (const [subject, count] of Object.entries(subjectCounts)) {
        const percentage = Math.round((count / total) * 100);
        chartHTML += `
            <div class="chart-bar-row">
                <div class="chart-label">${subject}</div>
                <div class="chart-bar-wrap">
                    <div class="chart-bar-fill" style="width: ${percentage}%"></div>
                </div>
                <div class="chart-count">${count}</div>
            </div>
        `;
    }
    chartContainer.innerHTML = chartHTML;
}

// HTML generator helper for a single task element
function createTaskHTML(task) {
    return `
        <div class="task-item ${task.completed ? 'completed' : ''}">
            <div class="task-info">
                <div class="checkbox" onclick="toggleTaskStatus(${task.id})"></div>
                <div>
                    <div class="task-text">${task.title}</div>
                    <div class="task-badges">
                        <span class="badge subject">${task.subject}</span>
                        <span class="badge ${task.priority}">${task.priority}</span>
                    </div>
                </div>
            </div>
            <div class="task-actions">
                <button class="icon-btn" onclick="editTask(${task.id})" title="Edit">✎</button>
                <button class="icon-btn" onclick="deleteTask(${task.id})" title="Delete">🗑</button>
            </div>
        </div>
    `;
}

// --- Modal Functions ---
function openModal() {
    isEditing = false;
    document.getElementById('modal-title').innerText = "Add New Task";
    taskForm.reset();
    modalOverlay.classList.add('active');
}

function closeModal() {
    modalOverlay.classList.remove('active');
}

// --- Timer (Pomodoro) Logic ---
function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    document.getElementById('time-display').innerText = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function startTimer() {
    if (isTimerRunning) return;
    isTimerRunning = true;
    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();
        
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            isTimerRunning = false;
            alert(isStudyMode ? "Study session finished! Take a break." : "Break is over! Back to studying.");
            switchTimerMode(!isStudyMode);
        }
    }, 1000);
}

function pauseTimer() {
    clearInterval(timerInterval);
    isTimerRunning = false;
}

function resetTimer() {
    pauseTimer();
    timeLeft = isStudyMode ? 25 * 60 : 5 * 60;
    updateTimerDisplay();
}

function switchTimerMode(toStudy) {
    pauseTimer();
    isStudyMode = toStudy;
    timeLeft = isStudyMode ? 25 * 60 : 5 * 60;
    
    document.getElementById('mode-pomodoro').classList.toggle('active', isStudyMode);
    document.getElementById('mode-break').classList.toggle('active', !isStudyMode);
    
    updateTimerDisplay();
}

// Run app
init();
