const API = "http://localhost:3000";


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

    fetch(`${API}/register`, {

        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify(data)

    })
    .then(res => res.text())
    .then(data => {

        alert(data);

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
        email: document.getElementById("loginEmail").value,
        password: document.getElementById("loginPassword").value
    };

    fetch(`${API}/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
    })
    .then(res => res.json())
    .then(data => {

        if (data.message === "Login Success") {

            localStorage.setItem("user", JSON.stringify(data.user));

            // Redirect by role
            if (data.user.role === "teacher") {
                window.location.href = "teacher.html";
            } else {
                window.location.href = "student.html";
            }

        } else {
            alert("Invalid Login");
        }

    });

}


// CREATE SESSION
function createSession() {

    const user =
        JSON.parse(localStorage.getItem("user"));

    const subjectId =
        document.getElementById("subjectSelect").value;

    fetch(`${API}/create-session`, {

        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify({

            teacher_id: user.id,

            subject_id: subjectId

        })

    })
    .then(res => res.json())
    .then(data => {

        document.getElementById("qrImage").src =
            data.qr;

    });

}


// MANUAL ATTENDANCE
function markAttendance() {

    const user = JSON.parse(localStorage.getItem("user"));

    const sessionCode =
        document.getElementById("sessionCode").value;

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
function startScanner() {

    const user = JSON.parse(localStorage.getItem("user"));

    let scanned = false;

    function onScanSuccess(decodedText) {

        if (scanned) return;

        scanned = true;

        document.getElementById("result")
            .innerText = "QR Detected: " + decodedText;

        // Stop scanner after scan
        html5QrCode.stop();

        // Send attendance request
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

            // Reload attendance history
            loadAttendanceHistory();

            // Reload percentage
            loadAttendancePercentage();

        });

    }

    function onScanError(error) {
        // Ignore scan errors
    }

    const html5QrCode =
        new Html5Qrcode("reader");

    Html5Qrcode.getCameras()
        .then(devices => {

            if (devices && devices.length) {

                const cameraId = devices[0].id;

                html5QrCode.start(
                    cameraId,
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




// LOAD ATTENDANCE PERCENTAGE
function loadAttendancePercentage() {

    const user =
        JSON.parse(localStorage.getItem("user"));

    fetch(`${API}/attendance-percentage/${user.id}`)

    .then(res => res.json())

    .then(data => {

        let html = "";

        data.forEach(item => {

            html += `

                <div>

                    <h4>
                        ${item.subject_name}
                    </h4>

                    Total Classes:
                    ${item.total_classes}

                    <br>

                    Present:
                    ${item.present_count}

                    <br>

                    Percentage:
                    ${item.percentage || 0}%

                    <hr>

                </div>

            `;

        });

        document.getElementById(
            "percentageList"
        ).innerHTML = html;

    });

}


// AUTO START SCANNER + HISTORY
if (window.location.pathname.includes("student.html")) {

    startScanner();

    loadAttendancePercentage();

}


// AUTO TOGGLE ROLL NUMBER FIELD
if (window.location.pathname.includes("register.html")) {

    toggleRollNo();

}


// LOGOUT
function logout() {

    localStorage.removeItem("user");

    window.location.href = "login.html";

}