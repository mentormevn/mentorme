import "dotenv/config";

import crypto from "node:crypto";

const ADMIN_DASHBOARD_PASSWORD = process.env.ADMIN_DASHBOARD_PASSWORD || "ADMIN2026";
const SUPABASE_URL =
  process.env.SUPABASE_URL || "https://gmyrnqupbqwbyaamixgv.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdteXJucXVwYnF3YnlhYW1peGd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MTgzOTYsImV4cCI6MjA4OTk5NDM5Nn0.Q8EN6VzW6NG6hsMyOki5GjZsiWPfS0msjBesu6_gy6U";
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  "";

export class SupabaseError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = "SupabaseError";
    this.status = status;
    this.details = details;
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

function getBody(req) {
  if (!req || !req.body || typeof req.body !== "object") {
    return {};
  }

  return req.body;
}

function getRouteSegments(req) {
  const route = req && req.query ? req.query.route : [];
  if (Array.isArray(route)) {
    return route.filter(Boolean);
  }

  return route ? [route] : [];
}

function getSupabaseApiUrl(segment) {
  return new URL(segment, SUPABASE_URL.endsWith("/") ? SUPABASE_URL : SUPABASE_URL + "/");
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
  const baseUrl = options.kind === "auth"
    ? getSupabaseApiUrl("auth/v1/")
    : getSupabaseApiUrl("rest/v1/");
  const url = new URL(pathname, baseUrl);
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
    method: options.method || "GET",
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
  const payload = await requestSupabase(table, {
    kind: "rest",
    method: "GET",
    query: Object.assign({ select: options.select || "*" }, options.query || {}),
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
      Prefer: "return=representation,resolution=merge-duplicates"
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

function normalizeText(value) {
  return String(value || "").trim();
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

function normalizeStringArray(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .map(function mapValue(value) {
      return normalizeText(value);
    })
    .filter(Boolean);
}

function parsePositiveInteger(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseNonNegativeInteger(value, fallback = 0) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return Math.round(parsed);
}

function parseRatingValue(value, fallback = 0) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return Number(parsed.toFixed(1));
}

function slugifyText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildMentorAvailabilityText(availability) {
  const labels = {
    sang: "Buoi sang",
    chieu: "Buoi chieu",
    toi: "Buoi toi",
    "cuoi-tuan": "Cuoi tuan"
  };

  const list = normalizeStringArray(availability)
    .map(function mapAvailability(item) {
      return labels[item];
    })
    .filter(Boolean);

  return list.length ? list.join(", ") : "Linh hoat theo lich hen";
}

function buildMentorServiceText(services) {
  const labels = {
    "1-1": "Mentor 1 kem 1",
    group: "Mentor theo nhom",
    roadmap: "Tu van lo trinh",
    competition: "Luyen thi/cuoc thi"
  };

  const list = normalizeStringArray(services)
    .map(function mapService(item) {
      return labels[item];
    })
    .filter(Boolean);

  return list.length ? list.join(", ") : "Mentor 1 kem 1";
}

function buildMentorSearchableText(mentor) {
  return [
    mentor.name,
    mentor.tag,
    mentor.role,
    mentor.bio,
    mentor.focus,
    mentor.fit,
    mentor.workplace
  ]
    .map(slugifyText)
    .filter(Boolean)
    .join(" ");
}

function toEqualityFilter(value) {
  return "eq." + String(value);
}

function toNotEqualFilter(value) {
  return "neq." + String(value);
}

function toInFilter(values) {
  return "in.(" + (values || []).map(function mapValue(value) {
    const stringValue = String(value);
    return /^[a-zA-Z0-9_-]+$/.test(stringValue)
      ? stringValue
      : '"' + stringValue.replace(/"/g, '\\"') + '"';
  }).join(",") + ")";
}

function getBearerToken(req) {
  const authorization = String((req && req.headers && req.headers.authorization) || "");
  return authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
}

function getAdminKey(req) {
  return String((req && req.headers && req.headers["x-admin-key"]) || "");
}

function handleRouteError(res, error, fallbackMessage, fallbackStatus) {
  const status = error instanceof SupabaseError ? error.status : fallbackStatus || 500;
  const message = error instanceof SupabaseError ? error.message : fallbackMessage;

  res.status(status || 500).json({
    message: message || fallbackMessage || "Khong the xu ly yeu cau luc nay."
  });
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
    mentorProfileId: profileData.mentor_profile_id || "",
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
    mentorProfileId: application.mentor_profile_id || "",
    activatedUserId: application.activated_user_id || "",
    createdAt: application.created_at,
    updatedAt: application.updated_at
  };
}

function sanitizeReview(review) {
  return {
    id: review.id,
    bookingId: review.booking_request_id,
    mentorId: review.mentor_profile_id,
    mentorName: review.mentor_name || "",
    author: review.author_name,
    role: review.author_role || "Mentee Mentor Me",
    rating: Number(review.rating || 0),
    content: review.content || "",
    createdAt: review.created_at,
    _source: "supabase"
  };
}

function serializeMentorProfile(row, options = {}) {
  const reviews = Array.isArray(options.reviews) ? options.reviews : [];
  const acceptedCount = parseNonNegativeInteger(options.acceptedCount, 0);
  const baseRating = parseRatingValue(row.rating, 0);
  const baseStudents = parseNonNegativeInteger(row.students_taught, 0);
  const reviewTotal = reviews.reduce(function reduceReviews(total, review) {
    return total + Number(review.rating || 0);
  }, 0);
  const computedRating = reviews.length
    ? ((baseRating * Math.max(baseStudents, 1)) + reviewTotal) /
      (Math.max(baseStudents, 1) + reviews.length)
    : baseRating;

  return {
    id: row.id,
    name: row.display_name || row.id,
    image: row.image_url || "mentor2.jpg",
    workplace: row.workplace || "Dang cap nhat",
    tag: row.tag || ("Mentor " + (row.focus || row.display_name || "")),
    role: row.headline || row.tag || "Mentor",
    bio: row.bio || "",
    focus: row.focus || "",
    field: row.field || "",
    availability: Array.isArray(row.availability_tokens) ? row.availability_tokens : [],
    availabilityText: row.availability_text || buildMentorAvailabilityText(row.availability_tokens || []),
    service: Array.isArray(row.service_tokens) ? row.service_tokens : [],
    serviceText: row.service_text || buildMentorServiceText(row.service_tokens || []),
    pricing: row.pricing || "",
    achievements: Array.isArray(row.achievements) ? row.achievements : [],
    fit: row.fit || "",
    searchableText:
      row.searchable_text ||
      buildMentorSearchableText({
        name: row.display_name || "",
        tag: row.tag || "",
        role: row.headline || "",
        bio: row.bio || "",
        focus: row.focus || "",
        fit: row.fit || "",
        workplace: row.workplace || ""
      }),
    rating: Number(computedRating.toFixed(1)),
    studentsTaught: baseStudents + acceptedCount,
    reviews: reviews.map(function mapReview(review) {
      return {
        bookingId: review.bookingId,
        author: review.author,
        role: review.role,
        rating: review.rating,
        content: review.content,
        createdAt: review.createdAt
      };
    }),
    _source: "supabase",
    _origin: row.origin || "admin",
    _status: row.status || "approved",
    _visibility: row.visibility || "public",
    _ownerUserId: row.owner_user_id || ""
  };
}

function sanitizeBookingRequest(row) {
  return {
    id: row.id,
    mentorId: row.mentor_profile_id,
    mentorName: row.mentor_name || row.mentor_name_snapshot || "",
    mentorImage: row.mentor_image || row.mentor_image_snapshot || "mentor2.jpg",
    mentorFocus: row.mentor_focus || row.mentor_focus_snapshot || "",
    menteeUserId: row.mentee_user_id || "",
    menteeName: row.mentee_name || "",
    menteeEmail: row.mentee_email || "",
    goal: row.goal || "",
    preferredTime: row.preferred_time || "",
    note: row.note || "",
    adminNote: row.admin_note || "",
    status: row.status || "pending",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    _source: "supabase"
  };
}

function sanitizeMentorProfileUpdateRequest(row) {
  return {
    id: row.id,
    mentorId: row.mentor_profile_id,
    mentorName:
      row.mentor_name ||
      (row.profile_snapshot && (row.profile_snapshot.name || row.profile_snapshot.displayName)) ||
      "Mentor",
    status: row.status || "pending",
    adminNote: row.admin_note || "",
    profile: row.profile_snapshot || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    _source: "supabase"
  };
}

function sanitizeMentorDraft(row) {
  return Object.assign({}, row.payload || {}, {
    mentorProfileId: row.mentor_profile_id || "",
    updatedAt: row.updated_at
  });
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
    query.id = toNotEqualFilter(excludeUserId);
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
      mentor_profile_id: null,
      updated_at: now
    },
    profile
  );

  const result = await restUpsert("profiles", payload, {
    onConflict: "id"
  });

  return result[0] || null;
}

async function requireAuthenticatedUser(req, res) {
  const token = getBearerToken(req);

  if (!token) {
    res.status(401).json({ message: "Ban can dang nhap de tiep tuc." });
    return null;
  }

  try {
    const authUser = await getAuthUserByToken(token);

    if (!authUser) {
      res.status(401).json({ message: "Phien dang nhap khong hop le hoac da het han." });
      return null;
    }

    const profile = await getProfileById(authUser.id);
    return {
      token: token,
      authUser: authUser,
      profile: profile,
      user: sanitizeUser(authUser, profile)
    };
  } catch (error) {
    res.status(500).json({ message: "Khong the xac thuc nguoi dung." });
    return null;
  }
}

async function getOptionalUserContext(req) {
  const token = getBearerToken(req);
  if (!token) {
    return null;
  }

  const authUser = await getAuthUserByToken(token);
  if (!authUser) {
    return null;
  }

  const profile = await getProfileById(authUser.id);
  return {
    token: token,
    authUser: authUser,
    profile: profile,
    user: sanitizeUser(authUser, profile)
  };
}

function requireAdmin(req, res) {
  const adminKey = getAdminKey(req);

  if (!adminKey || adminKey !== ADMIN_DASHBOARD_PASSWORD) {
    res.status(401).json({ message: "Ban khong co quyen truy cap khu vuc quan tri." });
    return false;
  }

  return true;
}

async function getMentorProfileById(mentorProfileId) {
  if (!mentorProfileId) {
    return null;
  }

  return restSelect("mentor_profiles", {
    single: true,
    query: {
      select: "*",
      id: toEqualityFilter(mentorProfileId),
      limit: 1
    }
  });
}

async function getMentorProfileByOwnerUserId(userId) {
  if (!userId) {
    return null;
  }

  return restSelect("mentor_profiles", {
    single: true,
    query: {
      select: "*",
      owner_user_id: toEqualityFilter(userId),
      order: "created_at.asc",
      limit: 1
    }
  });
}

async function generateUniqueMentorProfileId(name) {
  const baseId = slugifyText(name) || "mentor";
  let nextId = baseId;
  let index = 2;

  while (await getMentorProfileById(nextId)) {
    nextId = baseId + "-" + index;
    index += 1;
  }

  return nextId;
}

function buildMentorProfileSnapshot(input, existingRow) {
  const existing = existingRow || {};
  const availability = normalizeStringArray(
    input.availability !== undefined ? input.availability : existing.availability_tokens
  );
  const service = normalizeStringArray(
    input.service !== undefined ? input.service : existing.service_tokens
  );
  const achievements = Array.isArray(input.achievements)
    ? normalizeStringArray(input.achievements)
    : typeof input.achievements === "string"
      ? input.achievements.split("\n").map(normalizeText).filter(Boolean)
      : Array.isArray(existing.achievements)
        ? existing.achievements
        : [];
  const name = normalizeText(input.name || input.displayName || existing.display_name || existing.name || "");
  const headline = normalizeText(input.role || input.headline || existing.headline || existing.role || "");
  const focus = normalizeText(input.focus || input.expertise || existing.focus || "");
  const tag = normalizeText(
    input.tag ||
      existing.tag ||
      (focus ? "Mentor " + focus : name ? "Mentor " + name : "Mentor")
  );
  const workplace = normalizeText(input.workplace || existing.workplace || "");
  const bio = normalizeText(input.bio || input.intro || existing.bio || "");
  const fit = normalizeText(input.fit || existing.fit || "");
  const image = normalizeText(input.image || input.imageUrl || existing.image_url || "mentor2.jpg");
  const pricing = normalizeText(input.pricing || existing.pricing || "");
  const visibility = normalizeText(input.visibility || existing.visibility || "public") === "public"
    ? "public"
    : "draft";
  const field = normalizeText(input.field || existing.field || "khac");
  const availabilityText = normalizeText(
    input.availabilityText || input.availability || existing.availability_text || buildMentorAvailabilityText(availability)
  );
  const serviceText = normalizeText(
    input.serviceText || input.services || existing.service_text || buildMentorServiceText(service)
  );
  const rating = parseRatingValue(input.rating !== undefined ? input.rating : existing.rating, parseRatingValue(existing.rating, 0));
  const studentsTaught = parseNonNegativeInteger(
    input.studentsTaught !== undefined ? input.studentsTaught : existing.students_taught,
    parseNonNegativeInteger(existing.students_taught, 0)
  );

  return {
    displayName: name,
    name: name,
    image: image,
    role: headline,
    workplace: workplace,
    focus: focus,
    field: field,
    availability: availability,
    availabilityText: availabilityText,
    service: service,
    serviceText: serviceText,
    pricing: pricing,
    bio: bio,
    achievements: achievements,
    fit: fit,
    tag: tag,
    searchableText: buildMentorSearchableText({
      name: name,
      tag: tag,
      role: headline,
      bio: bio,
      focus: focus,
      fit: fit,
      workplace: workplace
    }),
    rating: rating,
    studentsTaught: studentsTaught,
    visibility: visibility
  };
}

function buildMentorProfileRecord(snapshot, options = {}) {
  const now = options.now || new Date().toISOString();
  const existing = options.existingRow || {};

  return {
    id: normalizeText(options.id || existing.id),
    owner_user_id:
      options.ownerUserId !== undefined
        ? options.ownerUserId || null
        : existing.owner_user_id || null,
    source_application_id:
      options.sourceApplicationId !== undefined
        ? options.sourceApplicationId || null
        : existing.source_application_id || null,
    display_name: snapshot.displayName,
    image_url: snapshot.image,
    workplace: snapshot.workplace,
    tag: snapshot.tag,
    headline: snapshot.role,
    bio: snapshot.bio,
    focus: snapshot.focus,
    field: snapshot.field || "khac",
    availability_tokens: snapshot.availability,
    availability_text: snapshot.availabilityText,
    service_tokens: snapshot.service,
    service_text: snapshot.serviceText,
    pricing: snapshot.pricing || "",
    achievements: snapshot.achievements,
    fit: snapshot.fit,
    searchable_text: snapshot.searchableText,
    rating: snapshot.rating,
    students_taught: snapshot.studentsTaught,
    visibility: snapshot.visibility,
    status: normalizeText(options.status || existing.status || "approved") || "approved",
    origin: normalizeText(options.origin || existing.origin || "admin") || "admin",
    published_at:
      snapshot.visibility === "public"
        ? existing.published_at || now
        : existing.published_at || null,
    updated_at: now,
    created_at: existing.created_at || now
  };
}

async function createMentorProfile(record) {
  const result = await restInsert("mentor_profiles", record);
  return result[0] || null;
}

async function updateMentorProfile(mentorProfileId, patch) {
  const result = await restUpdate("mentor_profiles", patch, {
    query: {
      id: toEqualityFilter(mentorProfileId)
    }
  });
  return result[0] || null;
}

async function resolveMentorProfileForUser(userContext, options = {}) {
  if (!userContext || !userContext.authUser) {
    return null;
  }

  let profileRow = userContext.profile || null;
  let mentorProfile = profileRow && profileRow.mentor_profile_id
    ? await getMentorProfileById(profileRow.mentor_profile_id)
    : null;

  if (!mentorProfile) {
    mentorProfile = await getMentorProfileByOwnerUserId(userContext.authUser.id);
  }

  if (!mentorProfile && options.allowCreate) {
    const name = normalizeText(userContext.user && userContext.user.name) || "Mentor";
    const mentorProfileId = await generateUniqueMentorProfileId(name);
    const snapshot = buildMentorProfileSnapshot(
      {
        name: name,
        displayName: name,
        image: (userContext.user && userContext.user.avatar) || "mentor2.jpg",
        role: "",
        workplace: "",
        focus: "",
        field: "khac",
        availability: [],
        service: ["1-1"],
        bio: "",
        fit: "",
        pricing: "",
        visibility: "draft",
        tag: "Mentor " + name
      },
      null
    );
    mentorProfile = await createMentorProfile(
      buildMentorProfileRecord(snapshot, {
        id: mentorProfileId,
        ownerUserId: userContext.authUser.id,
        status: "approved",
        origin: "mentor_update"
      })
    );
  }

  if (mentorProfile && (!profileRow || profileRow.mentor_profile_id !== mentorProfile.id)) {
    profileRow = await upsertProfile(
      Object.assign({}, profileRow || {}, {
        id: userContext.authUser.id,
        full_name: (profileRow && profileRow.full_name) || (userContext.user && userContext.user.name) || "",
        phone: (profileRow && profileRow.phone) || "",
        goal: (profileRow && profileRow.goal) || "",
        bio: (profileRow && profileRow.bio) || "",
        role: normalizeRole((profileRow && profileRow.role) || (userContext.user && userContext.user.role) || "mentor"),
        avatar_url: (profileRow && profileRow.avatar_url) || "",
        mentor_profile_id: mentorProfile.id
      })
    );
    userContext.profile = profileRow;
    userContext.user = sanitizeUser(userContext.authUser, profileRow);
  }

  return mentorProfile;
}
async function getMentorApplicationById(applicationId) {
  return restSelect("mentor_applications", {
    single: true,
    query: {
      select: "*",
      id: toEqualityFilter(applicationId),
      limit: 1
    }
  });
}

async function getMentorProfileUpdateById(requestId) {
  return restSelect("mentor_profile_update_requests", {
    single: true,
    query: {
      select: "*",
      id: toEqualityFilter(requestId),
      limit: 1
    }
  });
}

async function getPendingMentorProfileUpdateByMentorId(mentorProfileId) {
  return restSelect("mentor_profile_update_requests", {
    single: true,
    query: {
      select: "*",
      mentor_profile_id: toEqualityFilter(mentorProfileId),
      status: toEqualityFilter("pending"),
      order: "created_at.desc",
      limit: 1
    }
  });
}

async function getMentorProfileDraftByUserId(userId) {
  if (!userId) {
    return null;
  }

  return restSelect("mentor_profile_drafts", {
    single: true,
    query: {
      select: "*",
      user_id: toEqualityFilter(userId),
      limit: 1
    }
  });
}

async function getBookingRequestById(bookingId) {
  if (!bookingId) {
    return null;
  }

  return restSelect("mentor_booking_requests", {
    single: true,
    query: {
      select: "*",
      id: toEqualityFilter(bookingId),
      limit: 1
    }
  });
}

async function getReviewByBookingId(bookingId) {
  if (!bookingId) {
    return null;
  }

  return restSelect("mentor_reviews", {
    single: true,
    query: {
      select: "*",
      booking_request_id: toEqualityFilter(bookingId),
      limit: 1
    }
  });
}

function isMentorBookingStatus(status) {
  return ["pending", "accepted", "rejected", "completed"].includes(status);
}

async function buildApprovedMentorProfileState() {
  const mentorRows = await restSelect("mentor_profiles", {
    query: {
      select: "*",
      status: toEqualityFilter("approved"),
      visibility: toEqualityFilter("public"),
      order: "created_at.asc"
    }
  });
  const reviewRows = await restSelect("mentor_reviews", {
    query: {
      select: "*",
      is_published: toEqualityFilter(true),
      order: "created_at.desc"
    }
  });
  const acceptedRows = await restSelect("mentor_booking_requests", {
    query: {
      select: "mentor_profile_id,status",
      status: toInFilter(["accepted", "completed"])
    }
  });

  const reviews = reviewRows.map(sanitizeReview);
  const reviewsByMentor = reviews.reduce(function reduceMentorReviews(map, review) {
    if (!review.mentorId) {
      return map;
    }

    if (!map[review.mentorId]) {
      map[review.mentorId] = [];
    }

    map[review.mentorId].push(review);
    return map;
  }, {});
  const acceptedCountByMentor = acceptedRows.reduce(function reduceAccepted(map, row) {
    if (!row.mentor_profile_id) {
      return map;
    }

    map[row.mentor_profile_id] = (map[row.mentor_profile_id] || 0) + 1;
    return map;
  }, {});
  const approvedMentorProfiles = mentorRows.reduce(function reduceProfiles(store, row) {
    store[row.id] = serializeMentorProfile(row, {
      reviews: reviewsByMentor[row.id] || [],
      acceptedCount: acceptedCountByMentor[row.id] || 0
    });
    return store;
  }, {});

  return {
    approvedMentorProfiles: approvedMentorProfiles,
    mentorSubmittedReviews: reviews
  };
}

async function getResolvedMentorProfileSnapshot(mentorProfileId) {
  const mentorRow = await getMentorProfileById(mentorProfileId);
  if (!mentorRow) {
    return null;
  }

  const publicState = await buildApprovedMentorProfileState();
  return publicState.approvedMentorProfiles[mentorProfileId] || serializeMentorProfile(mentorRow);
}

async function getBusinessState(options = {}) {
  const publicState = await buildApprovedMentorProfileState();
  const state = Object.assign({}, publicState, {
    mentorBookingRequests: [],
    pendingMentorProfileUpdates: [],
    mentorProfileDrafts: {}
  });

  if (options.isAdmin) {
    const bookingRows = await restSelect("mentor_booking_requests", {
      query: {
        select: "*",
        order: "created_at.desc"
      }
    });
    const updateRows = await restSelect("mentor_profile_update_requests", {
      query: {
        select: "*",
        order: "created_at.desc"
      }
    });

    state.mentorBookingRequests = bookingRows.map(sanitizeBookingRequest);
    state.pendingMentorProfileUpdates = updateRows.map(sanitizeMentorProfileUpdateRequest);
    return state;
  }

  if (!options.userContext) {
    return state;
  }

  const userContext = options.userContext;
  const normalizedRole = normalizeRole(userContext.user && userContext.user.role);

  if (normalizedRole === "mentee") {
    const bookingRows = await restSelect("mentor_booking_requests", {
      query: {
        select: "*",
        or:
          "mentee_user_id.eq." +
          userContext.authUser.id +
          ",mentee_email.eq." +
          normalizeEmail(userContext.user.email),
        order: "created_at.desc"
      }
    });

    state.mentorBookingRequests = bookingRows.map(sanitizeBookingRequest);
    return state;
  }

  if (normalizedRole === "mentor" || normalizedRole === "admin") {
    const mentorProfile = await resolveMentorProfileForUser(userContext, {
      allowCreate: normalizedRole === "mentor"
    });
    const bookingRows = mentorProfile
      ? await restSelect("mentor_booking_requests", {
          query: {
            select: "*",
            mentor_profile_id: toEqualityFilter(mentorProfile.id),
            order: "created_at.desc"
          }
        })
      : [];
    const updateRows = mentorProfile
      ? await restSelect("mentor_profile_update_requests", {
          query: {
            select: "*",
            mentor_profile_id: toEqualityFilter(mentorProfile.id),
            order: "created_at.desc"
          }
        })
      : [];
    const draftRow = await getMentorProfileDraftByUserId(userContext.authUser.id);

    state.mentorBookingRequests = bookingRows.map(sanitizeBookingRequest);
    state.pendingMentorProfileUpdates = updateRows.map(sanitizeMentorProfileUpdateRequest);

    if (draftRow) {
      state.mentorProfileDrafts[userContext.authUser.id] = sanitizeMentorDraft(draftRow);
    }
  }

  return state;
}

async function upsertMentorProfileDraft(userId, mentorProfileId, payload) {
  const now = new Date().toISOString();
  const result = await restUpsert(
    "mentor_profile_drafts",
    {
      user_id: userId,
      mentor_profile_id: mentorProfileId,
      payload: payload,
      updated_at: now,
      created_at: now
    },
    {
      onConflict: "user_id"
    }
  );

  return result[0] || null;
}

async function upsertMentorProfileUpdateRequest(mentorProfileId, requesterUserId, mentorName, profileSnapshot) {
  const existingRequest = await getPendingMentorProfileUpdateByMentorId(mentorProfileId);
  const now = new Date().toISOString();

  if (existingRequest) {
    const result = await restUpdate(
      "mentor_profile_update_requests",
      {
        requester_user_id: requesterUserId,
        mentor_name: mentorName,
        profile_snapshot: profileSnapshot,
        admin_note: "",
        status: "pending",
        updated_at: now
      },
      {
        query: {
          id: toEqualityFilter(existingRequest.id)
        }
      }
    );

    return result[0] || existingRequest;
  }

  const result = await restInsert("mentor_profile_update_requests", {
    mentor_profile_id: mentorProfileId,
    requester_user_id: requesterUserId,
    mentor_name: mentorName,
    status: "pending",
    admin_note: "",
    profile_snapshot: profileSnapshot,
    created_at: now,
    updated_at: now
  });

  return result[0] || null;
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

async function createConsultationRequest(req, res) {
  if (!ensureSupabaseConfig(res)) {
    return;
  }

  const body = getBody(req);
  const name = normalizeText(body.name);
  const email = normalizeEmail(body.email);
  const phone = normalizePhone(body.phone);
  const serviceType = normalizeText(body.serviceType);
  const audience = normalizeText(body.audience);
  const goal = normalizeText(body.goal);
  const preferredFormat = normalizeText(body.preferredFormat);
  const preferredChannel = normalizeText(body.preferredChannel);
  const preferredTime = normalizeText(body.preferredTime);
  const note = normalizeText(body.note);

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
    const result = await restInsert("consultation_requests", {
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
      request: sanitizeConsultationRequest(result[0])
    });
  } catch (error) {
    handleRouteError(res, error, "Khong the gui yeu cau tu van luc nay.");
  }
}

async function createMentorApplication(req, res) {
  if (!ensureSupabaseConfig(res)) {
    return;
  }

  const body = getBody(req);
  const fullName = normalizeText(body.fullName);
  const email = normalizeEmail(body.email);
  const phone = normalizePhone(body.phone);
  const expertise = normalizeText(body.expertise);
  const experience = normalizeText(body.experience);
  const motivation = normalizeText(body.motivation);
  const portfolioLink = normalizeText(body.portfolioLink);

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
    const result = await restInsert("mentor_applications", {
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
      mentor_profile_id: null,
      activated_user_id: null,
      created_at: now,
      updated_at: now
    });

    res.status(201).json({
      message:
        "Da gui ho so ung tuyen mentor. Doi ngu Mentor Me se lien he neu ho so phu hop.",
      application: sanitizeMentorApplication(result[0])
    });
  } catch (error) {
    handleRouteError(res, error, "Khong the gui ho so ung tuyen luc nay.");
  }
}

async function getBusinessStateRoute(req, res) {
  if (!ensureSupabaseConfig(res)) {
    return;
  }

  try {
    const adminAllowed = getAdminKey(req) === ADMIN_DASHBOARD_PASSWORD;
    const userContext = adminAllowed ? null : await getOptionalUserContext(req);
    const state = await getBusinessState({
      isAdmin: adminAllowed,
      userContext: userContext
    });

    res.json(state);
  } catch (error) {
    handleRouteError(res, error, "Khong the tai du lieu he thong.");
  }
}
async function verifyMentorActivation(req, res) {
  if (!ensureSupabaseConfig(res)) {
    return;
  }

  const body = getBody(req);
  const email = normalizeEmail(body.email);
  const activationCode = normalizeText(body.activationCode).toUpperCase();

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
}

async function activateMentorApplication(req, res) {
  if (!ensureSupabaseConfig(res)) {
    return;
  }

  const userContext = await requireAuthenticatedUser(req, res);
  if (!userContext) {
    return;
  }

  const body = getBody(req);
  const email = normalizeEmail(body.email);
  const activationCode = normalizeText(body.activationCode).toUpperCase();

  if (!email.includes("@")) {
    res.status(400).json({ message: "Email chua dung dinh dang." });
    return;
  }

  if (!activationCode) {
    res.status(400).json({ message: "Vui long nhap ma kich hoat mentor." });
    return;
  }

  if (normalizeEmail(userContext.authUser.email) !== email) {
    res.status(403).json({ message: "Tai khoan dang nhap khong khop email duoc moi kich hoat." });
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

    let mentorProfile = application.mentor_profile_id
      ? await getMentorProfileById(application.mentor_profile_id)
      : null;

    if (!mentorProfile) {
      const mentorProfileId = await generateUniqueMentorProfileId(application.full_name);
      const snapshot = buildMentorProfileSnapshot(
        {
          name: application.full_name,
          displayName: application.full_name,
          role: "Mentor " + normalizeText(application.expertise || "Mentor"),
          focus: normalizeText(application.expertise),
          field: "khac",
          service: ["1-1"],
          availability: [],
          bio: normalizeText(application.motivation),
          achievements: application.experience ? [application.experience] : [],
          fit: "",
          visibility: "draft",
          image: "mentor2.jpg",
          tag: "Mentor " + normalizeText(application.expertise || application.full_name)
        },
        null
      );
      mentorProfile = await createMentorProfile(
        buildMentorProfileRecord(snapshot, {
          id: mentorProfileId,
          ownerUserId: userContext.authUser.id,
          sourceApplicationId: application.id,
          status: "approved",
          origin: "application"
        })
      );
    } else if (mentorProfile.owner_user_id !== userContext.authUser.id) {
      mentorProfile = await updateMentorProfile(mentorProfile.id, {
        owner_user_id: userContext.authUser.id,
        updated_at: new Date().toISOString()
      });
    }

    const now = new Date().toISOString();
    const updatedApplication = await restUpdate(
      "mentor_applications",
      {
        status: "activated",
        activated_at: now,
        activated_user_id: userContext.authUser.id,
        mentor_profile_id: mentorProfile.id,
        updated_at: now
      },
      {
        query: {
          id: toEqualityFilter(application.id)
        }
      }
    );

    await upsertProfile({
      id: userContext.authUser.id,
      full_name:
        (userContext.profile && userContext.profile.full_name) || application.full_name,
      phone: (userContext.profile && userContext.profile.phone) || application.phone || "",
      goal: (userContext.profile && userContext.profile.goal) || "",
      bio: (userContext.profile && userContext.profile.bio) || "",
      role: "mentor",
      avatar_url: (userContext.profile && userContext.profile.avatar_url) || "",
      mentor_profile_id: mentorProfile.id,
      created_at:
        (userContext.profile && userContext.profile.created_at) ||
        userContext.authUser.created_at ||
        now,
      updated_at: now
    });

    res.json({
      message: "Da xac nhan kich hoat mentor.",
      application: sanitizeMentorApplication(updatedApplication[0] || application),
      mentorProfile: await getResolvedMentorProfileSnapshot(mentorProfile.id)
    });
  } catch (error) {
    handleRouteError(res, error, "Khong the hoan tat kich hoat tai khoan mentor luc nay.");
  }
}

async function getAdminConsultationRequests(req, res) {
  if (!ensureSupabaseConfig(res) || !requireAdmin(req, res)) {
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
}

async function getAdminMentorApplications(req, res) {
  if (!ensureSupabaseConfig(res) || !requireAdmin(req, res)) {
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
}

async function updateAdminConsultationRequest(req, res, requestIdParam) {
  if (!ensureSupabaseConfig(res) || !requireAdmin(req, res)) {
    return;
  }

  const requestId = parsePositiveInteger(requestIdParam);
  const body = getBody(req);
  const status = normalizeText(body.status);
  const adminNote = normalizeText(body.adminNote);
  const meetingLink = normalizeText(body.meetingLink);

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

    const result = await restUpdate(
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
      request: sanitizeConsultationRequest(result[0] || existingRequest)
    });
  } catch (error) {
    handleRouteError(res, error, "Khong the cap nhat yeu cau tu van.");
  }
}

async function updateAdminMentorApplication(req, res, applicationIdParam) {
  if (!ensureSupabaseConfig(res) || !requireAdmin(req, res)) {
    return;
  }

  const applicationId = parsePositiveInteger(applicationIdParam);
  const body = getBody(req);
  const status = normalizeText(body.status);
  const adminNote = normalizeText(body.adminNote);
  const shouldGenerateActivation = Boolean(body.generateActivation);

  if (!applicationId) {
    res.status(400).json({ message: "Ma ho so mentor khong hop le." });
    return;
  }

  if (!status) {
    res.status(400).json({ message: "Vui long chon trang thai xu ly cho ho so mentor." });
    return;
  }

  try {
    const existingApplication = await getMentorApplicationById(applicationId);

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

    const result = await restUpdate(
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
      application: sanitizeMentorApplication(result[0] || existingApplication)
    });
  } catch (error) {
    handleRouteError(res, error, "Khong the cap nhat ho so mentor.");
  }
}

async function createBookingRequest(req, res) {
  if (!ensureSupabaseConfig(res)) {
    return;
  }

  const body = getBody(req);
  const mentorId = normalizeText(body.mentorId);
  const menteeName = normalizeText(body.menteeName || body.name);
  const menteeEmail = normalizeEmail(body.menteeEmail || body.email);
  const goal = normalizeText(body.goal);
  const preferredTime = normalizeText(body.preferredTime);
  const note = normalizeText(body.note);
  const userContext = await getOptionalUserContext(req);

  if (!mentorId) {
    res.status(400).json({ message: "Khong tim thay mentor de dat lich." });
    return;
  }

  if (menteeName.length < 2) {
    res.status(400).json({ message: "Vui long nhap ten hop le." });
    return;
  }

  if (!menteeEmail.includes("@")) {
    res.status(400).json({ message: "Email chua dung dinh dang." });
    return;
  }

  if (goal.length < 6) {
    res.status(400).json({ message: "Hay mo ta muc tieu hoc tap ro hon." });
    return;
  }

  if (!preferredTime) {
    res.status(400).json({ message: "Vui long chon khung thoi gian mong muon." });
    return;
  }

  try {
    const mentorProfile = await getMentorProfileById(mentorId);
    if (!mentorProfile || mentorProfile.status !== "approved" || mentorProfile.visibility !== "public") {
      res.status(404).json({ message: "Mentor nay hien khong san sang nhan lich hoc." });
      return;
    }

    const snapshot = serializeMentorProfile(mentorProfile);
    const now = new Date().toISOString();
    const result = await restInsert("mentor_booking_requests", {
      mentor_profile_id: mentorProfile.id,
      mentee_user_id: userContext ? userContext.authUser.id : null,
      mentee_name: menteeName,
      mentee_email: menteeEmail,
      goal: goal,
      preferred_time: preferredTime,
      note: note,
      admin_note: "",
      status: "pending",
      mentor_name_snapshot: snapshot.name,
      mentor_image_snapshot: snapshot.image,
      mentor_focus_snapshot: snapshot.focus,
      created_at: now,
      updated_at: now
    });

    res.status(201).json({
      message: "Yeu cau dang ky hoc da duoc gui thanh cong.",
      request: sanitizeBookingRequest(result[0])
    });
  } catch (error) {
    handleRouteError(res, error, "Khong the gui yeu cau dat lich luc nay.");
  }
}

async function updateBookingRequest(req, res, bookingId) {
  if (!ensureSupabaseConfig(res)) {
    return;
  }

  const body = getBody(req);
  const status = normalizeText(body.status).toLowerCase();
  const adminNote = normalizeText(body.adminNote);
  const isAdmin = getAdminKey(req) === ADMIN_DASHBOARD_PASSWORD;

  if (!bookingId) {
    res.status(400).json({ message: "Ma dang ky hoc khong hop le." });
    return;
  }

  if (!status || !isMentorBookingStatus(status)) {
    res.status(400).json({ message: "Trang thai dang ky hoc khong hop le." });
    return;
  }

  const booking = await getBookingRequestById(bookingId);
  if (!booking) {
    res.status(404).json({ message: "Khong tim thay dang ky hoc voi mentor." });
    return;
  }

  if (!isAdmin) {
    const userContext = await requireAuthenticatedUser(req, res);
    if (!userContext) {
      return;
    }

    const mentorProfile = await resolveMentorProfileForUser(userContext, {
      allowCreate: false
    });
    if (!mentorProfile || mentorProfile.id !== booking.mentor_profile_id) {
      res.status(403).json({ message: "Ban khong co quyen cap nhat dang ky hoc nay." });
      return;
    }
  }

  try {
    const result = await restUpdate(
      "mentor_booking_requests",
      {
        status: status,
        admin_note: isAdmin ? adminNote : normalizeText(booking.admin_note),
        updated_at: new Date().toISOString()
      },
      {
        query: {
          id: toEqualityFilter(bookingId)
        }
      }
    );

    res.json({
      message: "Da cap nhat dang ky hoc voi mentor.",
      request: sanitizeBookingRequest(result[0] || booking),
      mentorProfile: await getResolvedMentorProfileSnapshot(booking.mentor_profile_id)
    });
  } catch (error) {
    handleRouteError(res, error, "Khong the cap nhat dang ky hoc luc nay.");
  }
}

async function createReview(req, res) {
  if (!ensureSupabaseConfig(res)) {
    return;
  }

  const userContext = await requireAuthenticatedUser(req, res);
  if (!userContext) {
    return;
  }

  const body = getBody(req);
  const bookingId = normalizeText(body.bookingId);
  const rating = Number(body.rating);
  const content = normalizeText(body.content);

  if (!bookingId) {
    res.status(400).json({ message: "Khong tim thay buoi hoc de danh gia." });
    return;
  }

  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    res.status(400).json({ message: "So sao danh gia khong hop le." });
    return;
  }

  if (content.length < 8) {
    res.status(400).json({ message: "Hay chia se danh gia chi tiet hon mot chut." });
    return;
  }

  try {
    const booking = await getBookingRequestById(bookingId);
    if (!booking) {
      res.status(404).json({ message: "Khong tim thay buoi hoc de danh gia." });
      return;
    }

    if (
      booking.mentee_user_id !== userContext.authUser.id &&
      normalizeEmail(booking.mentee_email) !== normalizeEmail(userContext.user.email)
    ) {
      res.status(403).json({ message: "Ban khong co quyen danh gia buoi hoc nay." });
      return;
    }

    if (!["accepted", "completed"].includes(booking.status)) {
      res.status(400).json({ message: "Ban chi co the danh gia sau khi mentor da nhan lich." });
      return;
    }

    const existingReview = await getReviewByBookingId(bookingId);
    if (existingReview) {
      res.status(409).json({ message: "Buoi hoc nay da duoc danh gia truoc do." });
      return;
    }

    const now = new Date().toISOString();
    const result = await restInsert("mentor_reviews", {
      booking_request_id: booking.id,
      mentor_profile_id: booking.mentor_profile_id,
      mentee_user_id: userContext.authUser.id,
      author_name: normalizeText(userContext.user.name || booking.mentee_name || "Mentee"),
      author_role: "Mentee Mentor Me",
      rating: Math.round(rating),
      content: content,
      is_published: true,
      created_at: now,
      updated_at: now
    });

    res.status(201).json({
      message: "Da gui danh gia mentor thanh cong.",
      review: sanitizeReview(
        Object.assign({}, result[0], {
          mentor_name: booking.mentor_name_snapshot || booking.mentor_name || ""
        })
      ),
      mentorProfile: await getResolvedMentorProfileSnapshot(booking.mentor_profile_id)
    });
  } catch (error) {
    handleRouteError(res, error, "Khong the gui danh gia mentor luc nay.");
  }
}

async function createMentorProfileUpdate(req, res) {
  if (!ensureSupabaseConfig(res)) {
    return;
  }

  const userContext = await requireAuthenticatedUser(req, res);
  if (!userContext) {
    return;
  }

  const normalizedRole = normalizeRole(userContext.user.role);
  if (!["mentor", "admin"].includes(normalizedRole)) {
    res.status(403).json({ message: "Chi mentor hoac admin moi co the gui cap nhat ho so mentor." });
    return;
  }

  try {
    const mentorProfile = await resolveMentorProfileForUser(userContext, {
      allowCreate: true
    });
    const snapshot = buildMentorProfileSnapshot(getBody(req), mentorProfile);
    const savedDraft = await upsertMentorProfileDraft(
      userContext.authUser.id,
      mentorProfile.id,
      Object.assign({}, snapshot, {
        updatedAt: new Date().toISOString()
      })
    );
    const updateRequest = await upsertMentorProfileUpdateRequest(
      mentorProfile.id,
      userContext.authUser.id,
      snapshot.displayName || userContext.user.name || "Mentor",
      snapshot
    );

    res.status(201).json({
      message: "Ho so mentor da duoc gui ve admin de duyet.",
      draft: savedDraft ? sanitizeMentorDraft(savedDraft) : null,
      request: sanitizeMentorProfileUpdateRequest(updateRequest)
    });
  } catch (error) {
    handleRouteError(res, error, "Khong the gui cap nhat ho so mentor luc nay.");
  }
}

async function updateAdminMentorProfileUpdate(req, res, requestId) {
  if (!ensureSupabaseConfig(res) || !requireAdmin(req, res)) {
    return;
  }

  const body = getBody(req);
  const status = normalizeText(body.status).toLowerCase();
  const adminNote = normalizeText(body.adminNote);

  if (!requestId) {
    res.status(400).json({ message: "Ma yeu cau cap nhat ho so mentor khong hop le." });
    return;
  }

  if (!["pending", "approved", "rejected"].includes(status)) {
    res.status(400).json({ message: "Trang thai duyet ho so mentor khong hop le." });
    return;
  }

  try {
    const existingRequest = await getMentorProfileUpdateById(requestId);

    if (!existingRequest) {
      res.status(404).json({ message: "Khong tim thay yeu cau cap nhat ho so mentor." });
      return;
    }

    let appliedMentorProfile = null;
    if (status === "approved") {
      const mentorProfile = await getMentorProfileById(existingRequest.mentor_profile_id);
      if (!mentorProfile) {
        res.status(404).json({ message: "Khong tim thay ho so mentor can cap nhat." });
        return;
      }

      const snapshot = buildMentorProfileSnapshot(existingRequest.profile_snapshot || {}, mentorProfile);
      const patch = buildMentorProfileRecord(snapshot, {
        id: mentorProfile.id,
        existingRow: mentorProfile,
        ownerUserId: mentorProfile.owner_user_id,
        sourceApplicationId: mentorProfile.source_application_id,
        origin: "mentor_update",
        status: "approved"
      });

      appliedMentorProfile = await updateMentorProfile(mentorProfile.id, patch);
    }

    const result = await restUpdate(
      "mentor_profile_update_requests",
      {
        status: status,
        admin_note: adminNote,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        query: {
          id: toEqualityFilter(requestId)
        }
      }
    );

    res.json({
      message: "Da cap nhat yeu cau chinh sua ho so mentor.",
      request: sanitizeMentorProfileUpdateRequest(result[0] || existingRequest),
      mentorProfile: appliedMentorProfile
        ? await getResolvedMentorProfileSnapshot(appliedMentorProfile.id)
        : null
    });
  } catch (error) {
    handleRouteError(res, error, "Khong the cap nhat yeu cau ho so mentor luc nay.");
  }
}

async function createAdminMentorProfile(req, res) {
  if (!ensureSupabaseConfig(res) || !requireAdmin(req, res)) {
    return;
  }

  const body = getBody(req);
  const name = normalizeText(body.name);

  if (name.length < 2) {
    res.status(400).json({ message: "Ten mentor can co it nhat 2 ky tu." });
    return;
  }

  try {
    const mentorProfileId = await generateUniqueMentorProfileId(name);
    const snapshot = buildMentorProfileSnapshot(
      Object.assign({}, body, {
        name: name,
        displayName: name,
        visibility: "public"
      }),
      null
    );
    const created = await createMentorProfile(
      buildMentorProfileRecord(snapshot, {
        id: mentorProfileId,
        ownerUserId: null,
        sourceApplicationId: null,
        origin: "admin",
        status: "approved"
      })
    );

    res.status(201).json({
      message: "Da tao mentor moi thanh cong.",
      mentorProfile: await getResolvedMentorProfileSnapshot(created.id)
    });
  } catch (error) {
    handleRouteError(res, error, "Khong the tao mentor moi luc nay.");
  }
}

export async function handleApiRequest(req, res) {
  const segments = getRouteSegments(req);
  const routePath = segments.join("/");

  try {
    if (req.method === "GET" && routePath === "business-state") {
      await getBusinessStateRoute(req, res);
      return;
    }

    if (req.method === "POST" && routePath === "consultation-requests") {
      await createConsultationRequest(req, res);
      return;
    }

    if (req.method === "POST" && routePath === "mentor-applications") {
      await createMentorApplication(req, res);
      return;
    }

    if (req.method === "POST" && routePath === "mentor-applications/verify-activation") {
      await verifyMentorActivation(req, res);
      return;
    }

    if (req.method === "POST" && routePath === "mentor-applications/activate") {
      await activateMentorApplication(req, res);
      return;
    }

    if (req.method === "GET" && routePath === "admin/consultation-requests") {
      await getAdminConsultationRequests(req, res);
      return;
    }

    if (req.method === "GET" && routePath === "admin/mentor-applications") {
      await getAdminMentorApplications(req, res);
      return;
    }

    if (
      req.method === "PUT" &&
      segments.length === 3 &&
      segments[0] === "admin" &&
      segments[1] === "consultation-requests"
    ) {
      await updateAdminConsultationRequest(req, res, segments[2]);
      return;
    }

    if (
      req.method === "PUT" &&
      segments.length === 3 &&
      segments[0] === "admin" &&
      segments[1] === "mentor-applications"
    ) {
      await updateAdminMentorApplication(req, res, segments[2]);
      return;
    }

    if (req.method === "POST" && routePath === "booking-requests") {
      await createBookingRequest(req, res);
      return;
    }

    if (
      req.method === "PUT" &&
      segments.length === 2 &&
      segments[0] === "booking-requests"
    ) {
      await updateBookingRequest(req, res, segments[1]);
      return;
    }

    if (req.method === "POST" && routePath === "reviews") {
      await createReview(req, res);
      return;
    }

    if (req.method === "POST" && routePath === "mentor-profile-updates") {
      await createMentorProfileUpdate(req, res);
      return;
    }

    if (
      req.method === "PUT" &&
      segments.length === 3 &&
      segments[0] === "admin" &&
      segments[1] === "mentor-profile-updates"
    ) {
      await updateAdminMentorProfileUpdate(req, res, segments[2]);
      return;
    }

    if (req.method === "POST" && routePath === "admin/mentor-profiles") {
      await createAdminMentorProfile(req, res);
      return;
    }

    res.status(404).json({ message: "Khong tim thay API route phu hop." });
  } catch (error) {
    handleRouteError(res, error, "Khong the xu ly yeu cau luc nay.");
  }
}
