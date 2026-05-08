const express = require("express");
const db = require("./db");

const app = express();

app.use(express.json());

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


app.listen(3000, () => {
    console.log("Server running on port 3000");
});