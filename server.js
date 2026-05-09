const express = require("express");
const db = require("./db");
const QRCode = require("qrcode");

const app = express();

app.use(express.json());

// SERVE FRONTEND FILES
app.use(express.static("public"));

app.get("/", (req, res) => {
    res.send("Server Running");
});


// REGISTER API

app.post("/register", (req, res) => {

    const { name, email, password, role } = req.body;

    const sql = `
        INSERT INTO users (name, email, password, role)
        VALUES (?, ?, ?, ?)
    `;

    db.query(sql, [name, email, password, role], (err, result) => {

        if (err) {
            console.log(err);
            return res.send("Registration Failed");
        }

        res.send("User Registered Successfully");

    });

});


// LOGIN API

app.post("/login", (req, res) => {

    const { email, password } = req.body;

    const sql = `
        SELECT * FROM users
        WHERE email = ? AND password = ?
    `;

    db.query(sql, [email, password], (err, result) => {

        if (err) {
            console.log(err);
            return res.send("Login Failed");
        }

        if (result.length > 0) {

            res.send({
                message: "Login Success",
                user: result[0]
            });

        } else {

            res.send("Invalid Email or Password");

        }

    });

});


// CREATE SESSION API

app.post("/create-session", (req, res) => {

    const { teacher_id } = req.body;

    // Generate random session code
    const sessionCode = Math.random()
        .toString(36)
        .substring(2, 8);

    // QR expiry time = 60 seconds
    const expiry = new Date(Date.now() + 60000);

    const sql = `
        INSERT INTO sessions
        (teacher_id, session_code, expires_at)
        VALUES (?, ?, ?)
    `;

    db.query(sql, [teacher_id, sessionCode, expiry], (err, result) => {

        if (err) {
            console.log(err);
            return res.send("Session Creation Failed");
        }

        // Generate QR Image
        QRCode.toDataURL(sessionCode, (err, qrImage) => {

            if (err) {
                return res.send("QR Generation Failed");
            }

            res.send({
                message: "Session Created",
                session_code: sessionCode,
                qr: qrImage
            });

        });

    });

});


// MARK ATTENDANCE API

app.post("/mark-attendance", (req, res) => {

    const { student_id, session_code } = req.body;

    // Find session using session code
    const findSessionQuery = `
        SELECT * FROM sessions
        WHERE session_code = ?
    `;

    db.query(findSessionQuery, [session_code], (err, sessionResult) => {

        if (err) {
            console.log(err);
            return res.send("Database Error");
        }

        // Check session exists
        if (sessionResult.length === 0) {
            return res.send("Invalid QR Code");
        }

        const session = sessionResult[0];

        // Check QR expiry
        const currentTime = new Date();

        if (currentTime > session.expires_at) {
            return res.send("QR Code Expired");
        }

        // Insert attendance
        const attendanceQuery = `
            INSERT INTO attendance
            (student_id, session_id)
            VALUES (?, ?)
        `;

        db.query(
            attendanceQuery,
            [student_id, session.id],
            (err, result) => {

                // Duplicate attendance
                if (err) {
                    console.log(err);
                    return res.send("Attendance Already Marked");
                }

                res.send("Attendance Marked Successfully");

            }
        );

    });

});


app.listen(3000, () => {
    console.log("Server running on port 3000");
});