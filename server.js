const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const sqlite3 = require("sqlite3").verbose();

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, "data");
const DB_PATH = path.join(DATA_DIR, "mentor-me.db");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new sqlite3.Database(DB_PATH);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(error) {
      if (error) {
        reject(error);
        return;
      }

      resolve(this);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, function onGet(error, row) {
      if (error) {
        reject(error);
        return;
      }

      resolve(row);
    });
  });
}

function initializeDatabase() {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        phone TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        goal TEXT DEFAULT '',
        bio TEXT DEFAULT '',
        avatar TEXT DEFAULT '',
        created_at TEXT NOT NULL
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id)
      )
    `);
  });
}

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    goal: user.goal || "",
    bio: user.bio || "",
    avatar: user.avatar || "",
    createdAt: user.created_at
  };
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizePhone(phone) {
  return String(phone || "").replace(/\D/g, "");
}

async function createSession(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  await run(
    "INSERT INTO sessions (user_id, token, created_at) VALUES (?, ?, ?)",
    [userId, token, new Date().toISOString()]
  );
  return token;
}

async function getUserByToken(token) {
  const session = await get(
    `
      SELECT users.*
      FROM sessions
      JOIN users ON users.id = sessions.user_id
      WHERE sessions.token = ?
    `,
    [token]
  );

  return session || null;
}

async function authMiddleware(req, res, next) {
  const authorization = req.headers.authorization || "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice(7)
    : "";

  if (!token) {
    res.status(401).json({ message: "Bạn cần đăng nhập để tiếp tục." });
    return;
  }

  try {
    const user = await getUserByToken(token);

    if (!user) {
      res.status(401).json({ message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn." });
      return;
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    res.status(500).json({ message: "Không thể xác thực người dùng." });
  }
}

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.static(__dirname));

app.post("/api/auth/register", async (req, res) => {
  const name = String(req.body.name || "").trim();
  const email = normalizeEmail(req.body.email);
  const phone = normalizePhone(req.body.phone);
  const goal = String(req.body.goal || "").trim();
  const password = String(req.body.password || "");

  if (name.length < 2) {
    res.status(400).json({ message: "Họ và tên cần có ít nhất 2 ký tự." });
    return;
  }

  if (!email.includes("@")) {
    res.status(400).json({ message: "Email chưa đúng định dạng." });
    return;
  }

  if (phone.length < 10) {
    res.status(400).json({ message: "Số điện thoại cần có ít nhất 10 chữ số." });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ message: "Mật khẩu cần có tối thiểu 8 ký tự." });
    return;
  }

  try {
    const emailExists = await get("SELECT id FROM users WHERE email = ?", [email]);
    const phoneExists = await get("SELECT id FROM users WHERE phone = ?", [phone]);

    if (emailExists) {
      res.status(409).json({ message: "Email này đã được đăng ký." });
      return;
    }

    if (phoneExists) {
      res.status(409).json({ message: "Số điện thoại này đã được sử dụng." });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const createdAt = new Date().toISOString();
    const result = await run(
      `
        INSERT INTO users (name, email, phone, password_hash, goal, bio, avatar, created_at)
        VALUES (?, ?, ?, ?, ?, '', '', ?)
      `,
      [name, email, phone, passwordHash, goal, createdAt]
    );

    const user = await get("SELECT * FROM users WHERE id = ?", [result.lastID]);
    const token = await createSession(user.id);

    res.status(201).json({
      message: "Tạo tài khoản thành công.",
      token,
      user: sanitizeUser(user)
    });
  } catch (error) {
    res.status(500).json({ message: "Không thể tạo tài khoản lúc này." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const identifier = String(req.body.identifier || "").trim();
  const password = String(req.body.password || "");
  const normalizedIdentifier = identifier.toLowerCase();
  const normalizedPhone = normalizePhone(identifier);

  try {
    const user = await get(
      "SELECT * FROM users WHERE email = ? OR phone = ?",
      [normalizedIdentifier, normalizedPhone]
    );

    if (!user) {
      res.status(401).json({ message: "Email/số điện thoại hoặc mật khẩu chưa chính xác." });
      return;
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      res.status(401).json({ message: "Email/số điện thoại hoặc mật khẩu chưa chính xác." });
      return;
    }

    const token = await createSession(user.id);
    res.json({
      message: "Đăng nhập thành công.",
      token,
      user: sanitizeUser(user)
    });
  } catch (error) {
    res.status(500).json({ message: "Không thể đăng nhập lúc này." });
  }
});

app.post("/api/auth/logout", authMiddleware, async (req, res) => {
  try {
    await run("DELETE FROM sessions WHERE token = ?", [req.token]);
    res.json({ message: "Đăng xuất thành công." });
  } catch (error) {
    res.status(500).json({ message: "Không thể đăng xuất lúc này." });
  }
});

app.post("/api/auth/forgot-password", async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const phone = normalizePhone(req.body.phone);
  const newPassword = String(req.body.newPassword || "");

  if (newPassword.length < 8) {
    res.status(400).json({ message: "Mật khẩu mới cần có tối thiểu 8 ký tự." });
    return;
  }

  try {
    const user = await get(
      "SELECT * FROM users WHERE email = ? AND phone = ?",
      [email, phone]
    );

    if (!user) {
      res.status(404).json({ message: "Không tìm thấy tài khoản khớp với email và số điện thoại." });
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await run("UPDATE users SET password_hash = ? WHERE id = ?", [passwordHash, user.id]);
    await run("DELETE FROM sessions WHERE user_id = ?", [user.id]);

    res.json({ message: "Đặt lại mật khẩu thành công. Hãy đăng nhập lại." });
  } catch (error) {
    res.status(500).json({ message: "Không thể đặt lại mật khẩu lúc này." });
  }
});

app.get("/api/profile", authMiddleware, async (req, res) => {
  res.json({ user: sanitizeUser(req.user) });
});

app.put("/api/profile", authMiddleware, async (req, res) => {
  const name = String(req.body.name || "").trim();
  const email = normalizeEmail(req.body.email);
  const phone = normalizePhone(req.body.phone);
  const goal = String(req.body.goal || "").trim();
  const bio = String(req.body.bio || "").trim();
  const avatar = String(req.body.avatar || "").trim();

  if (name.length < 2) {
    res.status(400).json({ message: "Tên hiển thị cần có ít nhất 2 ký tự." });
    return;
  }

  if (!email.includes("@")) {
    res.status(400).json({ message: "Email chưa đúng định dạng." });
    return;
  }

  if (phone.length < 10) {
    res.status(400).json({ message: "Số điện thoại cần có ít nhất 10 chữ số." });
    return;
  }

  try {
    const emailExists = await get(
      "SELECT id FROM users WHERE email = ? AND id != ?",
      [email, req.user.id]
    );
    const phoneExists = await get(
      "SELECT id FROM users WHERE phone = ? AND id != ?",
      [phone, req.user.id]
    );

    if (emailExists) {
      res.status(409).json({ message: "Email này đang được sử dụng bởi tài khoản khác." });
      return;
    }

    if (phoneExists) {
      res.status(409).json({ message: "Số điện thoại này đang được sử dụng bởi tài khoản khác." });
      return;
    }

    await run(
      `
        UPDATE users
        SET name = ?, email = ?, phone = ?, goal = ?, bio = ?, avatar = ?
        WHERE id = ?
      `,
      [name, email, phone, goal, bio, avatar, req.user.id]
    );

    const updatedUser = await get("SELECT * FROM users WHERE id = ?", [req.user.id]);
    res.json({
      message: "Hồ sơ đã được cập nhật thành công.",
      user: sanitizeUser(updatedUser)
    });
  } catch (error) {
    res.status(500).json({ message: "Không thể cập nhật hồ sơ lúc này." });
  }
});

app.put("/api/profile/password", authMiddleware, async (req, res) => {
  const currentPassword = String(req.body.currentPassword || "");
  const newPassword = String(req.body.newPassword || "");

  if (newPassword.length < 8) {
    res.status(400).json({ message: "Mật khẩu mới cần có tối thiểu 8 ký tự." });
    return;
  }

  try {
    const passwordMatches = await bcrypt.compare(currentPassword, req.user.password_hash);
    if (!passwordMatches) {
      res.status(401).json({ message: "Mật khẩu hiện tại chưa chính xác." });
      return;
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await run("UPDATE users SET password_hash = ? WHERE id = ?", [newHash, req.user.id]);
    await run("DELETE FROM sessions WHERE user_id = ? AND token != ?", [req.user.id, req.token]);

    res.json({ message: "Mật khẩu đã được cập nhật thành công." });
  } catch (error) {
    res.status(500).json({ message: "Không thể cập nhật mật khẩu lúc này." });
  }
});

app.get(/.*/, (req, res) => {
  const requestedPath = path.join(__dirname, req.path);
  if (fs.existsSync(requestedPath) && fs.statSync(requestedPath).isFile()) {
    res.sendFile(requestedPath);
    return;
  }

  res.sendFile(path.join(__dirname, "index.html"));
});

initializeDatabase();

app.listen(PORT, () => {
  console.log(`Mentor Me server is running at http://localhost:${PORT}`);
});
