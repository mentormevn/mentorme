const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const sqlite3 = require("sqlite3").verbose();

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_DASHBOARD_PASSWORD = process.env.ADMIN_DASHBOARD_PASSWORD || "ADMIN2026";
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

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, function onAll(error, rows) {
      if (error) {
        reject(error);
        return;
      }

      resolve(rows);
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
        role TEXT NOT NULL DEFAULT 'mentee',
        avatar TEXT DEFAULT '',
        created_at TEXT NOT NULL
      )
    `);

    db.run("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'mentee'", function ignoreRoleColumnError() {});

    db.run(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS consultation_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        service_type TEXT NOT NULL,
        audience TEXT DEFAULT '',
        goal TEXT NOT NULL,
        preferred_format TEXT NOT NULL,
        preferred_channel TEXT DEFAULT '',
        preferred_time TEXT DEFAULT '',
        note TEXT DEFAULT '',
        status TEXT NOT NULL DEFAULT 'new',
        admin_note TEXT DEFAULT '',
        meeting_link TEXT DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS mentor_applications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        full_name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        expertise TEXT NOT NULL,
        experience TEXT DEFAULT '',
        motivation TEXT NOT NULL,
        portfolio_link TEXT DEFAULT '',
        status TEXT NOT NULL DEFAULT 'pending',
        admin_note TEXT DEFAULT '',
        activation_code TEXT DEFAULT '',
        invited_at TEXT DEFAULT '',
        activated_at TEXT DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
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
    role: user.role || "mentee",
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

function sanitizeConsultationRequest(request) {
  return {
    id: request.id,
    name: request.name,
    email: request.email,
    phone: request.phone,
    serviceType: request.service_type,
    audience: request.audience || "",
    goal: request.goal || "",
    preferredFormat: request.preferred_format || "",
    preferredChannel: request.preferred_channel || "",
    preferredTime: request.preferred_time || "",
    note: request.note || "",
    status: request.status || "new",
    adminNote: request.admin_note || "",
    meetingLink: request.meeting_link || "",
    createdAt: request.created_at,
    updatedAt: request.updated_at
  };
}

function sanitizeMentorApplication(application) {
  return {
    id: application.id,
    fullName: application.full_name,
    email: application.email,
    phone: application.phone,
    expertise: application.expertise || "",
    experience: application.experience || "",
    motivation: application.motivation || "",
    portfolioLink: application.portfolio_link || "",
    status: application.status || "pending",
    adminNote: application.admin_note || "",
    activationCode: application.activation_code || "",
    invitedAt: application.invited_at || "",
    activatedAt: application.activated_at || "",
    createdAt: application.created_at,
    updatedAt: application.updated_at
  };
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

function requireAdmin(req, res, next) {
  const adminKey = String(req.headers["x-admin-key"] || "");

  if (!adminKey || adminKey !== ADMIN_DASHBOARD_PASSWORD) {
    res.status(401).json({ message: "Bạn không có quyền truy cập khu vực quản trị." });
    return;
  }

  next();
}

app.post("/api/auth/register", async (req, res) => {
  const name = String(req.body.name || "").trim();
  const email = normalizeEmail(req.body.email);
  const phone = normalizePhone(req.body.phone);
  const goal = String(req.body.goal || "").trim();
  const role = ["mentee", "mentor", "admin"].includes(String(req.body.role || "").trim())
    ? String(req.body.role || "").trim()
    : "mentee";
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
        INSERT INTO users (name, email, phone, password_hash, goal, bio, role, avatar, created_at)
        VALUES (?, ?, ?, ?, ?, '', ?, '', ?)
      `,
      [name, email, phone, passwordHash, goal, role, createdAt]
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

app.post("/api/mentor-applications", async (req, res) => {
  const fullName = String(req.body.fullName || "").trim();
  const email = normalizeEmail(req.body.email);
  const phone = normalizePhone(req.body.phone);
  const expertise = String(req.body.expertise || "").trim();
  const experience = String(req.body.experience || "").trim();
  const motivation = String(req.body.motivation || "").trim();
  const portfolioLink = String(req.body.portfolioLink || "").trim();

  if (fullName.length < 2) {
    res.status(400).json({ message: "Vui lòng nhập họ và tên hợp lệ." });
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

  if (expertise.length < 4) {
    res.status(400).json({ message: "Hãy mô tả lĩnh vực chuyên môn rõ hơn." });
    return;
  }

  if (motivation.length < 20) {
    res.status(400).json({ message: "Hãy chia sẻ kỹ hơn lý do bạn muốn trở thành mentor." });
    return;
  }

  try {
    const existedApplication = await get(
      "SELECT id, status FROM mentor_applications WHERE email = ? ORDER BY id DESC LIMIT 1",
      [email]
    );

    if (existedApplication && existedApplication.status !== "rejected") {
      res.status(409).json({ message: "Email này đã có hồ sơ ứng tuyển mentor đang được xử lý." });
      return;
    }

    const now = new Date().toISOString();
    const result = await run(
      `
        INSERT INTO mentor_applications (
          full_name, email, phone, expertise, experience, motivation, portfolio_link,
          status, admin_note, activation_code, invited_at, activated_at, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', '', '', '', '', ?, ?)
      `,
      [fullName, email, phone, expertise, experience, motivation, portfolioLink, now, now]
    );

    const createdApplication = await get(
      "SELECT * FROM mentor_applications WHERE id = ?",
      [result.lastID]
    );

    res.status(201).json({
      message: "Đã gửi hồ sơ ứng tuyển mentor. Đội ngũ Mentor Me sẽ liên hệ nếu hồ sơ phù hợp.",
      application: sanitizeMentorApplication(createdApplication)
    });
  } catch (error) {
    res.status(500).json({ message: "Không thể gửi hồ sơ ứng tuyển lúc này." });
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

app.post("/api/consultation-requests", async (req, res) => {
  const name = String(req.body.name || "").trim();
  const email = normalizeEmail(req.body.email);
  const phone = normalizePhone(req.body.phone);
  const serviceType = String(req.body.serviceType || "").trim();
  const audience = String(req.body.audience || "").trim();
  const goal = String(req.body.goal || "").trim();
  const preferredFormat = String(req.body.preferredFormat || "").trim();
  const preferredChannel = String(req.body.preferredChannel || "").trim();
  const preferredTime = String(req.body.preferredTime || "").trim();
  const note = String(req.body.note || "").trim();

  if (name.length < 2) {
    res.status(400).json({ message: "Vui lòng nhập họ và tên hợp lệ." });
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

  if (!serviceType) {
    res.status(400).json({ message: "Vui lòng chọn loại dịch vụ bạn quan tâm." });
    return;
  }

  if (goal.length < 10) {
    res.status(400).json({ message: "Hãy mô tả mục tiêu của bạn chi tiết hơn một chút." });
    return;
  }

  if (!preferredFormat) {
    res.status(400).json({ message: "Vui lòng chọn hình thức tư vấn mong muốn." });
    return;
  }

  try {
    const now = new Date().toISOString();
    const result = await run(
      `
        INSERT INTO consultation_requests (
          name, email, phone, service_type, audience, goal, preferred_format,
          preferred_channel, preferred_time, note, status, admin_note, meeting_link,
          created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', '', '', ?, ?)
      `,
      [
        name,
        email,
        phone,
        serviceType,
        audience,
        goal,
        preferredFormat,
        preferredChannel,
        preferredTime,
        note,
        now,
        now
      ]
    );

    const createdRequest = await get(
      "SELECT * FROM consultation_requests WHERE id = ?",
      [result.lastID]
    );

    res.status(201).json({
      message: "Yêu cầu tư vấn đã được gửi thành công.",
      request: sanitizeConsultationRequest(createdRequest)
    });
  } catch (error) {
    res.status(500).json({ message: "Không thể gửi yêu cầu tư vấn lúc này." });
  }
});

app.get("/api/admin/consultation-requests", requireAdmin, async (req, res) => {
  try {
    const requests = await all(
      "SELECT * FROM consultation_requests ORDER BY datetime(created_at) DESC"
    );

    res.json({
      requests: requests.map(sanitizeConsultationRequest)
    });
  } catch (error) {
    res.status(500).json({ message: "Không thể tải danh sách yêu cầu tư vấn." });
  }
});

app.get("/api/admin/mentor-applications", requireAdmin, async (req, res) => {
  try {
    const applications = await all(
      "SELECT * FROM mentor_applications ORDER BY datetime(created_at) DESC"
    );

    res.json({
      applications: applications.map(sanitizeMentorApplication)
    });
  } catch (error) {
    res.status(500).json({ message: "Không thể tải danh sách ứng tuyển mentor." });
  }
});

app.put("/api/admin/consultation-requests/:id", requireAdmin, async (req, res) => {
  const requestId = Number(req.params.id);
  const status = String(req.body.status || "").trim();
  const adminNote = String(req.body.adminNote || "").trim();
  const meetingLink = String(req.body.meetingLink || "").trim();

  if (!Number.isInteger(requestId) || requestId <= 0) {
    res.status(400).json({ message: "Mã yêu cầu tư vấn không hợp lệ." });
    return;
  }

  if (!status) {
    res.status(400).json({ message: "Vui lòng chọn trạng thái xử lý." });
    return;
  }

  try {
    const existingRequest = await get(
      "SELECT * FROM consultation_requests WHERE id = ?",
      [requestId]
    );

    if (!existingRequest) {
      res.status(404).json({ message: "Không tìm thấy yêu cầu tư vấn." });
      return;
    }

    await run(
      `
        UPDATE consultation_requests
        SET status = ?, admin_note = ?, meeting_link = ?, updated_at = ?
        WHERE id = ?
      `,
      [status, adminNote, meetingLink, new Date().toISOString(), requestId]
    );

    const updatedRequest = await get(
      "SELECT * FROM consultation_requests WHERE id = ?",
      [requestId]
    );

    res.json({
      message: "Đã cập nhật yêu cầu tư vấn.",
      request: sanitizeConsultationRequest(updatedRequest)
    });
  } catch (error) {
    res.status(500).json({ message: "Không thể cập nhật yêu cầu tư vấn." });
  }
});

app.put("/api/admin/mentor-applications/:id", requireAdmin, async (req, res) => {
  const applicationId = Number(req.params.id);
  const status = String(req.body.status || "").trim();
  const adminNote = String(req.body.adminNote || "").trim();
  const shouldGenerateActivation = Boolean(req.body.generateActivation);

  if (!Number.isInteger(applicationId) || applicationId <= 0) {
    res.status(400).json({ message: "Mã hồ sơ mentor không hợp lệ." });
    return;
  }

  if (!status) {
    res.status(400).json({ message: "Vui lòng chọn trạng thái xử lý cho hồ sơ mentor." });
    return;
  }

  try {
    const existingApplication = await get(
      "SELECT * FROM mentor_applications WHERE id = ?",
      [applicationId]
    );

    if (!existingApplication) {
      res.status(404).json({ message: "Không tìm thấy hồ sơ ứng tuyển mentor." });
      return;
    }

    const activationCode =
      shouldGenerateActivation && status === "approved"
        ? crypto.randomBytes(4).toString("hex").toUpperCase()
        : existingApplication.activation_code || "";
    const invitedAt =
      shouldGenerateActivation && status === "approved"
        ? new Date().toISOString()
        : existingApplication.invited_at || "";

    await run(
      `
        UPDATE mentor_applications
        SET status = ?, admin_note = ?, activation_code = ?, invited_at = ?, updated_at = ?
        WHERE id = ?
      `,
      [status, adminNote, activationCode, invitedAt, new Date().toISOString(), applicationId]
    );

    const updatedApplication = await get(
      "SELECT * FROM mentor_applications WHERE id = ?",
      [applicationId]
    );

    res.json({
      message: "Đã cập nhật hồ sơ ứng tuyển mentor.",
      application: sanitizeMentorApplication(updatedApplication)
    });
  } catch (error) {
    res.status(500).json({ message: "Không thể cập nhật hồ sơ mentor." });
  }
});

app.post("/api/mentor-applications/verify-activation", async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const activationCode = String(req.body.activationCode || "").trim().toUpperCase();

  if (!email.includes("@")) {
    res.status(400).json({ message: "Email chưa đúng định dạng." });
    return;
  }

  if (!activationCode) {
    res.status(400).json({ message: "Vui lòng nhập mã kích hoạt mentor." });
    return;
  }

  try {
    const application = await get(
      `
        SELECT *
        FROM mentor_applications
        WHERE email = ? AND activation_code = ? AND status = 'approved'
        ORDER BY id DESC
        LIMIT 1
      `,
      [email, activationCode]
    );

    if (!application) {
      res.status(404).json({ message: "Mã kích hoạt không hợp lệ hoặc hồ sơ chưa được duyệt." });
      return;
    }

    res.json({
      message: "Mã kích hoạt hợp lệ.",
      application: sanitizeMentorApplication(application)
    });
  } catch (error) {
    res.status(500).json({ message: "Không thể xác minh mã kích hoạt lúc này." });
  }
});

app.post("/api/mentor-applications/activate", async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const activationCode = String(req.body.activationCode || "").trim().toUpperCase();

  if (!email.includes("@")) {
    res.status(400).json({ message: "Email chưa đúng định dạng." });
    return;
  }

  if (!activationCode) {
    res.status(400).json({ message: "Vui lòng nhập mã kích hoạt mentor." });
    return;
  }

  try {
    const application = await get(
      `
        SELECT *
        FROM mentor_applications
        WHERE email = ? AND activation_code = ? AND status = 'approved'
        ORDER BY id DESC
        LIMIT 1
      `,
      [email, activationCode]
    );

    if (!application) {
      res.status(404).json({ message: "Mã kích hoạt không hợp lệ hoặc hồ sơ chưa được duyệt." });
      return;
    }

    await run(
      `
        UPDATE mentor_applications
        SET status = 'activated', activated_at = ?, updated_at = ?
        WHERE id = ?
      `,
      [new Date().toISOString(), new Date().toISOString(), application.id]
    );

    const updatedApplication = await get(
      "SELECT * FROM mentor_applications WHERE id = ?",
      [application.id]
    );

    res.json({
      message: "Đã xác nhận kích hoạt mentor.",
      application: sanitizeMentorApplication(updatedApplication)
    });
  } catch (error) {
    res.status(500).json({ message: "Không thể hoàn tất kích hoạt tài khoản mentor lúc này." });
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
