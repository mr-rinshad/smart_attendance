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

            timerText.innerText =
                "QR Expired";

            downloadBtn.style.display =
                "inline-block";

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

        let html = `

            <table
                border="1"
                cellpadding="10"
                style="
                    margin:auto;
                    border-collapse:collapse;
                "
            >

                <tr>

                    <th>Roll No</th>

                    <th>Name</th>

                    <th>Action</th>

                </tr>

        `;

        data.forEach(student => {

            html += `

                <tr>

                    <td>
                        ${student.roll_no}
                    </td>

                    <td>
                        ${student.name}
                    </td>

                    <td>

                        <button
                            onclick="
                                removeAttendance(
                                    ${student.attendance_id},
                                    ${sessionId}
                                )
                            "
                        >

                            Remove

                        </button>

                    </td>

                </tr>

            `;

        });

        html += `</table>`;

        document.getElementById(
            "sessionAttendance"
        ).innerHTML = html;

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

        let html = "";

        data.forEach(item => {

            html += `

                <div
                    style="
                        border: 1px solid #ccc;
                        padding: 15px;
                        margin: 10px;
                        border-radius: 8px;
                        background: #f9f9f9;
                    "
                >

                    <h4>
                        ${item.subject_name}
                    </h4>

                    Present:
                    ${item.present_count}

                    <br><br>

                    Total Classes:
                    ${item.total_classes}

                    <br><br>

                    Percentage:
                    ${item.percentage || 0}%

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
        JSON.parse(localStorage.getItem("user"));

    fetch(`${API}/overall-attendance/${user.id}`)

    .then(res => res.json())

    .then(data => {

        const percentage =
            parseFloat(data.percentage) || 0;

        // Full circle size
        const circumference = 440;

        // Calculate filled part
        const offset =
            circumference -
            (percentage / 100) * circumference;

        // Update progress circle
        document.getElementById(
            "progressCircle"
        ).style.strokeDashoffset = offset;

        // Update percentage text
        document.getElementById(
            "circleText"
        ).innerText = `${percentage}%`;

    });

}
// LOAD STUDENTS
function loadStudents() {

    fetch(`${API}/students`)

    .then(res => res.json())

    .then(data => {

        let html = `
            <table border="1" cellpadding="10">

            <tr>

                <th>Roll No</th>

                <th>Name</th>

                <th>Email</th>

                <th>Action</th>

            </tr>
        `;

        data.forEach(student => {

            html += `

                <tr>

                    <td>
                        ${student.roll_no}
                    </td>

                    <td>
                        ${student.name}
                    </td>

                    <td>
                        ${student.email}
                    </td>

                    <td>

                        <button
                            onclick="
                                deleteUser(${student.id})
                            "
                        >
                            Delete
                        </button>

                    </td>

                </tr>

            `;

        });

        html += `</table>`;

        document.getElementById(
            "studentsList"
        ).innerHTML = html;

    });

}
// LOAD TEACHERS
function loadTeachers() {

    fetch(`${API}/teachers`)

    .then(res => res.json())

    .then(data => {

        let html = `
            <table border="1" cellpadding="10">

            <tr>

                <th>Name</th>

                <th>Email</th>

                <th>Action</th>

            </tr>
        `;

        data.forEach(teacher => {

            html += `

                <tr>

                    <td>
                        ${teacher.name}
                    </td>

                    <td>
                        ${teacher.email}
                    </td>

                    <td>

                        <button
                            onclick="
                                deleteUser(${teacher.id})
                            "
                        >
                            Delete
                        </button>

                    </td>

                </tr>

            `;

        });

        html += `</table>`;

        document.getElementById(
            "teachersList"
        ).innerHTML = html;

    });

}
// LOAD SUBJECTS
function loadSubjects() {

    fetch(`${API}/subjects`)

    .then(res => res.json())

    .then(data => {

        let html = `

            <table
                border="1"
                cellpadding="10"
            >

                <tr>

                    <th>ID</th>

                    <th>Subject</th>

                    <th>Action</th>

                </tr>

        `;

        data.forEach(subject => {

            html += `

                <tr>

                    <td>
                        ${subject.id}
                    </td>

                    <td>
                        ${subject.subject_name}
                    </td>

                    <td>

                        <button
                            onclick="
                                deleteSubject(
                                    ${subject.id}
                                )
                            "
                        >

                            Delete

                        </button>

                    </td>

                </tr>

            `;

        });

        html += `</table>`;

        document.getElementById(
            "subjectsList"
        ).innerHTML = html;

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
            `Welcome, ${user.name}`;

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