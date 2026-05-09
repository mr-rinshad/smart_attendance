const API = "http://localhost:3000";


// REGISTER
function register() {

    const data = {
        name: document.getElementById("name").value,
        email: document.getElementById("email").value,
        password: document.getElementById("password").value,
        role: document.getElementById("role").value
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

function createSession() {

    const user = JSON.parse(localStorage.getItem("user"));

    fetch(`${API}/create-session`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            teacher_id: user.id
        })
    })
    .then(res => res.json())
    .then(data => {

        document.getElementById("qrImage").src = data.qr;

    });

}

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

if (window.location.pathname.includes("student.html")) {
    startScanner();
}