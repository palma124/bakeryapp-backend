const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bcrypt = require("bcryptjs"); // For password hashing

const app = express();
app.use(express.json());
app.use(cors({ origin: "*" })); // Allow requests from any origin

// MySQL connection
const db = mysql.createConnection({
  host: "sql.freedb.tech",
  user: "freedb_liceria",
  password: "*Zw6a9gp@QPcKRK",
  database: "freedb_bakeryapp",
  port: 3306,
});

db.connect((err) => {
  if (err) {
    console.error("❌ Database connection failed:", err);
  } else {
    console.log("✅ Connected to MySQL database.");
  }
});

// =======================
// ✅ Default Route (Fix for "Cannot GET /")
// =======================
app.get("/", (req, res) => {
  res.send("✅ BakeryApp Backend is Live! Use /orders, /user, /register, /login, etc.");
});

// =======================
// Orders Endpoints
// =======================
app.post("/addOrder", (req, res) => {
  const { name, weight, price, image } = req.body;

  if (!name || !weight || !price || !image) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const sql = "INSERT INTO orders (cake_name, weight, price, image) VALUES (?, ?, ?, ?)";
  db.query(sql, [name, weight, price, image], (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: "Added to cart successfully!", orderId: result.insertId });
  });
});

// Fetch orders
app.get("/orders", (req, res) => {
  const sql = "SELECT * FROM orders";
  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

// Delete an order
app.delete("/orders/:id", (req, res) => {
  const { id } = req.params;
  const sql = "DELETE FROM orders WHERE id = ?";
  db.query(sql, [id], (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Order not found" });
    }
    res.json({ message: "Order deleted successfully" });
  });
});

// =======================
// Authentication
// =======================
app.post("/register", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: "Please fill out all fields." });
  if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters long." });

  const checkEmailSql = "SELECT * FROM users WHERE email = ?";
  db.query(checkEmailSql, [email], async (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length > 0) return res.status(400).json({ error: "Email already in use." });

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const sql = "INSERT INTO users (name, email, password, createdAt, updatedAt) VALUES (?, ?, ?, NOW(), NOW())";
      db.query(sql, [name, email, hashedPassword], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Registered successfully!" });
      });
    } catch {
      res.status(500).json({ error: "Error hashing password." });
    }
  });
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Please enter both email and password." });

  const sql = "SELECT * FROM users WHERE email = ?";
  db.query(sql, [email], async (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ error: "User not found." });

    const user = results[0];
    try {
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(400).json({ error: "Invalid credentials." });

      res.json({ message: "Login successful!", userId: user.id });
    } catch {
      res.status(500).json({ error: "Error comparing passwords." });
    }
  });
});

// =======================
// Start Server
// =======================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
