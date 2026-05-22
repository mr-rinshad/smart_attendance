const express = require("express");
const db = require("./db");
const QRCode = require("qrcode");
const PDFDocument = require("pdfkit");

const app = express();

app.use(express.json());


// SERVE FRONTEND FILES
app.use(express.static("public"));

app.get("/", (req, res) => {
    res.send("Server Running");
});


// REGISTER API

app.post("/register", (req, res) => {

    const {
        name,
        email,
        roll_no,
        password,
        role
    } = req.body;

    const sql = `
        INSERT INTO users
        (name, email, roll_no, password, role)
        VALUES (?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [name, email, roll_no, password, role],
        (err, result) => {

            if (err) {
                console.log(err);
                return res.send("Registration Failed");
            }

            res.send("User Registered Successfully");

        }
    );

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

    const {
        teacher_id,
        subject_id,
        expiry_minutes
    } = req.body;

    const sessionCode = Math.random()
        .toString(36)
        .substring(2, 8);

    const expiry = new Date(
        Date.now() + expiry_minutes * 60000
    );

    const sql = `
        INSERT INTO sessions
        (
            teacher_id,
            session_code,
            expires_at,
            subject_id,
            expiry_minutes
        )
        VALUES (?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [
            teacher_id,
            sessionCode,
            expiry,
            subject_id,
            expiry_minutes
        ],
        (err, result) => {

            if (err) {

                console.log(err);

                return res.send(
                    "Session Creation Failed"
                );

            }

            QRCode.toDataURL(
                sessionCode,
                (err, qrImage) => {

                    res.send({

                        message:
                            "Session Created",

                        session_id:
                            result.insertId,

                        qr:
                            qrImage

                    });

                }
            );

        }
    );

});


// MARK ATTENDANCE API

app.post("/mark-attendance", (req, res) => {

    const { student_id, session_code } = req.body;

    // Find session using session code
    const findSessionQuery = `
        SELECT * FROM sessions
        WHERE session_code = ?
    `;

    db.query(
        findSessionQuery,
        [session_code],
        (err, sessionResult) => {

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
                        return res.send(
                            "Attendance Already Marked"
                        );
                    }

                    res.send(
                        "Attendance Marked Successfully"
                    );

                }
            );

        }
    );

});


// ATTENDANCE REPORT API

app.get("/attendance-report/:student_id", (req, res) => {

    const studentId = req.params.student_id;

    const sql = `
        SELECT attendance.id,
               sessions.session_code,
               attendance.marked_at
        FROM attendance
        JOIN sessions
        ON attendance.session_id = sessions.id
        WHERE attendance.student_id = ?
        ORDER BY attendance.marked_at DESC
    `;

    db.query(sql, [studentId], (err, result) => {

        if (err) {
            console.log(err);
            return res.send("Error");
        }

        res.json(result);

    });

});


// ATTENDANCE PERCENTAGE API

app.get("/attendance-percentage/:student_id", (req, res) => {

    const studentId = req.params.student_id;

    const sql = `

        SELECT

            subjects.subject_name,

            COUNT(DISTINCT sessions.id)
            AS total_classes,

            COUNT(attendance.id)
            AS present_count,

            ROUND(

                (
                    COUNT(attendance.id)
                    /
                    COUNT(DISTINCT sessions.id)
                ) * 100,

                2

            ) AS percentage

        FROM subjects

        LEFT JOIN sessions
        ON subjects.id = sessions.subject_id

        LEFT JOIN attendance
        ON attendance.session_id = sessions.id
        AND attendance.student_id = ?

        GROUP BY subjects.id

    `;

    db.query(sql, [studentId], (err, result) => {

        if (err) {

            console.log(err);

            return res.send("Error");

        }

        res.json(result);

    });

});


//overall attendance api
app.get("/overall-attendance/:student_id", (req, res) => {

    const studentId = req.params.student_id;

    const sql = `

        SELECT

            COUNT(attendance.id)
            AS total_present,

            (
                SELECT COUNT(*)
                FROM sessions
            )
            AS total_classes

        FROM attendance

        WHERE attendance.student_id = ?

    `;

    db.query(sql, [studentId], (err, result) => {

        if (err) {

            console.log(err);

            return res.send("Error");

        }

        const present =
            result[0].total_present;

        const total =
            result[0].total_classes;

        let percentage = 0;

        if (total > 0) {

            percentage =
                ((present / total) * 100)
                .toFixed(2);

        }

        res.json({

            total_present: present,

            total_classes: total,

            percentage: percentage

        });

    });

});


// DOWNLOAD PDF API

app.get("/download-attendance/:session_id", (req, res) => {

    const sessionId = req.params.session_id;

    const sql = `

        SELECT

            users.roll_no,
            users.name

        FROM attendance

        JOIN users
        ON attendance.student_id = users.id

        WHERE attendance.session_id = ?

    `;

    db.query(sql, [sessionId], (err, result) => {

        if (err) {

            console.log(err);

            return res.send("Error");

        }

        // ===== CREATE PDF =====

        const doc = new PDFDocument({
            margin: 50
        });

        // ===== RESPONSE HEADERS =====

        res.setHeader(
            "Content-Type",
            "application/pdf"
        );

        res.setHeader(
            "Content-Disposition",
            "attachment; filename=attendance-report.pdf"
        );

        // ===== PIPE PDF =====

        doc.pipe(res);

        // ===== TITLE =====

        doc
            .fontSize(28)
            .font("Helvetica-Bold")
            .text(
                "Attendance Report",
                {
                    align: "center",
                    underline: true
                }
            );

        doc.moveDown(2);

        // ===== TABLE SETTINGS =====

        const tableX = 80;

        const tableY = 180;

        const tableWidth = 450;

        const rowHeight = 40;

        const col1Width = 150;

        const col2Width = 300;

        // Header + student rows
        const totalRows = result.length + 1;

        const tableHeight =
            totalRows * rowHeight;

        // ===== OUTER TABLE BORDER =====

        doc.rect(
            tableX,
            tableY,
            tableWidth,
            tableHeight
        ).stroke();

        // ===== VERTICAL DIVIDER =====

        doc.moveTo(
            tableX + col1Width,
            tableY
        )
        .lineTo(
            tableX + col1Width,
            tableY + tableHeight
        )
        .stroke();

        // ===== HORIZONTAL ROW LINES =====

        for (let i = 1; i < totalRows; i++) {

            const y =
                tableY + (i * rowHeight);

            doc.moveTo(tableX, y)
               .lineTo(tableX + tableWidth, y)
               .stroke();

        }

        // ===== HEADER TEXT =====

        doc
            .fontSize(16)
            .font("Helvetica-Bold");

        doc.text(
            "Roll No",
            tableX + 40,
            tableY + 12
        );

        doc.text(
            "Student Name",
            tableX + col1Width + 70,
            tableY + 12
        );

        // ===== STUDENT DATA =====

        doc.font("Helvetica");

        let currentY =
            tableY + rowHeight;

        result.forEach(student => {

            // Roll No
            doc.text(
                student.roll_no || "-",
                tableX + 50,
                currentY + 12
            );

            // Student Name
            doc.text(
                student.name,
                tableX + col1Width + 60,
                currentY + 12
            );

            currentY += rowHeight;

        });

        // ===== FINISH PDF =====

        doc.end();

    });

});

// session attendance details api
app.get("/session-attendance/:session_id", (req, res) => {

    const sessionId = req.params.session_id;

    const sql = `

        SELECT

            attendance.id AS attendance_id,

            users.roll_no,

            users.name

        FROM attendance

        JOIN users
        ON attendance.student_id = users.id

        WHERE attendance.session_id = ?

    `;

    db.query(sql, [sessionId], (err, result) => {

        if (err) {

            console.log(err);

            return res.send("Error");

        }

        res.json(result);

    });

});


//romove attendance api
app.delete("/remove-attendance/:attendance_id", (req, res) => {

    const attendanceId =
        req.params.attendance_id;

    const sql = `
        DELETE FROM attendance
        WHERE id = ?
    `;

    db.query(sql, [attendanceId], (err, result) => {

        if (err) {

            console.log(err);

            return res.send(
                "Failed To Remove"
            );

        }

        res.send(
            "Attendance Removed"
        );

    });

});

// add subject api
app.post("/add-subject", (req, res) => {

    const { subject_name } = req.body;

    const sql = `
        INSERT INTO subjects
        (subject_name)
        VALUES (?)
    `;

    db.query(sql, [subject_name], (err) => {

        if (err) {

            console.log(err);

            return res.send(
                "Failed To Add Subject"
            );

        }

        res.send(
            "Subject Added"
        );

    });

});

// get all subjects api
app.get("/subjects", (req, res) => {

    const sql = `
        SELECT *
        FROM subjects
    `;

    db.query(sql, (err, result) => {

        if (err) {

            console.log(err);

            return res.send("Error");

        }

        res.json(result);

    });

});

// delete subject api
app.delete("/delete-subject/:id", (req, res) => {

    const subjectId =
        req.params.id;

    const sql = `
        DELETE FROM subjects
        WHERE id = ?
    `;

    db.query(sql, [subjectId], (err) => {

        if (err) {

            console.log(err);

            return res.send(
                "Delete Failed"
            );

        }

        res.send(
            "Subject Deleted"
        );

    });

});

// get all students api
app.get("/students", (req, res) => {

    const sql = `
        SELECT *
        FROM users
        WHERE role='student'
    `;

    db.query(sql, (err, result) => {

        if (err) {

            console.log(err);

            return res.send("Error");

        }

        res.json(result);

    });

});

// get all teachers api
app.get("/teachers", (req, res) => {

    const sql = `
        SELECT *
        FROM users
        WHERE role='teacher'
    `;

    db.query(sql, (err, result) => {

        if (err) {

            console.log(err);

            return res.send("Error");

        }

        res.json(result);

    });

});

// delete user api
app.delete("/delete-user/:id", (req, res) => {

    const userId =
        req.params.id;

    const sql = `
        DELETE FROM users
        WHERE id = ?
    `;

    db.query(sql, [userId], (err) => {

        if (err) {

            console.log(err);

            return res.send(
                "Delete Failed"
            );

        }

        res.send(
            "User Deleted"
        );

    });

});

// reset attendance api
app.delete("/reset-attendance", (req, res) => {

    const sql = `
        DELETE FROM attendance
    `;

    db.query(sql, (err) => {

        if (err) {

            console.log(err);

            return res.send(
                "Reset Failed"
            );

        }

        res.send(
            "Attendance Reset Successful"
        );

    });

});

// system stats api
app.get("/system-stats", (req, res) => {

    const stats = {};

    db.query(
        `
        SELECT COUNT(*) AS total
        FROM users
        WHERE role='student'
        `,
        (err, students) => {

            stats.students =
                students[0].total;

            db.query(
                `
                SELECT COUNT(*) AS total
                FROM users
                WHERE role='teacher'
                `,
                (err, teachers) => {

                    stats.teachers =
                        teachers[0].total;

                    db.query(
                        `
                        SELECT COUNT(*) AS total
                        FROM subjects
                        `,
                        (err, subjects) => {

                            stats.subjects =
                                subjects[0].total;

                            db.query(
                                `
                                SELECT COUNT(*) AS total
                                FROM sessions
                                `,
                                (err, sessions) => {

                                    stats.sessions =
                                        sessions[0].total;

                                    res.json(stats);

                                }
                            );

                        }
                    );

                }
            );

        }
    );

});

app.listen(3000, () => {
    console.log("Server running on port 3000");
});