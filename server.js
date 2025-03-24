const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bcrypt = require("bcrypt"); // For password hashing

const app = express();
app.use(express.json());
app.use(cors({ origin: "*" })); // Allow requests from any origin

// MySQL connection
const db = mysql.createConnection({
  host: "sql.freedb.tech",  // Freedb.tech host
  user: "freedb_liceria",   // Your Freedb.tech username
  password: "*Zw6a9gp@QPcKRK", // Your Freedb.tech password (Change this after testing!)
  database: "freedb_bakeryapp", // Your Freedb.tech database name
  port: 3306,  // MySQL default port
});

db.connect((err) => {
  if (err) {
    console.error("Database connection failed:", err);
  } else {
    console.log("Connected to MySQL database.");
  }
});

// =======================
// Orders Endpoints
// =======================

// Route to add order to the database
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

// Route to fetch orders from the database
app.get("/orders", (req, res) => {
  const sql = "SELECT * FROM orders";
  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

// Delete an order by id
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
// User Endpoints
// =======================

// GET /user?email=... - Retrieve user by email
app.get("/user", (req, res) => {
  const { email } = req.query;
  if (!email) {
    return res.status(400).json({ error: "Email is required." });
  }
  const sql = "SELECT name, email FROM users WHERE email = ?";
  db.query(sql, [email], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ error: "User not found." });
    res.json(results[0]);
  });
});

// PUT /user - Update user's name based on email
app.put("/user", (req, res) => {
  const { email, name } = req.body;
  if (!email || !name) {
    return res.status(400).json({ error: "Email and name are required." });
  }
  const sql = "UPDATE users SET name = ?, updatedAt = NOW() WHERE email = ?";
  db.query(sql, [name, email], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "User not found." });
    }
    res.json({ message: "Profile updated successfully!" });
  });
});

// =======================
// Authentication Endpoints
// =======================

// Register endpoint
app.post("/register", (req, res) => {
  const { name, email, password } = req.body;

  // Validate required fields
  if (!name || !email || !password) {
    return res.status(400).json({ error: "Please fill out all fields." });
  }
  
  // Validate password length
  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters long." });
  }

  // Check if email already exists
  const checkEmailSql = "SELECT * FROM users WHERE email = ?";
  db.query(checkEmailSql, [email], async (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (results.length > 0) {
      return res.status(400).json({ error: "Email already in use." });
    }

    try {
      // Hash the password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Insert user along with timestamps
      const insertUserSql =
        "INSERT INTO users (name, email, password, createdAt, updatedAt) VALUES (?, ?, ?, NOW(), NOW())";
      db.query(insertUserSql, [name, email, hashedPassword], (err, result) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json({ message: "Registered successfully! Please log in to continue." });
      });
    } catch (hashErr) {
      return res.status(500).json({ error: "Error hashing password." });
    }
  });
});

// Login endpoint
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  // Validate required fields
  if (!email || !password) {
    return res.status(400).json({ error: "Please enter both email and password." });
  }

  const sql = "SELECT * FROM users WHERE email = ?";
  db.query(sql, [email], async (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: "User not found." });
    }

    const user = results[0];

    try {
      // Compare the entered password with the hashed password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ error: "Invalid credentials." });
      }
      res.json({ message: "You can now continue to make your order!", userId: user.id });
    } catch (compareErr) {
      return res.status(500).json({ error: "Error comparing passwords." });
    }
  });
});

// =======================
// Start Server
// =======================
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
