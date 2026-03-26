/**
 * @typedef {Object} MentorMeConfig
 * @property {string=} SUPABASE_URL
 * @property {string=} SUPABASE_ANON_KEY
 */

/**
 * @typedef {Object} SupabaseBrowserGlobal
 * @property {(url: string, key: string) => any} createClient
 */

/**
 * @typedef {Window & {
 *   MENTOR_ME_CONFIG?: MentorMeConfig,
 *   supabase?: SupabaseBrowserGlobal
 * }} MentorMeWindow
 */

/** @type {MentorMeWindow} */
const browserWindow = window;

// ================= MENU MOBILE =================
const hamburger = document.querySelector(".hamburger");
const menu = document.querySelector(".menu");
const CURRENT_USER_STORAGE_KEY = "currentUser";
const MENTOR_PROFILE_STORAGE_KEY = "mentorProfileDrafts";
const BOOKING_REQUESTS_STORAGE_KEY = "mentorBookingRequests";
const APPROVED_MENTOR_PROFILE_STORAGE_KEY = "approvedMentorProfiles";
const PENDING_MENTOR_UPDATE_STORAGE_KEY = "pendingMentorProfileUpdates";
const MENTOR_REVIEW_STORAGE_KEY = "mentorSubmittedReviews";
const REVIEW_MIGRATION_STORAGE_KEY = "mentorReviewMigrationVersion";
const DEMO_ADMIN_ACCESS_CODE = "ADMIN2026";
const DEMO_MENTEE_EMAIL = "dothuytrang2k7@gmail.com";
const DEMO_MENTEE_PASSWORD = "trang2007";
const SEARCH_PAGE_SIZE = 12;
const REAL_MENTOR_DATA_VERSION = "2026-03-26-real-v2";
const REVIEW_CLEANUP_VERSION = "2026-03-26-clear-trang-dung";
let currentSearchPage = 1;
let supabaseClient = null;
let supabaseClientUrl = "";
let supabaseClientKey = "";

function refreshSupabaseClient() {
  const appConfig = browserWindow.MENTOR_ME_CONFIG || {};
  const nextUrl = appConfig.SUPABASE_URL || "";
  const nextKey = appConfig.SUPABASE_ANON_KEY || "";

  if (!browserWindow.supabase || !nextUrl || !nextKey) {
    supabaseClient = null;
    supabaseClientUrl = nextUrl;
    supabaseClientKey = nextKey;
    return null;
  }

  if (!supabaseClient || supabaseClientUrl !== nextUrl || supabaseClientKey !== nextKey) {
    supabaseClient = browserWindow.supabase.createClient(nextUrl, nextKey);
    supabaseClientUrl = nextUrl;
    supabaseClientKey = nextKey;
  }

  return supabaseClient;
}

if (hamburger) {
  hamburger.addEventListener("click", () => {
    menu.classList.toggle("active");
  });
}

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function normalizePhone(phone) {
  return phone.replace(/\D/g, "");
}

function sanitizeSessionUser(user) {
  if (!user) return null;

  const { password, passwordHash, passwordSalt, ...safeUser } = user;
  return safeUser;
}

function isDemoAccount(user) {
  return Boolean(user && user.isDemoAccount);
}

function normalizeRole(role) {
  const normalized = String(role || "").trim().toLowerCase();
  if (normalized === "mentor" || normalized === "admin") return normalized;
  return "mentee";
}

function formatRoleLabel(role) {
  if (role === "mentor") return "Mentor";
  if (role === "admin") return "Ná»™i bá»™";
  return "Mentee";
}

function getRoleHomePath(role) {
  const normalizedRole = normalizeRole(role);
  if (normalizedRole === "admin") return "admin-consultations.html";
  if (normalizedRole === "mentor") return "mentor-dashboard.html";
  return "profile.html";
}

function getRoleSchedulePath(role) {
  const normalizedRole = normalizeRole(role);
  if (normalizedRole === "mentor" || normalizedRole === "admin") return "mentor-mentees.html";
  return "mentee-schedule.html";
}

function getRoleCalendarPath(role) {
  const normalizedRole = normalizeRole(role);
  if (normalizedRole === "mentor" || normalizedRole === "admin") return "mentor-teaching-calendar.html";
  return "mentee-calendar.html";
}

function getRoleGoalLabel(role) {
  const normalizedRole = normalizeRole(role);
  if (normalizedRole === "mentor") return "Äá»‹nh hÆ°á»›ng mentoring";
  if (normalizedRole === "admin") return "Pháº¡m vi ná»™i bá»™";
  return "Má»¥c tiÃªu há»c táº­p";
}

function getRoleGoalPlaceholder(role) {
  const normalizedRole = normalizeRole(role);
  if (normalizedRole === "mentor") {
    return "VÃ­ dá»¥: Muá»‘n hoÃ n thiá»‡n há»“ sÆ¡ mentor, má»Ÿ lá»‹ch nháº­n mentee vÃ  chuáº©n hÃ³a dá»‹ch vá»¥";
  }

  if (normalizedRole === "admin") {
    return "VÃ­ dá»¥: Theo dÃµi váº­n hÃ nh ná»™i bá»™, kiá»ƒm duyá»‡t há»“ sÆ¡ vÃ  xá»­ lÃ½ cÃ¡c yÃªu cáº§u há»‡ thá»‘ng";
  }

  return "VÃ­ dá»¥: Muá»‘n cáº£i thiá»‡n speaking vÃ  tÃ¬m mentor buá»•i tá»‘i";
}

function getRoleBioPlaceholder(role) {
  const normalizedRole = normalizeRole(role);
  if (normalizedRole === "mentor") {
    return "Chia sáº» ngáº¯n vá» phong cÃ¡ch mentoring, Ä‘iá»ƒm máº¡nh chuyÃªn mÃ´n hoáº·c nhÃ³m mentee báº¡n muá»‘n Ä‘á»“ng hÃ nh.";
  }

  if (normalizedRole === "admin") {
    return "Chia sáº» ngáº¯n vá» vai trÃ² ná»™i bá»™ hoáº·c pháº¡m vi phá»¥ trÃ¡ch cá»§a tÃ i khoáº£n nÃ y.";
  }

  return "Chia sáº» ngáº¯n vá» nhu cáº§u há»c táº­p, Ä‘iá»ƒm máº¡nh hoáº·c Ä‘iá»u báº¡n Ä‘ang cáº§n há»— trá»£.";
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
    sang: "Buá»•i sÃ¡ng",
    chieu: "Buá»•i chiá»u",
    toi: "Buá»•i tá»‘i",
    "cuoi-tuan": "Cuá»‘i tuáº§n"
  };
  const list = (availability || []).map(function (item) {
    return labels[item];
  }).filter(Boolean);
  return list.length ? list.join(", ") : "Linh hoáº¡t theo lá»‹ch háº¹n";
}

function buildMentorServiceText(services) {
  const labels = {
    "1-1": "Mentor 1 kÃ¨m 1",
    group: "mentor theo nhÃ³m",
    roadmap: "tÆ° váº¥n lá»™ trÃ¬nh",
    competition: "luyá»‡n thi/cuá»™c thi"
  };
  const list = (services || []).map(function (item) {
    return labels[item];
  }).filter(Boolean);
  return list.length ? list.join(", ") : "Mentor 1 kÃ¨m 1";
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

function buildUniqueMentorId(name) {
  const baseId = slugifyText(name) || "mentor";
  const approvedStore = getApprovedMentorProfiles();
  const existingIds = new Set(Object.keys(mentorData).concat(Object.keys(approvedStore)));
  if (!existingIds.has(baseId)) return baseId;
  let index = 2;
  while (existingIds.has(baseId + "-" + index)) {
    index += 1;
  }
  return baseId + "-" + index;
}

function getMentorContextForUser(user) {
  const normalizedRole = normalizeRole(user && user.role);
  if (!["mentor", "admin"].includes(normalizedRole)) {
    return {
      mentorId: "",
      mentorName: ""
    };
  }

  const approvedStore = getApprovedMentorProfiles();
  if (user && user.mentorProfileId) {
    const linkedMentor = approvedStore[user.mentorProfileId] || mentorData[user.mentorProfileId] || null;
    return {
      mentorId: user.mentorProfileId,
      mentorName: (linkedMentor && linkedMentor.name) || user.name || "Mentor"
    };
  }

  const savedProfile = getMentorProfileByUserId(user.id) || {};
  const possibleNames = [savedProfile.displayName, user.name]
    .map(slugifyText)
    .filter(Boolean);
  const mentorEntry = getResolvedMentorList().find(function (mentor) {
    const mentorSlug = slugifyText(mentor.name);
    return possibleNames.some(function (nameSlug) {
      return mentorSlug === nameSlug || mentorSlug.includes(nameSlug) || nameSlug.includes(mentorSlug);
    });
  });

  if (mentorEntry) {
    return {
      mentorId: mentorEntry.id,
      mentorName: mentorEntry.name
    };
  }

  return {
    mentorId: "",
    mentorName: savedProfile.displayName || user.name || "Mentor"
  };
}

function createDemoSessionUser(accessCode) {
  if (normalizeEmail(accessCode) === DEMO_MENTEE_EMAIL) {
    return {
      id: "demo-mentee-do-thuy-trang",
      name: "Äá»— ThÃ¹y Trang",
      email: DEMO_MENTEE_EMAIL,
      phone: "",
      goal: "Muá»‘n há»c VÄƒn buá»•i tá»‘i Ä‘á»ƒ cáº£i thiá»‡n cÃ¡ch phÃ¢n tÃ­ch vÃ  viáº¿t bÃ i cháº¯c Ã½ hÆ¡n.",
      bio: "TÃ i khoáº£n mentee giáº£ láº­p Ä‘á»ƒ kiá»ƒm thá»­ luá»“ng Ä‘Äƒng kÃ½ há»c vá»›i mentor.",
      role: "mentee",
      avatar: createAvatarFallback("Äá»— ThÃ¹y Trang"),
      createdAt: new Date().toISOString(),
      isDemoAccount: true
    };
  }

  if (accessCode === DEMO_ADMIN_ACCESS_CODE) {
    return {
      id: "demo-admin",
      name: "Admin Mentor Me",
      email: "mentorme.vn@gmail.com",
      phone: "",
      goal: "Quáº£n lÃ½ lead tÆ° váº¥n, duyá»‡t mentor vÃ  váº­n hÃ nh há»‡ thá»‘ng",
      bio: "TÃ i khoáº£n admin dÃ¹ng Ä‘á»ƒ kiá»ƒm thá»­ luá»“ng quáº£n trá»‹ ná»™i bá»™.",
      role: "admin",
      avatar: createAvatarFallback("Admin Mentor Me"),
      createdAt: new Date().toISOString(),
      isDemoAccount: true
    };
  }

  return null;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "HÃ´m nay";

  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

function createAvatarFallback(name) {
  const initials = (name || "MM")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(function (part) {
      return part.charAt(0).toUpperCase();
    })
    .join("");

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
      <rect width="160" height="160" rx="80" fill="#dceeff"></rect>
      <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="Montserrat, Arial, sans-serif" font-size="54" font-weight="700" fill="#1b4fa3">${initials}</text>
    </svg>
  `;

  return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
}

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem(CURRENT_USER_STORAGE_KEY));
  } catch (error) {
    return null;
  }
}

function getMentorProfileStore() {
  try {
    return JSON.parse(localStorage.getItem(MENTOR_PROFILE_STORAGE_KEY)) || {};
  } catch (error) {
    return {};
  }
}

function getMentorProfileByUserId(userId) {
  if (!userId) return null;
  const store = getMentorProfileStore();
  return store[userId] || null;
}

function saveMentorProfileByUserId(userId, payload) {
  if (!userId) return;
  const store = getMentorProfileStore();
  store[userId] = payload;
  localStorage.setItem(MENTOR_PROFILE_STORAGE_KEY, JSON.stringify(store));
}

function getBookingRequests() {
  try {
    return JSON.parse(localStorage.getItem(BOOKING_REQUESTS_STORAGE_KEY)) || [];
  } catch (error) {
    return [];
  }
}

function saveBookingRequests(requests) {
  localStorage.setItem(BOOKING_REQUESTS_STORAGE_KEY, JSON.stringify(requests));
}

function getMentorSubmittedReviews() {
  try {
    return JSON.parse(localStorage.getItem(MENTOR_REVIEW_STORAGE_KEY)) || [];
  } catch (error) {
    return [];
  }
}

function saveMentorSubmittedReviews(reviews) {
  localStorage.setItem(MENTOR_REVIEW_STORAGE_KEY, JSON.stringify(reviews));
}

function getSubmittedReviewByBookingId(bookingId) {
  return getMentorSubmittedReviews().find(function (review) {
    return review.bookingId === bookingId;
  }) || null;
}

function saveSubmittedReview(review) {
  const reviews = getMentorSubmittedReviews();
  const nextReviews = reviews.filter(function (item) {
    return item.bookingId !== review.bookingId;
  });
  nextReviews.unshift(review);
  saveMentorSubmittedReviews(nextReviews);
}

function syncSubmittedReviewsWithCurrentData() {
  const savedVersion = localStorage.getItem(REVIEW_MIGRATION_STORAGE_KEY);
  if (savedVersion === REVIEW_CLEANUP_VERSION) {
    return;
  }

  const cleanedReviews = getMentorSubmittedReviews().filter(function (review) {
    return !["tien-dung", "thuy-trang"].includes(review.mentorId);
  });

  saveMentorSubmittedReviews(cleanedReviews);
  localStorage.setItem(REVIEW_MIGRATION_STORAGE_KEY, REVIEW_CLEANUP_VERSION);
}

function addBookingRequest(request) {
  const requests = getBookingRequests();
  requests.unshift(request);
  saveBookingRequests(requests);
}

function ensureDemoBookingRequests() {
  const demoMentor = mentorData["tien-dung"];
  if (!demoMentor) return;

  const requests = getBookingRequests();
  const existingDemoRequest = requests.some(function (request) {
    return request.id === "booking-demo-do-thuy-trang-tien-dung";
  });

  if (existingDemoRequest) return;

  requests.unshift({
    id: "booking-demo-do-thuy-trang-tien-dung",
    mentorId: demoMentor.id,
    mentorName: demoMentor.name,
    mentorImage: demoMentor.image,
    mentorFocus: demoMentor.focus,
    menteeUserId: "demo-mentee-do-thuy-trang",
    menteeName: "Äá»— ThÃ¹y Trang",
    menteeEmail: DEMO_MENTEE_EMAIL,
    goal: "Muá»‘n há»c VÄƒn vÃ o tá»‘i thá»© 4 Ä‘á»ƒ cáº£i thiá»‡n cÃ¡ch phÃ¢n tÃ­ch vÃ  viáº¿t bÃ i máº¡ch láº¡c hÆ¡n.",
    preferredTime: "Tá»‘i thá»© 4",
    note: "Em muá»‘n Ä‘Äƒng kÃ½ mentor Nguyá»…n Tiáº¿n DÅ©ng vÃ  cáº§n ngÆ°á»i theo sÃ¡t pháº§n VÄƒn, nháº¥t lÃ  phÃ¢n tÃ­ch vÃ  lÃªn Ã½.",
    adminNote: "Lead demo Ä‘á»ƒ kiá»ƒm thá»­ luá»“ng admin - mentor - mentee.",
    status: "pending",
    createdAt: "2026-03-26T07:00:00.000Z",
    updatedAt: "2026-03-26T07:00:00.000Z"
  });

  saveBookingRequests(requests);
}

function updateBookingRequest(requestId, updates) {
  const requests = getBookingRequests().map(function (request) {
    if (request.id !== requestId) return request;
    return Object.assign({}, request, updates, {
      updatedAt: new Date().toISOString()
    });
  });

  saveBookingRequests(requests);
  return requests.find(function (request) {
    return request.id === requestId;
  }) || null;
}

function getApprovedMentorProfiles() {
  try {
    return JSON.parse(localStorage.getItem(APPROVED_MENTOR_PROFILE_STORAGE_KEY)) || {};
  } catch (error) {
    return {};
  }
}

function saveApprovedMentorProfiles(store) {
  localStorage.setItem(APPROVED_MENTOR_PROFILE_STORAGE_KEY, JSON.stringify(store));
}

function syncApprovedMentorProfilesWithRealData() {
  const store = getApprovedMentorProfiles();
  let changed = false;

  Object.keys(store).forEach(function (mentorId) {
    const profile = store[mentorId] || {};
    if (!mentorData[mentorId] && profile._origin !== "admin") {
      delete store[mentorId];
      changed = true;
    }
  });

  Object.keys(mentorData).forEach(function (mentorId) {
    const currentProfile = store[mentorId] || {};
    if (currentProfile._seedVersion === REAL_MENTOR_DATA_VERSION) {
      return;
    }

    store[mentorId] = Object.assign({}, mentorData[mentorId], {
      _seedVersion: REAL_MENTOR_DATA_VERSION
    });
    changed = true;
  });

  if (changed) {
    saveApprovedMentorProfiles(store);
  }
}

function getPendingMentorProfileUpdates() {
  try {
    return JSON.parse(localStorage.getItem(PENDING_MENTOR_UPDATE_STORAGE_KEY)) || [];
  } catch (error) {
    return [];
  }
}

function savePendingMentorProfileUpdates(requests) {
  localStorage.setItem(PENDING_MENTOR_UPDATE_STORAGE_KEY, JSON.stringify(requests));
}

function upsertPendingMentorProfileUpdate(request) {
  const requests = getPendingMentorProfileUpdates();
  const existingIndex = requests.findIndex(function (item) {
    return item.mentorId === request.mentorId && item.status === "pending";
  });

  if (existingIndex >= 0) {
    requests[existingIndex] = Object.assign({}, requests[existingIndex], request);
  } else {
    requests.unshift(request);
  }

  savePendingMentorProfileUpdates(requests);
}

function updatePendingMentorProfileUpdate(requestId, updates) {
  const requests = getPendingMentorProfileUpdates().map(function (request) {
    if (request.id !== requestId) return request;
    return Object.assign({}, request, updates, {
      updatedAt: new Date().toISOString()
    });
  });

  savePendingMentorProfileUpdates(requests);
  return requests.find(function (request) {
    return request.id === requestId;
  }) || null;
}

function saveCurrentUser(user) {
  localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(sanitizeSessionUser(user)));
}

function saveAuthSession(user) {
  saveCurrentUser(user);
  renderAuthArea(user);
}

function clearAuthSession() {
  localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
  renderAuthArea(null);
}

async function buildApiHeaders(options = {}) {
  const headers = Object.assign({}, options.headers || {});
  const adminKey = options.adminKey || "";

  if (adminKey) {
    headers["X-Admin-Key"] = adminKey;
  }

  if (!options.skipAuth && !isDemoAccount(getCurrentUser()) && isSupabaseReady()) {
    try {
      const session = await getSupabaseSession();
      if (session && session.access_token) {
        headers.Authorization = "Bearer " + session.access_token;
      }
    } catch (error) {
      // Ignore session lookup failures and continue with public/admin headers.
    }
  }

  if (options.json !== false && options.body !== undefined && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  return headers;
}

async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    method: options.method || "GET",
    headers: await buildApiHeaders({
      headers: options.headers,
      adminKey: options.adminKey,
      body: options.body,
      skipAuth: options.skipAuth
    }),
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined
  });

  const data = await response.json().catch(function () {
    return {};
  });

  if (!response.ok) {
    throw new Error(data.message || options.errorMessage || "Khong the xu ly yeu cau luc nay.");
  }

  return data;
}

function saveBusinessStateToStorage(state) {
  if (state.approvedMentorProfiles) {
    saveApprovedMentorProfiles(state.approvedMentorProfiles);
  }

  if (state.mentorSubmittedReviews) {
    saveMentorSubmittedReviews(state.mentorSubmittedReviews);
  }

  if (state.mentorBookingRequests) {
    saveBookingRequests(state.mentorBookingRequests);
  }

  if (state.pendingMentorProfileUpdates) {
    savePendingMentorProfileUpdates(state.pendingMentorProfileUpdates);
  }

  if (state.mentorProfileDrafts) {
    localStorage.setItem(MENTOR_PROFILE_STORAGE_KEY, JSON.stringify(state.mentorProfileDrafts));
  }
}

function mergeMentorProfileIntoStore(mentorProfile) {
  if (!mentorProfile || !mentorProfile.id) return;
  const store = getApprovedMentorProfiles();
  store[mentorProfile.id] = mentorProfile;
  saveApprovedMentorProfiles(store);
}

function replaceBookingRequestInStore(request) {
  if (!request || !request.id) return null;
  const nextRequests = getBookingRequests().filter(function (item) {
    return item.id !== request.id;
  });
  nextRequests.unshift(request);
  saveBookingRequests(nextRequests);
  return request;
}

function replaceMentorProfileUpdateInStore(request) {
  if (!request || !request.id) return null;
  const nextRequests = getPendingMentorProfileUpdates().filter(function (item) {
    return item.id !== request.id;
  });
  nextRequests.unshift(request);
  savePendingMentorProfileUpdates(nextRequests);
  return request;
}

async function syncBusinessStateFromServer(options = {}) {
  const state = await apiRequest("/api/business-state", {
    adminKey: options.adminKey,
    errorMessage: "Khong the dong bo du lieu he thong luc nay."
  });

  saveBusinessStateToStorage(state);
  return state;
}

function showMessage(elementId, type, message) {
  const element = document.getElementById(elementId);
  if (!element) return;

  element.hidden = false;
  element.className = "auth-message " + type;
  element.textContent = message;
}

function clearMessage(elementId) {
  const element = document.getElementById(elementId);
  if (!element) return;

  element.hidden = true;
  element.className = "auth-message";
  element.textContent = "";
}

function normalizeWhitespace(value) {
  return String(value || "").trim();
}

function collectCheckedValues(form, name) {
  return Array.from(form.querySelectorAll('input[name="' + name + '"]:checked'))
    .map(function (input) {
      return input.value;
    });
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isSupabaseReady() {
  return Boolean(refreshSupabaseClient() && supabaseClientUrl && supabaseClientKey);
}

function ensureSupabaseReady(messageElementId) {
  if (isSupabaseReady()) return true;

  if (messageElementId) {
    showMessage(
      messageElementId,
      "error",
      "Cáº¥u hÃ¬nh Supabase chÆ°a sáºµn sÃ ng. HÃ£y kiá»ƒm tra láº¡i SUPABASE_URL vÃ  SUPABASE_ANON_KEY trÆ°á»›c khi sá»­ dá»¥ng tÃ­nh nÄƒng nÃ y."
    );
  }

  return false;
}

async function getSupabaseSession() {
  if (!isSupabaseReady()) return null;

  const { data } = await supabaseClient.auth.getSession();
  return data.session || null;
}

async function getSupabaseAuthUser() {
  if (!isSupabaseReady()) return null;

  const { data } = await supabaseClient.auth.getUser();
  return data.user || null;
}

async function getProfileByUserId(userId) {
  if (!isSupabaseReady() || !userId) return null;

  const { data, error } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "KhÃ´ng thá»ƒ táº£i há»“ sÆ¡ tá»« Supabase.");
  }

  return data;
}

async function upsertProfile(profile) {
  let existingProfile = null;

  try {
    existingProfile = profile && profile.id ? await getProfileByUserId(profile.id) : null;
  } catch (error) {
    existingProfile = null;
  }

  const payload = Object.assign({}, existingProfile || {}, profile);
  const { data, error } = await supabaseClient
    .from("profiles")
    .upsert(payload, { onConflict: "id" })
    .select()
    .single();

  if (error) {
    throw new Error(error.message || "KhÃƒÂ´ng thÃ¡Â»Æ’ cÃ¡ÂºÂ­p nhÃ¡ÂºÂ­t hÃ¡Â»â€œ sÃ†Â¡.");
  }

  return data;
}

function buildSessionUser(authUser, profile) {
  const profileData = profile || {};
  const role = normalizeRole(profileData.role || authUser.user_metadata?.role);
  return {
    id: authUser.id,
    name: profileData.full_name || authUser.user_metadata?.full_name || authUser.email?.split("@")[0] || "Mentor Me User",
    email: authUser.email || "",
    phone: profileData.phone || "",
    goal: profileData.goal || "",
    bio: profileData.bio || "",
    role: role,
    avatar: profileData.avatar_url || createAvatarFallback(profileData.full_name || authUser.email || "MM"),
    mentorProfileId: profileData.mentor_profile_id || "",
    createdAt: profileData.created_at || authUser.created_at || new Date().toISOString()
  };
}

async function loadCurrentUserFromSupabase() {
  const existingUser = getCurrentUser();
  if (isDemoAccount(existingUser)) {
    saveAuthSession(existingUser);
    return existingUser;
  }

  if (!isSupabaseReady()) return null;

  const authUser = await getSupabaseAuthUser();
  if (!authUser) {
    clearAuthSession();
    return null;
  }

  let profile = null;
  try {
    profile = await getProfileByUserId(authUser.id);
  } catch (error) {
    profile = null;
  }

  const sessionUser = buildSessionUser(authUser, profile);
  saveAuthSession(sessionUser);
  return sessionUser;
}

function togglePasswordVisibility(button) {
  const targetId = button.getAttribute("data-toggle-password");
  const input = document.getElementById(targetId);

  if (!input) return;

  const isPassword = input.type === "password";
  input.type = isPassword ? "text" : "password";
  button.textContent = isPassword ? "áº¨n" : "Hiá»‡n";
}

function initializePasswordToggles() {
  document.querySelectorAll(".password-toggle").forEach(function (button) {
    button.addEventListener("click", function () {
      togglePasswordVisibility(button);
    });
    button.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        togglePasswordVisibility(button);
      }
    });
  });
}

// ================= LOGIN STATE =================
const authArea = document.getElementById("authArea");
function renderAuthArea(user) {
  if (!authArea) return;

  if (!user) {
    authArea.innerHTML = `
      <a href="login.html">ÄÄƒng nháº­p</a>
      <a href="register.html" class="btn-register">ÄÄƒng kÃ½</a>
    `;
    return;
  }

  const normalizedRole = normalizeRole(user.role);
  let dropdownLinks = "";

  if (normalizedRole === "mentor") {
    dropdownLinks = `
      <a href="profile.html">Há»“ sÆ¡ tÃ i khoáº£n</a>
      <a href="mentor-dashboard.html">Há»“ sÆ¡ mentor</a>
      <a href="mentee-schedule.html">Lá»‹ch há»c</a>
      <a href="mentor-accepted.html">Mentee Ä‘Ã£ nháº­n</a>
      <a href="mentor-teaching-calendar.html">Lá»‹ch dáº¡y</a>
      <a href="mentor-requests.html">Mentee muá»‘n Ä‘Äƒng kÃ½</a>
    `;
  } else if (normalizedRole === "admin") {
    dropdownLinks = `
      <a href="profile.html">Há»“ sÆ¡ ná»™i bá»™</a>
      <a href="admin-consultations.html">Quáº£n trá»‹ ná»™i bá»™</a>
      <a href="mentor-dashboard.html">Há»“ sÆ¡ mentor</a>
      <a href="mentor-teaching-calendar.html">Lá»‹ch dáº¡y</a>
    `;
  } else {
    dropdownLinks = `
      <a href="profile.html">Há»“ sÆ¡ mentee</a>
      <a href="mentee-schedule.html">Lá»‹ch há»c</a>
    `;
  }

  authArea.innerHTML = `
    <div class="user-menu">
      <img src="${user.avatar || createAvatarFallback(user.name)}" class="avatar">
      <span>${user.name}</span>

      <div class="dropdown">
        ${dropdownLinks}
        <a href="#" id="logoutBtn">ÄÄƒng xuáº¥t</a>
      </div>
    </div>
  `;
}

renderAuthArea(getCurrentUser());

// ================= DROPDOWN CLICK =================
document.addEventListener("click", function (e) {
  const menu = document.querySelector(".user-menu");

  if (!menu) return;

  if (menu.contains(e.target)) {
    menu.classList.toggle("active");
  } else {
    menu.classList.remove("active");
  }
});

// ================= LOGOUT =================
document.addEventListener("click", async function (e) {
  if (e.target.id === "logoutBtn") {
    try {
      if (isSupabaseReady()) {
        await supabaseClient.auth.signOut();
      }
    } catch (error) {
      // Ignore sign-out errors and clear local session anyway.
    }
    clearAuthSession();
    location.reload();
  }
});

document.addEventListener("click", function(e) {
  const userMenu = document.querySelector(".user-menu");
  if (!userMenu) return;

  const dropdown = userMenu.querySelector(".dropdown");

  // Náº¿u click Ä‘Ãºng vÃ o avatar hoáº·c tÃªn â†’ toggle
  if (e.target.closest(".user-menu > img") || e.target.closest(".user-menu > span")) {
    dropdown.style.display =
      dropdown.style.display === "flex" ? "none" : "flex";
  }

  // Náº¿u click ra ngoÃ i â†’ Ä‘Ã³ng
  else if (!e.target.closest(".user-menu")) {
    dropdown.style.display = "none";
  }
});

function goSearch() {
  const searchInput = document.querySelector(".search-box input");
  if (!searchInput) return;

  const keyword = searchInput.value.trim();

  if (window.location.pathname.endsWith("search.html")) {
    filterMentors();
    return;
  }

  const targetUrl = keyword
    ? "search.html?q=" + encodeURIComponent(keyword)
    : "search.html";

  window.location.href = targetUrl;
}

const searchButton = document.querySelector(".search-box button");
const searchInput = document.querySelector(".search-box input");

if (searchButton) {
  searchButton.addEventListener("click", goSearch);
}

if (searchInput) {
  searchInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      goSearch();
    }
  });
}

const mentorData = {
  "tra-my": {
    id: "tra-my",
    name: "BÃ™I VÅ¨ TRÃ€ MY",
    image: "mentorbuivutramy.jpg",
    workplace: "Konkuk University - Top 12 Äáº¡i há»c HÃ n Quá»‘c",
    tag: "Mentor ngoáº¡i ngá»¯ vÃ  Ä‘á»‹nh hÆ°á»›ng",
    role: "Mentor tiáº¿ng Trung, ngoáº¡i ngá»¯, Ä‘á»‹nh hÆ°á»›ng nghá» nghiá»‡p vÃ  ká»¹ nÄƒng má»m",
    bio: "BÃ¹i VÅ© TrÃ  My lÃ  du há»c sinh táº¡i HÃ n Quá»‘c, cÃ³ ná»n táº£ng hoáº¡t Ä‘á»™ng ngoáº¡i khÃ³a máº¡nh vÃ  phÃ¹ há»£p vá»›i mentee cáº§n Ä‘á»“ng hÃ nh á»Ÿ máº£ng ngoáº¡i ngá»¯, Ä‘á»‹nh hÆ°á»›ng vÃ  ká»¹ nÄƒng má»m.",
    focus: "Tiáº¿ng Trung, ngoáº¡i ngá»¯, Ä‘á»‹nh hÆ°á»›ng nghá» nghiá»‡p, ká»¹ nÄƒng má»m",
    field: "trung",
    availability: ["sang", "chieu", "toi", "cuoi-tuan"],
    availabilityText: "Linh hoáº¡t theo lá»‹ch háº¹n",
    service: ["1-1", "group", "roadmap"],
    serviceText: "Mentor 1 kÃ¨m 1, mentor theo nhÃ³m, tÆ° váº¥n lá»™ trÃ¬nh",
    achievements: [
      "Äang lÃ  du há»c sinh Viá»‡n tiáº¿ng, Äáº¡i há»c Konkuk táº¡i HÃ n Quá»‘c.",
      "PhÃ³ Chá»§ nhiá»‡m CLB Äá»‹nh hÆ°á»›ng vÃ  PhÃ¡t triá»ƒn Khá»Ÿi nghiá»‡p ThÃ nh phá»‘ Cáº©m Pháº£ nhiá»‡m ká»³ 2024.",
      "Äá»“ng TrÆ°á»Ÿng ban tá»• chá»©c sá»± kiá»‡n gÃ¢y quá»¹ thiá»‡n nguyá»‡n \"Máº§m\" 2024 vÃ  tham gia nhiá»u dá»± Ã¡n truyá»n thÃ´ng, hÆ°á»›ng nghiá»‡p táº¡i Quáº£ng Ninh.",
      "HoÃ n thÃ nh cÃ¡c khÃ³a Ä‘Ã o táº¡o vÃ  chá»©ng nháº­n chuyÃªn mÃ´n tá»« WHO cÃ¹ng khÃ³a Ä‘Ã o táº¡o giÃ¡o viÃªn tiáº¿ng Trung ngáº¯n háº¡n."
    ],
    fit: "PhÃ¹ há»£p vá»›i há»c sinh, sinh viÃªn cáº§n Ä‘á»“ng hÃ nh vá» ngoáº¡i ngá»¯, Ä‘á»‹nh hÆ°á»›ng nghá» nghiá»‡p, hoáº¡t Ä‘á»™ng ngoáº¡i khÃ³a hoáº·c muá»‘n há»c cÃ¹ng má»™t mentor giÃ u tráº£i nghiá»‡m thá»±c táº¿.",
    searchableText: "tra my tieng trung ngoai ngu hsk du hoc han quoc dinh huong nghe nghiep ky nang mem hoat dong ngoai khoa truyen thong huong nghiep"
  },
  "tien-dung": {
    id: "tien-dung",
    name: "NGUYá»„N TIáº¾N DÅ¨NG",
    image: "mentor2.jpg",
    workplace: "Há»c viá»‡n BÃ¡o chÃ­ vÃ  TuyÃªn truyá»n - ChuyÃªn ngÃ nh Truyá»n thÃ´ng chÃ­nh sÃ¡ch",
    tag: "Mentor Ngá»¯ vÄƒn, truyá»n thÃ´ng vÃ  há»“ sÆ¡",
    role: "Mentor Ngá»¯ vÄƒn, truyá»n thÃ´ng, thuyáº¿t trÃ¬nh vÃ  hoáº¡t Ä‘á»™ng ngoáº¡i khÃ³a",
    bio: "Nguyá»…n Tiáº¿n DÅ©ng hiá»‡n theo há»c chuyÃªn ngÃ nh Truyá»n thÃ´ng chÃ­nh sÃ¡ch táº¡i Há»c viá»‡n BÃ¡o chÃ­ vÃ  TuyÃªn truyá»n, cÃ³ ná»n táº£ng há»c thuáº­t máº¡nh á»Ÿ mÃ´n Ngá»¯ vÄƒn vÃ  nhiá»u tráº£i nghiá»‡m thá»±c táº¿ trong truyá»n thÃ´ng, tá»• chá»©c hoáº¡t Ä‘á»™ng há»c sinh.",
    focus: "Ngá»¯ vÄƒn, truyá»n thÃ´ng, thuyáº¿t trÃ¬nh, hoáº¡t Ä‘á»™ng ngoáº¡i khÃ³a",
    field: "van",
    availability: ["sang", "chieu", "toi", "cuoi-tuan"],
    availabilityText: "Linh hoáº¡t theo lá»‹ch háº¹n",
    service: ["1-1", "group", "roadmap", "competition"],
    serviceText: "Mentor 1 kÃ¨m 1, mentor theo nhÃ³m, tÆ° váº¥n Ä‘á»‹nh hÆ°á»›ng, Ä‘á»“ng hÃ nh hoáº¡t Ä‘á»™ng vÃ  cuá»™c thi",
    achievements: [
      "Há»c sinh giá»i Tá»‰nh mÃ´n Ngá»¯ vÄƒn cáº¥p THPT nÄƒm há»c 2023 - 2024 vÃ  2024 - 2025, cÃ¹ng danh hiá»‡u Há»c sinh giá»i ThÃ nh phá»‘ mÃ´n Ngá»¯ vÄƒn cáº¥p THCS nÄƒm há»c 2021 - 2022.",
      "Giáº£i Nháº¥t thuyáº¿t trÃ¬nh NgÃ y há»™i VÄƒn hÃ³a Äá»c nÄƒm há»c 2024 - 2025.",
      "Giáº£i NhÃ¬ cuá»™c thi SÃ¡ng kiáº¿n phÃ²ng, chá»‘ng báº¡o lá»±c há»c Ä‘Æ°á»ng nÄƒm há»c 2024 - 2025.",
      "ThÃ nh viÃªn ACC - CÃ¢u láº¡c bá»™ truyá»n thÃ´ng Há»c viá»‡n BÃ¡o chÃ­ vÃ  TuyÃªn truyá»n, thÃ nh viÃªn Äá»™i BÃ¡o chÃ­ - Truyá»n thÃ´ng Spotlight 2025 vÃ  TrÆ°á»Ÿng ban Ná»™i dung HS14 nÄƒm 2023 - 2024."
    ],
    fit: "PhÃ¹ há»£p vá»›i há»c sinh cáº§n há»c tá»‘t mÃ´n VÄƒn, muá»‘n cáº£i thiá»‡n ká»¹ nÄƒng thuyáº¿t trÃ¬nh, tham gia hoáº¡t Ä‘á»™ng ngoáº¡i khÃ³a, lÃ m truyá»n thÃ´ng há»c Ä‘Æ°á»ng hoáº·c xÃ¢y dá»±ng há»“ sÆ¡ cÃ¡ nhÃ¢n chá»‰n chu hÆ¡n.",
    searchableText: "nguyen tien dung ngu van van hoc truyen thong thuyet trinh ky nang mem hoat dong ngoai khoa hoc vien bao chi truyen thong chinh sach spotlight hs14 ho so"
  },
  "thuy-trang": {
    id: "thuy-trang",
    name: "Äá»– THÃ™Y TRANG",
    image: "mentor3.jpg",
    workplace: "TrÆ°á»ng Äáº¡i há»c Kinh táº¿ - Äáº¡i há»c Quá»‘c gia HÃ  Ná»™i",
    tag: "Mentor Ä‘á»‹nh hÆ°á»›ng vÃ  ká»¹ nÄƒng má»m",
    role: "Mentor Ä‘á»‹nh hÆ°á»›ng nghá» nghiá»‡p, ká»¹ nÄƒng má»m vÃ  hoáº¡t Ä‘á»™ng ngoáº¡i khÃ³a",
    bio: "Äá»— ThÃ¹y Trang ná»•i báº­t á»Ÿ hoáº¡t Ä‘á»™ng ÄoÃ n - Há»™i, tá»• chá»©c sá»± kiá»‡n, khá»Ÿi nghiá»‡p vÃ  Ä‘á»‹nh hÆ°á»›ng phÃ¡t triá»ƒn cÃ¡ nhÃ¢n cho há»c sinh, sinh viÃªn.",
    focus: "Äá»‹nh hÆ°á»›ng nghá» nghiá»‡p, ká»¹ nÄƒng má»m, hoáº¡t Ä‘á»™ng ngoáº¡i khÃ³a",
    field: "ky-nang",
    availability: ["sang", "chieu", "toi", "cuoi-tuan"],
    availabilityText: "Linh hoáº¡t theo lá»‹ch háº¹n",
    service: ["1-1", "group", "roadmap", "competition"],
    serviceText: "Mentor 1 kÃ¨m 1, mentor theo nhÃ³m, tÆ° váº¥n Ä‘á»‹nh hÆ°á»›ng, Ä‘á»“ng hÃ nh hoáº¡t Ä‘á»™ng",
    achievements: [
      "Chá»§ nhiá»‡m CLB Äá»‹nh hÆ°á»›ng vÃ  PhÃ¡t triá»ƒn khá»Ÿi nghiá»‡p thÃ nh phá»‘ Cáº©m Pháº£ nhiá»‡m ká»³ 2024 vÃ  2024 - 2025.",
      "á»¦y viÃªn á»¦y ban Há»™i LHTN Viá»‡t Nam thÃ nh phá»‘ Cáº©m Pháº£ khÃ³a V, nhiá»‡m ká»³ 2024 - 2029 vÃ  Ä‘áº¡i biá»ƒu tham dá»± Äáº¡i há»™i Äáº¡i biá»ƒu Há»™i LHTN Viá»‡t Nam tá»‰nh Quáº£ng Ninh láº§n thá»© VII.",
      "TrÆ°á»Ÿng ban tá»• chá»©c cÃ¡c mÃ¹a sá»± kiá»‡n gÃ¢y quá»¹ thiá»‡n nguyá»‡n \"Máº§m\" vÃ  sá»± kiá»‡n hÆ°á»›ng nghiá»‡p cho hÆ¡n 200 há»c sinh THPT táº¡i thÃ nh phá»‘ Cáº©m Pháº£.",
      "Äáº¡t nhiá»u giáº¥y khen, báº±ng khen cáº¥p thÃ nh phá»‘, tá»‰nh vÃ  Trung Æ°Æ¡ng ÄoÃ n vá» cÃ´ng tÃ¡c ÄoÃ n - Há»™i, khá»Ÿi nghiá»‡p vÃ  dá»± Ã¡n cá»™ng Ä‘á»“ng."
    ],
    fit: "PhÃ¹ há»£p vá»›i mentee muá»‘n Ä‘Æ°á»£c Ä‘á»‹nh hÆ°á»›ng nghá» nghiá»‡p, phÃ¡t triá»ƒn ká»¹ nÄƒng má»m, xÃ¢y há»“ sÆ¡ hoáº¡t Ä‘á»™ng, tá»• chá»©c dá»± Ã¡n vÃ  nÃ¢ng cao sá»± tá»± tin khi tham gia cá»™ng Ä‘á»“ng.",
    searchableText: "do thuy trang dinh huong nghe nghiep ky nang mem hoat dong ngoai khoa khoi nghiep to chuc su kien doan hoi kinh te quoc gia"
  }
};

const mentorExperienceData = {
  "tra-my": {
    rating: 0,
    studentsTaught: 0,
    reviews: []
  },
  "tien-dung": {
    rating: 0,
    studentsTaught: 0,
    reviews: []
  },
  "thuy-trang": {
    rating: 0,
    studentsTaught: 0,
    reviews: []
  }
};

const querySynonyms = [
  { phrases: ["em yeu speaking", "yeu speaking", "ngai noi", "so noi tieng anh"], tags: ["speaking", "giao tiep", "tieng anh", "ielts"] },
  { phrases: ["muon tang band", "tang band", "can len band"], tags: ["ielts", "writing", "speaking", "luyen thi"] },
  { phrases: ["mentor nhe nhang", "nhe nhang", "de tam su"], tags: ["mentor nhe nhang", "theo sat", "coaching"] },
  { phrases: ["can nguoi theo sat", "theo sat", "kem sat"], tags: ["theo sat", "1 kem 1", "roadmap"] },
  { phrases: ["mat goc", "moi bat dau", "nguoi moi"], tags: ["mat goc", "co ban", "giai thich ky"] },
  { phrases: ["luyen thi", "on thi", "thi cu"], tags: ["luyen thi", "competition"] },
  { phrases: ["lap trinh web", "hoc code", "coding"], tags: ["lap trinh", "web", "project"] }
];

let summaryTypingTimeout;

function typeTextSlowly(element, text, speed) {
  if (!element) return;

  window.clearTimeout(summaryTypingTimeout);
  element.textContent = "";

  let index = 0;

  function typeNextCharacter() {
    element.textContent = text.slice(0, index);
    index += 1;

    if (index <= text.length) {
      summaryTypingTimeout = window.setTimeout(typeNextCharacter, speed);
    }
  }

  typeNextCharacter();
}

function updateSearchUrl(keyword) {
  if (!window.location.pathname.endsWith("search.html")) return;

  const url = new URL(window.location.href);

  if (keyword) {
    url.searchParams.set("q", keyword);
  } else {
    url.searchParams.delete("q");
  }

  window.history.replaceState({}, "", url);
}

function scoreMentorByKeyword(mentor, keyword) {
  if (!keyword) return 1;

  const normalizedKeyword = keyword.toLowerCase().trim();
  const expandedKeyword = expandSearchTerms(normalizedKeyword);
  const keywords = expandedKeyword.split(/\s+/).filter(Boolean);
  const target = [
    mentor.name,
    mentor.tag,
    mentor.role,
    mentor.bio,
    mentor.focus,
    mentor.fit,
    mentor.searchableText,
    mentor.achievements.join(" ")
  ]
    .join(" ")
    .toLowerCase();

  let score = 0;

  keywords.forEach(function (word) {
    if (target.includes(word)) {
      score += word.length > 3 ? 3 : 1;
    }
  });

  if (target.includes(normalizedKeyword) || target.includes(expandedKeyword)) {
    score += 5;
  }

  return score;
}

function expandSearchTerms(keyword) {
  let expanded = keyword;

  querySynonyms.forEach(function (rule) {
    const matches = rule.phrases.some(function (phrase) {
      return keyword.includes(phrase);
    });

    if (matches) {
      expanded += " " + rule.tags.join(" ");
    }
  });

  return expanded;
}

function getAcceptedStudentCountForMentor(mentorId) {
  return getBookingRequests().filter(function (request) {
    return request.mentorId === mentorId && (request.status === "accepted" || request.status === "completed");
  }).length;
}

function getResolvedMentorById(mentorId) {
  const approvedStore = getApprovedMentorProfiles();
  const approvedProfile = approvedStore[mentorId] || {};

  if (approvedProfile && approvedProfile._source === "supabase") {
    return Object.assign({}, mentorData[mentorId] || {}, approvedProfile);
  }

  const baseMentor = mentorData[mentorId] || (approvedProfile._origin === "admin" ? approvedProfile : null);
  if (!baseMentor) return null;
  const experience = mentorExperienceData[mentorId] || {};
  const acceptedCount = getAcceptedStudentCountForMentor(mentorId);
  const submittedReviews = getMentorSubmittedReviews().filter(function (review) {
    return review.mentorId === mentorId;
  });
  const baseRating = Number(
    approvedProfile.rating !== undefined && approvedProfile.rating !== null
      ? approvedProfile.rating
      : experience.rating !== undefined && experience.rating !== null
        ? experience.rating
        : 0
  );
  const baseStudents = Number(
    approvedProfile.studentsTaught !== undefined && approvedProfile.studentsTaught !== null
      ? approvedProfile.studentsTaught
      : experience.studentsTaught !== undefined && experience.studentsTaught !== null
        ? experience.studentsTaught
        : 0
  );
  const submittedRatingTotal = submittedReviews.reduce(function (total, review) {
    return total + Number(review.rating || 0);
  }, 0);
  const computedRating = submittedReviews.length
    ? ((baseRating * Math.max(baseStudents, 1)) + submittedRatingTotal) / (Math.max(baseStudents, 1) + submittedReviews.length)
    : baseRating;
  const mergedReviews = submittedReviews
    .map(function (review) {
      return {
        author: review.author,
        role: review.role,
        rating: review.rating,
        content: review.content
      };
    })
    .concat(approvedProfile.reviews || experience.reviews || []);

  return Object.assign({}, baseMentor, approvedProfile, {
    rating: Number(computedRating.toFixed(1)),
    studentsTaught: baseStudents + acceptedCount,
    reviews: mergedReviews
  });
}

function getResolvedMentorList() {
  const approvedStore = getApprovedMentorProfiles();
  const baseIds = Object.keys(mentorData);
  const extraIds = Object.keys(approvedStore).filter(function (mentorId) {
    return !mentorData[mentorId];
  });
  return baseIds.concat(extraIds)
    .map(function (mentorId) {
      return getResolvedMentorById(mentorId);
    })
    .filter(Boolean);
}

function renderMentorStatsBadge(mentor) {
  return `
    <div class="mentor-stats-badge" aria-label="ÄÃ¡nh giÃ¡ vÃ  sá»‘ há»c sinh">
      <span class="mentor-stats-pill">
        <span class="mentor-stats-star">â˜…</span>
        <strong>${Number(mentor.rating || 0).toFixed(1)}</strong>
      </span>
      <span class="mentor-stats-pill">
        <img src="personicon.png" alt="Sá»‘ há»c sinh">
        <strong>${mentor.studentsTaught || 0}</strong>
      </span>
    </div>
  `;
}

function renderReviewStars(rating) {
  const fullStars = Math.max(1, Math.round(Number(rating || 0)));
  return "â˜…".repeat(Math.min(fullStars, 5)) + "â˜†".repeat(Math.max(0, 5 - Math.min(fullStars, 5)));
}

function createMentorCard(mentor) {
  const safeMentor = getResolvedMentorById(mentor.id) || mentor;
  const achievementItems = safeMentor.achievements
    .slice(0, 2)
    .map(function (achievement) {
      return "<li>" + achievement + "</li>";
    })
    .join("");

  return `
    <a class="mentor-card mentor-grid-card mentor-card-link" href="mentor-detail.html?id=${mentor.id}">
      <div class="mentor-card-media">
        <img src="${safeMentor.image}" alt="${safeMentor.name}">
      </div>
      <div class="mentor-card-body">
        <h3>${safeMentor.name}</h3>
        <div class="mentor-card-rating-line">
          <span>${Number(safeMentor.rating || 0).toFixed(1)} / 5 sao</span>
          <span>${safeMentor.studentsTaught || 0} há»c sinh</span>
        </div>
        <div class="mentor-card-achievements">
          <p>ThÃ nh tÃ­ch ná»•i báº­t</p>
          <ul>${achievementItems}</ul>
        </div>
        <span class="mentor-card-cta">Xem há»“ sÆ¡ chi tiáº¿t</span>
      </div>
    </a>
  `;
}

function buildMentorPagination(currentPage, totalPages) {
  if (totalPages <= 1) return "";

  const pageButtons = Array.from({ length: totalPages }, function (_, index) {
    const page = index + 1;
    return `
      <button type="button" class="mentor-pagination-btn ${page === currentPage ? "is-active" : ""}" data-page="${page}">
        ${page}
      </button>
    `;
  }).join("");

  return `
    <button type="button" class="mentor-pagination-btn mentor-pagination-nav" data-page="${Math.max(1, currentPage - 1)}" ${currentPage === 1 ? "disabled" : ""}>
      &lt;
    </button>
    ${pageButtons}
    <button type="button" class="mentor-pagination-btn mentor-pagination-nav" data-page="${Math.min(totalPages, currentPage + 1)}" ${currentPage === totalPages ? "disabled" : ""}>
      &gt;
    </button>
  `;
}

function renderMentorList(mentors, keyword, page) {
  const mentorGrid = document.getElementById("mentorGrid");
  const summary = document.getElementById("mentorResultsSummary");
  const pagination = document.getElementById("mentorPagination");

  if (!mentorGrid || !summary || !pagination) return;

  if (!mentors.length) {
    mentorGrid.innerHTML = `
      <div class="mentor-empty-state">
        <h3>ChÆ°a cÃ³ mentor khá»›p hoÃ n toÃ n</h3>
        <p>Báº¡n cÃ³ thá»ƒ Ä‘á»•i cÃ¡ch mÃ´ táº£ á»Ÿ Ã´ tÃ¬m kiáº¿m hoáº·c ná»›i lá»ng bá»™ lá»c Ä‘á»ƒ xem thÃªm mentor phÃ¹ há»£p.</p>
      </div>
    `;
    typeTextSlowly(
      summary,
      keyword
        ? `KhÃ´ng tÃ¬m tháº¥y mentor phÃ¹ há»£p cho: "${keyword}".`
        : "Hiá»‡n chÆ°a cÃ³ mentor phÃ¹ há»£p vá»›i bá»™ lá»c báº¡n chá»n.",
      26
    );
    pagination.hidden = true;
    pagination.innerHTML = "";
    return;
  }

  const totalPages = Math.max(1, Math.ceil(mentors.length / SEARCH_PAGE_SIZE));
  const safePage = Math.min(Math.max(page || 1, 1), totalPages);
  const startIndex = (safePage - 1) * SEARCH_PAGE_SIZE;
  const pageMentors = mentors.slice(startIndex, startIndex + SEARCH_PAGE_SIZE);

  currentSearchPage = safePage;
  mentorGrid.innerHTML = pageMentors.map(createMentorCard).join("");
  pagination.hidden = totalPages <= 1;
  pagination.innerHTML = buildMentorPagination(safePage, totalPages);
  typeTextSlowly(
    summary,
    keyword
      ? `TÃ¬m tháº¥y ${mentors.length} mentor phÃ¹ há»£p vá»›i mÃ´ táº£: "${keyword}". Trang ${safePage}/${totalPages}.`
      : `Äang hiá»ƒn thá»‹ ${mentors.length} mentor phÃ¹ há»£p. Trang ${safePage}/${totalPages}.`,
    26
  );
}

function initializeHomeMentorSection() {
  const homeMentorTrack = document.getElementById("homeMentorTrack");
  if (!homeMentorTrack) return;

  const featuredMentors = getResolvedMentorList();
  const mentorPages = [];

  for (let i = 0; i < featuredMentors.length; i += 3) {
    mentorPages.push(featuredMentors.slice(i, i + 3));
  }

  homeMentorTrack.innerHTML = mentorPages
    .map(function (page) {
      return `
        <div class="mentor-slide">
          ${page.map(createMentorCard).join("")}
        </div>
      `;
    })
    .join("");

  const prevButton = document.querySelector(".mentor-home-prev");
  const nextButton = document.querySelector(".mentor-home-next");
  let currentPage = 0;

  function updateHomeMentorSlider() {
    homeMentorTrack.style.transform = `translateX(-${currentPage * 100}%)`;

    if (prevButton) {
      prevButton.disabled = currentPage === 0;
      prevButton.style.opacity = currentPage === 0 ? "0.5" : "1";
    }

    if (nextButton) {
      nextButton.disabled = currentPage === mentorPages.length - 1;
      nextButton.style.opacity = currentPage === mentorPages.length - 1 ? "0.5" : "1";
    }
  }

  if (prevButton) {
    prevButton.addEventListener("click", function () {
      if (currentPage > 0) {
        currentPage -= 1;
        updateHomeMentorSlider();
      }
    });
  }

  if (nextButton) {
    nextButton.addEventListener("click", function () {
      if (currentPage < mentorPages.length - 1) {
        currentPage += 1;
        updateHomeMentorSlider();
      }
    });
  }

  updateHomeMentorSlider();
}

function filterMentors() {
  const mentorGrid = document.getElementById("mentorGrid");
  if (!mentorGrid) return;

  const searchField = document.getElementById("mentorSearchInput");
  const fieldFilter = document.getElementById("fieldFilter");
  const availabilityFilter = document.getElementById("availabilityFilter");
  const serviceFilter = document.getElementById("serviceFilter");

  const keyword = searchField ? searchField.value.trim() : "";
  const selectedField = fieldFilter ? fieldFilter.value : "";
  const selectedAvailability = availabilityFilter ? availabilityFilter.value : "";
  const selectedService = serviceFilter ? serviceFilter.value : "";

  const mentors = getResolvedMentorList()
    .map(function (mentor) {
      return {
        mentor: mentor,
        score: scoreMentorByKeyword(mentor, keyword)
      };
    })
    .filter(function (entry) {
      const mentor = entry.mentor;
      const matchesKeyword = !keyword || entry.score > 0;
      const matchesField = !selectedField || mentor.field === selectedField;
      const matchesAvailability =
        !selectedAvailability || mentor.availability.includes(selectedAvailability);
      const matchesService = !selectedService || mentor.service.includes(selectedService);

      return matchesKeyword && matchesField && matchesAvailability && matchesService;
    })
    .sort(function (a, b) {
      return b.score - a.score;
    })
    .map(function (entry) {
      return entry.mentor;
    });

  updateSearchUrl(keyword);
  renderMentorList(mentors, keyword, currentSearchPage);
}

function initializeSearchPage() {
  const mentorGrid = document.getElementById("mentorGrid");
  const pagination = document.getElementById("mentorPagination");
  if (!mentorGrid || !pagination) return;

  const searchField = document.getElementById("mentorSearchInput");
  const searchButtonElement = document.getElementById("mentorSearchButton");
  const fieldFilter = document.getElementById("fieldFilter");
  const availabilityFilter = document.getElementById("availabilityFilter");
  const serviceFilter = document.getElementById("serviceFilter");
  const params = new URLSearchParams(window.location.search);
  const initialKeyword = params.get("q");

  if (searchField && initialKeyword) {
    searchField.value = initialKeyword;
  }

  if (searchField) {
    searchField.addEventListener("input", function () {
      currentSearchPage = 1;
      filterMentors();
    });
  }

  if (searchButtonElement) {
    searchButtonElement.addEventListener("click", function () {
      currentSearchPage = 1;
      filterMentors();
    });
  }

  [fieldFilter, availabilityFilter, serviceFilter].forEach(function (selectElement) {
    if (selectElement) {
      selectElement.addEventListener("change", function () {
        currentSearchPage = 1;
        filterMentors();
      });
    }
  });

  pagination.addEventListener("click", function (event) {
    const button = event.target.closest("[data-page]");
    if (!button || button.disabled) return;
    currentSearchPage = Number(button.getAttribute("data-page")) || 1;
    filterMentors();
    mentorGrid.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  filterMentors();
}

function renderMentorDetail() {
  const nameElement = document.getElementById("mentorDetailName");
  if (!nameElement) return;

  const params = new URLSearchParams(window.location.search);
  const mentorId = params.get("id");
  const mentor = getResolvedMentorById(mentorId) || getResolvedMentorById("tra-my");

  document.getElementById("mentorDetailImage").src = mentor.image;
  document.getElementById("mentorDetailImage").alt = mentor.name;
  nameElement.textContent = mentor.name;
  document.getElementById("mentorDetailHeadline").textContent = mentor.role;
  document.getElementById("mentorDetailRating").textContent = Number(mentor.rating || 0).toFixed(1) + " / 5 sao";
  document.getElementById("mentorDetailStudents").textContent = (mentor.studentsTaught || 0) + " há»c sinh";
  document.getElementById("mentorDetailWorkplace").textContent = mentor.workplace || "Äang cáº­p nháº­t";
  document.getElementById("mentorDetailFocus").textContent = mentor.focus;
  document.getElementById("mentorDetailAvailability").textContent = mentor.availabilityText;
  document.getElementById("mentorDetailService").textContent = mentor.serviceText;
  document.getElementById("mentorDetailFit").textContent = mentor.fit;

  const bookingLink = document.getElementById("mentorBookingLink");
  if (bookingLink) {
    bookingLink.href = "booking.html?id=" + mentor.id;
  }

  const achievementsElement = document.getElementById("mentorDetailAchievements");
  achievementsElement.innerHTML = mentor.achievements
    .map(function (achievement) {
      return "<li>" + achievement + "</li>";
    })
    .join("");

  const reviewsElement = document.getElementById("mentorDetailReviews");
  if (reviewsElement) {
    reviewsElement.innerHTML = (mentor.reviews || []).length
      ? mentor.reviews.map(function (review) {
          return `
            <article class="mentor-review-card">
              <div class="mentor-review-head">
                <div>
                  <h3>${escapeHtml(review.author)}</h3>
                  <p>${escapeHtml(review.role || "Mentee")}</p>
                </div>
                <span>${renderReviewStars(review.rating)} <strong>${Number(review.rating || 0).toFixed(1)}</strong></span>
              </div>
              <p>${escapeHtml(review.content)}</p>
            </article>
          `;
        }).join("")
      : `
          <div class="admin-empty-state">
            <h3>ChÆ°a cÃ³ Ä‘Ã¡nh giÃ¡</h3>
            <p>Pháº§n nháº­n xÃ©t tá»« mentee sáº½ hiá»ƒn thá»‹ táº¡i Ä‘Ã¢y khi mentor cÃ³ thÃªm review thá»±c táº¿.</p>
          </div>
        `;
  }
}

function initializeBookingPage() {
  const bookingForm = document.getElementById("bookingForm");
  if (!bookingForm) return;

  const params = new URLSearchParams(window.location.search);
  const mentorId = params.get("id");
  const mentor = getResolvedMentorById(mentorId) || getResolvedMentorById("tra-my");
  const currentUser = getCurrentUser();

  document.getElementById("bookingMentorImage").src = mentor.image;
  document.getElementById("bookingMentorImage").alt = mentor.name;
  document.getElementById("bookingMentorName").textContent = mentor.name;
  document.getElementById("bookingMentorFocus").textContent = mentor.focus;
  document.getElementById("bookingMentorAvailability").textContent = mentor.availabilityText;
  document.getElementById("bookingMentorService").textContent = mentor.serviceText;

  if (currentUser) {
    const nameInput = document.getElementById("bookingName");
    const emailInput = document.getElementById("bookingEmail");
    const goalInput = document.getElementById("bookingGoal");

    if (nameInput) nameInput.value = currentUser.name || "";
    if (emailInput) emailInput.value = currentUser.email || "";
    if (goalInput) goalInput.value = currentUser.goal || "";
  }

  bookingForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const name = document.getElementById("bookingName").value.trim();
    const email = document.getElementById("bookingEmail").value.trim();
    const goal = document.getElementById("bookingGoal").value.trim();
    const time = document.getElementById("bookingTime").value;
    const note = document.getElementById("bookingNote").value.trim();
    const successBox = document.getElementById("bookingSuccessMessage");

    try {
      const createdRequest = await submitBookingRequest({
        mentorId: mentor.id,
        menteeName: name,
        menteeEmail: email,
        goal: goal,
        preferredTime: time,
        note: note
      });
      replaceBookingRequestInStore(createdRequest);

      successBox.hidden = false;
      successBox.innerHTML = `
        YÃƒÂªu cÃ¡ÂºÂ§u Ã„â€˜ÃƒÂ£ Ã„â€˜Ã†Â°Ã¡Â»Â£c gÃ¡Â»Â­i tÃ¡Â»â€ºi <strong>${mentor.name}</strong>.<br>
        NgÃ†Â°Ã¡Â»Âi gÃ¡Â»Â­i: <strong>${name}</strong> (${email})<br>
        MÃ¡Â»Â¥c tiÃƒÂªu: <strong>${goal}</strong><br>
        ThÃ¡Â»Âi gian mong muÃ¡Â»â€˜n: <strong>${time}</strong>${note ? `<br>Ghi chÃƒÂº: <strong>${note}</strong>` : ""}
        ${currentUser && normalizeRole(currentUser.role) === "mentee" ? '<br><a href="mentee-schedule.html">Xem lÃ¡Â»â€¹ch hÃ¡Â»Âc cÃ¡Â»Â§a tÃƒÂ´i</a>' : ""}
      `;

      bookingForm.reset();
      if (currentUser) {
        document.getElementById("bookingName").value = currentUser.name || "";
        document.getElementById("bookingEmail").value = currentUser.email || "";
        document.getElementById("bookingGoal").value = currentUser.goal || "";
      }
    } catch (error) {
      successBox.hidden = false;
      successBox.textContent = error.message || "KhÃƒÂ´ng thÃ¡Â»Æ’ gÃ¡Â»Â­i yÃƒÂªu cÃ¡ÂºÂ§u Ã„â€˜Ã¡ÂºÂ·t lÃ¡Â»â€¹ch lÃƒÂºc nÃƒÂ y.";
    }
  });
}

async function submitConsultationRequest(payload) {
  return apiRequest("/api/consultation-requests", {
    method: "POST",
    body: payload,
    skipAuth: true,
    errorMessage: "Khong the gui yeu cau tu van luc nay."
  });
}

async function submitMentorApplication(payload) {
  return apiRequest("/api/mentor-applications", {
    method: "POST",
    body: payload,
    skipAuth: true,
    errorMessage: "Khong the gui ho so ung tuyen mentor luc nay."
  });
}

async function activateMentorApplication(payload) {
  return apiRequest("/api/mentor-applications/activate", {
    method: "POST",
    body: payload,
    errorMessage: "Khong the xac nhan kich hoat mentor."
  });
}

async function verifyMentorActivation(payload) {
  return apiRequest("/api/mentor-applications/verify-activation", {
    method: "POST",
    body: payload,
    skipAuth: true,
    errorMessage: "Khong the xac minh ma kich hoat mentor."
  });
}

async function fetchAdminConsultationRequests(adminKey) {
  const data = await apiRequest("/api/admin/consultation-requests", {
    adminKey: adminKey,
    skipAuth: true,
    errorMessage: "Khong the tai danh sach yeu cau tu van."
  });
  return data.requests || [];
}

async function fetchAdminMentorApplications(adminKey) {
  const data = await apiRequest("/api/admin/mentor-applications", {
    adminKey: adminKey,
    skipAuth: true,
    errorMessage: "Khong the tai danh sach ung tuyen mentor."
  });
  return data.applications || [];
}

async function updateAdminConsultationRequest(adminKey, requestId, payload) {
  const data = await apiRequest("/api/admin/consultation-requests/" + requestId, {
    method: "PUT",
    adminKey: adminKey,
    body: payload,
    skipAuth: true,
    errorMessage: "Khong the cap nhat yeu cau tu van."
  });
  return data.request;
}

async function updateAdminMentorApplication(adminKey, applicationId, payload) {
  const data = await apiRequest("/api/admin/mentor-applications/" + applicationId, {
    method: "PUT",
    adminKey: adminKey,
    body: payload,
    skipAuth: true,
    errorMessage: "Khong the cap nhat ho so ung tuyen mentor."
  });
  return data.application;
}

async function submitBookingRequest(payload) {
  const data = await apiRequest("/api/booking-requests", {
    method: "POST",
    body: payload,
    errorMessage: "Khong the gui yeu cau dat lich luc nay."
  });
  return data.request;
}

async function updateBookingRequestRemote(requestId, payload, options = {}) {
  return apiRequest("/api/booking-requests/" + requestId, {
    method: "PUT",
    body: payload,
    adminKey: options.adminKey,
    skipAuth: Boolean(options.adminKey),
    errorMessage: "Khong the cap nhat dang ky hoc voi mentor luc nay."
  });
}

async function submitMentorReview(payload) {
  return apiRequest("/api/reviews", {
    method: "POST",
    body: payload,
    errorMessage: "Khong the gui danh gia mentor luc nay."
  });
}

async function submitMentorProfileUpdateRemote(payload) {
  return apiRequest("/api/mentor-profile-updates", {
    method: "POST",
    body: payload,
    errorMessage: "Khong the gui cap nhat ho so mentor luc nay."
  });
}

async function updateAdminMentorProfileUpdateRemote(adminKey, requestId, payload) {
  return apiRequest("/api/admin/mentor-profile-updates/" + requestId, {
    method: "PUT",
    adminKey: adminKey,
    body: payload,
    skipAuth: true,
    errorMessage: "Khong the cap nhat yeu cau ho so mentor luc nay."
  });
}

async function createAdminMentorProfileRemote(adminKey, payload) {
  return apiRequest("/api/admin/mentor-profiles", {
    method: "POST",
    adminKey: adminKey,
    body: payload,
    skipAuth: true,
    errorMessage: "Khong the tao mentor moi luc nay."
  });
}

function buildAdminConsultationCard(request) {
  const safeName = escapeHtml(request.name);
  const safeEmail = escapeHtml(request.email);
  const safePhone = escapeHtml(request.phone);
  const safeServiceType = escapeHtml(request.serviceType);
  const safeAudience = escapeHtml(request.audience || "ChÆ°a chá»n");
  const safePreferredFormat = escapeHtml(request.preferredFormat);
  const safePreferredChannel = escapeHtml(request.preferredChannel || "ChÆ°a chá»n");
  const safePreferredTime = escapeHtml(request.preferredTime || "ChÆ°a cáº­p nháº­t");
  const safeGoal = escapeHtml(request.goal);
  const safeNote = escapeHtml(request.note || "KhÃ´ng cÃ³ ghi chÃº thÃªm.");
  const safeAdminNote = escapeHtml(request.adminNote || "");
  const safeMeetingLink = escapeHtml(request.meetingLink || "");
  const safeStatus = escapeHtml(request.status);
  const meetingLinkHtml = request.meetingLink
    ? `<a href="${safeMeetingLink}" target="_blank" rel="noreferrer">${safeMeetingLink}</a>`
    : "<span>ChÆ°a cÃ³ link online</span>";

  return `
    <article class="admin-request-card" data-request-id="${request.id}">
      <div class="admin-request-head">
        <div>
          <span class="admin-request-label">Lead #${request.id}</span>
          <h3>${safeName}</h3>
        </div>
        <span class="admin-request-status status-${safeStatus}">${safeStatus}</span>
      </div>

      <div class="admin-request-grid">
        <p><strong>Email:</strong> ${safeEmail}</p>
        <p><strong>Äiá»‡n thoáº¡i:</strong> ${safePhone}</p>
        <p><strong>Dá»‹ch vá»¥:</strong> ${safeServiceType}</p>
        <p><strong>Äá»‘i tÆ°á»£ng:</strong> ${safeAudience}</p>
        <p><strong>Muá»‘n tÆ° váº¥n:</strong> ${safePreferredFormat}</p>
        <p><strong>KÃªnh online:</strong> ${safePreferredChannel}</p>
        <p><strong>Thá»i gian tiá»‡n:</strong> ${safePreferredTime}</p>
        <p><strong>NgÃ y táº¡o:</strong> ${formatDate(request.createdAt)}</p>
      </div>

      <div class="admin-request-body">
        <div class="admin-request-block">
          <span>Má»¥c tiÃªu</span>
          <p>${safeGoal}</p>
        </div>
        <div class="admin-request-block">
          <span>Ghi chÃº cá»§a ngÆ°á»i gá»­i</span>
          <p>${safeNote}</p>
        </div>
      </div>

      <div class="admin-request-online">
        <span>Link tÆ° váº¥n online</span>
        <div class="admin-request-link">${meetingLinkHtml}</div>
      </div>

      <form class="admin-request-form">
        <label class="auth-field">
          <span>Tráº¡ng thÃ¡i</span>
          <select name="status">
            <option value="new" ${request.status === "new" ? "selected" : ""}>new</option>
            <option value="contacted" ${request.status === "contacted" ? "selected" : ""}>contacted</option>
            <option value="scheduled" ${request.status === "scheduled" ? "selected" : ""}>scheduled</option>
            <option value="completed" ${request.status === "completed" ? "selected" : ""}>completed</option>
          </select>
        </label>

        <label class="auth-field">
          <span>Link meeting online</span>
          <input type="text" name="meetingLink" value="${safeMeetingLink}" placeholder="VÃ­ dá»¥: https://meet.google.com/abc-defg-hij">
        </label>

        <label class="auth-field">
          <span>Ghi chÃº admin</span>
          <textarea name="adminNote" rows="4" placeholder="VÃ­ dá»¥: ÄÃ£ gá»i tÆ° váº¥n sÆ¡ bá»™, chá» xÃ¡c nháº­n lá»‹ch.">${safeAdminNote}</textarea>
        </label>

        <button type="submit" class="mentor-primary-btn">LÆ°u cáº­p nháº­t</button>
      </form>
    </article>
  `;
}

function buildAdminMentorApplicationCard(application) {
  const safeFullName = escapeHtml(application.fullName);
  const safeEmail = escapeHtml(application.email);
  const safePhone = escapeHtml(application.phone);
  const safeExpertise = escapeHtml(application.expertise);
  const safeExperience = escapeHtml(application.experience || "ChÆ°a bá»• sung.");
  const safeMotivation = escapeHtml(application.motivation);
  const safePortfolioLink = escapeHtml(application.portfolioLink || "");
  const safeAdminNote = escapeHtml(application.adminNote || "");
  const safeStatus = escapeHtml(application.status);

  const portfolioHtml = application.portfolioLink
    ? `<a href="${safePortfolioLink}" target="_blank" rel="noreferrer">${safePortfolioLink}</a>`
    : "<span>KhÃ´ng cÃ³ link há»“ sÆ¡</span>";
  const activationHtml = application.activationCode
    ? `<strong>${escapeHtml(application.activationCode)}</strong>`
    : "<span>ChÆ°a cáº¥p mÃ£ kÃ­ch hoáº¡t</span>";
  const activationGuideHtml = application.activationCode
    ? `
        <div class="admin-request-inline-note">
          Gá»­i mentor link <a href="mentor-activate.html" target="_blank" rel="noreferrer">mentor-activate.html</a>
          cÃ¹ng email á»©ng tuyá»ƒn vÃ  mÃ£ kÃ­ch hoáº¡t nÃ y Ä‘á»ƒ há» tá»± táº¡o máº­t kháº©u Ä‘Äƒng nháº­p.
        </div>
      `
    : "";
  const invitedAtHtml = application.invitedAt
    ? `<p><strong>ÄÃ£ cáº¥p mÃ£:</strong> ${formatDate(application.invitedAt)}</p>`
    : "";
  const activatedAtHtml = application.activatedAt
    ? `<p><strong>KÃ­ch hoáº¡t lÃºc:</strong> ${formatDate(application.activatedAt)}</p>`
    : "";

  return `
    <article class="admin-request-card" data-application-id="${application.id}">
      <div class="admin-request-head">
        <div>
          <span class="admin-request-label">Mentor Application #${application.id}</span>
          <h3>${safeFullName}</h3>
        </div>
        <span class="admin-request-status status-${safeStatus}">${safeStatus}</span>
      </div>

      <div class="admin-request-grid">
        <p><strong>Email:</strong> ${safeEmail}</p>
        <p><strong>Äiá»‡n thoáº¡i:</strong> ${safePhone}</p>
        <p><strong>ChuyÃªn mÃ´n:</strong> ${safeExpertise}</p>
        <p><strong>NgÃ y ná»™p:</strong> ${formatDate(application.createdAt)}</p>
        ${invitedAtHtml}
        ${activatedAtHtml}
      </div>

      <div class="admin-request-body">
        <div class="admin-request-block">
          <span>Kinh nghiá»‡m</span>
          <p>${safeExperience}</p>
        </div>
        <div class="admin-request-block">
          <span>Äá»™ng lá»±c á»©ng tuyá»ƒn</span>
          <p>${safeMotivation}</p>
        </div>
      </div>

      <div class="admin-request-body">
        <div class="admin-request-online">
          <span>Portfolio / LinkedIn</span>
          <div class="admin-request-link">${portfolioHtml}</div>
        </div>
        <div class="admin-request-online">
          <span>MÃ£ kÃ­ch hoáº¡t</span>
          <div class="admin-request-link">${activationHtml}</div>
          ${activationGuideHtml}
        </div>
      </div>

      <form class="admin-mentor-application-form">
        <label class="auth-field">
          <span>Tráº¡ng thÃ¡i</span>
          <select name="status">
            <option value="pending" ${application.status === "pending" ? "selected" : ""}>pending</option>
            <option value="interviewing" ${application.status === "interviewing" ? "selected" : ""}>interviewing</option>
            <option value="approved" ${application.status === "approved" ? "selected" : ""}>approved</option>
            <option value="rejected" ${application.status === "rejected" ? "selected" : ""}>rejected</option>
            <option value="activated" ${application.status === "activated" ? "selected" : ""}>activated</option>
          </select>
        </label>

        <label class="auth-field">
          <span>Cáº¥p mÃ£ kÃ­ch hoáº¡t</span>
          <select name="generateActivation">
            <option value="no">KhÃ´ng</option>
            <option value="yes">CÃ³, táº¡o mÃ£ má»›i</option>
          </select>
        </label>

        <label class="auth-field">
          <span>Ghi chÃº admin</span>
          <textarea name="adminNote" rows="4" placeholder="VÃ­ dá»¥: ÄÃ£ phá»ng váº¥n á»•n, gá»­i mÃ£ kÃ­ch hoáº¡t qua email.">${safeAdminNote}</textarea>
        </label>

        <button type="submit" class="mentor-primary-btn">LÆ°u há»“ sÆ¡ mentor</button>
      </form>
    </article>
  `;
}

function buildAdminMentorApplicationSummary(applications) {
  const counts = applications.reduce(function (summary, application) {
    const status = normalizeWhitespace(application.status || "pending").toLowerCase();
    summary.total += 1;
    summary[status] = (summary[status] || 0) + 1;
    return summary;
  }, {
    total: 0,
    pending: 0,
    interviewing: 0,
    approved: 0,
    activated: 0,
    rejected: 0
  });

  return `
    <div class="admin-summary-grid">
      <article class="admin-summary-card">
        <span>Tá»•ng há»“ sÆ¡ mentor</span>
        <strong>${counts.total}</strong>
        <p>ToÃ n bá»™ há»“ sÆ¡ á»©ng tuyá»ƒn Ä‘ang cÃ³ trong há»‡ thá»‘ng.</p>
      </article>
      <article class="admin-summary-card">
        <span>Chá» xá»­ lÃ½</span>
        <strong>${counts.pending}</strong>
        <p>CÃ¡c há»“ sÆ¡ má»›i cáº§n sÃ ng lá»c hoáº·c liÃªn há»‡ ban Ä‘áº§u.</p>
      </article>
      <article class="admin-summary-card">
        <span>Äang phá»ng váº¥n</span>
        <strong>${counts.interviewing}</strong>
        <p>á»¨ng viÃªn Ä‘ang á»Ÿ vÃ²ng trao Ä‘á»•i, Ä‘Ã¡nh giÃ¡ vÃ  chá»n lá»c.</p>
      </article>
      <article class="admin-summary-card">
        <span>ÄÃ£ cáº¥p quyá»n</span>
        <strong>${counts.approved + counts.activated}</strong>
        <p>Mentor Ä‘Ã£ Ä‘Æ°á»£c duyá»‡t hoáº·c Ä‘Ã£ kÃ­ch hoáº¡t tÃ i khoáº£n thÃ nh cÃ´ng.</p>
      </article>
    </div>
  `;
}

function buildAdminMentorProfileUpdateCard(request) {
  const safeMentorName = escapeHtml(request.mentorName);
  const safeStatus = escapeHtml(request.status);
  const safeAdminNote = escapeHtml(request.adminNote || "");
  const profile = request.profile || {};

  return `
    <article class="admin-request-card" data-mentor-profile-update-id="${request.id}">
      <div class="admin-request-head">
        <div>
          <span class="admin-request-label">Mentor Update</span>
          <h3>${safeMentorName}</h3>
        </div>
        <span class="admin-request-status status-${safeStatus}">${safeStatus}</span>
      </div>

      <div class="admin-request-grid">
        <p><strong>Mentor ID:</strong> ${escapeHtml(request.mentorId)}</p>
        <p><strong>Gá»­i lÃºc:</strong> ${formatDate(request.createdAt)}</p>
        <p><strong>Headline:</strong> ${escapeHtml(profile.role || "ChÆ°a cáº­p nháº­t")}</p>
        <p><strong>NÆ¡i lÃ m viá»‡c / há»c táº­p:</strong> ${escapeHtml(profile.workplace || "ChÆ°a cáº­p nháº­t")}</p>
        <p><strong>Lá»‹ch ráº£nh:</strong> ${escapeHtml(profile.availabilityText || "ChÆ°a cáº­p nháº­t")}</p>
      </div>

      <div class="admin-request-body">
        <div class="admin-request-block">
          <span>Dá»‹ch vá»¥ & giÃ¡</span>
          <p>${escapeHtml((profile.serviceText || "ChÆ°a cáº­p nháº­t") + " | " + (profile.pricing || "ChÆ°a cáº­p nháº­t"))}</p>
        </div>
        <div class="admin-request-block">
          <span>Äá»‘i tÆ°á»£ng phÃ¹ há»£p</span>
          <p>${escapeHtml(profile.fit || "ChÆ°a cáº­p nháº­t")}</p>
        </div>
      </div>

      <div class="admin-request-body">
        <div class="admin-request-block">
          <span>Giá»›i thiá»‡u mentor</span>
          <p>${escapeHtml(profile.intro || "ChÆ°a cáº­p nháº­t")}</p>
        </div>
        <div class="admin-request-block">
          <span>ThÃ nh tÃ­ch ná»•i báº­t</span>
          <p>${escapeHtml(String(profile.achievements || "").split("\n").filter(Boolean).join(" | ") || "ChÆ°a cáº­p nháº­t")}</p>
        </div>
      </div>

      <form class="admin-mentor-profile-update-form">
        <label class="auth-field">
          <span>Tráº¡ng thÃ¡i</span>
          <select name="status">
            <option value="pending" ${request.status === "pending" ? "selected" : ""}>pending</option>
            <option value="approved" ${request.status === "approved" ? "selected" : ""}>approved</option>
            <option value="rejected" ${request.status === "rejected" ? "selected" : ""}>rejected</option>
          </select>
        </label>

        <label class="auth-field">
          <span>Ghi chÃº admin</span>
          <textarea name="adminNote" rows="4" placeholder="VÃ­ dá»¥: ÄÃ£ duyá»‡t, cÃ³ thá»ƒ cáº­p nháº­t ra trang tÃ¬m kiáº¿m mentor.">${safeAdminNote}</textarea>
        </label>

        <button type="submit" class="mentor-primary-btn">Duyá»‡t cáº­p nháº­t</button>
      </form>
    </article>
  `;
}

function initializeMentorApplicationPage() {
  const form = document.getElementById("mentorApplicationForm");
  if (!form) return;

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    clearMessage("mentorApplicationMessage");

    const payload = {
      fullName: normalizeWhitespace(document.getElementById("mentorApplicationName").value),
      email: normalizeEmail(document.getElementById("mentorApplicationEmail").value),
      phone: normalizePhone(document.getElementById("mentorApplicationPhone").value),
      expertise: normalizeWhitespace(document.getElementById("mentorApplicationExpertise").value),
      experience: normalizeWhitespace(document.getElementById("mentorApplicationExperience").value),
      motivation: normalizeWhitespace(document.getElementById("mentorApplicationMotivation").value),
      portfolioLink: normalizeWhitespace(document.getElementById("mentorApplicationPortfolioLink").value)
    };

    if (payload.fullName.length < 2) {
      showMessage("mentorApplicationMessage", "error", "Vui lÃ²ng nháº­p há» vÃ  tÃªn há»£p lá»‡.");
      return;
    }

    if (!payload.email.includes("@")) {
      showMessage("mentorApplicationMessage", "error", "Email chÆ°a Ä‘Ãºng Ä‘á»‹nh dáº¡ng.");
      return;
    }

    if (payload.phone.length < 10) {
      showMessage("mentorApplicationMessage", "error", "Sá»‘ Ä‘iá»‡n thoáº¡i cáº§n cÃ³ Ã­t nháº¥t 10 chá»¯ sá»‘.");
      return;
    }

    if (payload.expertise.length < 4) {
      showMessage("mentorApplicationMessage", "error", "HÃ£y mÃ´ táº£ lÄ©nh vá»±c chuyÃªn mÃ´n rÃµ hÆ¡n.");
      return;
    }

    if (payload.motivation.length < 20) {
      showMessage("mentorApplicationMessage", "error", "HÃ£y chia sáº» ká»¹ hÆ¡n lÃ½ do báº¡n muá»‘n trá»Ÿ thÃ nh mentor.");
      return;
    }

    try {
      await submitMentorApplication(payload);
      form.reset();
      showMessage(
        "mentorApplicationMessage",
        "success",
        "Há»“ sÆ¡ á»©ng tuyá»ƒn mentor Ä‘Ã£ Ä‘Æ°á»£c gá»­i. Náº¿u phÃ¹ há»£p, Ä‘á»™i ngÅ© Mentor Me sáº½ liÃªn há»‡ vÃ  cáº¥p mÃ£ kÃ­ch hoáº¡t tÃ i khoáº£n."
      );
    } catch (error) {
      showMessage("mentorApplicationMessage", "error", error.message);
    }
  });
}

function initializeMentorActivationPage() {
  const form = document.getElementById("mentorActivationForm");
  if (!form) return;
  if (!ensureSupabaseReady("mentorActivationMessage")) return;

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    clearMessage("mentorActivationMessage");

    const name = normalizeWhitespace(document.getElementById("mentorActivationName").value);
    const email = normalizeEmail(document.getElementById("mentorActivationEmail").value);
    const activationCode = normalizeWhitespace(document.getElementById("mentorActivationCode").value).toUpperCase();
    const password = document.getElementById("mentorActivationPassword").value;
    const confirmPassword = document.getElementById("mentorActivationConfirmPassword").value;

    if (name.length < 2) {
      showMessage("mentorActivationMessage", "error", "Vui lÃ²ng nháº­p há» vÃ  tÃªn há»£p lá»‡.");
      return;
    }

    if (!email.includes("@")) {
      showMessage("mentorActivationMessage", "error", "Email chÆ°a Ä‘Ãºng Ä‘á»‹nh dáº¡ng.");
      return;
    }

    if (!activationCode) {
      showMessage("mentorActivationMessage", "error", "Vui lÃ²ng nháº­p mÃ£ kÃ­ch hoáº¡t mentor.");
      return;
    }

    if (password.length < 8) {
      showMessage("mentorActivationMessage", "error", "Máº­t kháº©u cáº§n cÃ³ tá»‘i thiá»ƒu 8 kÃ½ tá»±.");
      return;
    }

    if (password !== confirmPassword) {
      showMessage("mentorActivationMessage", "error", "Máº­t kháº©u xÃ¡c nháº­n chÆ°a khá»›p.");
      return;
    }

    try {
      await verifyMentorActivation({
        email: email,
        activationCode: activationCode
      });

      const { data, error } = await supabaseClient.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            full_name: name,
            role: "mentor"
          }
        }
      });

      if (error) {
        throw error;
      }

      if (!data.user) {
        throw new Error("KhÃ´ng thá»ƒ táº¡o tÃ i khoáº£n mentor lÃºc nÃ y.");
      }

      if (data.session) {
        const activationResult = await activateMentorApplication({
          email: email,
          activationCode: activationCode
        });

        if (activationResult && activationResult.mentorProfile) {
          mergeMentorProfileIntoStore(activationResult.mentorProfile);
        }

        await upsertProfile({
          id: data.user.id,
          full_name: name,
          phone: "",
          goal: "",
          bio: "",
          role: "mentor",
          avatar_url: createAvatarFallback(name),
          updated_at: new Date().toISOString()
        });

        const sessionUser = await loadCurrentUserFromSupabase();
        saveAuthSession(sessionUser);
        showMessage("mentorActivationMessage", "success", "KÃ­ch hoáº¡t tÃ i khoáº£n mentor thÃ nh cÃ´ng. Tá»« láº§n sau báº¡n Ä‘Äƒng nháº­p báº±ng email á»©ng tuyá»ƒn vÃ  máº­t kháº©u vá»«a táº¡o.");
        window.setTimeout(function () {
          window.location.href = "mentor-dashboard.html";
        }, 900);
        return;
      }

      showMessage(
        "mentorActivationMessage",
        "success",
        "TÃ i khoáº£n mentor Ä‘Ã£ Ä‘Æ°á»£c táº¡o. Tá»« láº§n sau báº¡n Ä‘Äƒng nháº­p báº±ng email á»©ng tuyá»ƒn vÃ  máº­t kháº©u vá»«a táº¡o. Náº¿u há»‡ thá»‘ng váº«n yÃªu cáº§u xÃ¡c thá»±c email, hÃ£y kiá»ƒm tra thiáº¿t láº­p xÃ¡c thá»±c trong Supabase."
      );
    } catch (error) {
      showMessage("mentorActivationMessage", "error", error.message || "KhÃ´ng thá»ƒ kÃ­ch hoáº¡t tÃ i khoáº£n mentor lÃºc nÃ y.");
    }
  });
}

function initializeAdminConsultationPage() {
  const accessForm = document.getElementById("adminAccessForm");
  const dashboard = document.getElementById("adminConsultationDashboard");
  const listElement = document.getElementById("adminConsultationList");
  const refreshButton = document.getElementById("adminRefreshRequests");
  const mentorDashboard = document.getElementById("adminMentorApplicationDashboard");
  const mentorSummaryElement = document.getElementById("adminMentorApplicationSummary");
  const mentorListElement = document.getElementById("adminMentorApplicationList");
  const mentorRefreshButton = document.getElementById("adminRefreshMentorApplications");
  const bookingDashboard = document.getElementById("adminBookingDashboard");
  const bookingListElement = document.getElementById("adminBookingRequestList");
  const bookingRefreshButton = document.getElementById("adminRefreshBookingRequests");
  const mentorProfileUpdateDashboard = document.getElementById("adminMentorProfileUpdateDashboard");
  const mentorProfileUpdateList = document.getElementById("adminMentorProfileUpdateList");
  const mentorProfileUpdateRefreshButton = document.getElementById("adminRefreshMentorProfileUpdates");
  const mentorCreateDashboard = document.getElementById("adminMentorCreateDashboard");
  const mentorCreateForm = document.getElementById("adminMentorCreateForm");

  if (!accessForm || !dashboard || !listElement) return;

  const currentUser = getCurrentUser();
  if (!currentUser) {
    showMessage("adminConsultationMessage", "error", "HÃ£y Ä‘Äƒng nháº­p báº±ng tÃ i khoáº£n admin Ä‘á»ƒ truy cáº­p khu vá»±c nÃ y.");
    accessForm.hidden = true;
    return;
  }

  if (normalizeRole(currentUser.role) !== "admin") {
    showMessage("adminConsultationMessage", "error", "Chá»‰ tÃ i khoáº£n admin má»›i cÃ³ thá»ƒ truy cáº­p dashboard tÆ° váº¥n.");
    accessForm.hidden = true;
    return;
  }

  let currentAdminKey = sessionStorage.getItem("mentorMeAdminKey") || "";
  if (!currentAdminKey && isDemoAccount(currentUser) && normalizeRole(currentUser.role) === "admin") {
    currentAdminKey = DEMO_ADMIN_ACCESS_CODE;
    sessionStorage.setItem("mentorMeAdminKey", currentAdminKey);
  }

  async function loadRequests() {
    if (!currentAdminKey) return;

    try {
      clearMessage("adminConsultationMessage");
      const requests = await fetchAdminConsultationRequests(currentAdminKey);
      dashboard.hidden = false;

      if (!requests.length) {
        listElement.innerHTML = `
          <div class="admin-empty-state">
            <h3>ChÆ°a cÃ³ yÃªu cáº§u tÆ° váº¥n nÃ o</h3>
            <p>Khi ngÆ°á»i dÃ¹ng gá»­i form á»Ÿ trang dá»‹ch vá»¥, danh sÃ¡ch sáº½ xuáº¥t hiá»‡n táº¡i Ä‘Ã¢y.</p>
          </div>
        `;
        return;
      }

      listElement.innerHTML = requests.map(buildAdminConsultationCard).join("");
    } catch (error) {
      dashboard.hidden = true;
      showMessage("adminConsultationMessage", "error", error.message);
    }
  }

  async function loadMentorApplications() {
    if (!currentAdminKey || !mentorDashboard || !mentorListElement) return;

    try {
      clearMessage("adminConsultationMessage");
      const applications = await fetchAdminMentorApplications(currentAdminKey);
      mentorDashboard.hidden = false;
      if (mentorSummaryElement) {
        mentorSummaryElement.innerHTML = buildAdminMentorApplicationSummary(applications);
      }

      if (!applications.length) {
        mentorListElement.innerHTML = `
          <div class="admin-empty-state">
            <h3>ChÆ°a cÃ³ há»“ sÆ¡ á»©ng tuyá»ƒn mentor</h3>
            <p>Khi cÃ³ mentor ná»™p há»“ sÆ¡, danh sÃ¡ch sáº½ xuáº¥t hiá»‡n táº¡i Ä‘Ã¢y.</p>
          </div>
        `;
        return;
      }

      mentorListElement.innerHTML = applications.map(buildAdminMentorApplicationCard).join("");
    } catch (error) {
      mentorDashboard.hidden = true;
      showMessage("adminConsultationMessage", "error", error.message);
    }
  }

  function loadBookingRequestsForAdmin() {
    if (!bookingDashboard || !bookingListElement) return;

    const requests = getBookingRequests();
    bookingDashboard.hidden = false;

    if (!requests.length) {
      bookingListElement.innerHTML = `
        <div class="admin-empty-state">
          <h3>ChÆ°a cÃ³ Ä‘Äƒng kÃ½ há»c nÃ o vá»›i mentor</h3>
          <p>Khi mentee gá»­i yÃªu cáº§u Ä‘áº·t lá»‹ch, admin sáº½ tháº¥y toÃ n bá»™ luá»“ng táº¡i Ä‘Ã¢y Ä‘á»ƒ tiá»‡n theo dÃµi.</p>
        </div>
      `;
      return;
    }

    bookingListElement.innerHTML = requests.map(buildAdminBookingRequestCard).join("");
  }

  function loadMentorProfileUpdates() {
    if (!mentorProfileUpdateDashboard || !mentorProfileUpdateList) return;

    const requests = getPendingMentorProfileUpdates();
    mentorProfileUpdateDashboard.hidden = false;

    if (!requests.length) {
      mentorProfileUpdateList.innerHTML = `
        <div class="admin-empty-state">
          <h3>ChÆ°a cÃ³ yÃªu cáº§u cáº­p nháº­t há»“ sÆ¡ mentor</h3>
          <p>Khi mentor báº¥m lÆ°u há»“ sÆ¡, yÃªu cáº§u sáº½ Ä‘Æ°á»£c chuyá»ƒn tá»›i admin Ä‘á»ƒ duyá»‡t trÆ°á»›c khi cáº­p nháº­t ra trang tÃ¬m kiáº¿m.</p>
        </div>
      `;
      return;
    }

    mentorProfileUpdateList.innerHTML = requests.map(buildAdminMentorProfileUpdateCard).join("");
  }

  accessForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    clearMessage("adminConsultationMessage");

    currentAdminKey = normalizeWhitespace(document.getElementById("adminAccessKey").value);
    if (!currentAdminKey) {
      showMessage("adminConsultationMessage", "error", "Vui lÃƒÂ²ng nhÃ¡ÂºÂ­p mÃ¡ÂºÂ­t khÃ¡ÂºÂ©u quÃ¡ÂºÂ£n trÃ¡Â»â€¹.");
      return;
    }

    sessionStorage.setItem("mentorMeAdminKey", currentAdminKey);

    try {
      await syncBusinessStateFromServer({ adminKey: currentAdminKey });
    } catch (error) {
      showMessage("adminConsultationMessage", "error", error.message);
      return;
    }

    await loadRequests();
    await loadMentorApplications();
    loadBookingRequestsForAdmin();
    loadMentorProfileUpdates();
    if (mentorCreateDashboard) {
      mentorCreateDashboard.hidden = false;
    }
  });

  if (refreshButton) {
    refreshButton.addEventListener("click", loadRequests);
  }

  if (mentorRefreshButton) {
    mentorRefreshButton.addEventListener("click", loadMentorApplications);
  }

  if (bookingRefreshButton) {
    bookingRefreshButton.addEventListener("click", async function () {
      try {
        await syncBusinessStateFromServer({ adminKey: currentAdminKey });
        loadBookingRequestsForAdmin();
      } catch (error) {
        showMessage("adminConsultationMessage", "error", error.message);
      }
    });
  }

  if (mentorProfileUpdateRefreshButton) {
    mentorProfileUpdateRefreshButton.addEventListener("click", async function () {
      try {
        await syncBusinessStateFromServer({ adminKey: currentAdminKey });
        loadMentorProfileUpdates();
      } catch (error) {
        showMessage("adminConsultationMessage", "error", error.message);
      }
    });
  }

  listElement.addEventListener("submit", async function (e) {
    const form = e.target.closest(".admin-request-form");
    if (!form) return;

    e.preventDefault();

    const card = form.closest(".admin-request-card");
    if (!card) return;

    const requestId = card.getAttribute("data-request-id");
    const formData = new FormData(form);

    try {
      const updatedRequest = await updateAdminConsultationRequest(currentAdminKey, requestId, {
        status: normalizeWhitespace(formData.get("status")),
        meetingLink: normalizeWhitespace(formData.get("meetingLink")),
        adminNote: normalizeWhitespace(formData.get("adminNote"))
      });

      card.outerHTML = buildAdminConsultationCard(updatedRequest);
      showMessage("adminConsultationMessage", "success", "ÄÃ£ cáº­p nháº­t yÃªu cáº§u tÆ° váº¥n.");
    } catch (error) {
      showMessage("adminConsultationMessage", "error", error.message);
    }
  });

  if (mentorListElement) {
    mentorListElement.addEventListener("submit", async function (e) {
      const form = e.target.closest(".admin-mentor-application-form");
      if (!form) return;

      e.preventDefault();

      const card = form.closest(".admin-request-card");
      if (!card) return;

      const applicationId = card.getAttribute("data-application-id");
      const formData = new FormData(form);

      try {
        const updatedApplication = await updateAdminMentorApplication(currentAdminKey, applicationId, {
          status: normalizeWhitespace(formData.get("status")),
          adminNote: normalizeWhitespace(formData.get("adminNote")),
          generateActivation: formData.get("generateActivation") === "yes"
        });

        card.outerHTML = buildAdminMentorApplicationCard(updatedApplication);
        showMessage("adminConsultationMessage", "success", "ÄÃ£ cáº­p nháº­t há»“ sÆ¡ á»©ng tuyá»ƒn mentor.");
      } catch (error) {
        showMessage("adminConsultationMessage", "error", error.message);
      }
    });
  }

  if (mentorProfileUpdateList) {
    mentorProfileUpdateList.addEventListener("submit", async function (e) {
      const form = e.target.closest(".admin-mentor-profile-update-form");
      if (!form) return;

      e.preventDefault();

      const card = form.closest(".admin-request-card");
      if (!card) return;

      const requestId = card.getAttribute("data-mentor-profile-update-id");
      const formData = new FormData(form);

      try {
        const result = await updateAdminMentorProfileUpdateRemote(currentAdminKey, requestId, {
          status: normalizeWhitespace(formData.get("status")),
          adminNote: normalizeWhitespace(formData.get("adminNote"))
        });

        replaceMentorProfileUpdateInStore(result.request);
        if (result.mentorProfile) {
          mergeMentorProfileIntoStore(result.mentorProfile);
        }

        loadMentorProfileUpdates();
        showMessage("adminConsultationMessage", "success", "Ã„ÂÃƒÂ£ cÃ¡ÂºÂ­p nhÃ¡ÂºÂ­t yÃƒÂªu cÃ¡ÂºÂ§u chÃ¡Â»â€°nh sÃ¡Â»Â­a hÃ¡Â»â€œ sÃ†Â¡ mentor.");
      } catch (error) {
        showMessage("adminConsultationMessage", "error", error.message);
      }
    });
  }

  if (bookingListElement) {
    bookingListElement.addEventListener("submit", async function (e) {
      const form = e.target.closest(".admin-booking-request-form");
      if (!form) return;

      e.preventDefault();

      const card = form.closest(".admin-request-card");
      if (!card) return;

      const requestId = card.getAttribute("data-admin-booking-id");
      const formData = new FormData(form);

      try {
        const result = await updateBookingRequestRemote(requestId, {
          status: normalizeWhitespace(formData.get("status")),
          adminNote: normalizeWhitespace(formData.get("adminNote"))
        }, {
          adminKey: currentAdminKey
        });

        replaceBookingRequestInStore(result.request);
        if (result.mentorProfile) {
          mergeMentorProfileIntoStore(result.mentorProfile);
        }

        loadBookingRequestsForAdmin();
        showMessage("adminConsultationMessage", "success", "Ã„ÂÃƒÂ£ cÃ¡ÂºÂ­p nhÃ¡ÂºÂ­t Ã„â€˜Ã„Æ’ng kÃƒÂ½ hÃ¡Â»Âc vÃ¡Â»â€ºi mentor.");
      } catch (error) {
        showMessage("adminConsultationMessage", "error", error.message);
      }
    });
  }

  if (mentorCreateForm) {
    mentorCreateForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      clearMessage("adminConsultationMessage");

      const name = normalizeWhitespace(document.getElementById("adminMentorCreateName").value);
      const role = normalizeWhitespace(document.getElementById("adminMentorCreateRole").value);
      const workplace = normalizeWhitespace(document.getElementById("adminMentorCreateWorkplace").value);
      const focus = normalizeWhitespace(document.getElementById("adminMentorCreateFocus").value);
      const field = normalizeWhitespace(document.getElementById("adminMentorCreateField").value);
      const image = normalizeWhitespace(document.getElementById("adminMentorCreateImage").value);
      const tag = normalizeWhitespace(document.getElementById("adminMentorCreateTag").value);
      const bio = normalizeWhitespace(document.getElementById("adminMentorCreateBio").value);
      const achievementsText = normalizeWhitespace(document.getElementById("adminMentorCreateAchievements").value);
      const fit = normalizeWhitespace(document.getElementById("adminMentorCreateFit").value);
      const ratingValue = normalizeWhitespace(document.getElementById("adminMentorCreateRating").value);
      const studentsValue = normalizeWhitespace(document.getElementById("adminMentorCreateStudents").value);
      const availability = collectCheckedValues(mentorCreateForm, "adminMentorCreateAvailability");
      const service = collectCheckedValues(mentorCreateForm, "adminMentorCreateService");

      if (!name || name.length < 2) {
        showMessage("adminConsultationMessage", "error", "TÃƒÂªn mentor cÃ¡ÂºÂ§n cÃƒÂ³ ÃƒÂ­t nhÃ¡ÂºÂ¥t 2 kÃƒÂ½ tÃ¡Â»Â±.");
        return;
      }

      if (!focus) {
        showMessage("adminConsultationMessage", "error", "HÃƒÂ£y thÃƒÂªm lÃ„Â©nh vÃ¡Â»Â±c chÃƒÂ­nh Ã„â€˜Ã¡Â»Æ’ mentor dÃ¡Â»â€¦ tÃƒÂ¬m.");
        return;
      }

      if (!field) {
        showMessage("adminConsultationMessage", "error", "Vui lÃƒÂ²ng chÃ¡Â»Ân nhÃƒÂ³m lÃ„Â©nh vÃ¡Â»Â±c.");
        return;
      }

      const achievements = achievementsText
        ? achievementsText.split("\n").map(normalizeWhitespace).filter(Boolean)
        : [];
      const finalService = service.length ? service : ["1-1"];
      const finalAvailability = availability.length ? availability : ["sang", "chieu", "toi"];

      try {
        const result = await createAdminMentorProfileRemote(currentAdminKey, {
          name: name,
          image: image || "mentor2.jpg",
          workplace: workplace || "Ã„Âang cÃ¡ÂºÂ­p nhÃ¡ÂºÂ­t",
          tag: tag || ("Mentor " + focus),
          role: role || ("Mentor " + focus),
          bio: bio || "ThÃƒÂ´ng tin mentor sÃ¡ÂºÂ½ Ã„â€˜Ã†Â°Ã¡Â»Â£c bÃ¡Â»â€¢ sung thÃƒÂªm.",
          focus: focus,
          field: field,
          availability: finalAvailability,
          availabilityText: buildMentorAvailabilityText(finalAvailability),
          service: finalService,
          serviceText: buildMentorServiceText(finalService),
          achievements: achievements,
          fit: fit || "PhÃƒÂ¹ hÃ¡Â»Â£p vÃ¡Â»â€ºi mentee Ã„â€˜ang cÃ¡ÂºÂ§n mentor Ã„â€˜Ã¡Â»â€œng hÃƒÂ nh theo mÃ¡Â»Â¥c tiÃƒÂªu hÃ¡Â»Âc tÃ¡ÂºÂ­p cÃ¡Â»Â¥ thÃ¡Â»Æ’.",
          rating: ratingValue ? Number(ratingValue) : undefined,
          studentsTaught: studentsValue ? Number(studentsValue) : undefined
        });

        if (result.mentorProfile) {
          mergeMentorProfileIntoStore(result.mentorProfile);
        }

        mentorCreateForm.reset();
        showMessage("adminConsultationMessage", "success", "Ã„ÂÃƒÂ£ thÃƒÂªm mentor mÃ¡Â»â€ºi. HÃƒÂ£y mÃ¡Â»Å¸ trang tÃƒÂ¬m kiÃ¡ÂºÂ¿m Ã„â€˜Ã¡Â»Æ’ xem hiÃ¡Â»Æ’n thÃ¡Â»â€¹.");
      } catch (error) {
        showMessage("adminConsultationMessage", "error", error.message);
      }
    });
  }

  if (currentAdminKey) {
    const accessInput = document.getElementById("adminAccessKey");
    if (accessInput) {
      accessInput.value = currentAdminKey;
    }
    loadRequests();
    loadMentorApplications();
    loadBookingRequestsForAdmin();
    loadMentorProfileUpdates();
    if (mentorCreateDashboard) {
      mentorCreateDashboard.hidden = false;
    }
  }
}

function initializeMentorDashboardPage() {
  const form = document.getElementById("mentorDashboardForm");
  if (!form) return;

  const currentUser = getCurrentUser();
  if (!currentUser) {
    window.location.href = "login.html?redirect=mentor-dashboard.html";
    return;
  }

  const currentRole = normalizeRole(currentUser.role);
  if (!["mentor", "admin"].includes(currentRole)) {
    showMessage("mentorDashboardMessage", "error", "Chá»‰ tÃ i khoáº£n mentor hoáº·c admin má»›i cÃ³ thá»ƒ dÃ¹ng dashboard nÃ y.");
    form.hidden = true;
    return;
  }

  const fallbackProfile = {
    displayName: currentUser.name || "",
    headline: "",
    workplace: "",
    expertise: "",
    services: "",
    pricing: "",
    availability: "",
    intro: "",
    achievements: "",
    fit: "",
    visibility: "draft",
    rating: "",
    studentsTaught: ""
  };

  const mentorContext = getMentorContextForUser(currentUser);
  const approvedMentor = mentorContext.mentorId ? getResolvedMentorById(mentorContext.mentorId) : null;
  let draftProfile = Object.assign(
    {},
    fallbackProfile,
    approvedMentor ? {
      displayName: approvedMentor.name,
      headline: approvedMentor.role,
      workplace: approvedMentor.workplace || "",
      expertise: approvedMentor.focus,
      services: approvedMentor.serviceText,
      pricing: "",
      availability: approvedMentor.availabilityText,
      intro: approvedMentor.bio || "",
      achievements: (approvedMentor.achievements || []).join("\n"),
      fit: approvedMentor.fit || "",
      visibility: "public",
      rating: approvedMentor.rating || "",
      studentsTaught: approvedMentor.studentsTaught || ""
    } : {},
    getMentorProfileByUserId(currentUser.id) || {}
  );

  const fields = {
    displayName: document.getElementById("mentorDashboardName"),
    headline: document.getElementById("mentorDashboardHeadline"),
    workplace: document.getElementById("mentorDashboardWorkplace"),
    expertise: document.getElementById("mentorDashboardExpertise"),
    services: document.getElementById("mentorDashboardServices"),
    pricing: document.getElementById("mentorDashboardPricing"),
    availability: document.getElementById("mentorDashboardAvailability"),
    intro: document.getElementById("mentorDashboardIntro"),
    achievements: document.getElementById("mentorDashboardAchievements"),
    fit: document.getElementById("mentorDashboardFit"),
    visibility: document.getElementById("mentorDashboardVisibility"),
    rating: document.getElementById("mentorDashboardRating"),
    studentsTaught: document.getElementById("mentorDashboardStudents")
  };

  const previewElements = {
    avatar: document.getElementById("mentorDashboardPreviewAvatar"),
    name: document.getElementById("mentorDashboardPreviewName"),
    headline: document.getElementById("mentorDashboardPreviewHeadline"),
    workplace: document.getElementById("mentorDashboardPreviewWorkplace"),
    expertise: document.getElementById("mentorDashboardPreviewExpertise"),
    services: document.getElementById("mentorDashboardPreviewServices"),
    pricing: document.getElementById("mentorDashboardPreviewPricing"),
    availability: document.getElementById("mentorDashboardPreviewAvailability"),
    intro: document.getElementById("mentorDashboardPreviewIntro"),
    achievements: document.getElementById("mentorDashboardPreviewAchievements"),
    fit: document.getElementById("mentorDashboardPreviewFit"),
    statusBadge: document.getElementById("mentorDashboardStatusBadge")
  };

  function fillForm(payload) {
    fields.displayName.value = payload.displayName || "";
    fields.headline.value = payload.headline || "";
    fields.workplace.value = payload.workplace || "";
    fields.expertise.value = payload.expertise || "";
    fields.services.value = payload.services || "";
    fields.pricing.value = payload.pricing || "";
    fields.availability.value = payload.availability || "";
    fields.intro.value = payload.intro || "";
    fields.achievements.value = payload.achievements || "";
    fields.fit.value = payload.fit || "";
    fields.visibility.value = payload.visibility || "draft";
    if (fields.rating) fields.rating.value = payload.rating || "";
    if (fields.studentsTaught) fields.studentsTaught.value = payload.studentsTaught || "";
  }

  function renderPreview(payload) {
    previewElements.avatar.src = currentUser.avatar || createAvatarFallback(payload.displayName || currentUser.name);
    previewElements.name.textContent = payload.displayName || currentUser.name || "TÃªn mentor";
    previewElements.headline.textContent = payload.headline || "Headline chuyÃªn mÃ´n sáº½ hiá»ƒn thá»‹ á»Ÿ Ä‘Ã¢y.";
    previewElements.workplace.textContent = payload.workplace || "ChÆ°a cáº­p nháº­t";
    previewElements.expertise.textContent = payload.expertise || "ChÆ°a cáº­p nháº­t";
    previewElements.services.textContent = payload.services || "ChÆ°a cáº­p nháº­t";
    previewElements.pricing.textContent = payload.pricing || "ChÆ°a cáº­p nháº­t";
    previewElements.availability.textContent = payload.availability || "ChÆ°a cáº­p nháº­t";
    previewElements.intro.textContent = payload.intro || "Pháº§n giá»›i thiá»‡u mentor sáº½ xuáº¥t hiá»‡n á»Ÿ Ä‘Ã¢y Ä‘á»ƒ báº¡n xem trÆ°á»›c cÃ¡ch hiá»ƒn thá»‹.";
    previewElements.fit.textContent = payload.fit || "MÃ´ táº£ nhÃ³m mentee phÃ¹ há»£p sáº½ hiá»ƒn thá»‹ táº¡i Ä‘Ã¢y.";
    previewElements.statusBadge.textContent =
      payload.visibility === "public" ? "Sáºµn sÃ ng cÃ´ng khai" : "LÆ°u nhÃ¡p ná»™i bá»™";
    previewElements.statusBadge.className =
      "mentor-preview-status " + (payload.visibility === "public" ? "is-public" : "is-draft");

    const achievements = String(payload.achievements || "")
      .split("\n")
      .map(function (item) {
        return item.trim();
      })
      .filter(Boolean);

    previewElements.achievements.innerHTML = achievements.length
      ? achievements.map(function (item) {
          return "<li>" + escapeHtml(item) + "</li>";
        }).join("")
      : "<li>ChÆ°a cÃ³ thÃ nh tÃ­ch ná»•i báº­t.</li>";
  }

  function syncFromForm() {
    draftProfile = {
      displayName: normalizeWhitespace(fields.displayName.value),
      headline: normalizeWhitespace(fields.headline.value),
      workplace: normalizeWhitespace(fields.workplace.value),
      expertise: normalizeWhitespace(fields.expertise.value),
      services: normalizeWhitespace(fields.services.value),
      pricing: normalizeWhitespace(fields.pricing.value),
      availability: normalizeWhitespace(fields.availability.value),
      intro: normalizeWhitespace(fields.intro.value),
      achievements: fields.achievements.value.trim(),
      fit: normalizeWhitespace(fields.fit.value),
      visibility: fields.visibility.value === "public" ? "public" : "draft",
      rating: normalizeWhitespace(fields.rating && fields.rating.value),
      studentsTaught: normalizeWhitespace(fields.studentsTaught && fields.studentsTaught.value),
      updatedAt: new Date().toISOString()
    };

    renderPreview(draftProfile);
  }

  fillForm(draftProfile);
  renderPreview(draftProfile);

  Object.keys(fields).forEach(function (key) {
    const input = fields[key];
    if (!input) return;
    input.addEventListener("input", syncFromForm);
    input.addEventListener("change", syncFromForm);
  });

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    clearMessage("mentorDashboardMessage");
    syncFromForm();

    if ((draftProfile.displayName || currentUser.name).length < 2) {
      showMessage("mentorDashboardMessage", "error", "TÃƒÂªn hiÃ¡Â»Æ’n thÃ¡Â»â€¹ mentor cÃ¡ÂºÂ§n cÃƒÂ³ ÃƒÂ­t nhÃ¡ÂºÂ¥t 2 kÃƒÂ½ tÃ¡Â»Â±.");
      return;
    }

    if (!draftProfile.headline) {
      showMessage("mentorDashboardMessage", "error", "HÃƒÂ£y thÃƒÂªm headline chuyÃƒÂªn mÃƒÂ´n Ã„â€˜Ã¡Â»Æ’ hÃ¡Â»â€œ sÃ†Â¡ rÃƒÂµ rÃƒÂ ng hÃ†Â¡n.");
      return;
    }

    try {
      const result = await submitMentorProfileUpdateRemote({
        displayName: draftProfile.displayName || currentUser.name,
        name: draftProfile.displayName || currentUser.name,
        image: approvedMentor ? approvedMentor.image : currentUser.avatar,
        role: draftProfile.headline,
        headline: draftProfile.headline,
        workplace: draftProfile.workplace,
        focus: draftProfile.expertise,
        expertise: draftProfile.expertise,
        serviceText: draftProfile.services,
        services: draftProfile.services,
        pricing: draftProfile.pricing,
        availabilityText: draftProfile.availability,
        availability: draftProfile.availability,
        bio: draftProfile.intro,
        intro: draftProfile.intro,
        achievements: String(draftProfile.achievements || "").split("\n").map(function (item) { return item.trim(); }).filter(Boolean),
        fit: draftProfile.fit,
        rating: Number(draftProfile.rating || (approvedMentor && approvedMentor.rating) || 4.8),
        studentsTaught: Number(draftProfile.studentsTaught || (approvedMentor && approvedMentor.studentsTaught) || 0),
        visibility: draftProfile.visibility
      });

      saveMentorProfileByUserId(currentUser.id, result.draft || draftProfile);
      if (result.request) {
        replaceMentorProfileUpdateInStore(result.request);
      }

      showMessage("mentorDashboardMessage", "success", "HÃ¡Â»â€œ sÃ†Â¡ mentor Ã„â€˜ÃƒÂ£ Ã„â€˜Ã†Â°Ã¡Â»Â£c gÃ¡Â»Â­i vÃ¡Â»Â admin Ã„â€˜Ã¡Â»Æ’ duyÃ¡Â»â€¡t. Sau khi approved, trang tÃƒÂ¬m kiÃ¡ÂºÂ¿m mentor sÃ¡ÂºÂ½ tÃ¡Â»Â± cÃ¡ÂºÂ­p nhÃ¡ÂºÂ­t.");
    } catch (error) {
      showMessage("mentorDashboardMessage", "error", error.message);
    }
  });
}

function getRedirectTarget() {
  const params = new URLSearchParams(window.location.search);
  return params.get("redirect");
}

function redirectIfAuthenticated() {
  if (
    !window.location.pathname.endsWith("login.html") &&
    !window.location.pathname.endsWith("register.html") &&
    !window.location.pathname.endsWith("forgot-password.html")
  ) {
    return;
  }

  const current = getCurrentUser();
  if (current) {
    window.location.href = getRedirectTarget() || getRoleHomePath(current.role);
  }
}

function initializeRegisterPage() {
  const registerForm = document.getElementById("registerForm");
  if (!registerForm) return;
  if (!ensureSupabaseReady("registerMessage")) return;

  registerForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    clearMessage("registerMessage");

    const name = document.getElementById("registerName").value.trim();
    const email = normalizeEmail(document.getElementById("registerEmail").value);
    const phone = normalizePhone(document.getElementById("registerPhone").value);
    const goal = document.getElementById("registerGoal").value.trim();
    const role = normalizeRole(document.getElementById("registerRole").value);
    const password = document.getElementById("registerPassword").value;
    const confirmPassword = document.getElementById("registerConfirmPassword").value;
    const agreed = document.getElementById("registerAgree").checked;
    if (name.length < 2) {
      showMessage("registerMessage", "error", "Há» vÃ  tÃªn cáº§n cÃ³ Ã­t nháº¥t 2 kÃ½ tá»±.");
      return;
    }

    if (!email.includes("@")) {
      showMessage("registerMessage", "error", "Email chÆ°a Ä‘Ãºng Ä‘á»‹nh dáº¡ng.");
      return;
    }

    if (phone.length < 10) {
      showMessage("registerMessage", "error", "Sá»‘ Ä‘iá»‡n thoáº¡i cáº§n cÃ³ Ã­t nháº¥t 10 chá»¯ sá»‘.");
      return;
    }

    if (password.length < 8) {
      showMessage("registerMessage", "error", "Máº­t kháº©u cáº§n cÃ³ tá»‘i thiá»ƒu 8 kÃ½ tá»±.");
      return;
    }

    if (password !== confirmPassword) {
      showMessage("registerMessage", "error", "Máº­t kháº©u xÃ¡c nháº­n chÆ°a khá»›p.");
      return;
    }

    if (!agreed) {
      showMessage("registerMessage", "error", "Báº¡n cáº§n Ä‘á»“ng Ã½ vá»›i Ä‘iá»u khoáº£n lÆ°u trá»¯ thÃ´ng tin Ä‘á»ƒ tiáº¿p tá»¥c.");
      return;
    }

    try {
      const { data, error } = await supabaseClient.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            full_name: name,
            role: role
          }
        }
      });

      if (error) {
        throw error;
      }

      if (!data.user) {
        throw new Error("KhÃ´ng thá»ƒ táº¡o tÃ i khoáº£n lÃºc nÃ y.");
      }

      if (data.session) {
        await upsertProfile({
          id: data.user.id,
          full_name: name,
          phone: phone,
          goal: goal,
          bio: "",
          role: role,
          avatar_url: createAvatarFallback(name),
          updated_at: new Date().toISOString()
        });

        const sessionUser = await loadCurrentUserFromSupabase();
        saveAuthSession(sessionUser);
        showMessage("registerMessage", "success", "Táº¡o tÃ i khoáº£n thÃ nh cÃ´ng. Báº¡n Ä‘ang Ä‘Æ°á»£c chuyá»ƒn tá»›i há»“ sÆ¡ cÃ¡ nhÃ¢n...");
        window.setTimeout(function () {
          window.location.href = "profile.html";
        }, 900);
        return;
      }

      showMessage("registerMessage", "success", "TÃ i khoáº£n Ä‘Ã£ Ä‘Æ°á»£c táº¡o. HÃ£y kiá»ƒm tra email Ä‘á»ƒ xÃ¡c nháº­n trÆ°á»›c khi Ä‘Äƒng nháº­p.");
    } catch (error) {
      showMessage("registerMessage", "error", error.message || "KhÃ´ng thá»ƒ táº¡o tÃ i khoáº£n trÃªn Supabase.");
    }
  });
}

function initializeLoginPage() {
  const loginForm = document.getElementById("loginForm");
  if (!loginForm) return;

  loginForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    clearMessage("loginMessage");

    const identifier = document.getElementById("loginIdentifier").value.trim();
    const password = document.getElementById("loginPassword").value;
    if (!identifier || !password) {
      showMessage("loginMessage", "error", "Vui lÃ²ng nháº­p Ä‘áº§y Ä‘á»§ thÃ´ng tin Ä‘Äƒng nháº­p.");
      return;
    }

    const demoUser = createDemoSessionUser(identifier);
    const isDemoAdminOnly = demoUser && normalizeRole(demoUser.role) === "admin" && password === identifier;
    const isDemoMentee = demoUser && normalizeRole(demoUser.role) === "mentee" && normalizeEmail(identifier) === DEMO_MENTEE_EMAIL && password === DEMO_MENTEE_PASSWORD;

    if (demoUser && (isDemoAdminOnly || isDemoMentee)) {
      if (demoUser.role === "admin") {
        sessionStorage.setItem("mentorMeAdminKey", DEMO_ADMIN_ACCESS_CODE);
      }

      saveAuthSession(demoUser);
      showMessage("loginMessage", "success", "ÄÄƒng nháº­p tÃ i khoáº£n test thÃ nh cÃ´ng. Äang chuyá»ƒn Ä‘áº¿n trang phÃ¹ há»£p...");
      window.setTimeout(function () {
        window.location.href = getRedirectTarget() || getRoleHomePath(demoUser.role);
      }, 500);
      return;
    }

    if (!ensureSupabaseReady("loginMessage")) return;

    if (!identifier.includes("@")) {
      showMessage("loginMessage", "error", "Vá»›i tÃ i khoáº£n tháº­t, vui lÃ²ng dÃ¹ng email Ä‘Ã£ Ä‘Äƒng kÃ½. Mentor sau khi kÃ­ch hoáº¡t sáº½ Ä‘Äƒng nháº­p báº±ng email á»©ng tuyá»ƒn vÃ  máº­t kháº©u vá»«a táº¡o, giá»‘ng nhÆ° mentee.");
      return;
    }

    try {
      const { error } = await supabaseClient.auth.signInWithPassword({
        email: normalizeEmail(identifier),
        password: password
      });

      if (error) {
        throw error;
      }

      const sessionUser = await loadCurrentUserFromSupabase();
      if (!sessionUser) {
        throw new Error("ÄÄƒng nháº­p thÃ nh cÃ´ng nhÆ°ng khÃ´ng táº£i Ä‘Æ°á»£c há»“ sÆ¡.");
      }

      showMessage("loginMessage", "success", "ÄÄƒng nháº­p thÃ nh cÃ´ng. Äang chuyá»ƒn Ä‘áº¿n trang tiáº¿p theo...");
      window.setTimeout(function () {
        window.location.href = getRedirectTarget() || getRoleHomePath(sessionUser.role);
      }, 700);
    } catch (error) {
      showMessage("loginMessage", "error", error.message || "KhÃ´ng thá»ƒ Ä‘Äƒng nháº­p lÃºc nÃ y.");
    }
  });
}

function initializeProfilePage() {
  const profileForm = document.getElementById("profileForm");
  if (!profileForm) return;

  const sessionUser = getCurrentUser();
  if (!sessionUser) {
    window.location.href = "login.html?redirect=profile.html";
    return;
  }
  const demoMode = isDemoAccount(sessionUser);
  if (!demoMode && !ensureSupabaseReady("profileMessage")) return;

  let currentProfileUser = sessionUser;

  const profileAvatar = document.getElementById("profileAvatar");
  const profileDisplayName = document.getElementById("profileDisplayName");
  const profileHeadline = document.getElementById("profileHeadline");
  const profileGoalPreview = document.getElementById("profileGoalPreview");
  const profileEmailText = document.getElementById("profileEmailText");
  const profilePhoneText = document.getElementById("profilePhoneText");
  const profileRoleText = document.getElementById("profileRoleText");
  const profileCreatedAt = document.getElementById("profileCreatedAt");
  const profileBannerTitle = document.getElementById("profileBannerTitle");
  const profileBannerDescription = document.getElementById("profileBannerDescription");
  const profileSectionDescription = document.getElementById("profileSectionDescription");
  const profileNameInput = document.getElementById("profileNameInput");
  const profileEmailInput = document.getElementById("profileEmailInput");
  const profilePhoneInput = document.getElementById("profilePhoneInput");
  const profileGoalInput = document.getElementById("profileGoalInput");
  const profileGoalLabel = document.getElementById("profileGoalLabel");
  const profileRoleInput = document.getElementById("profileRoleInput");
  const profileRoleHint = document.getElementById("profileRoleHint");
  const profileBioInput = document.getElementById("profileBioInput");
  const profileBioLabel = document.getElementById("profileBioLabel");
  const profileAvatarUpload = document.getElementById("profileAvatarUpload");
  const profileLogoutBtn = document.getElementById("profileLogoutBtn");

  function updateProfileFormCopy(account) {
    const normalizedRole = normalizeRole(account.role);

    if (profileGoalLabel) {
      profileGoalLabel.textContent = getRoleGoalLabel(normalizedRole);
    }

    if (profileGoalInput) {
      profileGoalInput.placeholder = getRoleGoalPlaceholder(normalizedRole);
    }

    if (profileBioLabel) {
      profileBioLabel.textContent = normalizedRole === "mentee" ? "Giá»›i thiá»‡u ngáº¯n" : "MÃ´ táº£ ngáº¯n";
    }

    if (profileBioInput) {
      profileBioInput.placeholder = getRoleBioPlaceholder(normalizedRole);
    }

    if (profileRoleHint) {
      profileRoleHint.textContent = normalizedRole === "mentee"
        ? "TÃ i khoáº£n mentee Ä‘Æ°á»£c Ä‘Äƒng kÃ½ cÃ´ng khai. Mentor Ä‘Æ°á»£c cáº¥p riÃªng sau khi chá»n lá»c."
        : "Loáº¡i tÃ i khoáº£n nÃ y Ä‘Æ°á»£c cáº¥p riÃªng theo quy trÃ¬nh ná»™i bá»™ nÃªn khÃ´ng Ä‘á»•i trá»±c tiáº¿p táº¡i há»“ sÆ¡ cÃ¡ nhÃ¢n.";
    }

    if (profileBannerTitle) {
      profileBannerTitle.textContent = normalizedRole === "mentor"
        ? "Quáº£n lÃ½ tÃ i khoáº£n mentor vÃ  sáºµn sÃ ng hoÃ n thiá»‡n dashboard chuyÃªn mÃ´n."
        : normalizedRole === "admin"
          ? "Quáº£n lÃ½ tÃ i khoáº£n ná»™i bá»™ vÃ  pháº¡m vi cÃ´ng viá»‡c Ä‘Æ°á»£c phÃ¢n quyá»n."
          : "Quáº£n lÃ½ thÃ´ng tin vÃ  sáºµn sÃ ng káº¿t ná»‘i vá»›i mentor phÃ¹ há»£p.";
    }

    if (profileBannerDescription) {
      profileBannerDescription.textContent = normalizedRole === "mentor"
        ? "Giá»¯ thÃ´ng tin liÃªn há»‡ nháº¥t quÃ¡n Ä‘á»ƒ Ä‘á»™i ngÅ© Mentor Me dá»… xÃ¡c minh vÃ  mentee dá»… nháº­n diá»‡n khi há»“ sÆ¡ Ä‘Æ°á»£c má»Ÿ cÃ´ng khai."
        : normalizedRole === "admin"
          ? "Há»“ sÆ¡ ná»™i bá»™ táº­p trung vÃ o liÃªn há»‡ cÃ´ng viá»‡c vÃ  pháº¡m vi phá»¥ trÃ¡ch, cÃ²n pháº§n váº­n hÃ nh chÃ­nh náº±m á»Ÿ khu quáº£n trá»‹ ná»™i bá»™."
          : "Cáº­p nháº­t má»¥c tiÃªu, cÃ¡ch há»c vÃ  thÃ´ng tin liÃªn há»‡ Ä‘á»ƒ tráº£i nghiá»‡m tÃ¬m mentor trá»Ÿ nÃªn sÃ¡t nhu cáº§u hÆ¡n.";
    }

    if (profileSectionDescription) {
      profileSectionDescription.textContent = normalizedRole === "mentor"
        ? "Cáº­p nháº­t thÃ´ng tin tÃ i khoáº£n cÆ¡ báº£n. Pháº§n chuyÃªn mÃ´n, dá»‹ch vá»¥ vÃ  lá»‹ch ráº£nh náº±m á»Ÿ dashboard mentor."
        : normalizedRole === "admin"
          ? "Cáº­p nháº­t thÃ´ng tin tÃ i khoáº£n ná»™i bá»™ cÆ¡ báº£n. Viá»‡c xá»­ lÃ½ lead vÃ  há»“ sÆ¡ mentor Ä‘Æ°á»£c thá»±c hiá»‡n á»Ÿ khu quáº£n trá»‹ ná»™i bá»™."
          : "Cáº­p nháº­t há»“ sÆ¡ Ä‘á»ƒ mentor hiá»ƒu rÃµ hÆ¡n vá» nhu cáº§u vÃ  má»¥c tiÃªu há»c táº­p cá»§a báº¡n.";
    }
  }

  function fillProfile(account) {
    const normalizedRole = normalizeRole(account.role);
    profileAvatar.src = account.avatar || createAvatarFallback(account.name);
    profileDisplayName.textContent = account.name;
    profileHeadline.textContent = account.bio || "Há»“ sÆ¡ cÃ¡ nhÃ¢n Mentor Me";
    profileGoalPreview.textContent = account.goal
      ? (normalizedRole === "mentee" ? "Má»¥c tiÃªu hiá»‡n táº¡i: " : "Äá»‹nh hÆ°á»›ng hiá»‡n táº¡i: ") + account.goal
      : normalizedRole === "mentor"
        ? "Báº¡n chÆ°a thÃªm Ä‘á»‹nh hÆ°á»›ng mentoring. HÃ£y cáº­p nháº­t Ä‘á»ƒ Ä‘á»™i ngÅ© Mentor Me vÃ  mentee hiá»ƒu rÃµ hÆ¡n vá» vai trÃ² cá»§a báº¡n."
        : normalizedRole === "admin"
          ? "Báº¡n chÆ°a thÃªm pháº¡m vi phá»¥ trÃ¡ch. HÃ£y cáº­p nháº­t Ä‘á»ƒ ná»™i bá»™ dá»… nháº­n biáº¿t vai trÃ² cá»§a tÃ i khoáº£n nÃ y."
          : "Báº¡n chÆ°a thÃªm má»¥c tiÃªu há»c táº­p. HÃ£y cáº­p nháº­t Ä‘á»ƒ mentor hiá»ƒu rÃµ hÆ¡n vá» nhu cáº§u cá»§a báº¡n.";
    profileEmailText.textContent = account.email;
    profilePhoneText.textContent = account.phone;
    profileRoleText.textContent = formatRoleLabel(normalizedRole);
    profileCreatedAt.textContent = formatDate(account.createdAt);
    profileNameInput.value = account.name || "";
    profileEmailInput.value = account.email || "";
    profilePhoneInput.value = account.phone || "";
    profileGoalInput.value = account.goal || "";
    profileRoleInput.value = normalizedRole;
    profileBioInput.value = account.bio || "";
    updateProfileFormCopy(account);
  }

  let draftAvatar = currentProfileUser.avatar || createAvatarFallback(currentProfileUser.name);
  fillProfile(currentProfileUser);

  if (profileRoleInput) {
    profileRoleInput.disabled = true;
  }

  if (!demoMode) {
    loadCurrentUserFromSupabase()
      .then(function (payload) {
        currentProfileUser = payload;
        draftAvatar = currentProfileUser.avatar || createAvatarFallback(currentProfileUser.name);
        saveCurrentUser(currentProfileUser);
        fillProfile(currentProfileUser);
      })
      .catch(function () {
        clearAuthSession();
        window.location.href = "login.html?redirect=profile.html";
      });
  }

  profileAvatarUpload.addEventListener("change", function () {
    const file = profileAvatarUpload.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {
      draftAvatar = event.target.result;
      profileAvatar.src = draftAvatar;
    };
    reader.readAsDataURL(file);
  });

  profileForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    clearMessage("profileMessage");

    const updatedName = profileNameInput.value.trim();
    const updatedPhone = normalizePhone(profilePhoneInput.value);
    const updatedGoal = profileGoalInput.value.trim();
    const updatedRole = normalizeRole(profileRoleInput.value);
    const updatedBio = profileBioInput.value.trim();
    if (updatedName.length < 2) {
      showMessage("profileMessage", "error", "TÃªn hiá»ƒn thá»‹ cáº§n cÃ³ Ã­t nháº¥t 2 kÃ½ tá»±.");
      return;
    }

    if (updatedPhone.length < 10) {
      showMessage("profileMessage", "error", "Sá»‘ Ä‘iá»‡n thoáº¡i cáº§n cÃ³ Ã­t nháº¥t 10 chá»¯ sá»‘.");
      return;
    }

    try {
      if (demoMode) {
        currentProfileUser = Object.assign({}, currentProfileUser, {
          name: updatedName,
          phone: updatedPhone,
          goal: updatedGoal,
          bio: updatedBio,
          role: updatedRole,
          avatar: draftAvatar || createAvatarFallback(updatedName)
        });
        saveCurrentUser(currentProfileUser);
        fillProfile(currentProfileUser);
        showMessage("profileMessage", "success", "ÄÃ£ cáº­p nháº­t há»“ sÆ¡ tÃ i khoáº£n test.");
        return;
      }

      await upsertProfile({
        id: currentProfileUser.id,
        full_name: updatedName,
        phone: updatedPhone,
        goal: updatedGoal,
        bio: updatedBio,
        role: updatedRole,
        avatar_url: draftAvatar || createAvatarFallback(updatedName),
        updated_at: new Date().toISOString()
      });

      const authUser = await getSupabaseAuthUser();
      currentProfileUser = buildSessionUser(authUser, {
        id: currentProfileUser.id,
        full_name: updatedName,
        phone: updatedPhone,
        goal: updatedGoal,
        bio: updatedBio,
        role: updatedRole,
        avatar_url: draftAvatar || createAvatarFallback(updatedName),
        created_at: currentProfileUser.createdAt,
        updated_at: new Date().toISOString()
      });
      saveCurrentUser(currentProfileUser);
      fillProfile(currentProfileUser);
      showMessage("profileMessage", "success", "Há»“ sÆ¡ Ä‘Ã£ Ä‘Æ°á»£c cáº­p nháº­t thÃ nh cÃ´ng.");
    } catch (error) {
      showMessage("profileMessage", "error", error.message);
    }
  });

  const changePasswordForm = document.getElementById("changePasswordForm");
  if (changePasswordForm) {
    changePasswordForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      clearMessage("profileMessage");

      const currentPassword = document.getElementById("currentPasswordInput").value;
      const newPassword = document.getElementById("newPasswordInput").value;
      const confirmNewPassword = document.getElementById("confirmNewPasswordInput").value;
      if (newPassword.length < 8) {
        showMessage("profileMessage", "error", "Máº­t kháº©u má»›i cáº§n cÃ³ tá»‘i thiá»ƒu 8 kÃ½ tá»±.");
        return;
      }

      if (newPassword !== confirmNewPassword) {
        showMessage("profileMessage", "error", "Máº­t kháº©u má»›i vÃ  xÃ¡c nháº­n máº­t kháº©u chÆ°a khá»›p.");
        return;
      }

      try {
        if (demoMode) {
          changePasswordForm.reset();
          showMessage("profileMessage", "success", "ÄÃ£ Ä‘á»•i máº­t kháº©u giáº£ láº­p cho tÃ i khoáº£n test.");
          return;
        }

        const { error: reauthError } = await supabaseClient.auth.signInWithPassword({
          email: currentProfileUser.email,
          password: currentPassword
        });

        if (reauthError) {
          throw new Error("Máº­t kháº©u hiá»‡n táº¡i chÆ°a chÃ­nh xÃ¡c.");
        }

        const { error: updateError } = await supabaseClient.auth.updateUser({
          password: newPassword
        });

        if (updateError) {
          throw updateError;
        }

        changePasswordForm.reset();
        showMessage("profileMessage", "success", "Máº­t kháº©u Ä‘Ã£ Ä‘Æ°á»£c cáº­p nháº­t thÃ nh cÃ´ng.");
      } catch (error) {
        showMessage("profileMessage", "error", error.message);
      }
    });
  }

  profileLogoutBtn.addEventListener("click", async function () {
    try {
      if (!demoMode) {
        await supabaseClient.auth.signOut();
      }
    } catch (error) {
      // Ignore sign-out errors and clear local session anyway.
    }
    clearAuthSession();
    window.location.href = "index.html";
  });
}

function buildBookingStatusLabel(status) {
  const normalizedStatus = normalizeWhitespace(status).toLowerCase();
  if (normalizedStatus === "accepted") return "ÄÃ£ nháº­n";
  if (normalizedStatus === "rejected") return "ÄÃ£ tá»« chá»‘i";
  if (normalizedStatus === "completed") return "ÄÃ£ hoÃ n thÃ nh";
  return "Chá» pháº£n há»“i";
}

function buildMenteeScheduleCard(request) {
  const submittedReview = getSubmittedReviewByBookingId(request.id);
  const canReview = request.status === "accepted" || request.status === "completed";
  const reviewHtml = !canReview
    ? `
        <div class="schedule-review-box is-muted">
          <span>ÄÃ¡nh giÃ¡ mentor</span>
          <p>Báº¡n cÃ³ thá»ƒ Ä‘Ã¡nh giÃ¡ mentor sau khi yÃªu cáº§u Ä‘Ã£ Ä‘Æ°á»£c nháº­n.</p>
        </div>
      `
    : submittedReview
      ? `
          <div class="schedule-review-box">
            <span>ÄÃ¡nh giÃ¡ cá»§a báº¡n</span>
            <div class="schedule-review-summary">
              <strong>${Number(submittedReview.rating || 0).toFixed(1)} / 5 sao</strong>
              <p>${escapeHtml(submittedReview.content || "Báº¡n Ä‘Ã£ gá»­i Ä‘Ã¡nh giÃ¡ cho mentor nÃ y.")}</p>
            </div>
          </div>
        `
      : `
          <form class="schedule-review-form" data-booking-review-id="${request.id}">
            <div class="schedule-review-form-head">
              <span>ÄÃ¡nh giÃ¡ mentor</span>
              <p>Chia sáº» nhanh tráº£i nghiá»‡m cá»§a báº¡n Ä‘á»ƒ há»“ sÆ¡ mentor hiá»ƒn thá»‹ chÃ¢n thá»±c hÆ¡n.</p>
            </div>
            <div class="schedule-review-fields">
              <label class="auth-field">
                <span>Sá»‘ sao</span>
                <select name="rating" required>
                  <option value="">Chá»n sá»‘ sao</option>
                  <option value="5">5 sao</option>
                  <option value="4">4 sao</option>
                  <option value="3">3 sao</option>
                  <option value="2">2 sao</option>
                  <option value="1">1 sao</option>
                </select>
              </label>
              <label class="auth-field profile-full-width">
                <span>Nháº­n xÃ©t</span>
                <textarea name="content" rows="4" placeholder="VÃ­ dá»¥: Mentor giáº£i thÃ­ch rÃµ, theo sÃ¡t vÃ  giÃºp mÃ¬nh tá»± tin hÆ¡n." required></textarea>
              </label>
            </div>
            <button type="submit" class="mentor-primary-btn">Gá»­i Ä‘Ã¡nh giÃ¡</button>
          </form>
        `;

  return `
    <article class="schedule-card">
      <div class="schedule-card-head">
        <div>
          <span class="schedule-card-label">Mentor</span>
          <h3>${escapeHtml(request.mentorName)}</h3>
        </div>
        <span class="admin-request-status status-${escapeHtml(request.status)}">${buildBookingStatusLabel(request.status)}</span>
      </div>
      <div class="schedule-card-grid">
        <p><strong>Má»¥c tiÃªu:</strong> ${escapeHtml(request.goal)}</p>
        <p><strong>Thá»i gian mong muá»‘n:</strong> ${escapeHtml(request.preferredTime)}</p>
        <p><strong>Gá»­i lÃºc:</strong> ${formatDate(request.createdAt)}</p>
        <p><strong>LÄ©nh vá»±c:</strong> ${escapeHtml(request.mentorFocus || "ChÆ°a cáº­p nháº­t")}</p>
      </div>
      <div class="schedule-card-note">
        <span>Ghi chÃº</span>
        <p>${escapeHtml(request.note || "KhÃ´ng cÃ³ ghi chÃº thÃªm.")}</p>
      </div>
      ${reviewHtml}
    </article>
  `;
}

function buildMentorLeadCard(request) {
  return `
    <article class="schedule-card">
      <div class="schedule-card-head">
        <div>
          <span class="schedule-card-label">YÃªu cáº§u má»›i</span>
          <h3>${escapeHtml(request.menteeName)}</h3>
        </div>
        <span class="admin-request-status status-${escapeHtml(request.status)}">${buildBookingStatusLabel(request.status)}</span>
      </div>
      <div class="schedule-card-grid">
        <p><strong>Email:</strong> ${escapeHtml(request.menteeEmail)}</p>
        <p><strong>Mentor Ä‘Æ°á»£c chá»n:</strong> ${escapeHtml(request.mentorName)}</p>
        <p><strong>Thá»i gian mong muá»‘n:</strong> ${escapeHtml(request.preferredTime)}</p>
        <p><strong>NgÃ y gá»­i:</strong> ${formatDate(request.createdAt)}</p>
      </div>
      <div class="schedule-card-note">
        <span>Má»¥c tiÃªu mentee</span>
        <p>${escapeHtml(request.goal)}</p>
      </div>
      <div class="schedule-card-actions">
        <button type="button" class="mentor-primary-btn" data-booking-action="accept" data-booking-id="${request.id}">Nháº­n mentee</button>
        <button type="button" class="mentor-secondary-btn" data-booking-action="reject" data-booking-id="${request.id}">Tá»« chá»‘i</button>
      </div>
    </article>
  `;
}

function buildAdminBookingRequestCard(request) {
  return `
    <article class="admin-request-card" data-admin-booking-id="${request.id}">
      <div class="admin-request-head">
        <div>
          <span class="admin-request-label">Mentor Booking</span>
          <h3>${escapeHtml(request.menteeName)}</h3>
        </div>
        <span class="admin-request-status status-${escapeHtml(request.status)}">${buildBookingStatusLabel(request.status)}</span>
      </div>

      <div class="admin-request-grid">
        <p><strong>Email mentee:</strong> ${escapeHtml(request.menteeEmail)}</p>
        <p><strong>Mentor:</strong> ${escapeHtml(request.mentorName)}</p>
        <p><strong>Khung giá»:</strong> ${escapeHtml(request.preferredTime)}</p>
        <p><strong>NgÃ y gá»­i:</strong> ${formatDate(request.createdAt)}</p>
      </div>

      <div class="admin-request-body">
        <div class="admin-request-block">
          <span>Má»¥c tiÃªu há»c</span>
          <p>${escapeHtml(request.goal || "ChÆ°a cáº­p nháº­t")}</p>
        </div>
        <div class="admin-request-block">
          <span>Ghi chÃº mentee</span>
          <p>${escapeHtml(request.note || "KhÃ´ng cÃ³ ghi chÃº thÃªm.")}</p>
        </div>
      </div>

      <form class="admin-booking-request-form">
        <label class="auth-field">
          <span>Tráº¡ng thÃ¡i</span>
          <select name="status">
            <option value="pending" ${request.status === "pending" ? "selected" : ""}>pending</option>
            <option value="accepted" ${request.status === "accepted" ? "selected" : ""}>accepted</option>
            <option value="rejected" ${request.status === "rejected" ? "selected" : ""}>rejected</option>
            <option value="completed" ${request.status === "completed" ? "selected" : ""}>completed</option>
          </select>
        </label>

        <label class="auth-field">
          <span>Ghi chÃº admin</span>
          <textarea name="adminNote" rows="4" placeholder="VÃ­ dá»¥: ÄÃ£ xÃ¡c nháº­n Ä‘Ã¢y lÃ  lead phÃ¹ há»£p cho mentor.">${escapeHtml(request.adminNote || "")}</textarea>
        </label>

        <button type="submit" class="mentor-primary-btn">LÆ°u cáº­p nháº­t</button>
      </form>
    </article>
  `;
}

function buildAcceptedMenteeCard(request) {
  return `
    <article class="schedule-card">
      <div class="schedule-card-head">
        <div>
          <span class="schedule-card-label">Mentee Ä‘Ã£ nháº­n</span>
          <h3>${escapeHtml(request.menteeName)}</h3>
        </div>
        <span class="admin-request-status status-${escapeHtml(request.status)}">${buildBookingStatusLabel(request.status)}</span>
      </div>
      <div class="schedule-card-grid">
        <p><strong>Email:</strong> ${escapeHtml(request.menteeEmail)}</p>
        <p><strong>Mentor:</strong> ${escapeHtml(request.mentorName)}</p>
        <p><strong>Lá»‹ch dáº¡y:</strong> ${escapeHtml(request.preferredTime)}</p>
        <p><strong>Má»¥c tiÃªu:</strong> ${escapeHtml(request.goal)}</p>
      </div>
      <div class="schedule-card-note">
        <span>Ghi chÃº cá»§a mentee</span>
        <p>${escapeHtml(request.note || "KhÃ´ng cÃ³ ghi chÃº thÃªm.")}</p>
      </div>
    </article>
  `;
}

function buildAcceptedMenteeDetailCard(request) {
  return `
    <a class="schedule-card schedule-card-link" href="mentor-booking-detail.html?id=${encodeURIComponent(request.id)}">
      <div class="schedule-card-head">
        <div>
          <span class="schedule-card-label">Mentee Ä‘Ã£ nháº­n</span>
          <h3>${escapeHtml(request.menteeName)}</h3>
        </div>
        <span class="admin-request-status status-${escapeHtml(request.status)}">${buildBookingStatusLabel(request.status)}</span>
      </div>
      <div class="schedule-card-grid">
        <p><strong>Email:</strong> ${escapeHtml(request.menteeEmail)}</p>
        <p><strong>Khung giá»:</strong> ${escapeHtml(request.preferredTime)}</p>
        <p><strong>Má»¥c tiÃªu:</strong> ${escapeHtml(request.goal)}</p>
        <p><strong>Mentor:</strong> ${escapeHtml(request.mentorName)}</p>
      </div>
      <div class="schedule-card-note">
        <span>Äi tá»›i chi tiáº¿t</span>
        <p>Báº¥m vÃ o Ã´ nÃ y Ä‘á»ƒ xem Ä‘áº§y Ä‘á»§ thÃ´ng tin mentee, buá»•i há»c vÃ  há»“ sÆ¡ mentor liÃªn quan.</p>
      </div>
    </a>
  `;
}

function parsePreferredTimeToWeekday(timeText) {
  const text = normalizeWhitespace(timeText).toLowerCase();
  if (text.includes("thá»© 2")) return 1;
  if (text.includes("thá»© 3")) return 2;
  if (text.includes("thá»© 4")) return 3;
  if (text.includes("thá»© 5")) return 4;
  if (text.includes("thá»© 6")) return 5;
  if (text.includes("thá»© 7")) return 6;
  if (text.includes("cn") || text.includes("chá»§ nháº­t")) return 0;
  return null;
}

function getCalendarDatesForRequestInMonth(request, referenceDate) {
  const activeDate = referenceDate instanceof Date ? referenceDate : new Date();
  const year = activeDate.getFullYear();
  const month = activeDate.getMonth();
  const weekday = parsePreferredTimeToWeekday(request.preferredTime);
  const totalDays = new Date(year, month + 1, 0).getDate();

  if (weekday === null) {
    return [new Date(year, month, Math.min(28, Math.max(1, activeDate.getDate())))];
  }

  const matches = [];
  for (let day = 1; day <= totalDays; day += 1) {
    const currentDate = new Date(year, month, day);
    if (currentDate.getDay() === weekday) {
      matches.push(currentDate);
    }
  }

  if (matches.length) {
    return matches;
  }

  return [new Date(year, month, Math.min(28, Math.max(1, activeDate.getDate())))];
}

function getAcceptedRequestsForCurrentMentor(currentUser) {
  return filterRequestsForCurrentMentor(getBookingRequests(), currentUser).filter(function (request) {
    return request.status === "accepted" || request.status === "completed";
  });
}

function renderCalendarGrid(gridElement, monthLabelElement, requests, linkBuilder, emptyMessage, referenceDate) {
  if (!gridElement || !monthLabelElement) return;

  const today = new Date();
  const activeDate = referenceDate instanceof Date ? referenceDate : new Date();
  const year = activeDate.getFullYear();
  const month = activeDate.getMonth();
  const firstDate = new Date(year, month, 1);
  const startOffset = (firstDate.getDay() + 6) % 7;
  const totalDays = new Date(year, month + 1, 0).getDate();

  monthLabelElement.textContent = firstDate.toLocaleDateString("vi-VN", {
    month: "long",
    year: "numeric"
  });

  if (!requests.length) {
    gridElement.innerHTML = `
      <div class="admin-empty-state mentor-calendar-empty">
        <h3>ChÆ°a cÃ³ lá»‹ch há»c nÃ o</h3>
        <p>${emptyMessage}</p>
      </div>
    `;
    return;
  }

  const eventsByDay = requests.reduce(function (map, request) {
    getCalendarDatesForRequestInMonth(request, firstDate).forEach(function (eventDate) {
      const day = eventDate.getDate();
      if (!map[day]) {
        map[day] = [];
      }
      map[day].push(request);
    });
    return map;
  }, {});

  const cells = [];
  for (let i = 0; i < startOffset; i += 1) {
    cells.push('<div class="mentor-calendar-cell is-empty"></div>');
  }

  for (let day = 1; day <= totalDays; day += 1) {
    const events = eventsByDay[day] || [];
    const isToday =
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear();
    cells.push(`
      <div class="mentor-calendar-cell ${isToday ? "is-today" : ""}">
        <div class="mentor-calendar-date">${day}</div>
        <div class="mentor-calendar-events">
          ${events.map(function (request) {
            return `
              <a href="${linkBuilder(request)}" class="mentor-calendar-event">
                <strong>${escapeHtml(request.menteeName || request.mentorName)}</strong>
                <span>${escapeHtml(request.preferredTime)}</span>
              </a>
            `;
          }).join("")}
        </div>
      </div>
    `);
  }

  gridElement.innerHTML = cells.join("");
}

function attachCalendarNavigator(options) {
  const gridElement = options.gridElement;
  const monthLabelElement = options.monthLabelElement;
  const prevButton = options.prevButton;
  const nextButton = options.nextButton;
  const requests = options.requests || [];
  const linkBuilder = options.linkBuilder;
  const emptyMessage = options.emptyMessage;
  if (!gridElement || !monthLabelElement || !prevButton || !nextButton) return;

  let monthOffset = 0;

  function render() {
    const activeDate = new Date();
    activeDate.setDate(1);
    activeDate.setMonth(activeDate.getMonth() + monthOffset);
    renderCalendarGrid(gridElement, monthLabelElement, requests, linkBuilder, emptyMessage, activeDate);
  }

  if (!prevButton.dataset.calendarBound) {
    prevButton.addEventListener("click", function () {
      monthOffset -= 1;
      render();
    });
    prevButton.dataset.calendarBound = "true";
  }

  if (!nextButton.dataset.calendarBound) {
    nextButton.addEventListener("click", function () {
      monthOffset += 1;
      render();
    });
    nextButton.dataset.calendarBound = "true";
  }

  render();
}

function filterRequestsForCurrentMentor(requests, currentUser) {
  const mentorContext = getMentorContextForUser(currentUser);
  if (!mentorContext.mentorId) {
    return requests;
  }

  return requests.filter(function (request) {
    return request.mentorId === mentorContext.mentorId;
  });
}

function getRequestsForCurrentMentee(currentUser) {
  return getBookingRequests().filter(function (request) {
    return request.menteeUserId === currentUser.id || normalizeEmail(request.menteeEmail) === normalizeEmail(currentUser.email);
  });
}

function renderMenteeScheduleSummary(summaryElement, requests) {
  if (!summaryElement) return;

  summaryElement.innerHTML = `
    <article class="schedule-summary-card">
      <span>Tá»•ng yÃªu cáº§u</span>
      <strong>${requests.length}</strong>
    </article>
    <article class="schedule-summary-card">
      <span>ÄÃ£ nháº­n</span>
      <strong>${requests.filter(function (request) { return request.status === "accepted"; }).length}</strong>
    </article>
    <article class="schedule-summary-card">
      <span>Chá» pháº£n há»“i</span>
      <strong>${requests.filter(function (request) { return request.status === "pending"; }).length}</strong>
    </article>
  `;
}

function initializeMenteeSchedulePage() {
  const scheduleList = document.getElementById("menteeScheduleList");
  const summary = document.getElementById("menteeScheduleSummary");
  const calendarGrid = document.getElementById("menteeScheduleCalendarGrid");
  const monthLabel = document.getElementById("menteeCalendarMonthLabel");
  const prevButton = document.getElementById("menteeCalendarPrevBtn");
  const nextButton = document.getElementById("menteeCalendarNextBtn");
  if (!scheduleList || !summary) return;

  const currentUser = getCurrentUser();
  if (!currentUser) {
    window.location.href = "login.html?redirect=mentee-schedule.html";
    return;
  }

  const requests = getRequestsForCurrentMentee(currentUser);
  renderMenteeScheduleSummary(summary, requests);

  if (!requests.length) {
    scheduleList.innerHTML = `
      <div class="admin-empty-state">
        <h3>Báº¡n chÆ°a cÃ³ lá»‹ch há»c nÃ o</h3>
        <p>HÃ£y Ä‘áº·t lá»‹ch vá»›i mentor Ä‘á»ƒ cÃ¡c buá»•i há»c vÃ  tráº¡ng thÃ¡i xá»­ lÃ½ xuáº¥t hiá»‡n táº¡i Ä‘Ã¢y.</p>
      </div>
    `;
    renderCalendarGrid(
      calendarGrid,
      monthLabel,
      [],
      function () {
        return "search.html";
      },
      "Khi mentor nháº­n yÃªu cáº§u cá»§a báº¡n, buá»•i há»c sáº½ xuáº¥t hiá»‡n á»Ÿ Ä‘Ã¢y dÆ°á»›i dáº¡ng calendar.",
      new Date()
    );
    return;
  }

  scheduleList.innerHTML = requests.map(buildMenteeScheduleCard).join("");
  attachCalendarNavigator({
    gridElement: calendarGrid,
    monthLabelElement: monthLabel,
    prevButton: prevButton,
    nextButton: nextButton,
    requests: requests.filter(function (request) {
      return request.status === "accepted" || request.status === "completed";
    }),
    linkBuilder: function (request) {
      return "mentor-detail.html?id=" + encodeURIComponent(request.mentorId);
    },
    emptyMessage: "Khi mentor nháº­n yÃªu cáº§u cá»§a báº¡n, buá»•i há»c sáº½ xuáº¥t hiá»‡n á»Ÿ Ä‘Ã¢y dÆ°á»›i dáº¡ng calendar."
  });

  if (!scheduleList.dataset.reviewBound) {
    scheduleList.addEventListener("submit", async function (event) {
      const form = event.target.closest(".schedule-review-form");
      if (!form) return;

      event.preventDefault();
      clearMessage("menteeScheduleMessage");

      const bookingId = form.getAttribute("data-booking-review-id");
      const currentRequest = getBookingRequests().find(function (item) {
        return item.id === bookingId;
      });
      const activeUser = getCurrentUser();
      if (!currentRequest || !activeUser) return;

      const formData = new FormData(form);
      const rating = Number(formData.get("rating"));
      const content = normalizeWhitespace(formData.get("content"));

      if (!rating || rating < 1 || rating > 5 || !content || content.length < 8) {
        return;
      }

      const submitButton = form.querySelector('button[type="submit"]');
      if (submitButton) {
        submitButton.disabled = true;
      }

      try {
        const result = await submitMentorReview({
          bookingId: currentRequest.id,
          rating: rating,
          content: content
        });

        saveSubmittedReview(result.review);
        if (result.mentorProfile) {
          mergeMentorProfileIntoStore(result.mentorProfile);
        }

        initializeMenteeSchedulePage();
      } catch (error) {
        showMessage("menteeScheduleMessage", "error", error.message || "Khong the gui danh gia mentor luc nay.");
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
        }
      }
    });
    scheduleList.dataset.reviewBound = "true";
  }
}

function initializeMenteeCalendarPage() {
  const summary = document.getElementById("menteeCalendarSummary");
  const calendarGrid = document.getElementById("menteeCalendarOnlyGrid");
  const monthLabel = document.getElementById("menteeCalendarOnlyMonthLabel");
  const prevButton = document.getElementById("menteeCalendarOnlyPrevBtn");
  const nextButton = document.getElementById("menteeCalendarOnlyNextBtn");
  if (!summary || !calendarGrid || !monthLabel || !prevButton || !nextButton) return;

  const currentUser = getCurrentUser();
  if (!currentUser) {
    window.location.href = "login.html?redirect=mentee-calendar.html";
    return;
  }

  const requests = getRequestsForCurrentMentee(currentUser);
  renderMenteeScheduleSummary(summary, requests);

  attachCalendarNavigator({
    gridElement: calendarGrid,
    monthLabelElement: monthLabel,
    prevButton: prevButton,
    nextButton: nextButton,
    requests: requests.filter(function (request) {
      return request.status === "accepted" || request.status === "completed";
    }),
    linkBuilder: function (request) {
      return "mentor-detail.html?id=" + encodeURIComponent(request.mentorId);
    },
    emptyMessage: "Khi mentor nháº­n yÃªu cáº§u cá»§a báº¡n, buá»•i há»c sáº½ xuáº¥t hiá»‡n táº¡i Ä‘Ã¢y theo dáº¡ng calendar riÃªng."
  });
}

function initializeMentorRequestsPage() {
  const listElement = document.getElementById("mentorRequestList");
  const summary = document.getElementById("mentorRequestSummary");
  const note = document.getElementById("mentorRequestScopeNote");
  if (!listElement || !summary || !note) return;

  const currentUser = getCurrentUser();
  if (!currentUser) {
    window.location.href = "login.html?redirect=mentor-requests.html";
    return;
  }

  if (!["mentor", "admin"].includes(normalizeRole(currentUser.role))) {
    window.location.href = "profile.html";
    return;
  }

  function render() {
    const mentorContext = getMentorContextForUser(currentUser);
    const scopedRequests = filterRequestsForCurrentMentor(getBookingRequests(), currentUser);
    const pendingRequests = scopedRequests.filter(function (request) {
      return request.status === "pending";
    });

    note.textContent = mentorContext.mentorId
      ? "Äang hiá»ƒn thá»‹ yÃªu cáº§u Ä‘Äƒng kÃ½ dÃ nh cho mentor: " + mentorContext.mentorName + "."
      : "TÃ i khoáº£n nÃ y chÆ°a Ä‘Æ°á»£c gáº¯n vá»›i má»™t há»“ sÆ¡ mentor cá»¥ thá»ƒ, nÃªn Ä‘ang hiá»ƒn thá»‹ toÃ n bá»™ yÃªu cáº§u Ä‘á»ƒ tiá»‡n theo dÃµi ná»™i bá»™.";

    summary.innerHTML = `
      <article class="schedule-summary-card">
        <span>YÃªu cáº§u má»›i</span>
        <strong>${pendingRequests.length}</strong>
      </article>
      <article class="schedule-summary-card">
        <span>ÄÃ£ nháº­n</span>
        <strong>${scopedRequests.filter(function (request) { return request.status === "accepted"; }).length}</strong>
      </article>
      <article class="schedule-summary-card">
        <span>ÄÃ£ tá»« chá»‘i</span>
        <strong>${scopedRequests.filter(function (request) { return request.status === "rejected"; }).length}</strong>
      </article>
    `;

    if (!pendingRequests.length) {
      listElement.innerHTML = `
        <div class="admin-empty-state">
          <h3>ChÆ°a cÃ³ mentee má»›i muá»‘n Ä‘Äƒng kÃ½</h3>
          <p>Khi mentee gá»­i yÃªu cáº§u Ä‘áº·t lá»‹ch, danh sÃ¡ch nÃ y sáº½ cáº­p nháº­t Ä‘á»ƒ mentor xá»­ lÃ½.</p>
        </div>
      `;
      return;
    }

    listElement.innerHTML = pendingRequests.map(buildMentorLeadCard).join("");
  }

  listElement.addEventListener("click", async function (event) {
    const button = event.target.closest("[data-booking-action]");
    if (!button) return;

    const bookingId = button.getAttribute("data-booking-id");
    const action = button.getAttribute("data-booking-action");
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    button.disabled = true;
    clearMessage("mentorRequestsMessage");

    try {
      const result = await updateBookingRequestRemote(bookingId, {
        status: action === "accept" ? "accepted" : "rejected"
      });

      replaceBookingRequestInStore(result.request);
      if (result.mentorProfile) {
        mergeMentorProfileIntoStore(result.mentorProfile);
      }

      render();
    } catch (error) {
      showMessage("mentorRequestsMessage", "error", error.message || "Khong the cap nhat yeu cau luc nay.");
    } finally {
      button.disabled = false;
    }
  });

  render();
}

function initializeMentorMenteesPage() {
  const acceptedPreview = document.getElementById("mentorAcceptedCountPreview");
  const teachingPreview = document.getElementById("mentorTeachingCountPreview");
  const summary = document.getElementById("mentorTeachingSummary");
  const note = document.getElementById("mentorTeachingScopeNote");
  if (!acceptedPreview || !teachingPreview || !summary || !note) return;

  const currentUser = getCurrentUser();
  if (!currentUser) {
    window.location.href = "login.html?redirect=mentor-mentees.html";
    return;
  }

  if (!["mentor", "admin"].includes(normalizeRole(currentUser.role))) {
    window.location.href = "profile.html";
    return;
  }

  const mentorContext = getMentorContextForUser(currentUser);
  const acceptedRequests = getAcceptedRequestsForCurrentMentor(currentUser);

  note.textContent = mentorContext.mentorId
    ? "Äang hiá»ƒn thá»‹ mentee vÃ  lá»‹ch dáº¡y cá»§a mentor: " + mentorContext.mentorName + "."
    : "TÃ i khoáº£n nÃ y chÆ°a Ä‘Æ°á»£c gáº¯n vá»›i má»™t há»“ sÆ¡ mentor cá»¥ thá»ƒ, nÃªn Ä‘ang hiá»ƒn thá»‹ toÃ n bá»™ khu quáº£n lÃ½ Ä‘Ã£ nháº­n trong há»‡ thá»‘ng.";

  summary.innerHTML = `
    <article class="schedule-summary-card">
      <span>Mentee Ä‘Ã£ nháº­n</span>
      <strong>${acceptedRequests.length}</strong>
    </article>
    <article class="schedule-summary-card">
      <span>Lá»‹ch dáº¡y sáº¯p tá»›i</span>
      <strong>${acceptedRequests.length}</strong>
    </article>
    <article class="schedule-summary-card">
      <span>ÄÃ£ hoÃ n thÃ nh</span>
      <strong>${acceptedRequests.filter(function (request) { return request.status === "completed"; }).length}</strong>
    </article>
  `;
  acceptedPreview.textContent = acceptedRequests.length + " mentee";
  teachingPreview.textContent = acceptedRequests.length + " buá»•i";
}

function initializeMentorAcceptedPage() {
  const listElement = document.getElementById("mentorAcceptedDetailList");
  const summary = document.getElementById("mentorAcceptedSummary");
  const note = document.getElementById("mentorAcceptedScopeNote");
  if (!listElement || !summary || !note) return;

  const currentUser = getCurrentUser();
  if (!currentUser) {
    window.location.href = "login.html?redirect=mentor-accepted.html";
    return;
  }

  if (!["mentor", "admin"].includes(normalizeRole(currentUser.role))) {
    window.location.href = "profile.html";
    return;
  }

  const mentorContext = getMentorContextForUser(currentUser);
  const acceptedRequests = getAcceptedRequestsForCurrentMentor(currentUser);

  note.textContent = mentorContext.mentorId
    ? "Äang hiá»ƒn thá»‹ danh sÃ¡ch mentee Ä‘Ã£ nháº­n cho mentor: " + mentorContext.mentorName + "."
    : "TÃ i khoáº£n nÃ y chÆ°a Ä‘Æ°á»£c gáº¯n mentor cá»¥ thá»ƒ nÃªn Ä‘ang hiá»ƒn thá»‹ toÃ n bá»™ mentee Ä‘Ã£ nháº­n.";

  summary.innerHTML = `
    <article class="schedule-summary-card">
      <span>Mentee Ä‘Ã£ nháº­n</span>
      <strong>${acceptedRequests.length}</strong>
    </article>
    <article class="schedule-summary-card">
      <span>ÄÃ£ hoÃ n thÃ nh</span>
      <strong>${acceptedRequests.filter(function (request) { return request.status === "completed"; }).length}</strong>
    </article>
    <article class="schedule-summary-card">
      <span>Má»Ÿ chi tiáº¿t</span>
      <strong>${acceptedRequests.length}</strong>
    </article>
  `;

  if (!acceptedRequests.length) {
    listElement.innerHTML = `
      <div class="admin-empty-state">
        <h3>ChÆ°a cÃ³ mentee Ä‘Ã£ nháº­n</h3>
        <p>Sau khi mentor nháº­n yÃªu cáº§u Ä‘Äƒng kÃ½, danh sÃ¡ch mentee sáº½ xuáº¥t hiá»‡n táº¡i Ä‘Ã¢y.</p>
      </div>
    `;
    return;
  }

  listElement.innerHTML = acceptedRequests.map(buildAcceptedMenteeDetailCard).join("");
}

function initializeMentorTeachingCalendarPage() {
  const calendarGrid = document.getElementById("mentorTeachingCalendarGrid");
  const summary = document.getElementById("mentorCalendarSummary");
  const note = document.getElementById("mentorCalendarScopeNote");
  const monthLabel = document.getElementById("mentorCalendarMonthLabel");
  const prevButton = document.getElementById("mentorCalendarPrevBtn");
  const nextButton = document.getElementById("mentorCalendarNextBtn");
  if (!calendarGrid || !summary || !note || !monthLabel) return;

  const currentUser = getCurrentUser();
  if (!currentUser) {
    window.location.href = "login.html?redirect=mentor-teaching-calendar.html";
    return;
  }

  if (!["mentor", "admin"].includes(normalizeRole(currentUser.role))) {
    window.location.href = "profile.html";
    return;
  }

  const mentorContext = getMentorContextForUser(currentUser);
  const acceptedRequests = getAcceptedRequestsForCurrentMentor(currentUser);

  note.textContent = mentorContext.mentorId
    ? "Calendar Ä‘ang hiá»ƒn thá»‹ lá»‹ch dáº¡y cá»§a mentor: " + mentorContext.mentorName + "."
    : "Calendar Ä‘ang hiá»ƒn thá»‹ toÃ n bá»™ cÃ¡c lá»‹ch dáº¡y Ä‘Ã£ Ä‘Æ°á»£c nháº­n trong há»‡ thá»‘ng.";

  summary.innerHTML = `
    <article class="schedule-summary-card">
      <span>Buá»•i Ä‘Ã£ nháº­n</span>
      <strong>${acceptedRequests.length}</strong>
    </article>
    <article class="schedule-summary-card">
      <span>Tuáº§n nÃ y</span>
      <strong>${acceptedRequests.length}</strong>
    </article>
    <article class="schedule-summary-card">
      <span>Calendar events</span>
      <strong>${acceptedRequests.length}</strong>
    </article>
  `;

  if (!acceptedRequests.length) {
    renderCalendarGrid(
      calendarGrid,
      monthLabel,
      [],
      function () {
        return "mentor-booking-detail.html";
      },
      "Khi mentor nháº­n mentee, buá»•i há»c sáº½ xuáº¥t hiá»‡n á»Ÿ Ä‘Ã¢y dÆ°á»›i dáº¡ng calendar.",
      new Date()
    );
    return;
  }
  attachCalendarNavigator({
    gridElement: calendarGrid,
    monthLabelElement: monthLabel,
    prevButton: prevButton,
    nextButton: nextButton,
    requests: acceptedRequests,
    linkBuilder: function (request) {
      return "mentor-booking-detail.html?id=" + encodeURIComponent(request.id);
    },
    emptyMessage: "Khi mentor nháº­n mentee, buá»•i há»c sáº½ xuáº¥t hiá»‡n á»Ÿ Ä‘Ã¢y dÆ°á»›i dáº¡ng calendar."
  });
}

function initializeMentorBookingDetailPage() {
  const content = document.getElementById("mentorBookingDetailContent");
  const note = document.getElementById("mentorBookingDetailScopeNote");
  if (!content || !note) return;

  const currentUser = getCurrentUser();
  if (!currentUser) {
    window.location.href = "login.html?redirect=mentor-booking-detail.html";
    return;
  }

  if (!["mentor", "admin"].includes(normalizeRole(currentUser.role))) {
    window.location.href = "profile.html";
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const bookingId = params.get("id");
  const request = filterRequestsForCurrentMentor(getBookingRequests(), currentUser).find(function (item) {
    return item.id === bookingId;
  });

  if (!request) {
    content.innerHTML = `
      <div class="admin-empty-state">
        <h3>KhÃ´ng tÃ¬m tháº¥y buá»•i dáº¡y</h3>
        <p>Buá»•i há»c nÃ y khÃ´ng cÃ²n tá»“n táº¡i hoáº·c khÃ´ng thuá»™c mentor hiá»‡n táº¡i.</p>
      </div>
    `;
    return;
  }

  const mentor = getResolvedMentorById(request.mentorId);
  note.textContent = "ÄÃ¢y lÃ  trang chi tiáº¿t cá»§a buá»•i dáº¡y giá»¯a " + request.mentorName + " vÃ  " + request.menteeName + ".";

  content.innerHTML = `
    <article class="mentor-booking-detail-card">
      <span class="schedule-card-label">Mentee Ä‘Ã£ nháº­n</span>
      <h2>${escapeHtml(request.menteeName)}</h2>
      <div class="schedule-card-grid">
        <p><strong>Email:</strong> ${escapeHtml(request.menteeEmail)}</p>
        <p><strong>Khung giá»:</strong> ${escapeHtml(request.preferredTime)}</p>
        <p><strong>Tráº¡ng thÃ¡i:</strong> ${escapeHtml(buildBookingStatusLabel(request.status))}</p>
        <p><strong>NgÃ y gá»­i:</strong> ${escapeHtml(formatDate(request.createdAt))}</p>
      </div>
      <div class="schedule-card-note">
        <span>Má»¥c tiÃªu há»c táº­p</span>
        <p>${escapeHtml(request.goal || "ChÆ°a cáº­p nháº­t")}</p>
      </div>
      <div class="schedule-card-note">
        <span>Ghi chÃº cá»§a mentee</span>
        <p>${escapeHtml(request.note || "KhÃ´ng cÃ³ ghi chÃº thÃªm.")}</p>
      </div>
    </article>
    <article class="mentor-booking-detail-card">
      <span class="schedule-card-label">Mentor phá»¥ trÃ¡ch</span>
      <h2>${escapeHtml(request.mentorName)}</h2>
      <div class="schedule-card-grid">
        <p><strong>NÆ¡i lÃ m viá»‡c / há»c táº­p:</strong> ${escapeHtml((mentor && mentor.workplace) || "Äang cáº­p nháº­t")}</p>
        <p><strong>LÄ©nh vá»±c:</strong> ${escapeHtml((mentor && mentor.focus) || request.mentorFocus || "Äang cáº­p nháº­t")}</p>
        <p><strong>ÄÃ¡nh giÃ¡:</strong> ${escapeHtml(mentor ? Number(mentor.rating || 0).toFixed(1) + " / 5 sao" : "Äang cáº­p nháº­t")}</p>
        <p><strong>ÄÃ£ Ä‘á»“ng hÃ nh:</strong> ${escapeHtml(mentor ? String(mentor.studentsTaught || 0) + " há»c sinh" : "Äang cáº­p nháº­t")}</p>
      </div>
      <div class="schedule-card-note">
        <span>Giá»›i thiá»‡u ngáº¯n</span>
        <p>${escapeHtml((mentor && mentor.bio) || "ThÃ´ng tin mentor sáº½ hiá»ƒn thá»‹ táº¡i Ä‘Ã¢y sau khi há»“ sÆ¡ Ä‘Æ°á»£c cáº­p nháº­t.")}</p>
      </div>
      <div class="schedule-card-actions">
        <a href="mentor-detail.html?id=${encodeURIComponent(request.mentorId)}" class="mentor-primary-btn">Xem chi tiáº¿t mentor</a>
        <a href="mentor-accepted.html" class="mentor-secondary-btn">Quay láº¡i mentee Ä‘Ã£ nháº­n</a>
      </div>
    </article>
  `;
}

function initializeForgotPasswordPage() {
  const forgotPasswordForm = document.getElementById("forgotPasswordForm");
  if (!forgotPasswordForm) return;
  if (!ensureSupabaseReady("forgotPasswordMessage")) return;

  forgotPasswordForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    clearMessage("forgotPasswordMessage");

    const email = normalizeEmail(document.getElementById("forgotEmail").value);
    if (!email.includes("@")) {
      showMessage("forgotPasswordMessage", "error", "Vui lÃ²ng nháº­p Ä‘Ãºng email Ä‘Ã£ Ä‘Äƒng kÃ½.");
      return;
    }

    try {
      const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/reset-password.html"
      });

      if (error) {
        throw error;
      }

      showMessage("forgotPasswordMessage", "success", "ÄÃ£ gá»­i email Ä‘áº·t láº¡i máº­t kháº©u. HÃ£y kiá»ƒm tra há»™p thÆ° cá»§a báº¡n.");
    } catch (error) {
      showMessage("forgotPasswordMessage", "error", error.message);
    }
  });
}

function initializeResetPasswordPage() {
  const resetPasswordForm = document.getElementById("resetPasswordForm");
  if (!resetPasswordForm) return;
  if (!ensureSupabaseReady("resetPasswordMessage")) return;

  resetPasswordForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    clearMessage("resetPasswordMessage");

    const newPassword = document.getElementById("resetNewPassword").value;
    const confirmPassword = document.getElementById("resetConfirmPassword").value;

    if (newPassword.length < 8) {
      showMessage("resetPasswordMessage", "error", "Máº­t kháº©u má»›i cáº§n cÃ³ tá»‘i thiá»ƒu 8 kÃ½ tá»±.");
      return;
    }

    if (newPassword !== confirmPassword) {
      showMessage("resetPasswordMessage", "error", "Máº­t kháº©u xÃ¡c nháº­n chÆ°a khá»›p.");
      return;
    }

    try {
      const session = await getSupabaseSession();
      if (!session) {
        throw new Error("LiÃªn káº¿t Ä‘áº·t láº¡i máº­t kháº©u khÃ´ng há»£p lá»‡ hoáº·c Ä‘Ã£ háº¿t háº¡n.");
      }

      const { error } = await supabaseClient.auth.updateUser({
        password: newPassword
      });

      if (error) {
        throw error;
      }

      showMessage("resetPasswordMessage", "success", "Máº­t kháº©u má»›i Ä‘Ã£ Ä‘Æ°á»£c lÆ°u thÃ nh cÃ´ng. Báº¡n cÃ³ thá»ƒ Ä‘Äƒng nháº­p láº¡i.");
      window.setTimeout(async function () {
        await supabaseClient.auth.signOut();
        clearAuthSession();
        window.location.href = "login.html";
      }, 1000);
    } catch (error) {
      showMessage("resetPasswordMessage", "error", error.message);
    }
  });
}

async function bootstrapApp() {
  initializePasswordToggles();
  if (isSupabaseReady()) {
    await loadCurrentUserFromSupabase();
  }

  try {
    const storedAdminKey = window.location.pathname.endsWith("admin-consultations.html")
      ? normalizeWhitespace(sessionStorage.getItem("mentorMeAdminKey") || "")
      : "";
    await syncBusinessStateFromServer({ adminKey: storedAdminKey });
  } catch (error) {
    // Keep static fallbacks when the API is temporarily unavailable.
  }

  redirectIfAuthenticated();
  initializeRegisterPage();
  initializeLoginPage();
  initializeForgotPasswordPage();
  initializeResetPasswordPage();
  initializeSearchPage();
  initializeHomeMentorSection();
  renderMentorDetail();
  initializeBookingPage();
  initializeConsultationRequestForm();
  initializeMentorApplicationPage();
  initializeMentorActivationPage();
  initializeAdminConsultationPage();
  initializeMentorDashboardPage();
  initializeMenteeSchedulePage();
  initializeMenteeCalendarPage();
  initializeMentorRequestsPage();
  initializeMentorMenteesPage();
  initializeMentorAcceptedPage();
  initializeMentorTeachingCalendarPage();
  initializeMentorBookingDetailPage();
  initializeProfilePage();
}

bootstrapApp();
