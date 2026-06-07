const API = "http://localhost:3000";

let currentSessionId = null;


// REGISTER
function register() {

    const role =
        document.getElementById("role").value;

    let rollNo = null;

    // Only students need roll number
    if (role === "student") {

        rollNo =
            document.getElementById("rollno").value;

    }

    const data = {

        name:
            document.getElementById("name").value,

        email:
            document.getElementById("email").value,

        roll_no: rollNo,

        password:
            document.getElementById("password").value,

        role: role

    };

    // BASIC VALIDATION

    if (
        !data.name ||
        !data.email ||
        !data.password
    ) {

        alert("Fill All Fields");

        return;

    }

    // STUDENT ROLL NUMBER VALIDATION

    if (
        role === "student" &&
        !rollNo
    ) {

        alert("Enter Roll Number");

        return;

    }

    fetch(`${API}/register`, {

        method: "POST",

        headers: {
            "Content-Type":
                "application/json"
        },

        body: JSON.stringify(data)

    })

    .then(res => res.text())

    .then(data => {

        alert(data);

        // REDIRECT ONLY IF SUCCESS

        if (
            data ===
            "User Registered Successfully"
        ) {

            window.location =
                "index.html";

        }

    })

    .catch(err => {

        console.log(err);

        alert("Something Went Wrong");

    });

}


// TOGGLE ROLL NUMBER FIELD
function toggleRollNo() {

    const role =
        document.getElementById("role").value;

    const rollField =
        document.getElementById("rollNoField");

    if (role === "teacher") {

        rollField.style.display = "none";

    } else {

        rollField.style.display = "block";

    }

}


// LOGIN
function login() {

    const data = {

        email:
            document.getElementById(
                "loginEmail"
            ).value,

        password:
            document.getElementById(
                "loginPassword"
            ).value

    };

    // BASIC VALIDATION

    if (
        !data.email ||
        !data.password
    ) {

        alert(
            "Fill All Fields"
        );

        return;

    }

    fetch(`${API}/login`, {

        method: "POST",

        headers: {

            "Content-Type":
                "application/json"

        },

        body: JSON.stringify(data)

    })

    .then(res => res.json())

    .then(data => {

        // INVALID LOGIN

        if (
            data.message ===
            "Invalid credentials"
        ) {

            alert(
                "Invalid Email Or Password"
            );

            return;

        }

        // STORE USER DATA

        localStorage.setItem(

            "user",

            JSON.stringify(data.user)

        );

        // REDIRECT BASED ON ROLE

        if (
            data.user.role ===
            "teacher"
        ) {

            window.location =
                "teacher.html";

        }

        else if (
            data.user.role ===
            "student"
        ) {

            window.location =
                "student.html";

        }

        else if (
            data.user.role ===
            "admin"
        ) {

            window.location =
                "admin.html";

        }

    })

    .catch(err => {

        console.log(err);

        alert(
            "Something Went Wrong"
        );

    });

}


// CREATE SESSION
function createSession() {

    const user =
        JSON.parse(localStorage.getItem("user"));

    const subjectId =
        document.getElementById(
            "subjectSelect"
        ).value;

    const expiryMinutes =
        document.getElementById(
            "expiryTime"
        ).value;

    fetch(`${API}/create-session`, {

        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify({

            teacher_id: user.id,

            subject_id: subjectId,

            expiry_minutes: expiryMinutes

        })

    })
    .then(res => res.json())

    .then(data => {

        currentSessionId =
            data.session_id;

        document.getElementById(
            "qrImage"
        ).src = data.qr;

        startCountdown(
            expiryMinutes * 60,
            data.session_id
        );

        loadSessionAttendance(
            data.session_id
        );

    });

}


// COUNTDOWN TIMER
function startCountdown(seconds, sessionId) {

    // Switch to active QR state
    document.getElementById("stateEmpty").style.display   = "none";
    document.getElementById("stateActive").style.display  = "flex";
    document.getElementById("stateExpired").style.display = "none";

    const timerText =
        document.getElementById(
            "timerText"
        );

    const downloadBtn =
        document.getElementById(
            "downloadBtn"
        );

    const refreshInterval = setInterval(() => {

        loadSessionAttendance(sessionId);

    }, 3000);

    const interval = setInterval(() => {

        const mins =
            Math.floor(seconds / 60);

        const secs =
            seconds % 60;

        timerText.innerText =
            `QR Expires In: ${mins}:${secs
                .toString()
                .padStart(2, "0")}`;

        seconds--;

        if (seconds < 0) {

            clearInterval(interval);

            clearInterval(refreshInterval);

            // Switch to expired QR state
            document.getElementById("stateActive").style.display  = "none";
            document.getElementById("stateExpired").style.display = "flex";

            downloadBtn.style.display = "flex";

            downloadBtn.onclick = () => {

                window.open(
                    `${API}/download-attendance/${sessionId}`
                );

            };

        }

    }, 1000);

}


// LOAD SESSION ATTENDANCE
function loadSessionAttendance(sessionId) {

    fetch(
        `${API}/session-attendance/${sessionId}`
    )

    .then(res => res.json())

    .then(data => {

        let rows = "";

        data.forEach(student => {

            rows += `
                <tr>
                    <td>${student.roll_no}</td>
                    <td>${student.name}</td>
                    <td>
                        <button class="remove-btn"
                            onclick="removeAttendance(${student.attendance_id}, ${sessionId})"
                            title="Remove">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;

        });

        const html = `
            <table class="att-table">
                <thead>
                    <tr>
                        <th>Roll No</th>
                        <th>Name</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        `;

        document.getElementById(
            "sessionAttendance"
        ).innerHTML = html;

        // LOAD LIVE COUNT
        loadAttendanceCount(sessionId);

    });

}

function loadAttendanceCount(
    sessionId
) {

    fetch(
        `${API}/attendance-count/${sessionId}`
    )

    .then(res => res.json())

    .then(data => {

        document.getElementById(
            "liveCount"
        ).innerHTML =
            `<i class="fa-solid fa-users"></i> Total Present: ${data.total}`;

    });

}

// REMOVE ATTENDANCE
function removeAttendance(
    attendanceId,
    sessionId
) {

    const confirmDelete =
        confirm(
            "Remove this attendance?"
        );

    if (!confirmDelete) return;

    fetch(
        `${API}/remove-attendance/${attendanceId}`,
        {
            method: "DELETE"
        }
    )

    .then(res => res.text())

    .then(data => {

        alert(data);

        loadSessionAttendance(sessionId);

    });

}


// MANUAL ATTENDANCE
function markAttendance() {

    const user =
        JSON.parse(localStorage.getItem("user"));

    const sessionCode =
        document.getElementById(
            "sessionCode"
        ).value;

    fetch(`${API}/mark-attendance`, {

        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify({

            student_id: user.id,

            session_code: sessionCode

        })

    })
    .then(res => res.text())
    .then(data => {

        alert(data);

    });

}


// QR SCANNER
function openScanner() {

    const user =
        JSON.parse(localStorage.getItem("user"));

    let scanned = false;

    const html5QrCode =
        new Html5Qrcode("reader");

    function onScanSuccess(decodedText) {

        if (scanned) return;

        scanned = true;

        document.getElementById(
            "result"
        ).innerText =
            "QR Detected: " + decodedText;

        html5QrCode.stop();

        fetch(`${API}/mark-attendance`, {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({

                student_id: user.id,

                session_code: decodedText

            })

        })
        .then(res => res.text())
        .then(data => {

            alert(data);

            loadAttendancePercentage();

            loadOverallAttendance();

        });

    }

    function onScanError(error) {

        // Ignore errors

    }

    Html5Qrcode.getCameras()
    .then(devices => {

        if (devices.length) {

            html5QrCode.start(

                devices[0].id,

                {
                    fps: 10,
                    qrbox: 250
                },

                onScanSuccess,

                onScanError

            );

        }

    });

}


// TOGGLE ATTENDANCE DETAILS
function toggleAttendanceDetails() {

    const container =
        document.getElementById(
            "percentageContainer"
        );

    if (
        container.style.display === "none"
    ) {

        container.style.display =
            "block";

    } else {

        container.style.display =
            "none";

    }

}


// LOAD ATTENDANCE PERCENTAGE
function loadAttendancePercentage() {

    const user =
        JSON.parse(localStorage.getItem("user"));

    fetch(
        `${API}/attendance-percentage/${user.id}`
    )

    .then(res => res.json())

    .then(data => {

        const colors = [
            { text: 'c-purple', bar: 'bg-purple' },
            { text: 'c-blue',   bar: 'bg-blue'   },
            { text: 'c-green',  bar: 'bg-green'  },
            { text: 'c-orange', bar: 'bg-orange' },
        ];

        let html = "";

        data.forEach((item, i) => {

            const c = colors[i % colors.length];
            const pct = parseFloat(item.percentage) || 0;

            html += `
                <div class="subject-card">
                    <div class="subject-card-top">
                        <span class="subject-name">${item.subject_name}</span>
                        <span class="subject-pct ${c.text}">${pct.toFixed(2)}%</span>
                    </div>
                    <div class="progress-bar-bg">
                        <div class="progress-bar-fill ${c.bar}"
                             style="width: ${pct}%"></div>
                    </div>
                    <div class="subject-stats">
                        <div class="sub-stat">
                            <p class="sub-stat-label">Present</p>
                            <p class="sub-stat-value ${c.text}">${item.present_count}</p>
                        </div>
                        <div class="sub-divider"></div>
                        <div class="sub-stat">
                            <p class="sub-stat-label">Total Classes</p>
                            <p class="sub-stat-value ${c.text}">${item.total_classes}</p>
                        </div>
                        <div class="sub-divider"></div>
                        <div class="sub-stat">
                            <p class="sub-stat-label">Percentage</p>
                            <p class="sub-stat-value ${c.text}">${pct.toFixed(2)}%</p>
                        </div>
                    </div>
                </div>
            `;

        });

        document.getElementById(
            "percentageList"
        ).innerHTML = html;

    });

}


// LOAD OVERALL ATTENDANCE

function loadOverallAttendance() {

    const user =
        JSON.parse(
            localStorage.getItem("user")
        );

    fetch(
        `${API}/overall-attendance/${user.id}`
    )

    .then(res => res.json())

    .then(data => {

        const percentage =
            parseFloat(
                data.percentage
            ) || 0;

        // FULL CIRCLE SIZE

        const circumference = 440;

        // CALCULATE PROGRESS

        const offset =

            circumference -

            (percentage / 100) *

            circumference;

        // UPDATE CIRCLE

        document.getElementById(
            "progressCircle"
        ).style.strokeDashoffset = offset;

        // UPDATE PERCENTAGE TEXT

        document.getElementById(
            "pctText"
        ).innerText =

            `${percentage}%`;

        // UPDATE PRESENT COUNT

        document.getElementById(
            "presentCount"
        ).innerText =

            data.total_present || 0;

        // UPDATE TOTAL CLASSES

        document.getElementById(
            "totalClasses"
        ).innerText =

            data.total_classes || 0;

    });

}

// LOAD STUDENTS
function loadStudents() {

    fetch(`${API}/students`)

    .then(res => res.json())

    .then(data => {

        if (!data.length) {
            document.getElementById("studentsList").innerHTML =
                `<div class="empty-state"><i class="fa-solid fa-user-graduate"></i>No students registered yet.</div>`;
            return;
        }

        let rows = "";
        data.forEach(student => {
            rows += `
                <tr>
                    <td>${student.roll_no}</td>
                    <td>${student.name}</td>
                    <td>${student.email}</td>
                    <td>
                        <button class="del-btn" onclick="deleteUser(${student.id})" title="Delete">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </td>
                </tr>`;
        });

        document.getElementById("studentsList").innerHTML = `
            <table class="admin-table">
                <thead><tr>
                    <th>Roll No</th><th>Name</th><th>Email</th><th>Action</th>
                </tr></thead>
                <tbody>${rows}</tbody>
            </table>`;

    });

}
// LOAD TEACHERS
function loadTeachers() {

    fetch(`${API}/teachers`)

    .then(res => res.json())

    .then(data => {

        if (!data.length) {
            document.getElementById("teachersList").innerHTML =
                `<div class="empty-state"><i class="fa-solid fa-chalkboard-user"></i>No teachers registered yet.</div>`;
            return;
        }

        let rows = "";
        data.forEach(teacher => {
            rows += `
                <tr>
                    <td>${teacher.name}</td>
                    <td>${teacher.email}</td>
                    <td>
                        <button class="del-btn" onclick="deleteUser(${teacher.id})" title="Delete">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </td>
                </tr>`;
        });

        document.getElementById("teachersList").innerHTML = `
            <table class="admin-table">
                <thead><tr>
                    <th>Name</th><th>Email</th><th>Action</th>
                </tr></thead>
                <tbody>${rows}</tbody>
            </table>`;

    });

}
// LOAD SUBJECTS
function loadSubjects() {

    fetch(`${API}/subjects`)

    .then(res => res.json())

    .then(data => {

        if (!data.length) {
            document.getElementById("subjectsList").innerHTML =
                `<div class="empty-state"><i class="fa-solid fa-book"></i>No subjects added yet.</div>`;
            return;
        }

        let rows = "";
        data.forEach(subject => {
            rows += `
                <tr>
                    <td>${subject.id}</td>
                    <td>${subject.subject_name}</td>
                    <td>
                        <button class="del-btn" onclick="deleteSubject(${subject.id})" title="Delete">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </td>
                </tr>`;
        });

        document.getElementById("subjectsList").innerHTML = `
            <table class="admin-table">
                <thead><tr>
                    <th>ID</th><th>Subject Name</th><th>Action</th>
                </tr></thead>
                <tbody>${rows}</tbody>
            </table>`;

    });

}
// DELETE SUBJECT
function deleteSubject(id) {

    const confirmDelete =
        confirm(
            "Delete Subject?"
        );

    if (!confirmDelete) return;

    fetch(
        `${API}/delete-subject/${id}`,
        {
            method: "DELETE"
        }
    )

    .then(res => res.text())

    .then(data => {

        alert(data);

        loadSubjects();

        loadStats();

    });

}
// DELETE USER (STUDENT OR TEACHER)
function deleteUser(id) {

    const confirmDelete =
        confirm("Delete User?");

    if (!confirmDelete) return;

    fetch(`${API}/delete-user/${id}`, {

        method: "DELETE"

    })

    .then(res => res.text())

    .then(data => {

        alert(data);

        loadStudents();

        loadTeachers();

        loadStats();

    });

}
// LOAD SUBJECTS
function addSubject() {

    const subject =
        document.getElementById(
            "subjectName"
        ).value;

    fetch(`${API}/add-subject`, {

        method: "POST",

        headers: {
            "Content-Type":
                "application/json"
        },

        body: JSON.stringify({

            subject_name: subject

        })

    })

    .then(res => res.text())

    .then(data => {

        alert(data);

        loadSubjects();

        loadStats();

    });

}

// RESET ATTENDANCE
function resetAttendance() {

    const confirmReset =
        confirm(
            "Reset ALL Attendance?"
        );

    if (!confirmReset) return;

    fetch(`${API}/reset-attendance`, {

        method: "DELETE"

    })

    .then(res => res.text())

    .then(data => {

        alert(data);

    });

}
// LOAD SYSTEM STATS
function loadStats() {

    fetch(`${API}/system-stats`)

    .then(res => res.json())

    .then(data => {

        document.getElementById(
            "totalStudents"
        ).innerText =
            data.students;

        document.getElementById(
            "totalTeachers"
        ).innerText =
            data.teachers;

        document.getElementById(
            "totalSubjects"
        ).innerText =
            data.subjects;

        document.getElementById(
            "totalSessions"
        ).innerText =
            data.sessions;

    });

}

// SHOW USERNAME
function showUsername() {

    const user =
        JSON.parse(
            localStorage.getItem("user")
        );

    if (
        user &&
        document.getElementById(
            "welcomeText"
        )
    ) {

        document.getElementById(
            "welcomeText"
        ).innerText =
            `${user.name}`;

    }

}

// AUTO LOAD STUDENT DATA
if (
    window.location.pathname.includes(
        "student.html"
    )
) {

    loadAttendancePercentage();

    loadOverallAttendance();

    showUsername();

}


// AUTO TOGGLE ROLL NUMBER FIELD
if (
    window.location.pathname.includes(
        "register.html"
    )
) {

    toggleRollNo();

}

// AUTO LOAD admin DATA
if (
    window.location.pathname.includes(
        "admin.html"
    )
) {


    loadStats();
    showUsername();

}

if (
    window.location.pathname.includes(
        "teacher.html"
    )
) {

    showUsername();

}


// LOGOUT
function logout() {

    localStorage.removeItem("user");

    window.location.href =
        "login.html";

}

// TOGGLE PASSWORD VISIBILITY
function togglePassword(fieldId, btn) {

    const input = document.getElementById(fieldId);
    const icon = btn.querySelector('i');

    if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fa-regular fa-eye-slash';
    } else {
        input.type = 'password';
        icon.className = 'fa-regular fa-eye';
    }

}


// SELECT ROLE (register page tab UI)
function selectRole(role) {

    // Update hidden select (used by register())
    document.getElementById('role').value = role;

    toggleRollNo();

    // Update tab active styles
    document.getElementById('tabStudent').classList.toggle('active', role === 'student');
    document.getElementById('tabTeacher').classList.toggle('active', role === 'teacher');

}
