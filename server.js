const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const localEnv = {};
try {
  require("dotenv").config();
} catch (error) {
  const envPath = path.join(__dirname, ".env");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8");
    envContent.split(/\r?\n/).forEach(function (line) {
      const trimmed = String(line || "").trim();
      if (!trimmed || trimmed.startsWith("#")) {
        return;
      }

      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex < 0) {
        return;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1).trim();
      if (key) {
        localEnv[key] = value;
      }
      if (key && !process.env[key]) {
        process.env[key] = value;
      }
    });
  }
}

const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_DASHBOARD_PASSWORD = process.env.ADMIN_DASHBOARD_PASSWORD || "ADMIN2026";
const SUPABASE_URL = process.env.SUPABASE_URL || localEnv.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || localEnv.SUPABASE_ANON_KEY || "";
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  localEnv.SUPABASE_SERVICE_ROLE_KEY ||
  localEnv.SUPABASE_SERVICE_KEY ||
  "";
const PUBLIC_CONFIG_PATH = path.join(__dirname, "public-config.js");

function getPublicClientConfig() {
  return {
    SUPABASE_URL: SUPABASE_URL,
    SUPABASE_ANON_KEY: SUPABASE_ANON_KEY
  };
}

function writePublicConfigFile() {
  const fileContent = "window.MENTOR_ME_CONFIG = " + JSON.stringify(getPublicClientConfig(), null, 2) + ";\n";
  fs.writeFileSync(PUBLIC_CONFIG_PATH, fileContent, "utf8");
}

writePublicConfigFile();

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.get("/public-config.js", function (req, res) {
  res.type("application/javascript");
  res.send("window.MENTOR_ME_CONFIG = " + JSON.stringify(getPublicClientConfig(), null, 2) + ";\n");
});
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

function getSupabaseApiUrl(segment) {
  return new URL(segment, SUPABASE_URL.endsWith("/") ? SUPABASE_URL : SUPABASE_URL + "/");
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizePhone(phone) {
  return String(phone || "").replace(/\D/g, "");
}

function normalizeRole(role) {
  const normalized = String(role || "").trim().toLowerCase();
  if (normalized === "mentor" || normalized === "admin") {
    return normalized;
  }

  return "mentee";
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
    details: normalizeProfileDetails(profileData.details || {}),
    role: role,
    mentorId: profileData.mentor_id || "",
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

function buildMentorApplicationConflictMessage(application) {
  const status = String(application && application.status ? application.status : "pending").trim().toLowerCase();

  if (status === "approved") {
    return application.activation_code
      ? "Email nay da duoc duyet mentor va da co ma kich hoat. Hay vao trang mentor-activate.html de kich hoat tai khoan."
      : "Email nay da duoc duyet mentor. Admin can cap ma kich hoat truoc khi ban tao tai khoan.";
  }

  if (status === "activated") {
    return "Email nay da kich hoat tai khoan mentor. Hay dang nhap de su dung hoac dat lai mat khau neu can.";
  }

  if (status === "interviewing") {
    return "Email nay da co ho so mentor va dang o buoc phong van/chon loc. Vui long cho admin lien he tiep.";
  }

  return "Email nay da co ho so ung tuyen mentor dang duoc xu ly.";
}

function sanitizeMentorProfileUpdate(request) {
  return {
    id: String(request.id || ""),
    mentorId: request.mentor_id || "",
    mentorUserId: request.mentor_user_id || "",
    mentorName: request.mentor_name || "",
    status: request.status || "pending",
    adminNote: request.admin_note || "",
    profile: request.profile || {},
    createdAt: request.created_at,
    updatedAt: request.updated_at
  };
}

function sanitizeMentorProfile(record) {
  return {
    id: String(record.id || ""),
    ownerUserId: record.owner_user_id || "",
    email: record.email || "",
    name: record.name || "",
    field: normalizeFieldCategory(record.field || ""),
    visibility: record.visibility || "draft",
    status: record.status || "pending",
    profile: record.profile || {},
    createdAt: record.created_at,
    updatedAt: record.updated_at
  };
}

function sanitizeBookingRequest(request) {
  return {
    id: request.id,
    mentorId: request.mentor_id || "",
    mentorName: request.mentor_name || "",
    mentorImage: request.mentor_image || "",
    mentorFocus: request.mentor_focus || "",
    menteeUserId: request.mentee_user_id || "",
    menteeName: request.mentee_name || "",
    menteeEmail: request.mentee_email || "",
    servicePackageId: request.service_package_id || "",
    serviceName: request.service_name || "",
    serviceDurationMinutes: Number(request.service_duration_minutes || 0),
    servicePriceText: request.service_price_text || "",
    proposedOptions: Array.isArray(request.proposed_options) ? request.proposed_options : [],
    slotId: request.slot_id || "",
    slotIds: Array.isArray(request.slot_ids) ? request.slot_ids : [],
    menteeProfileSnapshot: normalizeProfileDetails(request.mentee_profile_snapshot || {}),
    chatMessages: Array.isArray(request.chat_messages) ? request.chat_messages : [],
    goal: request.goal || "",
    preferredTime: request.preferred_time || "",
    note: request.note || "",
    status: request.status || "pending",
    adminNote: request.admin_note || "",
    createdAt: request.created_at,
    updatedAt: request.updated_at
  };
}

function sanitizeNotification(notification) {
  return {
    id: String(notification.id || ""),
    userId: notification.user_id || "",
    title: notification.title || "",
    body: notification.body || "",
    link: notification.link || "",
    type: notification.type || "general",
    isRead: Boolean(notification.is_read),
    meta: notification.meta || {},
    createdAt: notification.created_at,
    updatedAt: notification.updated_at
  };
}

function toEqualityFilter(value) {
  return "eq." + String(value);
}

function parseNumericId(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function slugifyText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeProfileDetails(details) {
  const source = details && typeof details === "object" ? details : {};
  return {
    experience: String(source.experience || "").trim(),
    education: String(source.education || "").trim(),
    activities: String(source.activities || "").trim(),
    awards: String(source.awards || "").trim(),
    skills: String(source.skills || "").trim()
  };
}

function normalizeFieldCategory(field) {
  const normalized = slugifyText(field);
  const aliases = {
    toan: "hoc-tap",
    van: "hoc-tap",
    ly: "hoc-tap",
    hoa: "hoc-tap",
    sinh: "hoc-tap",
    su: "hoc-tap",
    dia: "hoc-tap",
    "hoc-tap": "hoc-tap",
    anh: "ngoai-ngu",
    ielts: "ngoai-ngu",
    trung: "ngoai-ngu",
    nhat: "ngoai-ngu",
    han: "ngoai-ngu",
    "ngoai-ngu": "ngoai-ngu",
    "ngoai-khoa": "ngoai-khoa",
    "hoat-dong-ngoai-khoa": "ngoai-khoa",
    competition: "cuoc-thi-nghien-cuu",
    "cuoc-thi": "cuoc-thi-nghien-cuu",
    "nghien-cuu": "cuoc-thi-nghien-cuu",
    "cuoc-thi-nghien-cuu": "cuoc-thi-nghien-cuu",
    "dinh-huong": "dinh-huong-ky-nang",
    "ky-nang": "dinh-huong-ky-nang",
    "nghe-nghiep": "dinh-huong-ky-nang",
    "dinh-huong-ky-nang": "dinh-huong-ky-nang",
    "kinh-doanh": "kinh-doanh-khoi-nghiep",
    "khoi-nghiep": "kinh-doanh-khoi-nghiep",
    "kinh-doanh-khoi-nghiep": "kinh-doanh-khoi-nghiep",
    "lap-trinh": "cong-nghe",
    "cong-nghe": "cong-nghe",
    "phat-trien-ban-than": "phat-trien-ban-than"
  };

  return aliases[normalized] || normalized;
}

function normalizeFieldCategoryList(values) {
  const list = Array.isArray(values) ? values : [values];
  return list
    .map(function (value) {
      return normalizeFieldCategory(value);
    })
    .filter(Boolean)
    .filter(function (value, index, array) {
      return array.indexOf(value) === index;
    });
}

function stableSerialize(value) {
  if (Array.isArray(value)) {
    return "[" + value.map(stableSerialize).join(",") + "]";
  }

  if (value && typeof value === "object") {
    return "{" + Object.keys(value).sort().map(function (key) {
      return JSON.stringify(key) + ":" + stableSerialize(value[key]);
    }).join(",") + "}";
  }

  return JSON.stringify(value);
}

const VALID_MENTOR_FIELD_CATEGORIES = new Set([
  "hoc-tap",
  "ngoai-ngu",
  "ngoai-khoa",
  "cuoc-thi-nghien-cuu",
  "dinh-huong-ky-nang",
  "kinh-doanh-khoi-nghiep",
  "cong-nghe",
  "phat-trien-ban-than"
]);

function inferMentorFieldCategory(value) {
  const rawValue = String(value || "").trim().toLowerCase();
  const normalizedValue = normalizeFieldCategory(rawValue);
  if (VALID_MENTOR_FIELD_CATEGORIES.has(normalizedValue)) {
    return normalizedValue;
  }

  const keywordMappings = [
    { field: "ngoai-ngu", keywords: ["ielts", "toeic", "toefl", "english", "tieng anh", "ngoai ngu", "language"] },
    { field: "cong-nghe", keywords: ["lap trinh", "coding", "code", "developer", "software", "data", "ai", "cong nghe"] },
    { field: "kinh-doanh-khoi-nghiep", keywords: ["startup", "khoi nghiep", "kinh doanh", "marketing", "sales", "business"] },
    { field: "cuoc-thi-nghien-cuu", keywords: ["nghien cuu", "research", "competition", "cuoc thi", "hoc thuat"] },
    { field: "ngoai-khoa", keywords: ["ngoai khoa", "clb", "club", "leadership", "volunteer", "su kien"] },
    { field: "hoc-tap", keywords: ["toan", "van", "ly", "hoa", "sinh", "su", "dia", "on thi", "hoc tap"] },
    { field: "phat-trien-ban-than", keywords: ["phat trien ban than", "mindset", "self", "habit", "productivity"] }
  ];

  const matched = keywordMappings.find(function (item) {
    return item.keywords.some(function (keyword) {
      return rawValue.includes(keyword);
    });
  });

  return matched ? matched.field : "dinh-huong-ky-nang";
}

function buildMentorIdFromApplication(application, existingProfile) {
  if (existingProfile && existingProfile.id) {
    return String(existingProfile.id);
  }

  const baseId = slugifyText(application && application.full_name ? application.full_name : "");
  return baseId || ("mentor-application-" + application.id);
}

function buildPublishedMentorProfileFromApplication(application, existingProfile) {
  const experience = String(application && application.experience ? application.experience : "").trim();
  const expertise = String(application && application.expertise ? application.expertise : "").trim();
  const motivation = String(application && application.motivation ? application.motivation : "").trim();
  const portfolioLink = String(application && application.portfolio_link ? application.portfolio_link : "").trim();
  const field = inferMentorFieldCategory(expertise || experience || motivation);
  const mentorId = buildMentorIdFromApplication(application, existingProfile);
  const previousProfile = existingProfile && typeof existingProfile.profile === "object" ? existingProfile.profile : {};
  const achievements = []
    .concat(Array.isArray(previousProfile.achievements) ? previousProfile.achievements : [])
    .concat(portfolioLink ? ["Portfolio: " + portfolioLink] : [])
    .filter(Boolean);
  const uniqueAchievements = Array.from(new Set(achievements));
  const profile = Object.assign({}, previousProfile, {
    id: mentorId,
    name: application.full_name,
    displayName: previousProfile.displayName || application.full_name,
    image: previousProfile.image || "robot.png",
    role: previousProfile.role || expertise || "Mentor đồng hành 1-1",
    workplace: previousProfile.workplace || "Đang cập nhật",
    focus: previousProfile.focus || expertise,
    field: field,
    serviceText: previousProfile.serviceText || "Mentoring 1-1",
    servicePackages: Array.isArray(previousProfile.servicePackages) && previousProfile.servicePackages.length
      ? previousProfile.servicePackages
      : [
          {
            id: "package-1-1-1",
            serviceKey: "1-1",
            title: "Mentoring 1-1",
            durationMinutes: 60,
            priceValue: 0,
            priceText: "Admin duyệt sau"
          }
        ],
    pricing: previousProfile.pricing || "Admin duyệt sau",
    availabilityText: previousProfile.availabilityText || "Linh hoạt theo lịch hẹn",
    availabilitySlots: Array.isArray(previousProfile.availabilitySlots) ? previousProfile.availabilitySlots : [],
    bio: previousProfile.bio || motivation || experience || "Mentor đang hoàn thiện hồ sơ chi tiết.",
    achievements: uniqueAchievements,
    fit: previousProfile.fit || experience || motivation,
    rating: Number(previousProfile.rating || 4.8),
    studentsTaught: Number(previousProfile.studentsTaught || 0),
    reviews: Array.isArray(previousProfile.reviews) ? previousProfile.reviews : []
  });

  return {
    id: mentorId,
    owner_user_id: (existingProfile && existingProfile.owner_user_id) || null,
    email: normalizeEmail((existingProfile && existingProfile.email) || application.email),
    name: application.full_name,
    field: field,
    visibility: "draft",
    status: "pending",
    profile: profile
  };
}

function canMentorManageBooking(user, bookingRequest) {
  if (!user || !bookingRequest) {
    return false;
  }

  if (normalizeRole(user.role) === "admin") {
    return true;
  }

  const userSlug = slugifyText(user.name || "");
  const bookingMentorSlug = slugifyText(bookingRequest.mentor_id || bookingRequest.mentor_name || "");
  if (!userSlug || !bookingMentorSlug) {
    return false;
  }

  return bookingMentorSlug === userSlug || bookingMentorSlug.includes(userSlug) || userSlug.includes(bookingMentorSlug);
}

function canUserAccessBooking(user, bookingRequest) {
  if (!user || !bookingRequest) {
    return false;
  }

  const role = normalizeRole(user.role);
  if (role === "admin") {
    return true;
  }

  if (role === "mentor") {
    return canMentorManageBooking(user, bookingRequest);
  }

  return (
    String(bookingRequest.mentee_user_id || "") === String(user.id || "") ||
    normalizeEmail(bookingRequest.mentee_email || "") === normalizeEmail(user.email || "")
  );
}

async function createNotification(payload) {
  const userId = String(payload && payload.userId ? payload.userId : "").trim();
  if (!userId) {
    return null;
  }

  const now = new Date().toISOString();
  const [savedNotification] = await restInsert("notifications", {
    user_id: userId,
    title: String(payload.title || "").trim(),
    body: String(payload.body || "").trim(),
    link: String(payload.link || "").trim(),
    type: String(payload.type || "general").trim() || "general",
    is_read: false,
    meta: payload.meta && typeof payload.meta === "object" ? payload.meta : {},
    created_at: now,
    updated_at: now
  });

  return savedNotification || null;
}

async function getProfileById(userId, options = {}) {
  if (!userId) {
    return null;
  }

  return restSelect("profiles", {
    single: true,
    useServiceRole: options.useServiceRole !== false,
    accessToken: options.accessToken,
    query: {
      select: "*",
      id: toEqualityFilter(userId),
      limit: 1
    }
  });
}

async function upsertProfile(profile, options = {}) {
  const now = new Date().toISOString();
  const payload = Object.assign(
    {
      full_name: "",
      phone: "",
      goal: "",
      bio: "",
      details: {},
      role: "mentee",
      mentor_id: "",
      avatar_url: "",
      updated_at: now
    },
    profile
  );

  payload.details = normalizeProfileDetails(payload.details);
  let savedProfile;

  try {
    [savedProfile] = await restUpsert("profiles", payload, {
      onConflict: "id",
      useServiceRole: options.useServiceRole !== false,
      accessToken: options.accessToken
    });
  } catch (error) {
    if (/details.*column|column.*details/i.test(String(error && error.message || ""))) {
      const fallbackPayload = Object.assign({}, payload);
      delete fallbackPayload.details;
      [savedProfile] = await restUpsert("profiles", fallbackPayload, {
        onConflict: "id",
        useServiceRole: options.useServiceRole !== false,
        accessToken: options.accessToken
      });
    } else {
      throw error;
    }
  }

  return savedProfile || null;
}

async function getProfileByPhone(phone, excludeUserId, options = {}) {
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
    useServiceRole: options.useServiceRole !== false,
    accessToken: options.accessToken,
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

async function signUpWithPassword(credentials) {
  return authRequest("signup", {
    method: "POST",
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

async function listAuthUsers(options = {}) {
  const payload = await authRequest("admin/users", {
    method: "GET",
    query: {
      page: options.page || 1,
      per_page: options.perPage || 200
    },
    useServiceRole: true
  });

  return Array.isArray(payload && payload.users) ? payload.users : [];
}

async function findAuthUserByEmail(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return null;
  }

  let page = 1;
  while (page <= 20) {
    const users = await listAuthUsers({ page: page, perPage: 200 });
    if (!users.length) {
      return null;
    }

    const matchedUser = users.find(function (user) {
      return normalizeEmail(user && user.email) === normalizedEmail;
    });

    if (matchedUser) {
      return matchedUser;
    }

    if (users.length < 200) {
      return null;
    }

    page += 1;
  }

  return null;
}

async function getMentorProfileById(mentorId) {
  if (!mentorId) {
    return null;
  }

  return restSelect("mentor_profiles", {
    single: true,
    query: {
      select: "*",
      id: toEqualityFilter(mentorId),
      limit: 1
    }
  });
}

async function getMentorProfileByEmail(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return null;
  }

  return restSelect("mentor_profiles", {
    single: true,
    query: {
      select: "*",
      email: toEqualityFilter(normalizedEmail),
      order: "updated_at.desc",
      limit: 1
    }
  });
}

async function getMentorProfiles(options = {}) {
  return restSelect("mentor_profiles", {
    query: Object.assign(
      {
        select: "*",
        order: "updated_at.desc"
      },
      options.query || {}
    )
  });
}

async function upsertMentorProfileRecord(record) {
  const now = new Date().toISOString();
  const profile = record && typeof record.profile === "object" ? Object.assign({}, record.profile) : {};
  const normalizedField = normalizeFieldCategory(record.field || profile.field || "");
  const payload = Object.assign(
    {
      id: "",
      owner_user_id: null,
      email: "",
      name: "",
      field: "",
      visibility: "draft",
      status: "pending",
      profile: {},
      updated_at: now
    },
    record,
    {
      field: normalizedField,
      profile: Object.assign({}, profile, normalizedField ? { field: normalizedField } : {})
    }
  );

  if (!payload.created_at) {
    const existing = await getMentorProfileById(payload.id);
    payload.created_at = (existing && existing.created_at) || now;
  }

  const [savedProfile] = await restUpsert("mentor_profiles", payload, {
    onConflict: "id"
  });

  return savedProfile || payload;
}

async function repairPublishedMentorProfiles() {
  const approvedUpdates = await restSelect("mentor_profile_updates", {
    query: {
      select: "*",
      status: toEqualityFilter("approved"),
      order: "updated_at.desc"
    }
  });

  if (!approvedUpdates.length) {
    return [];
  }

  const repairedProfiles = [];

  for (const update of approvedUpdates) {
    const mentorId = String(update.mentor_id || "").trim();
    if (!mentorId) {
      continue;
    }

    const existingPublished = await getMentorProfileById(mentorId);
    if (existingPublished && existingPublished.visibility === "public") {
      repairedProfiles.push(existingPublished);
      continue;
    }

    let email = existingPublished && existingPublished.email ? existingPublished.email : "";
    if (!email && update.mentor_user_id) {
      const authUser = await getAuthUserById(update.mentor_user_id).catch(function () {
        return null;
      });
      email = normalizeEmail(authUser && authUser.email ? authUser.email : "");
    }

    const mergedProfile = Object.assign(
      {},
      existingPublished && existingPublished.profile ? existingPublished.profile : {},
      update.profile || {},
      {
        id: mentorId,
        name: update.mentor_name || (update.profile && update.profile.name) || ""
      }
    );

    const repairedProfile = await upsertMentorProfileRecord({
      id: mentorId,
      owner_user_id: update.mentor_user_id || (existingPublished && existingPublished.owner_user_id) || null,
      email: email,
      name: update.mentor_name || (existingPublished && existingPublished.name) || "Mentor",
      field: String((update.profile && update.profile.field) || (existingPublished && existingPublished.field) || "").trim(),
      visibility: "public",
      status: "approved",
      profile: mergedProfile,
      created_at: (existingPublished && existingPublished.created_at) || update.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    if (update.mentor_user_id) {
      const profileRecord = await getProfileById(update.mentor_user_id).catch(function () {
        return null;
      });
      if (profileRecord) {
        await upsertProfile(Object.assign({}, profileRecord, {
          id: update.mentor_user_id,
          role: "mentor",
          mentor_id: mentorId,
          updated_at: new Date().toISOString()
        }));
      }
    }

    repairedProfiles.push(repairedProfile);
  }

  return repairedProfiles;
}

async function repairApprovedMentorApplicationProfiles() {
  const approvedApplications = await restSelect("mentor_applications", {
    query: {
      select: "*",
      status: "in.(approved,activated)",
      order: "updated_at.desc"
    }
  });

  if (!approvedApplications.length) {
    return [];
  }

  const repairedProfiles = [];

  for (const application of approvedApplications) {
    const existingByEmail = await getMentorProfileByEmail(application.email);
    const existingById = existingByEmail
      ? existingByEmail
      : await getMentorProfileById(buildMentorIdFromApplication(application));

    if (existingById && existingById.visibility === "public") {
      repairedProfiles.push(existingById);
      continue;
    }

    const repairedProfile = await upsertMentorProfileRecord(Object.assign(
      {},
      buildPublishedMentorProfileFromApplication(application, existingById),
      {
        created_at: (existingById && existingById.created_at) || application.activated_at || application.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ));

    repairedProfiles.push(repairedProfile);
  }

  return repairedProfiles;
}

function mapMentorProfileStateFromApplicationStatus(status) {
  const normalizedStatus = String(status || "").trim().toLowerCase();

  if (normalizedStatus === "approved" || normalizedStatus === "activated") {
    return {
      visibility: "draft",
      status: "pending"
    };
  }

  if (normalizedStatus === "rejected") {
    return {
      visibility: "draft",
      status: "rejected"
    };
  }

  return {
    visibility: "draft",
    status: normalizedStatus || "pending"
  };
}

function mapMentorProfileStateFromReviewStatus(status) {
  const normalizedStatus = String(status || "").trim().toLowerCase();

  if (normalizedStatus === "approved") {
    return {
      visibility: "public",
      status: "approved"
    };
  }

  if (normalizedStatus === "rejected") {
    return {
      visibility: "draft",
      status: "rejected"
    };
  }

  return {
    visibility: "draft",
    status: "pending"
  };
}

async function createAuthUser(attributes) {
  const payload = await authRequest("admin/users", {
    method: "POST",
    body: attributes,
    useServiceRole: true
  });

  return unwrapAuthUser(payload);
}

async function deleteAuthUserById(userId) {
  return authRequest("admin/users/" + encodeURIComponent(userId), {
    method: "DELETE",
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

async function requireAdmin(req, res, next) {
  const authorization = req.headers.authorization || "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice(7)
    : "";
  const adminKey = String(req.headers["x-admin-key"] || "");

  if (token) {
    try {
      const authUser = await getAuthUserByToken(token);
      if (!authUser) {
        res.status(401).json({ message: "Phien dang nhap admin khong hop le hoac da het han." });
        return;
      }

      const profile = await getProfileById(authUser.id);
      const user = sanitizeUser(authUser, profile);
      if (normalizeRole(user.role) !== "admin") {
        res.status(403).json({ message: "Chi tai khoan admin moi co the truy cap khu vuc quan tri." });
        return;
      }

      req.token = token;
      req.authUser = authUser;
      req.profile = profile;
      req.user = user;
      next();
      return;
    } catch (error) {
      res.status(500).json({ message: "Khong the xac thuc tai khoan admin." });
      return;
    }
  }

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

    const profile = await getProfileById(authUser.id, {
      useServiceRole: false,
      accessToken: token
    });
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

app.post("/api/auth/register", async (req, res) => {
  if (!ensureSupabaseConfig(res, { requireServiceRole: false })) {
    return;
  }

  const name = String(req.body.name || "").trim();
  const email = normalizeEmail(req.body.email);
  const phone = normalizePhone(req.body.phone);
  const goal = String(req.body.goal || "").trim();
  const role = normalizeRole(req.body.role);
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
    if (hasSupabaseServerConfig()) {
      const phoneExists = await getProfileByPhone(phone);
      if (phoneExists) {
        res.status(409).json({ message: "So dien thoai nay da duoc su dung." });
        return;
      }
    }

    let createdUser = null;
    let token = "";
    if (hasSupabaseServerConfig()) {
      createdUser = await createAuthUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: {
          full_name: name,
          role: role
        }
      });
    } else {
      const signUpResult = await signUpWithPassword({
        email: email,
        password: password,
        data: {
          full_name: name,
          role: role
        }
      });
      createdUser =
        unwrapAuthUser(signUpResult) ||
        (signUpResult.session && signUpResult.session.user) ||
        null;
      token = signUpResult.access_token || (signUpResult.session && signUpResult.session.access_token) || "";
    }

    if (!createdUser) {
      throw new SupabaseError(500, "Khong the tao tai khoan luc nay.");
    }

    let savedProfile = null;
    try {
      savedProfile = await upsertProfile({
        id: createdUser.id,
        full_name: name,
        phone: phone,
        goal: goal,
        bio: "",
        details: {},
        role: role,
        avatar_url: "",
        created_at: createdUser.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, hasSupabaseServerConfig()
        ? {}
        : {
            useServiceRole: false,
            accessToken: token
          });
    } catch (profileError) {
      if (!hasSupabaseServerConfig() && !token) {
        throw new SupabaseError(500, "Da tao tai khoan xac thuc nhung chua the luu ho so vi thieu quyen truy cap. Hay cau hinh SUPABASE_SERVICE_ROLE_KEY tren server.");
      }
      if (hasSupabaseServerConfig()) {
        await deleteAuthUserById(createdUser.id).catch(function ignoreCleanupError() {});
      }
      throw profileError;
    }

    const loginResult = token
      ? {
          access_token: token,
          session: {
            access_token: token,
            user: createdUser
          }
        }
      : await signInWithPassword({
          email: email,
          password: password
        });
    token = loginResult.access_token || (loginResult.session && loginResult.session.access_token) || "";
    const responseUser =
      unwrapAuthUser(loginResult) ||
      (loginResult.session && loginResult.session.user) ||
      createdUser;

    res.status(201).json({
      message: "Tao tai khoan thanh cong.",
      token: token,
      user: sanitizeUser(responseUser, savedProfile)
    });
  } catch (error) {
    if (error instanceof SupabaseError && /already registered|already been registered|already exists/i.test(error.message)) {
      res.status(409).json({ message: "Email nay da duoc dang ky." });
      return;
    }

    handleRouteError(res, error, "Khong the tao tai khoan luc nay.");
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
  if (!ensureSupabaseConfig(res, { requireServiceRole: false })) {
    return;
  }

  const name = String(req.body.name || "").trim();
  const email = normalizeEmail(req.body.email || req.authUser.email);
  const phone = normalizePhone(req.body.phone);
  const goal = String(req.body.goal || "").trim();
  const bio = String(req.body.bio || "").trim();
  const avatar = String(req.body.avatar || "").trim();
  const details = normalizeProfileDetails(req.body.details || {});

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
    const phoneExists = hasSupabaseServerConfig()
      ? await getProfileByPhone(phone, req.authUser.id)
      : null;

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
      details: details,
      role: normalizeRole((req.profile && req.profile.role) || (req.authUser.user_metadata && req.authUser.user_metadata.role)),
      avatar_url: avatar || ((req.profile && req.profile.avatar_url) || ""),
      created_at:
        (req.profile && req.profile.created_at) || req.authUser.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, {
      useServiceRole: false,
      accessToken: req.token
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
      const fullExistingApplication = await restSelect("mentor_applications", {
        single: true,
        query: {
          select: "*",
          id: toEqualityFilter(existedApplication.id),
          limit: 1
        }
      });
      res.status(409).json({
        message: buildMentorApplicationConflictMessage(fullExistingApplication || existedApplication),
        application: fullExistingApplication ? sanitizeMentorApplication(fullExistingApplication) : null
      });
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

app.post("/api/mentor-profile-updates", authMiddleware, async (req, res) => {
  if (!ensureSupabaseConfig(res)) {
    return;
  }

  const userRole = normalizeRole(req.user && req.user.role);
  const mentorId = String(req.body.mentorId || "").trim();
  const mentorName = String(req.body.mentorName || "").trim();
  const profile = req.body.profile && typeof req.body.profile === "object"
    ? req.body.profile
    : null;

  if (!["mentor", "admin"].includes(userRole)) {
    res.status(403).json({ message: "Chi tai khoan mentor hoac admin moi duoc gui cap nhat ho so mentor." });
    return;
  }

  if (!mentorId) {
    res.status(400).json({ message: "Ma mentor khong hop le." });
    return;
  }

  if (!mentorName || mentorName.length < 2) {
    res.status(400).json({ message: "Ten mentor can co it nhat 2 ky tu." });
    return;
  }

  if (!profile || typeof profile !== "object") {
    res.status(400).json({ message: "Du lieu ho so mentor khong hop le." });
    return;
  }

  const normalizedFields = normalizeFieldCategoryList(profile.fields || profile.field || []);
  const normalizedField = normalizedFields[0] || normalizeFieldCategory(profile.field || "");
  if (!normalizedField) {
    res.status(400).json({ message: "Vui long chon nhom linh vuc cho ho so mentor." });
    return;
  }

  try {
    const now = new Date().toISOString();
    const nextProfile = Object.assign({}, profile, {
      field: normalizedField,
      fields: normalizedFields
    });
    const payload = {
      id: "mentor-profile-update-" + mentorId,
      mentor_id: mentorId,
      mentor_user_id: req.authUser.id,
      mentor_name: mentorName,
      status: "pending",
      admin_note: "",
      profile: nextProfile,
      created_at: now,
      updated_at: now
    };

    const existingRequest = await restSelect("mentor_profile_updates", {
      single: true,
      query: {
        select: "*",
        id: toEqualityFilter(payload.id),
        limit: 1
      }
    });

    if (existingRequest) {
      payload.created_at = existingRequest.created_at || now;
      const previousComparableProfile = stableSerialize(existingRequest.profile || {});
      const nextComparableProfile = stableSerialize(nextProfile);
      if (previousComparableProfile === nextComparableProfile) {
        payload.status = existingRequest.status || "pending";
        payload.admin_note = existingRequest.admin_note || "";
      }
    }

    const [savedRequest] = await restUpsert("mentor_profile_updates", payload, {
      onConflict: "id"
    });

    res.status(existingRequest ? 200 : 201).json({
      message: "Da gui cap nhat ho so mentor ve admin.",
      request: sanitizeMentorProfileUpdate(savedRequest || payload)
    });
  } catch (error) {
    handleRouteError(res, error, "Khong the gui cap nhat ho so mentor luc nay.");
  }
});

app.get("/api/mentor-profile-updates/mine", authMiddleware, async (req, res) => {
  if (!ensureSupabaseConfig(res)) {
    return;
  }

  const userRole = normalizeRole(req.user && req.user.role);
  if (!["mentor", "admin"].includes(userRole)) {
    res.status(403).json({ message: "Chi tai khoan mentor hoac admin moi xem duoc trang thai ho so mentor." });
    return;
  }

  try {
    const requests = await restSelect("mentor_profile_updates", {
      query: {
        select: "*",
        mentor_user_id: toEqualityFilter(req.authUser.id),
        order: "updated_at.desc",
        limit: 1
      }
    });

    const latestRequest = Array.isArray(requests) ? requests[0] || null : null;
    res.json({
      request: latestRequest ? sanitizeMentorProfileUpdate(latestRequest) : null
    });
  } catch (error) {
    handleRouteError(res, error, "Khong the tai trang thai ho so mentor.");
  }
});

app.get("/api/mentor-profiles", async (req, res) => {
  if (!ensureSupabaseConfig(res)) {
    return;
  }

  try {
    await repairPublishedMentorProfiles();

    const profiles = await getMentorProfiles({
      query: {
        select: "*",
        visibility: toEqualityFilter("public"),
        order: "updated_at.desc"
      }
    });

    res.json({
      profiles: profiles.map(sanitizeMentorProfile)
    });
  } catch (error) {
    handleRouteError(res, error, "Khong the tai danh sach mentor luc nay.");
  }
});

app.get("/api/mentor-profiles/:id", async (req, res) => {
  if (!ensureSupabaseConfig(res)) {
    return;
  }

  const mentorId = String(req.params.id || "").trim();
  if (!mentorId) {
    res.status(400).json({ message: "Ma mentor khong hop le." });
    return;
  }

  try {
    await repairPublishedMentorProfiles();
    const profile = await getMentorProfileById(mentorId);
    if (!profile || profile.visibility !== "public") {
      res.status(404).json({ message: "Khong tim thay mentor." });
      return;
    }

    res.json({
      profile: sanitizeMentorProfile(profile)
    });
  } catch (error) {
    handleRouteError(res, error, "Khong the tai ho so mentor luc nay.");
  }
});

app.get("/api/booking-requests/occupied", async (req, res) => {
  if (!ensureSupabaseConfig(res)) {
    return;
  }

  const mentorId = String(req.query.mentorId || "").trim();
  if (!mentorId) {
    res.status(400).json({ message: "Ma mentor khong hop le." });
    return;
  }

  try {
    const requests = await restSelect("booking_requests", {
      query: {
        select: "slot_ids,status",
        mentor_id: toEqualityFilter(mentorId),
        status: "in.(accepted,completed)"
      }
    });

    const occupiedSlotIds = [];
    requests.forEach(function (request) {
      const slotIds = Array.isArray(request.slot_ids) ? request.slot_ids : [];
      slotIds.forEach(function (slotId) {
        if (slotId && !occupiedSlotIds.includes(slotId)) {
          occupiedSlotIds.push(slotId);
        }
      });
    });

    res.json({
      mentorId: mentorId,
      occupiedSlotIds: occupiedSlotIds
    });
  } catch (error) {
    handleRouteError(res, error, "Khong the tai lich ban cua mentor.");
  }
});

app.post("/api/booking-requests", async (req, res) => {
  if (!ensureSupabaseConfig(res)) {
    return;
  }

  const mentorId = String(req.body.mentorId || "").trim();
  const mentorName = String(req.body.mentorName || "").trim();
  const mentorImage = String(req.body.mentorImage || "").trim();
  const mentorFocus = String(req.body.mentorFocus || "").trim();
  const menteeUserId = String(req.body.menteeUserId || "").trim();
  const menteeName = String(req.body.menteeName || "").trim();
  const menteeEmail = normalizeEmail(req.body.menteeEmail);
  const servicePackageId = String(req.body.servicePackageId || "").trim();
  const serviceName = String(req.body.serviceName || "").trim();
  const serviceDurationMinutes = Number(req.body.serviceDurationMinutes || 0);
  const servicePriceText = String(req.body.servicePriceText || "").trim();
  const proposedOptions = Array.isArray(req.body.proposedOptions) ? req.body.proposedOptions : [];
  const menteeProfileSnapshot = normalizeProfileDetails(req.body.menteeProfileSnapshot || {});
  const goal = String(req.body.goal || "").trim();
  const preferredTime = String(req.body.preferredTime || "").trim();
  const note = String(req.body.note || "").trim();

  if (!mentorId || !mentorName) {
    res.status(400).json({ message: "Thong tin mentor khong hop le." });
    return;
  }

  if (menteeName.length < 2) {
    res.status(400).json({ message: "Vui long nhap ten mentee hop le." });
    return;
  }

  if (!menteeEmail.includes("@")) {
    res.status(400).json({ message: "Email mentee chua dung dinh dang." });
    return;
  }

  if (!serviceName) {
    res.status(400).json({ message: "Vui long chon goi dich vu truoc khi gui booking." });
    return;
  }

  if (!proposedOptions.length) {
    res.status(400).json({ message: "Vui long chon it nhat mot khung gio de xuat." });
    return;
  }

  try {
    const now = new Date().toISOString();
    const menteeProfile = menteeUserId ? await getProfileById(menteeUserId).catch(function () {
      return null;
    }) : null;
    const mentorProfile = await getMentorProfileById(mentorId).catch(function () {
      return null;
    });
    const [createdRequest] = await restInsert("booking_requests", {
      mentor_id: mentorId,
      mentor_name: mentorName,
      mentor_image: mentorImage,
      mentor_focus: mentorFocus,
      mentee_user_id: menteeUserId || null,
      mentee_name: menteeName,
      mentee_email: menteeEmail,
      service_package_id: servicePackageId,
      service_name: serviceName,
      service_duration_minutes: Number.isFinite(serviceDurationMinutes) ? serviceDurationMinutes : 0,
      service_price_text: servicePriceText,
      proposed_options: proposedOptions,
      slot_id: "",
      slot_ids: [],
      mentee_profile_snapshot: Object.assign(
        {},
        normalizeProfileDetails(menteeProfile && menteeProfile.details),
        menteeProfileSnapshot
      ),
      chat_messages: [],
      goal: goal,
      preferred_time: preferredTime,
      note: note,
      status: "pending",
      admin_note: "",
      created_at: now,
      updated_at: now
    });

    if (mentorProfile && mentorProfile.owner_user_id) {
      await createNotification({
        userId: mentorProfile.owner_user_id,
        title: "Bạn có mentee mới",
        body: menteeName + " vừa gửi yêu cầu booking cho " + mentorName + ".",
        link: "mentor-requests.html",
        type: "booking",
        meta: {
          bookingId: createdRequest && createdRequest.id ? createdRequest.id : null,
          mentorId: mentorId
        }
      }).catch(function () {
        return null;
      });
    }

    res.status(201).json({
      message: "Yeu cau booking da duoc gui thanh cong.",
      request: sanitizeBookingRequest(createdRequest)
    });
  } catch (error) {
    handleRouteError(res, error, "Khong the gui booking luc nay.");
  }
});

app.get("/api/booking-requests/mine", authMiddleware, async (req, res) => {
  if (!ensureSupabaseConfig(res)) {
    return;
  }

  try {
    const requests = await restSelect("booking_requests", {
      query: {
        select: "*",
        or: "(mentee_user_id.eq." + req.authUser.id + ",mentee_email.eq." + normalizeEmail(req.user.email) + ")",
        order: "created_at.desc"
      }
    });

    res.json({
      requests: requests.map(sanitizeBookingRequest)
    });
  } catch (error) {
    handleRouteError(res, error, "Khong the tai danh sach booking cua ban.");
  }
});

app.get("/api/notifications", authMiddleware, async (req, res) => {
  if (!ensureSupabaseConfig(res)) {
    return;
  }

  try {
    const notifications = await restSelect("notifications", {
      query: {
        select: "*",
        user_id: toEqualityFilter(req.authUser.id),
        order: "created_at.desc"
      }
    });

    res.json({
      notifications: notifications.map(sanitizeNotification)
    });
  } catch (error) {
    handleRouteError(res, error, "Khong the tai thong bao luc nay.");
  }
});

app.put("/api/notifications/:id/read", authMiddleware, async (req, res) => {
  if (!ensureSupabaseConfig(res)) {
    return;
  }

  const notificationId = String(req.params.id || "").trim();
  if (!notificationId) {
    res.status(400).json({ message: "Ma thong bao khong hop le." });
    return;
  }

  try {
    const [updatedNotification] = await restUpdate("notifications", {
      is_read: true,
      updated_at: new Date().toISOString()
    }, {
      query: {
        id: toEqualityFilter(notificationId),
        user_id: toEqualityFilter(req.authUser.id)
      }
    });

    res.json({
      message: "Da danh dau thong bao da doc.",
      notification: sanitizeNotification(updatedNotification || {})
    });
  } catch (error) {
    handleRouteError(res, error, "Khong the cap nhat thong bao.");
  }
});

app.get("/api/mentor/booking-requests", authMiddleware, async (req, res) => {
  if (!ensureSupabaseConfig(res)) {
    return;
  }

  const role = normalizeRole(req.user && req.user.role);
  if (!["mentor", "admin"].includes(role)) {
    res.status(403).json({ message: "Chi mentor hoac admin moi xem duoc booking nay." });
    return;
  }

  const mentorId = String(req.query.mentorId || "").trim();
  if (!mentorId) {
    res.status(400).json({ message: "Ma mentor khong hop le." });
    return;
  }

  try {
    const requests = await restSelect("booking_requests", {
      query: {
        select: "*",
        mentor_id: toEqualityFilter(mentorId),
        order: "created_at.desc"
      }
    });

    res.json({
      requests: requests
        .filter(function (request) {
          return role === "admin" || canMentorManageBooking(req.user, request);
        })
        .map(sanitizeBookingRequest)
    });
  } catch (error) {
    handleRouteError(res, error, "Khong the tai booking cua mentor.");
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

app.get("/api/admin/booking-requests", requireAdmin, async (req, res) => {
  if (!ensureSupabaseConfig(res)) {
    return;
  }

  try {
    const requests = await restSelect("booking_requests", {
      query: {
        select: "*",
        order: "created_at.desc"
      }
    });

    res.json({
      requests: requests.map(sanitizeBookingRequest)
    });
  } catch (error) {
    handleRouteError(res, error, "Khong the tai danh sach booking mentor.");
  }
});

app.get("/api/admin/mentor-profile-updates", requireAdmin, async (req, res) => {
  if (!ensureSupabaseConfig(res)) {
    return;
  }

  try {
    const requests = await restSelect("mentor_profile_updates", {
      query: {
        select: "*",
        order: "updated_at.desc"
      }
    });

    res.json({
      requests: requests.map(sanitizeMentorProfileUpdate)
    });
  } catch (error) {
    handleRouteError(res, error, "Khong the tai danh sach cap nhat ho so mentor.");
  }
});

app.get("/api/admin/mentor-profiles", requireAdmin, async (req, res) => {
  if (!ensureSupabaseConfig(res)) {
    return;
  }

  try {
    const profiles = await getMentorProfiles({
      query: {
        select: "*",
        order: "updated_at.desc"
      }
    });

    res.json({
      profiles: profiles.map(sanitizeMentorProfile)
    });
  } catch (error) {
    handleRouteError(res, error, "Khong the tai danh sach mentor luc nay.");
  }
});

app.post("/api/admin/mentor-profiles", requireAdmin, async (req, res) => {
  if (!ensureSupabaseConfig(res)) {
    return;
  }

  const name = String(req.body.name || "").trim();
  const field = String(req.body.field || "").trim();
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || "");
  const profile = req.body.profile && typeof req.body.profile === "object"
    ? req.body.profile
    : null;

  if (name.length < 2) {
    res.status(400).json({ message: "Ten mentor can co it nhat 2 ky tu." });
    return;
  }

  if (!field) {
    res.status(400).json({ message: "Vui long chon nhom linh vuc cho mentor." });
    return;
  }

  if (!profile) {
    res.status(400).json({ message: "Du lieu ho so mentor khong hop le." });
    return;
  }

  const normalizedField = normalizeFieldCategory(field || profile.field || "");
  if (!normalizedField) {
    res.status(400).json({ message: "Vui long chon nhom linh vuc cho mentor." });
    return;
  }

  if (!email.includes("@")) {
    res.status(400).json({ message: "Email dang nhap cua mentor chua dung dinh dang." });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ message: "Mat khau dang nhap cua mentor can toi thieu 8 ky tu." });
    return;
  }

  try {
    const now = new Date().toISOString();
    const mentorId = String(req.body.mentorId || "").trim() || slugifyText(name) || ("mentor-" + Date.now());
    const existingAuthUser = await findAuthUserByEmail(email);
    let authUser = existingAuthUser;

    if (authUser) {
      await updateAuthUserById(authUser.id, {
        password: password,
        user_metadata: Object.assign({}, authUser.user_metadata || {}, {
          full_name: name,
          role: "mentor"
        })
      });
    } else {
      authUser = await createAuthUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: {
          full_name: name,
          role: "mentor"
        }
      });
    }

    const savedProfile = await upsertProfile({
      id: authUser.id,
      full_name: name,
      phone: normalizePhone(req.body.phone || profile.phone || ""),
      goal: "",
      bio: "",
      role: "mentor",
      mentor_id: mentorId,
      avatar_url: String(profile.image || ""),
      created_at: now,
      updated_at: now
    });

    const mentorProfile = await upsertMentorProfileRecord({
      id: mentorId,
      owner_user_id: authUser.id,
      email: email,
      name: name,
      field: normalizedField,
      visibility: "public",
      status: "approved",
      profile: Object.assign({}, profile, {
        id: mentorId,
        name: name,
        field: normalizedField,
        phone: normalizePhone(req.body.phone || profile.phone || "")
      }),
      updated_at: now,
      created_at: now
    });

    res.status(existingAuthUser ? 200 : 201).json({
      message: existingAuthUser
        ? "Da cap nhat tai khoan va ho so mentor."
        : "Da tao tai khoan va ho so mentor.",
      user: sanitizeUser(authUser, savedProfile),
      profile: sanitizeMentorProfile(mentorProfile)
    });
  } catch (error) {
    handleRouteError(res, error, "Khong the tao mentor luc nay.");
  }
});

app.put("/api/admin/mentor-profiles/:id", requireAdmin, async (req, res) => {
  if (!ensureSupabaseConfig(res)) {
    return;
  }

  const mentorId = String(req.params.id || "").trim();
  const name = String(req.body.name || "").trim();
  const field = String(req.body.field || "").trim();
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || "");
  const profile = req.body.profile && typeof req.body.profile === "object"
    ? req.body.profile
    : null;

  if (!mentorId) {
    res.status(400).json({ message: "Ma mentor khong hop le." });
    return;
  }

  if (name.length < 2) {
    res.status(400).json({ message: "Ten mentor can co it nhat 2 ky tu." });
    return;
  }

  if (!field) {
    res.status(400).json({ message: "Vui long chon nhom linh vuc cho mentor." });
    return;
  }

  if (!profile) {
    res.status(400).json({ message: "Du lieu ho so mentor khong hop le." });
    return;
  }

  const normalizedField = normalizeFieldCategory(field || profile.field || "");
  if (!normalizedField) {
    res.status(400).json({ message: "Vui long chon nhom linh vuc cho mentor." });
    return;
  }

  if (!email.includes("@")) {
    res.status(400).json({ message: "Email dang nhap cua mentor chua dung dinh dang." });
    return;
  }

  try {
    const now = new Date().toISOString();
    const existingMentorProfile = await getMentorProfileById(mentorId);
    if (!existingMentorProfile) {
      res.status(404).json({ message: "Khong tim thay ho so mentor de cap nhat." });
      return;
    }

    let ownerAuthUser = null;
    if (existingMentorProfile.owner_user_id) {
      ownerAuthUser = await getAuthUserById(existingMentorProfile.owner_user_id).catch(function () {
        return null;
      });
    }

    if (ownerAuthUser) {
      const authPatch = {
        email: email,
        user_metadata: Object.assign({}, ownerAuthUser.user_metadata || {}, {
          full_name: name,
          role: "mentor"
        })
      };

      if (password) {
        if (password.length < 8) {
          res.status(400).json({ message: "Mat khau dang nhap cua mentor can toi thieu 8 ky tu." });
          return;
        }
        authPatch.password = password;
      }

      await updateAuthUserById(ownerAuthUser.id, authPatch);

      const currentProfile = await getProfileById(ownerAuthUser.id).catch(function () {
        return null;
      });
      await upsertProfile({
        id: ownerAuthUser.id,
        full_name: name,
        phone: normalizePhone(req.body.phone || profile.phone || (currentProfile && currentProfile.phone) || ""),
        goal: (currentProfile && currentProfile.goal) || "",
        bio: (currentProfile && currentProfile.bio) || "",
        role: "mentor",
        mentor_id: mentorId,
        avatar_url: String(profile.image || (currentProfile && currentProfile.avatar_url) || ""),
        created_at: (currentProfile && currentProfile.created_at) || now,
        updated_at: now
      });
    }

    const updatedMentorProfile = await upsertMentorProfileRecord({
      id: mentorId,
      owner_user_id: existingMentorProfile.owner_user_id || null,
      email: email,
      name: name,
      field: normalizedField,
      visibility: String(req.body.visibility || existingMentorProfile.visibility || "public").trim() || "public",
      status: String(req.body.status || existingMentorProfile.status || "approved").trim() || "approved",
      profile: Object.assign({}, existingMentorProfile.profile || {}, profile, {
        id: mentorId,
        name: name,
        field: normalizedField,
        phone: normalizePhone(
          req.body.phone ||
          profile.phone ||
          (existingMentorProfile.profile && existingMentorProfile.profile.phone) ||
          ""
        )
      }),
      created_at: existingMentorProfile.created_at || now,
      updated_at: now
    });

    res.json({
      message: "Da cap nhat ho so mentor.",
      profile: sanitizeMentorProfile(updatedMentorProfile)
    });
  } catch (error) {
    handleRouteError(res, error, "Khong the cap nhat ho so mentor luc nay.");
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

    const shouldGenerateActivation =
      status === "approved" &&
      existingApplication.status !== "activated" &&
      !existingApplication.activation_code;
    const activationCode = shouldGenerateActivation
      ? crypto.randomBytes(4).toString("hex").toUpperCase()
      : existingApplication.activation_code || "";
    const invitedAt = shouldGenerateActivation
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

    const nextApplication = updatedApplication || existingApplication;
    const existingProfile = await getMentorProfileByEmail(existingApplication.email);
    const applicationProfileState = mapMentorProfileStateFromApplicationStatus(status);
    let publishedProfile = null;

    if (existingProfile || status === "approved" || status === "activated") {
      publishedProfile = await upsertMentorProfileRecord(Object.assign(
        {},
        buildPublishedMentorProfileFromApplication(nextApplication, existingProfile),
        existingProfile ? {
          owner_user_id: existingProfile.owner_user_id || null,
          email: existingProfile.email || normalizeEmail(existingApplication.email),
          profile: Object.assign(
            {},
            existingProfile.profile && typeof existingProfile.profile === "object" ? existingProfile.profile : {},
            buildPublishedMentorProfileFromApplication(nextApplication, existingProfile).profile || {}
          )
        } : {},
        {
          visibility: applicationProfileState.visibility,
          status: applicationProfileState.status,
          created_at:
            (existingProfile && existingProfile.created_at) ||
            existingApplication.activated_at ||
            existingApplication.created_at ||
            new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ));
    }

    res.json({
      message: "Da cap nhat ho so ung tuyen mentor.",
      application: sanitizeMentorApplication(nextApplication),
      publishedProfile: publishedProfile ? sanitizeMentorProfile(publishedProfile) : null
    });
  } catch (error) {
    handleRouteError(res, error, "Khong the cap nhat ho so mentor.");
  }
});

app.put("/api/admin/mentor-profile-updates/:id", requireAdmin, async (req, res) => {
  if (!ensureSupabaseConfig(res)) {
    return;
  }

  const requestId = String(req.params.id || "").trim();
  const status = String(req.body.status || "").trim();
  const adminNote = String(req.body.adminNote || "").trim();

  if (!requestId) {
    res.status(400).json({ message: "Ma yeu cau cap nhat mentor khong hop le." });
    return;
  }

  if (!status) {
    res.status(400).json({ message: "Vui long chon trang thai xu ly cho cap nhat mentor." });
    return;
  }

  try {
    const existingRequest = await restSelect("mentor_profile_updates", {
      single: true,
      query: {
        select: "*",
        id: toEqualityFilter(requestId),
        limit: 1
      }
    });

    if (!existingRequest) {
      res.status(404).json({ message: "Khong tim thay yeu cau cap nhat mentor." });
      return;
    }

    const now = new Date().toISOString();
    const [updatedRequest] = await restUpdate(
      "mentor_profile_updates",
      {
        status: status,
        admin_note: adminNote,
        updated_at: now
      },
      {
        query: {
          id: toEqualityFilter(requestId)
        }
      }
    );

    const currentPublished = await getMentorProfileById(existingRequest.mentor_id);
    const reviewProfileState = mapMentorProfileStateFromReviewStatus(status);
    let publishedProfile = null;

    if (currentPublished || existingRequest.profile) {
      publishedProfile = await upsertMentorProfileRecord({
        id: existingRequest.mentor_id,
        owner_user_id: existingRequest.mentor_user_id || (currentPublished && currentPublished.owner_user_id) || null,
        email: (currentPublished && currentPublished.email) || "",
        name: existingRequest.mentor_name,
        field: String((existingRequest.profile && existingRequest.profile.field) || (currentPublished && currentPublished.field) || "").trim(),
        visibility: reviewProfileState.visibility,
        status: reviewProfileState.status,
        profile: Object.assign({}, currentPublished && currentPublished.profile ? currentPublished.profile : {}, existingRequest.profile || {}, {
          id: existingRequest.mentor_id,
          name: existingRequest.mentor_name
        }),
        updated_at: now,
        created_at: (currentPublished && currentPublished.created_at) || existingRequest.created_at || now
      });

      if (existingRequest.mentor_user_id) {
        const profileRecord = await getProfileById(existingRequest.mentor_user_id);
        if (profileRecord) {
          await upsertProfile(Object.assign({}, profileRecord, {
            id: existingRequest.mentor_user_id,
            role: "mentor",
            mentor_id: existingRequest.mentor_id,
            updated_at: now
          }));
        }
      }
    }

    res.json({
      message: "Da cap nhat yeu cau chinh sua ho so mentor.",
      request: sanitizeMentorProfileUpdate(updatedRequest || existingRequest),
      publishedProfile: publishedProfile ? sanitizeMentorProfile(publishedProfile) : null
    });
  } catch (error) {
    handleRouteError(res, error, "Khong the cap nhat yeu cau ho so mentor.");
  }
});

app.put("/api/admin/booking-requests/:id", requireAdmin, async (req, res) => {
  if (!ensureSupabaseConfig(res)) {
    return;
  }

  const requestId = parseNumericId(req.params.id);
  const status = String(req.body.status || "").trim();
  const adminNote = String(req.body.adminNote || "").trim();

  if (!requestId) {
    res.status(400).json({ message: "Ma booking khong hop le." });
    return;
  }

  if (!status) {
    res.status(400).json({ message: "Vui long chon trang thai booking." });
    return;
  }

  try {
    const existingRequest = await restSelect("booking_requests", {
      single: true,
      query: {
        select: "*",
        id: toEqualityFilter(requestId),
        limit: 1
      }
    });

    if (!existingRequest) {
      res.status(404).json({ message: "Khong tim thay booking." });
      return;
    }

    const [updatedRequest] = await restUpdate("booking_requests", {
      status: status,
      admin_note: adminNote,
      updated_at: new Date().toISOString()
    }, {
      query: {
        id: toEqualityFilter(requestId)
      }
    });

    if (existingRequest.mentee_user_id) {
      await createNotification({
        userId: existingRequest.mentee_user_id,
        title: "Booking được cập nhật",
        body: "Yêu cầu với mentor " + existingRequest.mentor_name + " đã được chuyển sang trạng thái " + status + ".",
        link: "mentee-schedule.html",
        type: "booking",
        meta: {
          bookingId: requestId,
          status: status
        }
      }).catch(function () {
        return null;
      });
    }

    res.json({
      message: "Da cap nhat booking.",
      request: sanitizeBookingRequest(updatedRequest || existingRequest)
    });
  } catch (error) {
    handleRouteError(res, error, "Khong the cap nhat booking.");
  }
});

app.put("/api/mentor/booking-requests/:id", authMiddleware, async (req, res) => {
  if (!ensureSupabaseConfig(res)) {
    return;
  }

  const requestId = parseNumericId(req.params.id);
  const role = normalizeRole(req.user && req.user.role);
  const status = String(req.body.status || "").trim();
  const slotId = String(req.body.slotId || "").trim();
  const slotIds = Array.isArray(req.body.slotIds) ? req.body.slotIds : [];
  const preferredTime = String(req.body.preferredTime || "").trim();

  if (!requestId) {
    res.status(400).json({ message: "Ma booking khong hop le." });
    return;
  }

  if (!["mentor", "admin"].includes(role)) {
    res.status(403).json({ message: "Chi mentor hoac admin moi duoc cap nhat booking nay." });
    return;
  }

  try {
    const existingRequest = await restSelect("booking_requests", {
      single: true,
      query: {
        select: "*",
        id: toEqualityFilter(requestId),
        limit: 1
      }
    });

    if (!existingRequest) {
      res.status(404).json({ message: "Khong tim thay booking." });
      return;
    }

    if (role !== "admin" && !canMentorManageBooking(req.user, existingRequest)) {
      res.status(403).json({ message: "Booking nay khong thuoc mentor hien tai." });
      return;
    }

    const patch = {
      status: status || existingRequest.status || "pending",
      updated_at: new Date().toISOString()
    };

    if (patch.status === "accepted") {
      patch.slot_id = slotId || existingRequest.slot_id || "";
      patch.slot_ids = slotIds.length ? slotIds : (Array.isArray(existingRequest.slot_ids) ? existingRequest.slot_ids : []);
      patch.preferred_time = preferredTime || existingRequest.preferred_time || "";
    }

    if (patch.status === "rejected") {
      patch.slot_id = "";
      patch.slot_ids = [];
    }

    const [updatedRequest] = await restUpdate("booking_requests", patch, {
      query: {
        id: toEqualityFilter(requestId)
      }
    });

    if (existingRequest.mentee_user_id) {
      await createNotification({
        userId: existingRequest.mentee_user_id,
        title: patch.status === "accepted" ? "Mentor đã nhận lịch của bạn" : "Booking đã được cập nhật",
        body:
          patch.status === "accepted"
            ? existingRequest.mentor_name + " đã nhận yêu cầu và chốt lịch " + (patch.preferred_time || existingRequest.preferred_time || "đã chọn") + "."
            : existingRequest.mentor_name + " đã cập nhật trạng thái booking sang " + patch.status + ".",
        link: "mentee-schedule.html",
        type: "booking",
        meta: {
          bookingId: requestId,
          status: patch.status
        }
      }).catch(function () {
        return null;
      });
    }

    res.json({
      message: "Da cap nhat booking cho mentor.",
      request: sanitizeBookingRequest(updatedRequest || existingRequest)
    });
  } catch (error) {
    handleRouteError(res, error, "Khong the cap nhat booking cho mentor.");
  }
});

app.get("/api/booking-requests/:id/chat", authMiddleware, async (req, res) => {
  if (!ensureSupabaseConfig(res)) {
    return;
  }

  const requestId = parseNumericId(req.params.id);
  if (!requestId) {
    res.status(400).json({ message: "Ma booking khong hop le." });
    return;
  }

  try {
    const bookingRequest = await restSelect("booking_requests", {
      single: true,
      query: {
        select: "*",
        id: toEqualityFilter(requestId),
        limit: 1
      }
    });

    if (!bookingRequest) {
      res.status(404).json({ message: "Khong tim thay booking." });
      return;
    }

    if (!canUserAccessBooking(req.user, bookingRequest)) {
      res.status(403).json({ message: "Ban khong co quyen xem doan chat nay." });
      return;
    }

    res.json({
      request: sanitizeBookingRequest(bookingRequest),
      messages: Array.isArray(bookingRequest.chat_messages) ? bookingRequest.chat_messages : []
    });
  } catch (error) {
    handleRouteError(res, error, "Khong the tai doan chat.");
  }
});

app.post("/api/booking-requests/:id/chat", authMiddleware, async (req, res) => {
  if (!ensureSupabaseConfig(res)) {
    return;
  }

  const requestId = parseNumericId(req.params.id);
  const content = String(req.body.content || "").trim();
  if (!requestId) {
    res.status(400).json({ message: "Ma booking khong hop le." });
    return;
  }

  if (content.length < 1) {
    res.status(400).json({ message: "Noi dung tin nhan khong hop le." });
    return;
  }

  try {
    const bookingRequest = await restSelect("booking_requests", {
      single: true,
      query: {
        select: "*",
        id: toEqualityFilter(requestId),
        limit: 1
      }
    });

    if (!bookingRequest) {
      res.status(404).json({ message: "Khong tim thay booking." });
      return;
    }

    if (!canUserAccessBooking(req.user, bookingRequest)) {
      res.status(403).json({ message: "Ban khong co quyen gui tin nhan o doan chat nay." });
      return;
    }

    const now = new Date().toISOString();
    const nextMessage = {
      id: "chat-" + requestId + "-" + Date.now(),
      senderUserId: req.authUser.id,
      senderRole: normalizeRole(req.user.role),
      senderName: req.user.name || req.authUser.email || "Mentor Me",
      content: content,
      createdAt: now
    };
    const existingMessages = Array.isArray(bookingRequest.chat_messages) ? bookingRequest.chat_messages : [];
    const [updatedRequest] = await restUpdate("booking_requests", {
      chat_messages: existingMessages.concat(nextMessage),
      updated_at: now
    }, {
      query: {
        id: toEqualityFilter(requestId)
      }
    });

    const senderRole = normalizeRole(req.user.role);
    let recipientUserId = "";
    if (senderRole === "mentor" || senderRole === "admin") {
      recipientUserId = String(bookingRequest.mentee_user_id || "").trim();
    } else {
      const mentorProfile = await getMentorProfileById(bookingRequest.mentor_id).catch(function () {
        return null;
      });
      recipientUserId = String((mentorProfile && mentorProfile.owner_user_id) || "").trim();
    }

    await createNotification({
      userId: recipientUserId,
      title: "Bạn có tin nhắn mới",
      body: (req.user.name || "Người dùng") + " vừa gửi tin nhắn trong booking với " + bookingRequest.mentor_name + ".",
      link: "booking-chat.html?id=" + requestId,
      type: "chat",
      meta: {
        bookingId: requestId
      }
    }).catch(function () {
      return null;
    });

    res.status(201).json({
      message: "Da gui tin nhan.",
      request: sanitizeBookingRequest(updatedRequest || bookingRequest),
      chatMessage: nextMessage
    });
  } catch (error) {
    handleRouteError(res, error, "Khong the gui tin nhan luc nay.");
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
  const fullName = String(req.body.name || "").trim();
  const password = String(req.body.password || "");

  if (!email.includes("@")) {
    res.status(400).json({ message: "Email chua dung dinh dang." });
    return;
  }

  if (!activationCode) {
    res.status(400).json({ message: "Vui long nhap ma kich hoat mentor." });
    return;
  }

  if (fullName.length < 2) {
    res.status(400).json({ message: "Vui long nhap ho va ten hop le." });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ message: "Mat khau can co toi thieu 8 ky tu." });
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
    const mentorId = slugifyText(fullName) || slugifyText(application.full_name) || ("mentor-" + application.id);
    const existingAuthUser = await findAuthUserByEmail(email);
    let createdUser = existingAuthUser;

    if (existingAuthUser) {
      await updateAuthUserById(existingAuthUser.id, {
        password: password,
        user_metadata: Object.assign({}, existingAuthUser.user_metadata || {}, {
          full_name: fullName,
          role: "mentor"
        })
      });
    } else {
      createdUser = await createAuthUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          role: "mentor"
        }
      });
    }

    if (!createdUser) {
      throw new SupabaseError(500, "Khong the tao tai khoan mentor luc nay.");
    }

    let savedProfile = null;
    try {
      const currentProfile = await getProfileById(createdUser.id);
      savedProfile = await upsertProfile({
        id: createdUser.id,
        full_name: fullName,
        phone: normalizePhone(application.phone),
        goal: (currentProfile && currentProfile.goal) || "",
        bio: (currentProfile && currentProfile.bio) || "",
        role: "mentor",
        mentor_id: mentorId,
        avatar_url: (currentProfile && currentProfile.avatar_url) || "",
        created_at: (currentProfile && currentProfile.created_at) || createdUser.created_at || now,
        updated_at: now
      });

      const currentMentorProfile = await getMentorProfileByEmail(email) || await getMentorProfileById(mentorId);
      await upsertMentorProfileRecord({
        id: (currentMentorProfile && currentMentorProfile.id) || mentorId,
        owner_user_id: createdUser.id,
        email: email,
        name: fullName,
        field: String((currentMentorProfile && currentMentorProfile.field) || "").trim(),
        visibility: currentMentorProfile ? currentMentorProfile.visibility : "draft",
        status: currentMentorProfile ? currentMentorProfile.status : "pending",
        profile: Object.assign({}, currentMentorProfile && currentMentorProfile.profile ? currentMentorProfile.profile : {}, {
          id: (currentMentorProfile && currentMentorProfile.id) || mentorId,
          name: fullName
        }),
        created_at: (currentMentorProfile && currentMentorProfile.created_at) || now,
        updated_at: now
      });

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

      const loginResult = await signInWithPassword({
        email: email,
        password: password
      });
      const token = loginResult.access_token || (loginResult.session && loginResult.session.access_token) || "";
      const responseUser =
        unwrapAuthUser(loginResult) ||
        (loginResult.session && loginResult.session.user) ||
        createdUser;

      res.json({
        message: "Da kich hoat tai khoan mentor thanh cong.",
        token: token,
        user: sanitizeUser(responseUser, savedProfile),
        application: sanitizeMentorApplication(updatedApplication || application)
      });
    } catch (profileError) {
      await deleteAuthUserById(createdUser.id).catch(function ignoreCleanupError() {});
      throw profileError;
    }
  } catch (error) {
    handleRouteError(res, error, "Khong the hoan tat kich hoat tai khoan mentor luc nay.");
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
