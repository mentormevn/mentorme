require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_DASHBOARD_PASSWORD = process.env.ADMIN_DASHBOARD_PASSWORD || "ADMIN2026";
<<<<<<< HEAD
const DATA_DIR = path.join(__dirname, "data");
const DB_PATH = path.join(DATA_DIR, "mentor-me.db");
=======
const SUPABASE_URL =
  process.env.SUPABASE_URL || "https://gmyrnqupbqwbyaamixgv.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdteXJucXVwYnF3YnlhYW1peGd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MTgzOTYsImV4cCI6MjA4OTk5NDM5Nn0.Q8EN6VzW6NG6hsMyOki5GjZsiWPfS0msjBesu6_gy6U";
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  "";
>>>>>>> 155461a0426eca3495bdd89cf41124fc7a01e3fc

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.static(__dirname));

class SupabaseError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = "SupabaseError";
    this.status = status;
    this.details = details;
  }
}

function ensureFetchAvailable() {
  if (typeof fetch !== "function") {
    throw new Error("Global fetch is required to run this server.");
  }
}

function hasSupabasePublicConfig() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

function hasSupabaseServerConfig() {
  return Boolean(hasSupabasePublicConfig() && SUPABASE_SERVICE_ROLE_KEY);
}

function ensureSupabaseConfig(res, options = {}) {
  const requireServiceRole = options.requireServiceRole !== false;
  const isReady = requireServiceRole
    ? hasSupabaseServerConfig()
    : hasSupabasePublicConfig();

  if (isReady) {
    return true;
  }

  res.status(500).json({
    message:
      "Cau hinh Supabase tren server chua day du. Hay kiem tra SUPABASE_URL, SUPABASE_ANON_KEY va SUPABASE_SERVICE_ROLE_KEY."
  });
  return false;
}

<<<<<<< HEAD
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
=======
function getSupabaseApiUrl(segment) {
  return new URL(segment, SUPABASE_URL.endsWith("/") ? SUPABASE_URL : SUPABASE_URL + "/");
>>>>>>> 155461a0426eca3495bdd89cf41124fc7a01e3fc
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizePhone(phone) {
  return String(phone || "").replace(/\D/g, "");
}

<<<<<<< HEAD
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
=======
function normalizeRole(role) {
  const normalized = String(role || "").trim().toLowerCase();
  if (normalized === "mentor" || normalized === "admin") {
    return normalized;
  }

  return "mentee";
>>>>>>> 155461a0426eca3495bdd89cf41124fc7a01e3fc
}

function extractSupabaseMessage(payload, fallbackMessage) {
  if (!payload) {
    return fallbackMessage;
  }

  if (typeof payload === "string") {
    return payload || fallbackMessage;
  }

  return (
    payload.msg ||
    payload.message ||
    payload.error_description ||
    payload.error ||
    fallbackMessage
  );
}

async function parseResponseBody(response) {
  const raw = await response.text();
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    return raw;
  }
}

function buildHeaders(options = {}) {
  const useServiceRole = Boolean(options.useServiceRole);
  const accessToken = options.accessToken || "";
  const headers = Object.assign({}, options.headers);
  const apiKey = useServiceRole ? SUPABASE_SERVICE_ROLE_KEY : SUPABASE_ANON_KEY;

  headers.apikey = apiKey;

  if (accessToken) {
    headers.Authorization = "Bearer " + accessToken;
  } else if (useServiceRole) {
    headers.Authorization = "Bearer " + SUPABASE_SERVICE_ROLE_KEY;
  }

  return headers;
}

async function requestSupabase(pathname, options = {}) {
  ensureFetchAvailable();

  const isAuthRequest = options.kind === "auth";
  const baseUrl = isAuthRequest ? getSupabaseApiUrl("auth/v1/") : getSupabaseApiUrl("rest/v1/");
  const url = new URL(pathname, baseUrl);
  const method = options.method || "GET";
  const headers = buildHeaders({
    useServiceRole: options.useServiceRole,
    accessToken: options.accessToken,
    headers: options.headers
  });

  const searchParams = new URLSearchParams();
  if (options.query) {
    Object.keys(options.query).forEach(function appendQuery(key) {
      const value = options.query[key];
      if (value === undefined || value === null || value === "") {
        return;
      }

      if (Array.isArray(value)) {
        value.forEach(function appendMany(item) {
          searchParams.append(key, item);
        });
        return;
      }

      searchParams.set(key, String(value));
    });
  }

  if (Array.from(searchParams.keys()).length) {
    url.search = searchParams.toString();
  }

  const requestInit = {
    method: method,
    headers: headers
  };

  if (options.body !== undefined) {
    requestInit.body = JSON.stringify(options.body);
    if (!requestInit.headers["Content-Type"]) {
      requestInit.headers["Content-Type"] = "application/json";
    }
  }

  const response = await fetch(url, requestInit);
  const payload = await parseResponseBody(response);

  if (!response.ok) {
    throw new SupabaseError(
      response.status,
      extractSupabaseMessage(payload, "Khong the xu ly yeu cau voi Supabase."),
      payload
    );
  }

  return payload;
}

async function restSelect(table, options = {}) {
  const query = Object.assign(
    {
      select: options.select || "*"
    },
    options.query || {}
  );

  const payload = await requestSupabase(table, {
    kind: "rest",
    method: "GET",
    query: query,
    useServiceRole: options.useServiceRole !== false,
    accessToken: options.accessToken
  });

  if (options.single) {
    return Array.isArray(payload) ? payload[0] || null : payload || null;
  }

  return Array.isArray(payload) ? payload : [];
}

async function restInsert(table, rows, options = {}) {
  const payload = await requestSupabase(table, {
    kind: "rest",
    method: "POST",
    query: options.query,
    body: rows,
    useServiceRole: options.useServiceRole !== false,
    accessToken: options.accessToken,
    headers: {
      Prefer: options.prefer || "return=representation"
    }
  });

  return Array.isArray(payload) ? payload : [payload];
}

async function restUpsert(table, rows, options = {}) {
  const preferParts = ["return=representation", "resolution=merge-duplicates"];
  if (options.prefer) {
    preferParts.unshift(options.prefer);
  }

  const query = Object.assign({}, options.query || {});
  if (options.onConflict) {
    query.on_conflict = options.onConflict;
  }

  const payload = await requestSupabase(table, {
    kind: "rest",
    method: "POST",
    query: query,
    body: rows,
    useServiceRole: options.useServiceRole !== false,
    accessToken: options.accessToken,
    headers: {
      Prefer: preferParts.join(",")
    }
  });

  return Array.isArray(payload) ? payload : [payload];
}

async function restUpdate(table, patch, options = {}) {
  const payload = await requestSupabase(table, {
    kind: "rest",
    method: "PATCH",
    query: options.query,
    body: patch,
    useServiceRole: options.useServiceRole !== false,
    accessToken: options.accessToken,
    headers: {
      Prefer: options.prefer || "return=representation"
    }
  });

  return Array.isArray(payload) ? payload : [payload];
}

async function authRequest(pathname, options = {}) {
  return requestSupabase(pathname, Object.assign({}, options, { kind: "auth" }));
}

function unwrapAuthUser(payload) {
  if (!payload) {
    return null;
  }

  return payload.user || payload;
}

function sanitizeUser(authUser, profile) {
  const profileData = profile || {};
  const role = normalizeRole(profileData.role || (authUser && authUser.user_metadata && authUser.user_metadata.role));
  const email = (authUser && authUser.email) || profileData.email || "";
  const name =
    profileData.full_name ||
    (authUser && authUser.user_metadata && authUser.user_metadata.full_name) ||
    (email ? email.split("@")[0] : "Mentor Me User");

  return {
    id: authUser && authUser.id ? authUser.id : profileData.id,
    name: name,
    email: email,
    phone: profileData.phone || "",
    goal: profileData.goal || "",
    bio: profileData.bio || "",
    role: role,
    avatar: profileData.avatar_url || "",
    createdAt:
      profileData.created_at ||
      (authUser && authUser.created_at) ||
      new Date().toISOString()
  };
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

function toEqualityFilter(value) {
  return "eq." + String(value);
}

function parseNumericId(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

async function getProfileById(userId) {
  if (!userId) {
    return null;
  }

  return restSelect("profiles", {
    single: true,
    query: {
      select: "*",
      id: toEqualityFilter(userId),
      limit: 1
    }
  });
}

async function upsertProfile(profile) {
  const now = new Date().toISOString();
  const payload = Object.assign(
    {
      full_name: "",
      phone: "",
      goal: "",
      bio: "",
      role: "mentee",
      avatar_url: "",
      updated_at: now
    },
    profile
  );

  const [savedProfile] = await restUpsert("profiles", payload, {
    onConflict: "id"
  });

  return savedProfile || null;
}

async function getProfileByPhone(phone, excludeUserId) {
  if (!phone) {
    return null;
  }

  const query = {
    select: "*",
    phone: toEqualityFilter(phone),
    limit: 1
  };

  if (excludeUserId) {
    query.id = "neq." + String(excludeUserId);
  }

  return restSelect("profiles", {
    single: true,
    query: query
  });
}

async function getAuthUserByToken(token) {
  if (!token) {
    return null;
  }

  try {
    const payload = await authRequest("user", {
      method: "GET",
      accessToken: token,
      useServiceRole: false
    });
    return unwrapAuthUser(payload);
  } catch (error) {
    if (error instanceof SupabaseError && error.status === 401) {
      return null;
    }

    throw error;
  }
}

async function getAuthUserById(userId) {
  if (!userId) {
    return null;
  }

  try {
    const payload = await authRequest("admin/users/" + encodeURIComponent(userId), {
      method: "GET",
      useServiceRole: true
    });
    return unwrapAuthUser(payload);
  } catch (error) {
    if (error instanceof SupabaseError && error.status === 404) {
      return null;
    }

    throw error;
  }
}

async function signInWithPassword(credentials) {
  return authRequest("token", {
    method: "POST",
    query: {
      grant_type: "password"
    },
    body: credentials,
    useServiceRole: false
  });
}

async function updateAuthenticatedUser(accessToken, attributes) {
  const payload = await authRequest("user", {
    method: "PUT",
    accessToken: accessToken,
    body: attributes,
    useServiceRole: false
  });
  return unwrapAuthUser(payload);
}

async function updateAuthUserById(userId, attributes) {
  return authRequest("admin/users/" + encodeURIComponent(userId), {
    method: "PUT",
    body: attributes,
    useServiceRole: true
  });
}

async function logoutAuthenticatedUser(accessToken) {
  return authRequest("logout", {
    method: "POST",
    accessToken: accessToken,
    useServiceRole: false
  });
}

function requireAdmin(req, res, next) {
  const adminKey = String(req.headers["x-admin-key"] || "");

  if (!adminKey || adminKey !== ADMIN_DASHBOARD_PASSWORD) {
    res.status(401).json({ message: "Ban khong co quyen truy cap khu vuc quan tri." });
    return;
  }

  next();
}

async function authMiddleware(req, res, next) {
  const authorization = req.headers.authorization || "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice(7)
    : "";

  if (!token) {
    res.status(401).json({ message: "Ban can dang nhap de tiep tuc." });
    return;
  }

  try {
    const authUser = await getAuthUserByToken(token);

    if (!authUser) {
      res.status(401).json({ message: "Phien dang nhap khong hop le hoac da het han." });
      return;
    }

    const profile = await getProfileById(authUser.id);
    req.token = token;
    req.authUser = authUser;
    req.profile = profile;
    req.user = sanitizeUser(authUser, profile);
    next();
  } catch (error) {
    res.status(500).json({ message: "Khong the xac thuc nguoi dung." });
  }
}

function handleRouteError(res, error, fallbackMessage, fallbackStatus) {
  const status = error instanceof SupabaseError ? error.status : fallbackStatus || 500;
  const message =
    error instanceof SupabaseError ? error.message : fallbackMessage;

  res.status(status || 500).json({
    message: message || fallbackMessage || "Khong the xu ly yeu cau luc nay."
  });
}

function requireAdmin(req, res, next) {
  const adminKey = String(req.headers["x-admin-key"] || "");

  if (!adminKey || adminKey !== ADMIN_DASHBOARD_PASSWORD) {
    res.status(401).json({ message: "Bạn không có quyền truy cập khu vực quản trị." });
    return;
  }

  next();
}

app.post("/api/auth/register", async (req, res) => {
  if (!ensureSupabaseConfig(res)) {
    return;
  }

  const name = String(req.body.name || "").trim();
  const email = normalizeEmail(req.body.email);
  const phone = normalizePhone(req.body.phone);
  const goal = String(req.body.goal || "").trim();
<<<<<<< HEAD
  const role = ["mentee", "mentor", "admin"].includes(String(req.body.role || "").trim())
    ? String(req.body.role || "").trim()
    : "mentee";
=======
  const role = normalizeRole(req.body.role);
>>>>>>> 155461a0426eca3495bdd89cf41124fc7a01e3fc
  const password = String(req.body.password || "");

  if (name.length < 2) {
    res.status(400).json({ message: "Ho va ten can co it nhat 2 ky tu." });
    return;
  }

  if (!email.includes("@")) {
    res.status(400).json({ message: "Email chua dung dinh dang." });
    return;
  }

  if (phone.length < 10) {
    res.status(400).json({ message: "So dien thoai can co it nhat 10 chu so." });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ message: "Mat khau can co toi thieu 8 ky tu." });
    return;
  }

  try {
    const phoneExists = await getProfileByPhone(phone);
    if (phoneExists) {
      res.status(409).json({ message: "So dien thoai nay da duoc su dung." });
      return;
    }

<<<<<<< HEAD
    const passwordHash = await bcrypt.hash(password, 10);
    const createdAt = new Date().toISOString();
    const result = await run(
      `
        INSERT INTO users (name, email, phone, password_hash, goal, bio, role, avatar, created_at)
        VALUES (?, ?, ?, ?, ?, '', ?, '', ?)
      `,
      [name, email, phone, passwordHash, goal, role, createdAt]
    );
=======
    const signupResult = await authRequest("signup", {
      method: "POST",
      body: {
        email: email,
        password: password,
        data: {
          full_name: name,
          role: role
        }
      },
      useServiceRole: false
    });
>>>>>>> 155461a0426eca3495bdd89cf41124fc7a01e3fc

    const createdUser = unwrapAuthUser(signupResult);
    if (!createdUser) {
      throw new SupabaseError(500, "Khong the tao tai khoan luc nay.");
    }

    const savedProfile = await upsertProfile({
      id: createdUser.id,
      full_name: name,
      phone: phone,
      goal: goal,
      bio: "",
      role: role,
      avatar_url: "",
      created_at: createdUser.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    const token =
      signupResult.access_token ||
      (signupResult.session && signupResult.session.access_token) ||
      "";
    const responseUser =
      token ? await getAuthUserByToken(token) : createdUser;

    res.status(201).json({
      message: token
        ? "Tao tai khoan thanh cong."
        : "Tai khoan da duoc tao. Hay kiem tra email de xac nhan truoc khi dang nhap.",
      token: token,
      user: sanitizeUser(responseUser, savedProfile)
    });
  } catch (error) {
    if (error instanceof SupabaseError && /already registered/i.test(error.message)) {
      res.status(409).json({ message: "Email nay da duoc dang ky." });
      return;
    }

    handleRouteError(res, error, "Khong the tao tai khoan luc nay.");
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
  if (!ensureSupabaseConfig(res)) {
    return;
  }

  const identifier = String(req.body.identifier || "").trim();
  const password = String(req.body.password || "");
  let email = normalizeEmail(identifier);

  try {
    if (!identifier.includes("@")) {
      const phone = normalizePhone(identifier);
      const profile = await getProfileByPhone(phone);

      if (!profile) {
        res.status(401).json({ message: "Email/so dien thoai hoac mat khau chua chinh xac." });
        return;
      }

      const authUser = await getAuthUserById(profile.id);
      email = normalizeEmail(authUser && authUser.email);
    }

    if (!email || !email.includes("@")) {
      res.status(401).json({ message: "Email/so dien thoai hoac mat khau chua chinh xac." });
      return;
    }

    const loginResult = await signInWithPassword({
      email: email,
      password: password
    });

    const authUser =
      unwrapAuthUser(loginResult) ||
      (loginResult.session && loginResult.session.user) ||
      null;
    const token = loginResult.access_token || (loginResult.session && loginResult.session.access_token) || "";

    if (!authUser || !token) {
      throw new SupabaseError(500, "Khong the dang nhap luc nay.");
    }

    const profile = await getProfileById(authUser.id);

    res.json({
      message: "Dang nhap thanh cong.",
      token: token,
      user: sanitizeUser(authUser, profile)
    });
  } catch (error) {
    if (
      error instanceof SupabaseError &&
      [400, 401, 422].includes(error.status)
    ) {
      res.status(401).json({ message: "Email/so dien thoai hoac mat khau chua chinh xac." });
      return;
    }

    handleRouteError(res, error, "Khong the dang nhap luc nay.");
  }
});

app.post("/api/auth/logout", authMiddleware, async (req, res) => {
  if (!ensureSupabaseConfig(res, { requireServiceRole: false })) {
    return;
  }

  try {
    await logoutAuthenticatedUser(req.token);
    res.json({ message: "Dang xuat thanh cong." });
  } catch (error) {
    handleRouteError(res, error, "Khong the dang xuat luc nay.");
  }
});

app.post("/api/auth/forgot-password", async (req, res) => {
  if (!ensureSupabaseConfig(res)) {
    return;
  }

  const email = normalizeEmail(req.body.email);
  const phone = normalizePhone(req.body.phone);
  const newPassword = String(req.body.newPassword || "");

  if (newPassword.length < 8) {
    res.status(400).json({ message: "Mat khau moi can co toi thieu 8 ky tu." });
    return;
  }

  try {
    const profile = await getProfileByPhone(phone);
    if (!profile) {
      res.status(404).json({ message: "Khong tim thay tai khoan khop voi email va so dien thoai." });
      return;
    }

    const authUser = await getAuthUserById(profile.id);
    if (!authUser || normalizeEmail(authUser.email) !== email) {
      res.status(404).json({ message: "Khong tim thay tai khoan khop voi email va so dien thoai." });
      return;
    }

    await updateAuthUserById(profile.id, {
      password: newPassword
    });

    res.json({ message: "Dat lai mat khau thanh cong. Hay dang nhap lai." });
  } catch (error) {
    handleRouteError(res, error, "Khong the dat lai mat khau luc nay.");
  }
});

app.get("/api/profile", authMiddleware, async (req, res) => {
  res.json({ user: sanitizeUser(req.authUser, req.profile) });
});

app.put("/api/profile", authMiddleware, async (req, res) => {
  if (!ensureSupabaseConfig(res)) {
    return;
  }

  const name = String(req.body.name || "").trim();
  const email = normalizeEmail(req.body.email || req.authUser.email);
  const phone = normalizePhone(req.body.phone);
  const goal = String(req.body.goal || "").trim();
  const bio = String(req.body.bio || "").trim();
  const avatar = String(req.body.avatar || "").trim();

  if (name.length < 2) {
    res.status(400).json({ message: "Ten hien thi can co it nhat 2 ky tu." });
    return;
  }

  if (!email.includes("@")) {
    res.status(400).json({ message: "Email chua dung dinh dang." });
    return;
  }

  if (phone.length < 10) {
    res.status(400).json({ message: "So dien thoai can co it nhat 10 chu so." });
    return;
  }

  try {
    const phoneExists = await getProfileByPhone(phone, req.authUser.id);

    if (phoneExists) {
      res.status(409).json({ message: "So dien thoai nay dang duoc su dung boi tai khoan khac." });
      return;
    }

    let updatedAuthUser = req.authUser;
    if (email !== normalizeEmail(req.authUser.email)) {
      updatedAuthUser = await updateAuthenticatedUser(req.token, { email: email });
    }

    const savedProfile = await upsertProfile({
      id: req.authUser.id,
      full_name: name,
      phone: phone,
      goal: goal,
      bio: bio,
      role: normalizeRole((req.profile && req.profile.role) || (req.authUser.user_metadata && req.authUser.user_metadata.role)),
      avatar_url: avatar || ((req.profile && req.profile.avatar_url) || ""),
      created_at:
        (req.profile && req.profile.created_at) || req.authUser.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    res.json({
      message: "Ho so da duoc cap nhat thanh cong.",
      user: sanitizeUser(updatedAuthUser, savedProfile)
    });
  } catch (error) {
    handleRouteError(res, error, "Khong the cap nhat ho so luc nay.");
  }
});

app.put("/api/profile/password", authMiddleware, async (req, res) => {
  if (!ensureSupabaseConfig(res, { requireServiceRole: false })) {
    return;
  }

  const currentPassword = String(req.body.currentPassword || "");
  const newPassword = String(req.body.newPassword || "");

  if (newPassword.length < 8) {
    res.status(400).json({ message: "Mat khau moi can co toi thieu 8 ky tu." });
    return;
  }

  try {
    await signInWithPassword({
      email: normalizeEmail(req.authUser.email),
      password: currentPassword
    });

    await updateAuthenticatedUser(req.token, {
      password: newPassword
    });

    res.json({ message: "Mat khau da duoc cap nhat thanh cong." });
  } catch (error) {
    if (error instanceof SupabaseError && error.status === 400) {
      res.status(401).json({ message: "Mat khau hien tai chua chinh xac." });
      return;
    }

    handleRouteError(res, error, "Khong the cap nhat mat khau luc nay.");
  }
});

app.post("/api/consultation-requests", async (req, res) => {
  if (!ensureSupabaseConfig(res)) {
    return;
  }

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
    res.status(400).json({ message: "Vui long nhap ho va ten hop le." });
    return;
  }

  if (!email.includes("@")) {
    res.status(400).json({ message: "Email chua dung dinh dang." });
    return;
  }

  if (phone.length < 10) {
    res.status(400).json({ message: "So dien thoai can co it nhat 10 chu so." });
    return;
  }

  if (!serviceType) {
    res.status(400).json({ message: "Vui long chon loai dich vu ban quan tam." });
    return;
  }

  if (goal.length < 10) {
    res.status(400).json({ message: "Hay mo ta muc tieu cua ban chi tiet hon mot chut." });
    return;
  }

  if (!preferredFormat) {
    res.status(400).json({ message: "Vui long chon hinh thuc tu van mong muon." });
    return;
  }

  try {
    const now = new Date().toISOString();
    const [createdRequest] = await restInsert("consultation_requests", {
      name: name,
      email: email,
      phone: phone,
      service_type: serviceType,
      audience: audience,
      goal: goal,
      preferred_format: preferredFormat,
      preferred_channel: preferredChannel,
      preferred_time: preferredTime,
      note: note,
      status: "new",
      admin_note: "",
      meeting_link: "",
      created_at: now,
      updated_at: now
    });

    res.status(201).json({
      message: "Yeu cau tu van da duoc gui thanh cong.",
      request: sanitizeConsultationRequest(createdRequest)
    });
  } catch (error) {
    handleRouteError(res, error, "Khong the gui yeu cau tu van luc nay.");
  }
});

app.post("/api/mentor-applications", async (req, res) => {
  if (!ensureSupabaseConfig(res)) {
    return;
  }

  const fullName = String(req.body.fullName || "").trim();
  const email = normalizeEmail(req.body.email);
  const phone = normalizePhone(req.body.phone);
  const expertise = String(req.body.expertise || "").trim();
  const experience = String(req.body.experience || "").trim();
  const motivation = String(req.body.motivation || "").trim();
  const portfolioLink = String(req.body.portfolioLink || "").trim();

  if (fullName.length < 2) {
    res.status(400).json({ message: "Vui long nhap ho va ten hop le." });
    return;
  }

  if (!email.includes("@")) {
    res.status(400).json({ message: "Email chua dung dinh dang." });
    return;
  }

  if (phone.length < 10) {
    res.status(400).json({ message: "So dien thoai can co it nhat 10 chu so." });
    return;
  }

  if (expertise.length < 4) {
    res.status(400).json({ message: "Hay mo ta linh vuc chuyen mon ro hon." });
    return;
  }

  if (motivation.length < 20) {
    res.status(400).json({ message: "Hay chia se ky hon ly do ban muon tro thanh mentor." });
    return;
  }

  try {
    const existedApplication = await restSelect("mentor_applications", {
      single: true,
      query: {
        select: "id,status",
        email: toEqualityFilter(email),
        order: "created_at.desc",
        limit: 1
      }
    });

    if (existedApplication && existedApplication.status !== "rejected") {
      res.status(409).json({ message: "Email nay da co ho so ung tuyen mentor dang duoc xu ly." });
      return;
    }

    const now = new Date().toISOString();
    const [createdApplication] = await restInsert("mentor_applications", {
      full_name: fullName,
      email: email,
      phone: phone,
      expertise: expertise,
      experience: experience,
      motivation: motivation,
      portfolio_link: portfolioLink,
      status: "pending",
      admin_note: "",
      activation_code: "",
      invited_at: null,
      activated_at: null,
      created_at: now,
      updated_at: now
    });

    res.status(201).json({
      message:
        "Da gui ho so ung tuyen mentor. Doi ngu Mentor Me se lien he neu ho so phu hop.",
      application: sanitizeMentorApplication(createdApplication)
    });
  } catch (error) {
    handleRouteError(res, error, "Khong the gui ho so ung tuyen luc nay.");
  }
});

app.get("/api/admin/consultation-requests", requireAdmin, async (req, res) => {
  if (!ensureSupabaseConfig(res)) {
    return;
  }

  try {
    const requests = await restSelect("consultation_requests", {
      query: {
        select: "*",
        order: "created_at.desc"
      }
    });

    res.json({
      requests: requests.map(sanitizeConsultationRequest)
    });
  } catch (error) {
    handleRouteError(res, error, "Khong the tai danh sach yeu cau tu van.");
  }
});

app.get("/api/admin/mentor-applications", requireAdmin, async (req, res) => {
  if (!ensureSupabaseConfig(res)) {
    return;
  }

  try {
    const applications = await restSelect("mentor_applications", {
      query: {
        select: "*",
        order: "created_at.desc"
      }
    });

    res.json({
      applications: applications.map(sanitizeMentorApplication)
    });
  } catch (error) {
    handleRouteError(res, error, "Khong the tai danh sach ung tuyen mentor.");
  }
});

app.put("/api/admin/consultation-requests/:id", requireAdmin, async (req, res) => {
  if (!ensureSupabaseConfig(res)) {
    return;
  }

  const requestId = parseNumericId(req.params.id);
  const status = String(req.body.status || "").trim();
  const adminNote = String(req.body.adminNote || "").trim();
  const meetingLink = String(req.body.meetingLink || "").trim();

  if (!requestId) {
    res.status(400).json({ message: "Ma yeu cau tu van khong hop le." });
    return;
  }

  if (!status) {
    res.status(400).json({ message: "Vui long chon trang thai xu ly." });
    return;
  }

  try {
    const existingRequest = await restSelect("consultation_requests", {
      single: true,
      query: {
        select: "*",
        id: toEqualityFilter(requestId),
        limit: 1
      }
    });

    if (!existingRequest) {
      res.status(404).json({ message: "Khong tim thay yeu cau tu van." });
      return;
    }

    const [updatedRequest] = await restUpdate(
      "consultation_requests",
      {
        status: status,
        admin_note: adminNote,
        meeting_link: meetingLink,
        updated_at: new Date().toISOString()
      },
      {
        query: {
          id: toEqualityFilter(requestId)
        }
      }
    );

    res.json({
      message: "Da cap nhat yeu cau tu van.",
      request: sanitizeConsultationRequest(updatedRequest || existingRequest)
    });
  } catch (error) {
    handleRouteError(res, error, "Khong the cap nhat yeu cau tu van.");
  }
});

app.put("/api/admin/mentor-applications/:id", requireAdmin, async (req, res) => {
  if (!ensureSupabaseConfig(res)) {
    return;
  }

  const applicationId = parseNumericId(req.params.id);
  const status = String(req.body.status || "").trim();
  const adminNote = String(req.body.adminNote || "").trim();
  const shouldGenerateActivation = Boolean(req.body.generateActivation);

  if (!applicationId) {
    res.status(400).json({ message: "Ma ho so mentor khong hop le." });
    return;
  }

  if (!status) {
    res.status(400).json({ message: "Vui long chon trang thai xu ly cho ho so mentor." });
    return;
  }

  try {
    const existingApplication = await restSelect("mentor_applications", {
      single: true,
      query: {
        select: "*",
        id: toEqualityFilter(applicationId),
        limit: 1
      }
    });

    if (!existingApplication) {
      res.status(404).json({ message: "Khong tim thay ho so ung tuyen mentor." });
      return;
    }

    const activationCode =
      shouldGenerateActivation && status === "approved"
        ? crypto.randomBytes(4).toString("hex").toUpperCase()
        : existingApplication.activation_code || "";
    const invitedAt =
      shouldGenerateActivation && status === "approved"
        ? new Date().toISOString()
        : existingApplication.invited_at || null;

    const [updatedApplication] = await restUpdate(
      "mentor_applications",
      {
        status: status,
        admin_note: adminNote,
        activation_code: activationCode,
        invited_at: invitedAt,
        updated_at: new Date().toISOString()
      },
      {
        query: {
          id: toEqualityFilter(applicationId)
        }
      }
    );

    res.json({
      message: "Da cap nhat ho so ung tuyen mentor.",
      application: sanitizeMentorApplication(updatedApplication || existingApplication)
    });
  } catch (error) {
    handleRouteError(res, error, "Khong the cap nhat ho so mentor.");
  }
});

app.post("/api/mentor-applications/verify-activation", async (req, res) => {
  if (!ensureSupabaseConfig(res)) {
    return;
  }

  const email = normalizeEmail(req.body.email);
  const activationCode = String(req.body.activationCode || "").trim().toUpperCase();

  if (!email.includes("@")) {
    res.status(400).json({ message: "Email chua dung dinh dang." });
    return;
  }

  if (!activationCode) {
    res.status(400).json({ message: "Vui long nhap ma kich hoat mentor." });
    return;
  }

  try {
    const application = await restSelect("mentor_applications", {
      single: true,
      query: {
        select: "*",
        email: toEqualityFilter(email),
        activation_code: toEqualityFilter(activationCode),
        status: toEqualityFilter("approved"),
        order: "created_at.desc",
        limit: 1
      }
    });

    if (!application) {
      res.status(404).json({ message: "Ma kich hoat khong hop le hoac ho so chua duoc duyet." });
      return;
    }

    res.json({
      message: "Ma kich hoat hop le.",
      application: sanitizeMentorApplication(application)
    });
  } catch (error) {
    handleRouteError(res, error, "Khong the xac minh ma kich hoat luc nay.");
  }
});

app.post("/api/mentor-applications/activate", async (req, res) => {
  if (!ensureSupabaseConfig(res)) {
    return;
  }

  const email = normalizeEmail(req.body.email);
  const activationCode = String(req.body.activationCode || "").trim().toUpperCase();

  if (!email.includes("@")) {
    res.status(400).json({ message: "Email chua dung dinh dang." });
    return;
  }

  if (!activationCode) {
    res.status(400).json({ message: "Vui long nhap ma kich hoat mentor." });
    return;
  }

  try {
    const application = await restSelect("mentor_applications", {
      single: true,
      query: {
        select: "*",
        email: toEqualityFilter(email),
        activation_code: toEqualityFilter(activationCode),
        status: toEqualityFilter("approved"),
        order: "created_at.desc",
        limit: 1
      }
    });

    if (!application) {
      res.status(404).json({ message: "Ma kich hoat khong hop le hoac ho so chua duoc duyet." });
      return;
    }

    const now = new Date().toISOString();
    const [updatedApplication] = await restUpdate(
      "mentor_applications",
      {
        status: "activated",
        activated_at: now,
        updated_at: now
      },
      {
        query: {
          id: toEqualityFilter(application.id)
        }
      }
    );

    res.json({
      message: "Da xac nhan kich hoat mentor.",
      application: sanitizeMentorApplication(updatedApplication || application)
    });
  } catch (error) {
    handleRouteError(res, error, "Khong the hoan tat kich hoat tai khoan mentor luc nay.");
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

if (!hasSupabaseServerConfig()) {
  console.warn(
    "Supabase server configuration is incomplete. API routes that write to Supabase will fail until SUPABASE_SERVICE_ROLE_KEY is set."
  );
}

app.listen(PORT, () => {
  console.log("Mentor Me server is running at http://localhost:" + PORT);
});
