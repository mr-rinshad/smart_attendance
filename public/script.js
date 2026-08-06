const API = "http://localhost:3000";

let currentSessionId = null;
let html5QrCodeInstance = null;

// ==========================================================================
// SESSION MANAGEMENT (PER-TAB ISOLATION & ROLE PROTECTION)
// ==========================================================================
function getCurrentUser() {
    try {
        const sessionUser = sessionStorage.getItem("user");
        if (sessionUser) return JSON.parse(sessionUser);
        const localUser = localStorage.getItem("user");
        if (localUser) return JSON.parse(localUser);
    } catch (e) {
        console.error("Error reading user session:", e);
    }
    return null;
}

function checkRoleAccess(requiredRole) {
    const user = getCurrentUser();
    if (!user) {
        showToast("Please log in to access this page", "warning");
        setTimeout(() => { window.location.href = "login.html"; }, 800);
        return false;
    }

    if (user.role !== requiredRole) {
        showToast(`Access redirected to your ${user.role.toUpperCase()} dashboard`, "info");
        setTimeout(() => {
            if (user.role === "teacher") window.location.href = "teacher.html";
            else if (user.role === "student") window.location.href = "student.html";
            else if (user.role === "admin") window.location.href = "admin.html";
            else window.location.href = "login.html";
        }, 800);
        return false;
    }
    return true;
}

// ==========================================================================
// TOAST NOTIFICATION SYSTEM
// ==========================================================================
function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconClass = 'fa-circle-info';
    if (type === 'success') iconClass = 'fa-circle-check';
    if (type === 'danger') iconClass = 'fa-circle-xmark';
    if (type === 'warning') iconClass = 'fa-triangle-exclamation';

    toast.innerHTML = `<i class="fa-solid ${iconClass}"></i> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'toastOut 0.3s forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

function notify(msg) {
    if (msg.toLowerCase().includes('success') || msg.toLowerCase().includes('registered') || msg.toLowerCase().includes('marked') || msg.toLowerCase().includes('added')) {
        showToast(msg, 'success');
    } else if (msg.toLowerCase().includes('failed') || msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('wrong') || msg.toLowerCase().includes('error')) {
        showToast(msg, 'danger');
    } else {
        showToast(msg, 'info');
    }
}

// ==========================================================================
// CLIENT-SIDE TABLE / CARD FILTER
// ==========================================================================
function filterTable(inputId, containerId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const filter = input.value.toLowerCase();
    const container = document.getElementById(containerId);
    if (!container) return;

    const items = container.querySelectorAll('tbody tr, .subject-mini-card');
    items.forEach(item => {
        const text = item.innerText.toLowerCase();
        item.style.display = text.includes(filter) ? '' : 'none';
    });
}

// ==========================================================================
// REGISTER USER
// ==========================================================================
function register() {
    const role = document.getElementById("role").value;
    let rollNo = null;

    if (role === "student") {
        rollNo = document.getElementById("rollno").value;
    }

    const data = {
        name: document.getElementById("name").value,
        email: document.getElementById("email").value,
        roll_no: rollNo,
        password: document.getElementById("password").value,
        role: role
    };

    if (!data.name || !data.email || !data.password) {
        showToast("Please fill in all required fields", "warning");
        return;
    }

    if (role === "student" && !rollNo) {
        showToast("Please enter your Roll Number", "warning");
        return;
    }

    fetch(`${API}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    })
    .then(res => res.text())
    .then(data => {
        notify(data);
        if (data === "User Registered Successfully") {
            setTimeout(() => {
                window.location = "login.html";
            }, 1200);
        }
    })
    .catch(err => {
        console.log(err);
        showToast("Something went wrong with registration", "danger");
    });
}

// ==========================================================================
// TOGGLE ROLL NUMBER FIELD
// ==========================================================================
function toggleRollNo() {
    const roleSelect = document.getElementById("role");
    if (!roleSelect) return;
    const role = roleSelect.value;
    const rollField = document.getElementById("rollNoField");
    if (!rollField) return;

    if (role === "teacher") {
        rollField.style.display = "none";
    } else {
        rollField.style.display = "block";
    }
}

// ==========================================================================
// LOGIN USER
// ==========================================================================
function login() {
    const data = {
        email: document.getElementById("loginEmail").value,
        password: document.getElementById("loginPassword").value
    };

    if (!data.email || !data.password) {
        showToast("Please enter your email and password", "warning");
        return;
    }

    fetch(`${API}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    })
    .then(res => res.json())
    .then(data => {
        if (data.message === "Invalid credentials" || data === "Invalid Email or Password") {
            showToast("Invalid Email or Password", "danger");
            return;
        }

        if (data.user) {
            // Save to both sessionStorage (tab-isolated) and localStorage
            sessionStorage.setItem("user", JSON.stringify(data.user));
            localStorage.setItem("user", JSON.stringify(data.user));

            showToast(`Welcome back, ${data.user.name}!`, "success");

            setTimeout(() => {
                if (data.user.role === "teacher") {
                    window.location = "teacher.html";
                } else if (data.user.role === "student") {
                    window.location = "student.html";
                } else if (data.user.role === "admin") {
                    window.location = "admin.html";
                }
            }, 800);
        } else {
            showToast("Invalid Email or Password", "danger");
        }
    })
    .catch(err => {
        console.log(err);
        showToast("Something went wrong during login", "danger");
    });
}

// ==========================================================================
// DYNAMIC SUBJECTS LOADER FOR TEACHER & STUDENT
// ==========================================================================
function loadSubjectsForTeacher() {
    const select = document.getElementById("subjectSelect");
    if (!select) return;

    fetch(`${API}/subjects`)
    .then(res => res.json())
    .then(subjects => {
        if (!subjects || !subjects.length) {
            select.innerHTML = `<option value="">No Subjects Available (Add in Admin)</option>`;
            return;
        }

        let options = "";
        subjects.forEach(sub => {
            options += `<option value="${sub.id}">${sub.subject_name}</option>`;
        });
        select.innerHTML = options;
    })
    .catch(err => {
        console.error("Error loading subjects:", err);
    });
}

// ==========================================================================
// CREATE TEACHER SESSION
// ==========================================================================
function createSession() {
    const user = getCurrentUser();
    if (!user) return;
    const subjectSelect = document.getElementById("subjectSelect");
    if (!subjectSelect || !subjectSelect.value) {
        showToast("Please select a subject first (Add subjects in Admin if list is empty)", "warning");
        return;
    }
    const subjectId = subjectSelect.value;
    const expiryMinutes = document.getElementById("expiryTime").value;

    fetch(`${API}/create-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            teacher_id: user.id,
            subject_id: subjectId,
            expiry_minutes: expiryMinutes
        })
    })
    .then(res => res.json())
    .then(data => {
        currentSessionId = data.session_id;

        document.getElementById("qrImage").src = data.qr;
        showToast("New Attendance QR generated!", "success");

        startCountdown(expiryMinutes * 60, data.session_id);
        loadSessionAttendance(data.session_id);
    })
    .catch(err => {
        console.error(err);
        showToast("Failed to create session", "danger");
    });
}

// ==========================================================================
// COUNTDOWN TIMER
// ==========================================================================
function startCountdown(seconds, sessionId) {
    const stateEmpty = document.getElementById("stateEmpty");
    const stateActive = document.getElementById("stateActive");
    const stateExpired = document.getElementById("stateExpired");

    if (stateEmpty) stateEmpty.style.display = "none";
    if (stateActive) stateActive.style.display = "flex";
    if (stateExpired) stateExpired.style.display = "none";

    const timerText = document.getElementById("timerText");
    const downloadBtn = document.getElementById("downloadBtn");

    const refreshInterval = setInterval(() => {
        loadSessionAttendance(sessionId);
    }, 3000);

    const interval = setInterval(() => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;

        if (timerText) {
            timerText.innerText = `QR Expires In: ${mins}:${secs.toString().padStart(2, "0")}`;
        }

        seconds--;

        if (seconds < 0) {
            clearInterval(interval);
            clearInterval(refreshInterval);

            if (stateActive) stateActive.style.display = "none";
            if (stateExpired) stateExpired.style.display = "flex";

            if (downloadBtn) {
                downloadBtn.style.display = "flex";
                downloadBtn.onclick = () => {
                    window.open(`${API}/download-attendance/${sessionId}`);
                };
            }
            showToast("QR Session has expired", "warning");
        }
    }, 1000);
}

// ==========================================================================
// LOAD SESSION ATTENDANCE
// ==========================================================================
function loadSessionAttendance(sessionId) {
    fetch(`${API}/session-attendance/${sessionId}`)
    .then(res => res.json())
    .then(data => {
        let rows = "";
        data.forEach(student => {
            rows += `
                <tr>
                    <td><strong>${student.roll_no}</strong></td>
                    <td>${student.name}</td>
                    <td style="text-align: right;">
                        <button class="action-btn-danger"
                            onclick="removeAttendance(${student.attendance_id}, ${sessionId})"
                            title="Remove Student">
                            <i class="fa-solid fa-user-minus"></i> Remove
                        </button>
                    </td>
                </tr>
            `;
        });

        const html = `
            <table class="modern-table">
                <thead>
                    <tr>
                        <th>Roll No</th>
                        <th>Student Name</th>
                        <th style="text-align: right;">Action</th>
                    </tr>
                </thead>
                <tbody>${rows || '<tr><td colspan="3" style="text-align:center; color:var(--text-muted); padding: 20px;">No students scanned in yet</td></tr>'}</tbody>
            </table>
        `;

        const container = document.getElementById("sessionAttendance");
        if (container) container.innerHTML = html;

        loadAttendanceCount(sessionId);
    });
}

function loadAttendanceCount(sessionId) {
    fetch(`${API}/attendance-count/${sessionId}`)
    .then(res => res.json())
    .then(data => {
        const liveCount = document.getElementById("liveCount");
        if (liveCount) {
            liveCount.innerHTML = `<i class="fa-solid fa-users"></i> Total Present: ${data.total}`;
        }
    });
}

// ==========================================================================
// REMOVE ATTENDANCE RECORD
// ==========================================================================
function removeAttendance(attendanceId, sessionId) {
    if (!confirm("Remove this student from current session attendance?")) return;

    fetch(`${API}/remove-attendance/${attendanceId}`, {
        method: "DELETE"
    })
    .then(res => res.text())
    .then(data => {
        notify(data);
        loadSessionAttendance(sessionId);
    });
}

// ==========================================================================
// MANUAL ATTENDANCE MARKING
// ==========================================================================
function markAttendance() {
    const user = getCurrentUser();
    if (!user) return;
    const sessionCodeInput = document.getElementById("sessionCode");
    const sessionCode = sessionCodeInput ? sessionCodeInput.value : "";

    if (!sessionCode) {
        showToast("Please enter a session code", "warning");
        return;
    }

    fetch(`${API}/mark-attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            student_id: user.id,
            session_code: sessionCode
        })
    })
    .then(res => res.text())
    .then(data => {
        notify(data);
        if (typeof loadAttendancePercentage === "function") loadAttendancePercentage();
        if (typeof loadOverallAttendance === "function") loadOverallAttendance();
    });
}

// ==========================================================================
// QR SCANNER FOR STUDENTS
// ==========================================================================
function openScannerModal() {
    const modal = document.getElementById("scannerModal");
    if (modal) modal.classList.add("active");
    openScanner();
}

function closeScannerModal() {
    const modal = document.getElementById("scannerModal");
    if (modal) modal.classList.remove("active");
    if (html5QrCodeInstance) {
        try {
            html5QrCodeInstance.stop();
        } catch(e){}
    }
}

function openScanner() {
    const user = getCurrentUser();
    if (!user) return;
    let scanned = false;

    if (!document.getElementById("reader")) return;

    html5QrCodeInstance = new Html5Qrcode("reader");

    function onScanSuccess(decodedText) {
        if (scanned) return;
        scanned = true;

        const resultEl = document.getElementById("result");
        if (resultEl) resultEl.innerText = "QR Detected: " + decodedText;

        html5QrCodeInstance.stop();
        closeScannerModal();

        fetch(`${API}/mark-attendance`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                student_id: user.id,
                session_code: decodedText
            })
        })
        .then(res => res.text())
        .then(data => {
            notify(data);
            if (typeof loadAttendancePercentage === "function") loadAttendancePercentage();
            if (typeof loadOverallAttendance === "function") loadOverallAttendance();
        });
    }

    function onScanError(error) {
        // Silent
    }

    Html5Qrcode.getCameras()
    .then(devices => {
        if (devices.length) {
            html5QrCodeInstance.start(
                devices[0].id,
                { fps: 10, qrbox: 250 },
                onScanSuccess,
                onScanError
            );
        } else {
            showToast("No camera detected on device", "warning");
        }
    })
    .catch(err => {
        console.error(err);
        showToast("Camera permission denied or unaccessible", "danger");
    });
}

// ==========================================================================
// LOAD STUDENT ATTENDANCE DATA & ALL SUBJECTS
// ==========================================================================
function loadAttendancePercentage() {
    const user = getCurrentUser();
    if (!user) return;

    fetch(`${API}/attendance-percentage/${user.id}`)
    .then(res => res.json())
    .then(data => {
        let html = "";
        
        if (data && data.length) {
            data.forEach((item) => {
                const totalClasses = parseInt(item.total_classes) || 0;
                const presentCount = parseInt(item.present_count) || 0;
                const pct = totalClasses > 0 ? (presentCount / totalClasses) * 100 : 0;
                
                let barColor = "#2563eb";
                let pctDisplay = totalClasses > 0 ? `${pct.toFixed(1)}%` : "No Classes Held";

                if (totalClasses > 0) {
                    if (pct >= 85) barColor = "#059669";
                    else if (pct >= 75) barColor = "#2563eb";
                    else if (pct >= 60) barColor = "#d97706";
                    else barColor = "#dc2626";
                } else {
                    barColor = "#94a3b8";
                }

                html += `
                    <div class="subject-mini-card">
                        <div class="subject-card-header">
                            <span class="subject-title">${item.subject_name}</span>
                            <span class="subject-pct-pill" style="color:${barColor};">${pctDisplay}</span>
                        </div>
                        <div class="subject-progress-bg">
                            <div class="subject-progress-fill" style="width: ${totalClasses > 0 ? pct : 0}%; background-color: ${barColor};"></div>
                        </div>
                        <div class="subject-stats-row">
                            <div class="sub-stat-item">
                                <span class="sub-stat-title">Present</span>
                                <div class="sub-stat-val" style="color:#059669;">${presentCount}</div>
                            </div>
                            <div class="sub-stat-item">
                                <span class="sub-stat-title">Classes</span>
                                <div class="sub-stat-val" style="color:#2563eb;">${totalClasses}</div>
                            </div>
                            <div class="sub-stat-item">
                                <span class="sub-stat-title">Status</span>
                                <div class="sub-stat-val" style="color:${barColor}; font-size: 14px;">${totalClasses > 0 ? pct.toFixed(0) + '%' : 'Pending'}</div>
                            </div>
                        </div>
                    </div>
                `;
            });
        }

        const list = document.getElementById("percentageList");
        if (list) {
            list.innerHTML = html || `<p style="grid-column:1/-1; text-align:center; color:var(--text-muted); padding:20px;">No subjects added to system yet.</p>`;
        }
    })
    .catch(err => {
        console.error("Error loading student percentage:", err);
    });
}

function loadOverallAttendance() {
    const user = getCurrentUser();
    if (!user) return;

    fetch(`${API}/overall-attendance/${user.id}`)
    .then(res => res.json())
    .then(data => {
        const totalClasses = parseInt(data.total_classes) || 0;
        const totalPresent = parseInt(data.total_present) || 0;
        const percentage = totalClasses > 0 ? (totalPresent / totalClasses) * 100 : 0;
        
        const circumference = 440;
        const offset = circumference - (percentage / 100) * circumference;

        const circle = document.getElementById("progressCircle");
        if (circle) {
            circle.style.strokeDashoffset = totalClasses > 0 ? offset : circumference;
            if (percentage >= 75) circle.setAttribute("stroke", "#059669");
            else if (percentage >= 60) circle.setAttribute("stroke", "#d97706");
            else circle.setAttribute("stroke", "#dc2626");
        }

        const pctText = document.getElementById("pctText");
        if (pctText) pctText.innerText = totalClasses > 0 ? `${percentage.toFixed(1)}%` : `0%`;

        const presentCount = document.getElementById("presentCount");
        if (presentCount) presentCount.innerText = totalPresent;

        const totalClassesEl = document.getElementById("totalClasses");
        if (totalClassesEl) totalClassesEl.innerText = totalClasses;
    });
}

// ==========================================================================
// ADMIN LOADERS
// ==========================================================================
function loadStudents() {
    fetch(`${API}/students`)
    .then(res => res.json())
    .then(data => {
        const container = document.getElementById("studentsList");
        if (!container) return;

        if (!data.length) {
            container.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-muted);"><i class="fa-solid fa-user-graduate" style="font-size:24px; margin-bottom:8px; display:block;"></i>No students registered yet.</div>`;
            return;
        }

        let rows = "";
        data.forEach(student => {
            rows += `
                <tr>
                    <td><strong>${student.roll_no}</strong></td>
                    <td>${student.name}</td>
                    <td>${student.email}</td>
                    <td style="text-align: right;">
                        <button class="action-btn-danger" onclick="deleteUser(${student.id})" title="Delete Student">
                            <i class="fa-solid fa-trash"></i> Delete
                        </button>
                    </td>
                </tr>`;
        });

        container.innerHTML = `
            <div class="table-responsive">
                <table class="modern-table">
                    <thead><tr>
                        <th>Roll No</th><th>Name</th><th>Email</th><th style="text-align: right;">Action</th>
                    </tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>`;
    });
}

function loadTeachers() {
    fetch(`${API}/teachers`)
    .then(res => res.json())
    .then(data => {
        const container = document.getElementById("teachersList");
        if (!container) return;

        if (!data.length) {
            container.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-muted);"><i class="fa-solid fa-chalkboard-user" style="font-size:24px; margin-bottom:8px; display:block;"></i>No teachers registered yet.</div>`;
            return;
        }

        let rows = "";
        data.forEach(teacher => {
            rows += `
                <tr>
                    <td><strong>${teacher.name}</strong></td>
                    <td>${teacher.email}</td>
                    <td style="text-align: right;">
                        <button class="action-btn-danger" onclick="deleteUser(${teacher.id})" title="Delete Teacher">
                            <i class="fa-solid fa-trash"></i> Delete
                        </button>
                    </td>
                </tr>`;
        });

        container.innerHTML = `
            <div class="table-responsive">
                <table class="modern-table">
                    <thead><tr>
                        <th>Name</th><th>Email</th><th style="text-align: right;">Action</th>
                    </tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>`;
    });
}

function loadSubjects() {
    fetch(`${API}/subjects`)
    .then(res => res.json())
    .then(data => {
        const container = document.getElementById("subjectsList");
        if (!container) return;

        if (!data.length) {
            container.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-muted);"><i class="fa-solid fa-book" style="font-size:24px; margin-bottom:8px; display:block;"></i>No subjects added yet.</div>`;
            return;
        }

        let rows = "";
        data.forEach(subject => {
            rows += `
                <tr>
                    <td><strong>#${subject.id}</strong></td>
                    <td>${subject.subject_name}</td>
                    <td style="text-align: right;">
                        <button class="action-btn-danger" onclick="deleteSubject(${subject.id})" title="Delete Subject">
                            <i class="fa-solid fa-trash"></i> Delete
                        </button>
                    </td>
                </tr>`;
        });

        container.innerHTML = `
            <div class="table-responsive">
                <table class="modern-table">
                    <thead><tr>
                        <th>ID</th><th>Subject Name</th><th style="text-align: right;">Action</th>
                    </tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>`;
    });
}

function deleteSubject(id) {
    if (!confirm("Are you sure you want to delete this subject?")) return;

    fetch(`${API}/delete-subject/${id}`, { method: "DELETE" })
    .then(res => res.text())
    .then(data => {
        notify(data);
        loadSubjects();
        loadStats();
        loadSubjectsForTeacher();
    });
}

function deleteUser(id) {
    if (!confirm("Are you sure you want to delete this user?")) return;

    fetch(`${API}/delete-user/${id}`, { method: "DELETE" })
    .then(res => res.text())
    .then(data => {
        notify(data);
        loadStudents();
        loadTeachers();
        loadStats();
    });
}

function addSubject() {
    const input = document.getElementById("subjectName");
    const subject = input ? input.value : "";

    if (!subject) {
        showToast("Enter a valid subject name", "warning");
        return;
    }

    fetch(`${API}/add-subject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject_name: subject })
    })
    .then(res => res.text())
    .then(data => {
        notify(data);
        if (input) input.value = "";
        loadSubjects();
        loadStats();
        loadSubjectsForTeacher();
    });
}

function resetAttendance() {
    if (!confirm("PERMANENT ACTION: Are you sure you want to reset ALL attendance records in the database?")) return;

    fetch(`${API}/reset-attendance`, { method: "DELETE" })
    .then(res => res.text())
    .then(data => {
        notify(data);
    });
}

function loadStats() {
    fetch(`${API}/system-stats`)
    .then(res => res.json())
    .then(data => {
        const s = document.getElementById("totalStudents");
        const t = document.getElementById("totalTeachers");
        const sub = document.getElementById("totalSubjects");
        const sess = document.getElementById("totalSessions");

        if (s) s.innerText = data.students || 0;
        if (t) t.innerText = data.teachers || 0;
        if (sub) sub.innerText = data.subjects || 0;
        if (sess) sess.innerText = data.sessions || 0;
    });
}

// ==========================================================================
// USER & SESSION HELPERS
// ==========================================================================
function showUsername() {
    const user = getCurrentUser();
    const el = document.getElementById("welcomeText");
    const userDisplay = document.getElementById("navUserName");

    if (user) {
        if (el) el.innerText = user.name;
        if (userDisplay) userDisplay.innerText = user.name;
    }
}

function logout() {
    sessionStorage.removeItem("user");
    localStorage.removeItem("user");
    showToast("Logged out successfully", "info");
    setTimeout(() => {
        window.location.href = "login.html";
    }, 500);
}

function togglePassword(fieldId, btn) {
    const input = document.getElementById(fieldId);
    if (!input) return;
    const icon = btn.querySelector('i');

    if (input.type === 'password') {
        input.type = 'text';
        if (icon) icon.className = 'fa-regular fa-eye-slash';
    } else {
        input.type = 'password';
        if (icon) icon.className = 'fa-regular fa-eye';
    }
}

function selectRole(role) {
    const roleSelect = document.getElementById('role');
    if (roleSelect) roleSelect.value = role;

    toggleRollNo();

    const tabStudent = document.getElementById('tabStudent');
    const tabTeacher = document.getElementById('tabTeacher');

    if (tabStudent) tabStudent.classList.toggle('active', role === 'student');
    if (tabTeacher) tabTeacher.classList.toggle('active', role === 'teacher');
}

function toggleSection(section) {
    const config = {
        subjects: { wrap: 'subjectsWrap', btn: 'toggleSubjectsBtn', loader: loadSubjects },
        students: { wrap: 'studentsWrap', btn: 'toggleStudentsBtn', loader: loadStudents },
        teachers: { wrap: 'teachersWrap', btn: 'toggleTeachersBtn', loader: loadTeachers }
    };

    const target = config[section];
    if (!target) return;

    const wrapEl = document.getElementById(target.wrap);
    const btnEl  = document.getElementById(target.btn);
    if (!wrapEl) return;

    const isHidden = wrapEl.style.display === 'none' || wrapEl.style.display === '';

    if (isHidden) {
        target.loader();
        wrapEl.style.display = 'block';
        if (btnEl) btnEl.innerHTML = '<i class="fa-solid fa-eye-slash"></i> Hide';
    } else {
        wrapEl.style.display = 'none';
        if (btnEl) btnEl.innerHTML = '<i class="fa-solid fa-eye"></i> Show';
    }
}

// Auto Loaders & Strict Role Guards on DOM Content Loaded
document.addEventListener("DOMContentLoaded", () => {
    const path = window.location.pathname;

    if (path.includes("student.html")) {
        if (!checkRoleAccess("student")) return;
        loadAttendancePercentage();
        loadOverallAttendance();
        showUsername();
    } else if (path.includes("teacher.html")) {
        if (!checkRoleAccess("teacher")) return;
        loadSubjectsForTeacher();
        showUsername();
    } else if (path.includes("admin.html")) {
        if (!checkRoleAccess("admin")) return;
        loadStats();
        showUsername();
    } else if (path.includes("register.html")) {
        toggleRollNo();
    }
});