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
const DEMO_ADMIN_ACCESS_CODE = "ADMIN2026";
const DEMO_MENTOR_ACCESS_CODE = "mentor0001";
const DEMO_MENTEE_EMAIL = "dothuytrang2k7@gmail.com";
const DEMO_MENTEE_PASSWORD = "trang2007";
const SEARCH_PAGE_SIZE = 12;
let currentSearchPage = 1;
const appConfig = browserWindow.MENTOR_ME_CONFIG || {};
const SUPABASE_URL = appConfig.SUPABASE_URL || "";
const SUPABASE_PUBLISHABLE_KEY = appConfig.SUPABASE_ANON_KEY || "";
const supabaseClient =
  browserWindow.supabase && SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY
    ? browserWindow.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
    : null;

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
  if (role === "admin") return "Admin";
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

function getRoleGoalLabel(role) {
  const normalizedRole = normalizeRole(role);
  if (normalizedRole === "mentor") return "Định hướng mentoring";
  if (normalizedRole === "admin") return "Phạm vi quản trị";
  return "Mục tiêu học tập";
}

function getRoleGoalPlaceholder(role) {
  const normalizedRole = normalizeRole(role);
  if (normalizedRole === "mentor") {
    return "Ví dụ: Muốn hoàn thiện hồ sơ mentor, mở lịch nhận mentee và chuẩn hóa dịch vụ";
  }

  if (normalizedRole === "admin") {
    return "Ví dụ: Quản lý lead tư vấn, duyệt mentor và theo dõi vận hành hằng ngày";
  }

  return "Ví dụ: Muốn cải thiện speaking và tìm mentor buổi tối";
}

function getRoleBioPlaceholder(role) {
  const normalizedRole = normalizeRole(role);
  if (normalizedRole === "mentor") {
    return "Chia sẻ ngắn về phong cách mentoring, điểm mạnh chuyên môn hoặc nhóm mentee bạn muốn đồng hành.";
  }

  if (normalizedRole === "admin") {
    return "Chia sẻ ngắn về phạm vi quản trị, vai trò vận hành hoặc các đầu việc bạn đang phụ trách.";
  }

  return "Chia sẻ ngắn về nhu cầu học tập, điểm mạnh hoặc điều bạn đang cần hỗ trợ.";
}

function slugifyText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getMentorContextForUser(user) {
  const normalizedRole = normalizeRole(user && user.role);
  if (!["mentor", "admin"].includes(normalizedRole)) {
    return {
      mentorId: "",
      mentorName: ""
    };
  }

  const savedProfile = getMentorProfileByUserId(user.id) || {};
  const possibleNames = [
    savedProfile.displayName,
    user.name
  ]
    .map(slugifyText)
    .filter(Boolean);

  const mentorEntry = Object.values(mentorData).find(function (mentor) {
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
      name: "Đỗ Thùy Trang",
      email: DEMO_MENTEE_EMAIL,
      phone: "",
      goal: "Muốn học Văn buổi tối để cải thiện cách phân tích và viết bài chắc ý hơn.",
      bio: "Tài khoản mentee giả lập để kiểm thử luồng đăng ký học với mentor.",
      role: "mentee",
      avatar: createAvatarFallback("Đỗ Thùy Trang"),
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
      goal: "Quản lý lead tư vấn, duyệt mentor và vận hành hệ thống",
      bio: "Tài khoản admin dùng để kiểm thử luồng quản trị nội bộ.",
      role: "admin",
      avatar: createAvatarFallback("Admin Mentor Me"),
      createdAt: new Date().toISOString(),
      isDemoAccount: true
    };
  }

  if (accessCode === DEMO_MENTOR_ACCESS_CODE) {
    const mentor = mentorData["tien-dung"];
    return {
      id: "demo-mentor-nguyen-tien-dung",
      name: mentor ? mentor.name : "Nguyễn Tiến Dũng",
      email: "nguyen.tiendung@mentorme.local",
      phone: "",
      goal: "Hoàn thiện hồ sơ mentor và nhận mentee phù hợp",
      bio: mentor ? mentor.role : "Tài khoản mentor giả lập dành cho Nguyễn Tiến Dũng.",
      role: "mentor",
      avatar: mentor ? mentor.image : createAvatarFallback("Nguyễn Tiến Dũng"),
      createdAt: new Date().toISOString(),
      isDemoAccount: true
    };
  }

  return null;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "Hôm nay";

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
    menteeName: "Đỗ Thùy Trang",
    menteeEmail: DEMO_MENTEE_EMAIL,
    goal: "Muốn học Văn vào tối thứ 4 để cải thiện cách phân tích và viết bài mạch lạc hơn.",
    preferredTime: "Tối thứ 4",
    note: "Em muốn đăng ký mentor Nguyễn Tiến Dũng và cần người theo sát phần Văn, nhất là phân tích và lên ý.",
    adminNote: "Lead demo để kiểm thử luồng admin - mentor - mentee.",
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

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isSupabaseReady() {
  return Boolean(supabaseClient && SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
}

function ensureSupabaseReady(messageElementId) {
  if (isSupabaseReady()) return true;

  if (messageElementId) {
    showMessage(
      messageElementId,
      "error",
      "Cấu hình Supabase chưa sẵn sàng. Hãy kiểm tra lại SUPABASE_URL và SUPABASE_ANON_KEY trước khi sử dụng tính năng này."
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
    throw new Error(error.message || "Không thể tải hồ sơ từ Supabase.");
  }

  return data;
}

async function upsertProfile(profile) {
  const { data, error } = await supabaseClient
    .from("profiles")
    .upsert(profile, { onConflict: "id" })
    .select()
    .single();

  if (error) {
    throw new Error(error.message || "Không thể cập nhật hồ sơ.");
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
  const image = button.querySelector("img");

  if (!input || !image) return;

  const isPassword = input.type === "password";
  input.type = isPassword ? "text" : "password";
  image.src = isPassword ? "images/eye-open.png" : "images/eye-close.png";
  image.alt = isPassword ? "Hiện mật khẩu" : "Ẩn mật khẩu";
}

function initializePasswordToggles() {
  document.querySelectorAll(".password-toggle").forEach(function (button) {
    button.addEventListener("click", function () {
      togglePasswordVisibility(button);
    });
  });
}

// ================= LOGIN STATE =================
const authArea = document.getElementById("authArea");
function renderAuthArea(user) {
  if (!authArea) return;

  if (!user) {
    authArea.innerHTML = `
      <a href="login.html">Đăng nhập</a>
      <a href="register.html" class="btn-register">Đăng ký</a>
    `;
    return;
  }

  authArea.innerHTML = `
    <div class="user-menu">
      <img src="${user.avatar || createAvatarFallback(user.name)}" class="avatar">
      <span>${user.name}</span>

      <div class="dropdown">
        <a href="profile.html">${normalizeRole(user.role) === "mentee" ? "Hồ sơ mentee" : "Hồ sơ tài khoản"}</a>
        ${["mentor", "admin"].includes(normalizeRole(user.role)) ? '<a href="mentor-dashboard.html">Hồ sơ mentor</a>' : ""}
        ${normalizeRole(user.role) === "admin" ? '<a href="admin-consultations.html">Dashboard admin</a>' : ""}
        <a href="${getRoleSchedulePath(user.role)}">${normalizeRole(user.role) === "mentee" ? "Lịch học" : "Mentee & lịch dạy"}</a>
        <a href="#" id="logoutBtn">Đăng xuất</a>
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

  // Nếu click đúng vào avatar hoặc tên → toggle
  if (e.target.closest(".user-menu > img") || e.target.closest(".user-menu > span")) {
    dropdown.style.display =
      dropdown.style.display === "flex" ? "none" : "flex";
  }

  // Nếu click ra ngoài → đóng
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
    name: "BÙI VŨ TRÀ MY",
    image: "mentorbuivutramy.jpg",
    workplace: "Sinh viên ngành Ngôn ngữ Trung, cộng tác viên hỗ trợ học tập ngoại ngữ",
    tag: "Mentor tiếng Trung",
    role: "Đồng hành luyện thi HSK và xây dựng lộ trình học tiếng Trung",
    focus: "Tiếng Trung, HSK, kỹ năng tự học",
    field: "trung",
    availability: ["toi", "cuoi-tuan"],
    availabilityText: "Buổi tối và cuối tuần",
    service: ["1-1", "roadmap", "competition"],
    serviceText: "Mentor 1 kèm 1, tư vấn lộ trình, luyện thi",
    achievements: [
      "Đạt HSK 5 và có kinh nghiệm hướng dẫn học sinh ôn thi.",
      "Hỗ trợ xây dựng lộ trình học theo mục tiêu từng giai đoạn.",
      "Đồng hành cùng học sinh để giữ kỷ luật học tập."
    ],
    fit: "Học sinh muốn học tiếng Trung bài bản, luyện thi chứng chỉ hoặc cần người kèm cặp sát sao.",
    searchableText: "tieng trung hsk luyen thi chung chi 1 kem 1 buoi toi cuoi tuan roadmap mentor nhe nhang theo sat mat goc"
  },
  "tien-dung": {
    id: "tien-dung",
    name: "NGUYỄN TIẾN DŨNG",
    image: "mentor2.jpg",
    workplace: "Phụ trách nội dung HS14, mentor kỹ năng học đường và xây dựng hồ sơ",
    tag: "Mentor học tập và định hướng",
    role: "Thế mạnh về thuyết trình, hoạt động học đường và xây dựng hồ sơ",
    bio: "Tiến Dũng đồng hành tốt với các bạn cần mentor giao tiếp tốt, hỗ trợ thuyết trình, hoạt động CLB hoặc định hướng hồ sơ cá nhân.",
    focus: "Thuyết trình, hoạt động học đường, định hướng hồ sơ",
    field: "ky-nang",
    availability: ["chieu", "toi"],
    availabilityText: "Buổi chiều và buổi tối",
    service: ["1-1", "group", "roadmap"],
    serviceText: "Mentor 1 kèm 1, mentor theo nhóm, tư vấn định hướng",
    achievements: [
      "Giải Nhất thuyết trình Ngày hội Văn hóa Đọc năm học 2024 - 2025.",
      "Giải Nhì cuộc thi sáng kiến phòng, chống bạo lực học đường năm học 2024 - 2025.",
      "Trưởng ban Nội dung của HS14 - cộng đồng chia sẻ học tập cho học sinh Quảng Ninh."
    ],
    fit: "Học sinh muốn cải thiện kỹ năng thuyết trình, xây dựng hồ sơ hoạt động hoặc cần mentor để tự tin hơn.",
    searchableText: "ky nang thuyet trinh clb hoat dong hoc duong dinh huong ho so group 1 kem 1 buoi chieu toi giao tiep tu tin"
  },
  "mai-huong": {
    id: "mai-huong",
    name: "BÙI MAI HƯƠNG",
    image: "mentor3.jpg",
    workplace: "Sinh viên khối Khoa học Xã hội, mentor phương pháp học tập bền vững",
    tag: "Mentor học tập bền vững",
    role: "Đồng hành học tập, xây nề nếp học và phương pháp tự học hiệu quả",
    bio: "Mai Hương phù hợp với học sinh cần một người hướng dẫn cách học đều hơn, quản lý thời gian tốt hơn và giữ động lực lâu dài.",
    focus: "Tiếng Trung, kỹ năng học tập, quản lý thời gian",
    field: "ky-nang",
    availability: ["sang", "toi", "cuoi-tuan"],
    availabilityText: "Buổi sáng cuối tuần và buổi tối",
    service: ["1-1", "roadmap"],
    serviceText: "Mentor 1 kèm 1, coaching học tập",
    achievements: [
      "Đạt HSK 5.",
      "Có kinh nghiệm hướng dẫn phương pháp học tập bền vững.",
      "Tập trung vào việc xây dựng thói quen học đều và tự đánh giá tiến bộ."
    ],
    fit: "Học sinh dễ mất động lực, học chưa đều và cần mentor giúp sắp xếp thời gian hợp lý.",
    searchableText: "ky nang hoc tap quan ly thoi gian coaching thoi quen tieng trung buoi toi cuoi tuan roadmap can nguoi theo sat mentor nhe nhang"
  },
  "minh-khoi": {
    id: "minh-khoi",
    name: "LÊ MINH KHÔI",
    image: "mentor4.jpg",
    workplace: "Sinh viên khối Kỹ thuật, mentor Toán và chiến lược luyện đề",
    tag: "Mentor toán học",
    role: "Hỗ trợ Toán tư duy, luyện đề và chiến lược học theo mục tiêu",
    bio: "Minh Khôi phù hợp với học sinh cần củng cố nền tảng Toán, luyện đề có chiến lược và được theo sát tiến độ từng tuần.",
    focus: "Toán, luyện đề, quản lý tiến độ",
    field: "toan",
    availability: ["toi", "cuoi-tuan"],
    availabilityText: "Buổi tối và cuối tuần",
    service: ["1-1", "competition"],
    serviceText: "Mentor 1 kèm 1, luyện thi/cuộc thi",
    achievements: [
      "Có kinh nghiệm xây chiến lược luyện đề theo từng mốc điểm.",
      "Hướng dẫn học sinh phân tích lỗi sai sau mỗi buổi học.",
      "Đồng hành trong giai đoạn ôn thi nước rút."
    ],
    fit: "Học sinh cần tăng tốc môn Toán hoặc muốn có người kèm sát trong giai đoạn ôn thi.",
    searchableText: "toan luyen de luyen thi competition 1 kem 1 buoi toi cuoi tuan mat goc tang diem on thi de"
  },
  "ha-an": {
    id: "ha-an",
    name: "TRẦN HÀ AN",
    image: "mentor5.jpg",
    workplace: "Sinh viên chuyên ngành tiếng Anh, mentor IELTS và phản hồi bài viết",
    tag: "Mentor IELTS",
    role: "Đồng hành luyện IELTS, phản hồi speaking-writing và xây lịch học cá nhân",
    bio: "Hà An phù hợp với học sinh đang cần luyện IELTS thực tế, muốn được sửa bài kỹ và có lộ trình tăng band rõ ràng.",
    focus: "IELTS, tiếng Anh, speaking, writing",
    field: "ielts",
    availability: ["chieu", "toi"],
    availabilityText: "Buổi chiều và buổi tối",
    service: ["1-1", "roadmap", "competition"],
    serviceText: "Mentor 1 kèm 1, tư vấn lộ trình, luyện thi",
    achievements: [
      "Có kinh nghiệm đồng hành học sinh luyện IELTS theo band mục tiêu.",
      "Tập trung phản hồi kỹ phần speaking và writing.",
      "Giúp xây lịch học cá nhân phù hợp với thời gian rảnh."
    ],
    fit: "Học sinh cần mentor IELTS buổi tối, muốn được sửa bài kỹ và luyện thi có chiến lược.",
    searchableText: "ielts tieng anh speaking writing band luyen thi buoi toi buoi chieu 1 kem 1 roadmap competition em yeu speaking em yeu writing tang band"
  },
  "gia-huy": {
    id: "gia-huy",
    name: "PHẠM GIA HUY",
    image: "mentor6.JPG",
    workplace: "Sinh viên Công nghệ thông tin, mentor lập trình dự án cơ bản",
    tag: "Mentor lập trình",
    role: "Coaching lập trình nền tảng, dự án web cơ bản và tư duy giải quyết vấn đề",
    bio: "Gia Huy phù hợp với học sinh hoặc sinh viên mới học lập trình, cần người giải thích dễ hiểu và đồng hành khi làm project đầu tiên.",
    focus: "Lập trình, web cơ bản, tư duy logic",
    field: "lap-trinh",
    availability: ["chieu", "cuoi-tuan"],
    availabilityText: "Buổi chiều và cuối tuần",
    service: ["1-1", "group", "roadmap"],
    serviceText: "Mentor 1 kèm 1, mentor theo nhóm, tư vấn lộ trình",
    achievements: [
      "Có kinh nghiệm hỗ trợ người mới học lập trình từ nền tảng.",
      "Đồng hành làm project web cơ bản và sửa lỗi theo từng bước.",
      "Giúp xây lộ trình học phù hợp từ căn bản đến thực hành."
    ],
    fit: "Người mới học lập trình cần mentor giải thích kỹ, học theo dự án và có lộ trình rõ ràng.",
    searchableText: "lap trinh web project coding logic group 1 kem 1 roadmap buoi chieu cuoi tuan nguoi moi mat goc can giai thich ky"
  },
  "ngoc-linh": {
    id: "ngoc-linh",
    name: "ĐỖ NGỌC LINH",
    image: "mentor1.jpg",
    workplace: "Sinh viên ngành Ngôn ngữ Anh, mentor giao tiếp và phát âm",
    tag: "Mentor tiếng Anh giao tiếp",
    role: "Đồng hành luyện speaking, phản xạ giao tiếp và phát âm",
    bio: "Ngọc Linh phù hợp với người học cần vượt qua sự ngại nói, muốn luyện speaking đều đặn với mentor tích cực và nhẹ nhàng.",
    focus: "Tiếng Anh giao tiếp, speaking, phát âm",
    field: "anh",
    availability: ["toi", "cuoi-tuan"],
    availabilityText: "Buổi tối và cuối tuần",
    service: ["1-1", "group"],
    serviceText: "Mentor 1 kèm 1, mentor theo nhóm",
    achievements: [
      "Có kinh nghiệm đồng hành người học cải thiện phản xạ speaking.",
      "Tập trung luyện phát âm, phản xạ và vượt qua tâm lý ngại nói.",
      "Thiết kế buổi học theo tình huống thực tế."
    ],
    fit: "Người học bị yếu speaking, mất tự tin khi giao tiếp hoặc muốn luyện nói đều hằng tuần.",
    searchableText: "tieng anh speaking giao tiep phat am em yeu speaking ngai noi mentor nhe nhang buoi toi cuoi tuan"
  },
  "thu-trang": {
    id: "thu-trang",
    name: "VŨ THU TRANG",
    image: "mentor2.jpg",
    workplace: "Sinh viên Sư phạm Ngữ văn, mentor viết luận và ôn thi",
    tag: "Mentor ngữ văn",
    role: "Đồng hành môn Ngữ văn, viết luận và ôn thi theo dạng bài",
    bio: "Thu Trang phù hợp với học sinh muốn cải thiện cách phân tích tác phẩm, viết đoạn văn và xây ý mạch lạc hơn.",
    focus: "Ngữ văn, viết luận, phân tích tác phẩm",
    field: "van",
    availability: ["sang", "cuoi-tuan"],
    availabilityText: "Buổi sáng và cuối tuần",
    service: ["1-1", "competition"],
    serviceText: "Mentor 1 kèm 1, luyện thi/cuộc thi",
    achievements: [
      "Có kinh nghiệm hỗ trợ học sinh viết luận rõ ý và chắc cấu trúc.",
      "Đồng hành ôn thi theo từng dạng bài văn nghị luận và đọc hiểu.",
      "Giúp học sinh cải thiện khả năng diễn đạt mạch lạc."
    ],
    fit: "Học sinh muốn cải thiện kỹ năng viết văn, phân tích tác phẩm hoặc cần ôn thi theo dạng bài.",
    searchableText: "ngu van viet luan phan tich tac pham on thi de van 1 kem 1 cuoi tuan buoi sang"
  },
  "quang-huy": {
    id: "quang-huy",
    name: "NGUYỄN QUANG HUY",
    image: "mentor3.jpg",
    workplace: "Sinh viên khối Toán ứng dụng, mentor học sinh giỏi và toán nâng cao",
    tag: "Mentor olympic toán",
    role: "Luyện thi học sinh giỏi và toán nâng cao theo chuyên đề",
    bio: "Quang Huy phù hợp với học sinh muốn học toán nâng cao, đi thi học sinh giỏi hoặc cần mentor đẩy tốc độ tư duy giải bài.",
    focus: "Toán nâng cao, học sinh giỏi, chiến lược giải đề",
    field: "toan",
    availability: ["toi", "cuoi-tuan"],
    availabilityText: "Buổi tối và cuối tuần",
    service: ["1-1", "competition"],
    serviceText: "Mentor 1 kèm 1, luyện thi/cuộc thi",
    achievements: [
      "Có kinh nghiệm kèm học sinh theo chuyên đề toán nâng cao.",
      "Tập trung phân tích tư duy giải đề và tối ưu tốc độ làm bài.",
      "Phù hợp với học sinh hướng tới cuộc thi học thuật."
    ],
    fit: "Học sinh muốn chinh phục toán nâng cao hoặc chuẩn bị cho các kỳ thi học sinh giỏi.",
    searchableText: "toan nang cao olympic hoc sinh gioi competition giai de buoi toi cuoi tuan"
  }
};

const mentorExperienceData = {
  "tra-my": {
    rating: 4.9,
    studentsTaught: 32,
    reviews: [
      { author: "Khánh Linh", role: "HSK learner", rating: 5, content: "Mentor rất sát sao, giải thích rõ từng giai đoạn nên mình giữ được nhịp học đều." },
      { author: "Minh Thảo", role: "Học sinh lớp 11", rating: 5, content: "Lộ trình học tiếng Trung được chia nhỏ rất dễ theo, bớt bị ngợp hơn hẳn." }
    ]
  },
  "tien-dung": {
    rating: 4.8,
    studentsTaught: 41,
    reviews: [
      { author: "Mai Chi", role: "Học sinh THPT", rating: 5, content: "Anh Dũng giúp mình tự tin hơn khi thuyết trình và biết cách kể câu chuyện hồ sơ rõ ràng." },
      { author: "Bảo Ngọc", role: "Mentee kỹ năng", rating: 4.8, content: "Cách góp ý rất dễ hiểu, đặc biệt phù hợp với bạn đang thiếu định hướng hoạt động học đường." }
    ]
  },
  "mai-huong": {
    rating: 4.7,
    studentsTaught: 28,
    reviews: [
      { author: "Ngọc Hà", role: "Mentee học tập", rating: 4.7, content: "Mentor nhẹ nhàng nhưng rất đều, giúp mình xây lại thói quen học hiệu quả." }
    ]
  },
  "minh-khoi": {
    rating: 4.9,
    studentsTaught: 36,
    reviews: [
      { author: "Gia Minh", role: "Ôn thi Toán", rating: 5, content: "Học rất vào vì mentor chỉ rõ lỗi sai và đưa ra chiến lược luyện đề thực tế." }
    ]
  },
  "ha-an": {
    rating: 4.9,
    studentsTaught: 47,
    reviews: [
      { author: "Phương Anh", role: "IELTS mentee", rating: 5, content: "Phần speaking được sửa rất kỹ, lộ trình tăng band rõ ràng nên mình bám được lâu." }
    ]
  },
  "gia-huy": {
    rating: 4.8,
    studentsTaught: 34,
    reviews: [
      { author: "Tuấn Kiệt", role: "Sinh viên năm 1", rating: 4.8, content: "Mentor giải thích code rất dễ hiểu, phù hợp cho người mới học project web." }
    ]
  },
  "ngoc-linh": {
    rating: 4.7,
    studentsTaught: 25,
    reviews: [
      { author: "Hồng Nhung", role: "Speaking mentee", rating: 4.7, content: "Các buổi luyện nói tự nhiên và bớt áp lực, mình đỡ ngại giao tiếp hơn." }
    ]
  },
  "thu-trang": {
    rating: 4.8,
    studentsTaught: 29,
    reviews: [
      { author: "Thu Hà", role: "Mentee Ngữ văn", rating: 4.8, content: "Mentor giúp mình viết văn chặt chẽ hơn và dễ lên ý hơn trước." }
    ]
  },
  "quang-huy": {
    rating: 4.9,
    studentsTaught: 31,
    reviews: [
      { author: "Đức Anh", role: "Học sinh giỏi Toán", rating: 4.9, content: "Rất hợp cho bạn muốn đẩy tốc độ giải đề và học chuyên đề nâng cao." }
    ]
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
  const baseMentor = mentorData[mentorId];
  if (!baseMentor) return null;

  const approvedStore = getApprovedMentorProfiles();
  const approvedProfile = approvedStore[mentorId] || {};
  const experience = mentorExperienceData[mentorId] || {};
  const acceptedCount = getAcceptedStudentCountForMentor(mentorId);
  const submittedReviews = getMentorSubmittedReviews().filter(function (review) {
    return review.mentorId === mentorId;
  });
  const baseRating = Number(approvedProfile.rating || experience.rating || 4.8);
  const baseStudents = Number(approvedProfile.studentsTaught || experience.studentsTaught || 0);
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
  return Object.keys(mentorData)
    .map(function (mentorId) {
      return getResolvedMentorById(mentorId);
    })
    .filter(Boolean);
}

function renderMentorStatsBadge(mentor) {
  return `
    <div class="mentor-stats-badge" aria-label="Đánh giá và số học sinh">
      <span class="mentor-stats-pill">
        <span class="mentor-stats-star">★</span>
        <strong>${Number(mentor.rating || 0).toFixed(1)}</strong>
      </span>
      <span class="mentor-stats-pill">
        <img src="personicon.png" alt="Số học sinh">
        <strong>${mentor.studentsTaught || 0}</strong>
      </span>
    </div>
  `;
}

function renderReviewStars(rating) {
  const fullStars = Math.max(1, Math.round(Number(rating || 0)));
  return "★".repeat(Math.min(fullStars, 5)) + "☆".repeat(Math.max(0, 5 - Math.min(fullStars, 5)));
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
          <span>${safeMentor.studentsTaught || 0} học sinh</span>
        </div>
        <div class="mentor-card-achievements">
          <p>Thành tích nổi bật</p>
          <ul>${achievementItems}</ul>
        </div>
        <span class="mentor-card-cta">Xem hồ sơ chi tiết</span>
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
        <h3>Chưa có mentor khớp hoàn toàn</h3>
        <p>Bạn có thể đổi cách mô tả ở ô tìm kiếm hoặc nới lỏng bộ lọc để xem thêm mentor phù hợp.</p>
      </div>
    `;
    typeTextSlowly(
      summary,
      keyword
        ? `Không tìm thấy mentor phù hợp cho: "${keyword}".`
        : "Hiện chưa có mentor phù hợp với bộ lọc bạn chọn.",
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
      ? `Tìm thấy ${mentors.length} mentor phù hợp với mô tả: "${keyword}". Trang ${safePage}/${totalPages}.`
      : `Đang hiển thị ${mentors.length} mentor phù hợp. Trang ${safePage}/${totalPages}.`,
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
  document.getElementById("mentorDetailStudents").textContent = (mentor.studentsTaught || 0) + " học sinh";
  document.getElementById("mentorDetailWorkplace").textContent = mentor.workplace || "Đang cập nhật";
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
            <h3>Chưa có đánh giá</h3>
            <p>Phần nhận xét từ mentee sẽ hiển thị tại đây khi mentor có thêm review thực tế.</p>
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

  bookingForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const name = document.getElementById("bookingName").value.trim();
    const email = document.getElementById("bookingEmail").value.trim();
    const goal = document.getElementById("bookingGoal").value.trim();
    const time = document.getElementById("bookingTime").value;
    const note = document.getElementById("bookingNote").value.trim();
    const successBox = document.getElementById("bookingSuccessMessage");
    const createdAt = new Date().toISOString();

    const bookingRequest = {
      id: "booking-" + Date.now(),
      mentorId: mentor.id,
      mentorName: mentor.name,
      mentorImage: mentor.image,
      mentorFocus: mentor.focus,
      menteeUserId: currentUser && normalizeRole(currentUser.role) === "mentee" ? currentUser.id : "",
      menteeName: name,
      menteeEmail: email,
      goal: goal,
      preferredTime: time,
      note: note,
      status: "pending",
      createdAt: createdAt,
      updatedAt: createdAt
    };

    addBookingRequest(bookingRequest);

    successBox.hidden = false;
    successBox.innerHTML = `
      Yêu cầu đã được gửi tới <strong>${mentor.name}</strong>.<br>
      Người gửi: <strong>${name}</strong> (${email})<br>
      Mục tiêu: <strong>${goal}</strong><br>
      Thời gian mong muốn: <strong>${time}</strong>${note ? `<br>Ghi chú: <strong>${note}</strong>` : ""}
      ${currentUser && normalizeRole(currentUser.role) === "mentee" ? '<br><a href="mentee-schedule.html">Xem lịch học của tôi</a>' : ""}
    `;

    bookingForm.reset();
    if (currentUser) {
      document.getElementById("bookingName").value = currentUser.name || "";
      document.getElementById("bookingEmail").value = currentUser.email || "";
      document.getElementById("bookingGoal").value = currentUser.goal || "";
    }
  });
}

async function submitConsultationRequest(payload) {
  const response = await fetch("/api/consultation-requests", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(function () {
    return {};
  });

  if (!response.ok) {
    throw new Error(data.message || "Không thể gửi yêu cầu tư vấn lúc này.");
  }

  return data;
}

async function submitMentorApplication(payload) {
  const response = await fetch("/api/mentor-applications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(function () {
    return {};
  });

  if (!response.ok) {
    throw new Error(data.message || "Không thể gửi hồ sơ ứng tuyển mentor lúc này.");
  }

  return data;
}

async function activateMentorApplication(payload) {
  const response = await fetch("/api/mentor-applications/activate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(function () {
    return {};
  });

  if (!response.ok) {
    throw new Error(data.message || "Không thể xác nhận kích hoạt mentor.");
  }

  return data;
}

async function verifyMentorActivation(payload) {
  const response = await fetch("/api/mentor-applications/verify-activation", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(function () {
    return {};
  });

  if (!response.ok) {
    throw new Error(data.message || "Không thể xác minh mã kích hoạt mentor.");
  }

  return data;
}

function initializeConsultationRequestForm() {
  const form = document.getElementById("consultationRequestForm");
  if (!form) return;

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    clearMessage("consultationMessage");

    const payload = {
      name: normalizeWhitespace(document.getElementById("consultationName").value),
      email: normalizeEmail(document.getElementById("consultationEmail").value),
      phone: normalizePhone(document.getElementById("consultationPhone").value),
      serviceType: normalizeWhitespace(document.getElementById("consultationServiceType").value),
      audience: normalizeWhitespace(document.getElementById("consultationAudience").value),
      goal: normalizeWhitespace(document.getElementById("consultationGoal").value),
      preferredFormat: normalizeWhitespace(document.getElementById("consultationPreferredFormat").value),
      preferredChannel: normalizeWhitespace(document.getElementById("consultationPreferredChannel").value),
      preferredTime: normalizeWhitespace(document.getElementById("consultationPreferredTime").value),
      note: normalizeWhitespace(document.getElementById("consultationNote").value)
    };

    if (payload.name.length < 2) {
      showMessage("consultationMessage", "error", "Vui lòng nhập họ và tên hợp lệ.");
      return;
    }

    if (!payload.email.includes("@")) {
      showMessage("consultationMessage", "error", "Email chưa đúng định dạng.");
      return;
    }

    if (payload.phone.length < 10) {
      showMessage("consultationMessage", "error", "Số điện thoại cần có ít nhất 10 chữ số.");
      return;
    }

    if (!payload.serviceType) {
      showMessage("consultationMessage", "error", "Vui lòng chọn dịch vụ bạn quan tâm.");
      return;
    }

    if (payload.goal.length < 10) {
      showMessage("consultationMessage", "error", "Hãy mô tả nhu cầu chi tiết hơn để admin tư vấn chính xác.");
      return;
    }

    if (!payload.preferredFormat) {
      showMessage("consultationMessage", "error", "Vui lòng chọn hình thức muốn được tư vấn.");
      return;
    }

    try {
      await submitConsultationRequest(payload);
      form.reset();
      showMessage(
        "consultationMessage",
        "success",
        "Yêu cầu tư vấn đã được gửi. Admin sẽ liên hệ và sắp xếp buổi tư vấn online nếu phù hợp."
      );
    } catch (error) {
      showMessage("consultationMessage", "error", error.message);
    }
  });
}

async function fetchAdminConsultationRequests(adminKey) {
  const response = await fetch("/api/admin/consultation-requests", {
    headers: {
      "X-Admin-Key": adminKey
    }
  });

  const data = await response.json().catch(function () {
    return {};
  });

  if (!response.ok) {
    throw new Error(data.message || "Không thể tải danh sách yêu cầu tư vấn.");
  }

  return data.requests || [];
}

async function fetchAdminMentorApplications(adminKey) {
  const response = await fetch("/api/admin/mentor-applications", {
    headers: {
      "X-Admin-Key": adminKey
    }
  });

  const data = await response.json().catch(function () {
    return {};
  });

  if (!response.ok) {
    throw new Error(data.message || "Không thể tải danh sách ứng tuyển mentor.");
  }

  return data.applications || [];
}

async function updateAdminConsultationRequest(adminKey, requestId, payload) {
  const response = await fetch("/api/admin/consultation-requests/" + requestId, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-Admin-Key": adminKey
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(function () {
    return {};
  });

  if (!response.ok) {
    throw new Error(data.message || "Không thể cập nhật yêu cầu tư vấn.");
  }

  return data.request;
}

async function updateAdminMentorApplication(adminKey, applicationId, payload) {
  const response = await fetch("/api/admin/mentor-applications/" + applicationId, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-Admin-Key": adminKey
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(function () {
    return {};
  });

  if (!response.ok) {
    throw new Error(data.message || "Không thể cập nhật hồ sơ ứng tuyển mentor.");
  }

  return data.application;
}

function buildAdminConsultationCard(request) {
  const safeName = escapeHtml(request.name);
  const safeEmail = escapeHtml(request.email);
  const safePhone = escapeHtml(request.phone);
  const safeServiceType = escapeHtml(request.serviceType);
  const safeAudience = escapeHtml(request.audience || "Chưa chọn");
  const safePreferredFormat = escapeHtml(request.preferredFormat);
  const safePreferredChannel = escapeHtml(request.preferredChannel || "Chưa chọn");
  const safePreferredTime = escapeHtml(request.preferredTime || "Chưa cập nhật");
  const safeGoal = escapeHtml(request.goal);
  const safeNote = escapeHtml(request.note || "Không có ghi chú thêm.");
  const safeAdminNote = escapeHtml(request.adminNote || "");
  const safeMeetingLink = escapeHtml(request.meetingLink || "");
  const safeStatus = escapeHtml(request.status);
  const meetingLinkHtml = request.meetingLink
    ? `<a href="${safeMeetingLink}" target="_blank" rel="noreferrer">${safeMeetingLink}</a>`
    : "<span>Chưa có link online</span>";

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
        <p><strong>Điện thoại:</strong> ${safePhone}</p>
        <p><strong>Dịch vụ:</strong> ${safeServiceType}</p>
        <p><strong>Đối tượng:</strong> ${safeAudience}</p>
        <p><strong>Muốn tư vấn:</strong> ${safePreferredFormat}</p>
        <p><strong>Kênh online:</strong> ${safePreferredChannel}</p>
        <p><strong>Thời gian tiện:</strong> ${safePreferredTime}</p>
        <p><strong>Ngày tạo:</strong> ${formatDate(request.createdAt)}</p>
      </div>

      <div class="admin-request-body">
        <div class="admin-request-block">
          <span>Mục tiêu</span>
          <p>${safeGoal}</p>
        </div>
        <div class="admin-request-block">
          <span>Ghi chú của người gửi</span>
          <p>${safeNote}</p>
        </div>
      </div>

      <div class="admin-request-online">
        <span>Link tư vấn online</span>
        <div class="admin-request-link">${meetingLinkHtml}</div>
      </div>

      <form class="admin-request-form">
        <label class="auth-field">
          <span>Trạng thái</span>
          <select name="status">
            <option value="new" ${request.status === "new" ? "selected" : ""}>new</option>
            <option value="contacted" ${request.status === "contacted" ? "selected" : ""}>contacted</option>
            <option value="scheduled" ${request.status === "scheduled" ? "selected" : ""}>scheduled</option>
            <option value="completed" ${request.status === "completed" ? "selected" : ""}>completed</option>
          </select>
        </label>

        <label class="auth-field">
          <span>Link meeting online</span>
          <input type="text" name="meetingLink" value="${safeMeetingLink}" placeholder="Ví dụ: https://meet.google.com/abc-defg-hij">
        </label>

        <label class="auth-field">
          <span>Ghi chú admin</span>
          <textarea name="adminNote" rows="4" placeholder="Ví dụ: Đã gọi tư vấn sơ bộ, chờ xác nhận lịch.">${safeAdminNote}</textarea>
        </label>

        <button type="submit" class="mentor-primary-btn">Lưu cập nhật</button>
      </form>
    </article>
  `;
}

function buildAdminMentorApplicationCard(application) {
  const safeFullName = escapeHtml(application.fullName);
  const safeEmail = escapeHtml(application.email);
  const safePhone = escapeHtml(application.phone);
  const safeExpertise = escapeHtml(application.expertise);
  const safeExperience = escapeHtml(application.experience || "Chưa bổ sung.");
  const safeMotivation = escapeHtml(application.motivation);
  const safePortfolioLink = escapeHtml(application.portfolioLink || "");
  const safeAdminNote = escapeHtml(application.adminNote || "");
  const safeStatus = escapeHtml(application.status);

  const portfolioHtml = application.portfolioLink
    ? `<a href="${safePortfolioLink}" target="_blank" rel="noreferrer">${safePortfolioLink}</a>`
    : "<span>Không có link hồ sơ</span>";
  const activationHtml = application.activationCode
    ? `<strong>${escapeHtml(application.activationCode)}</strong>`
    : "<span>Chưa cấp mã kích hoạt</span>";
  const activationGuideHtml = application.activationCode
    ? `
        <div class="admin-request-inline-note">
          Gửi mentor link <a href="mentor-activate.html" target="_blank" rel="noreferrer">mentor-activate.html</a>
          cùng email ứng tuyển và mã kích hoạt này để họ tự tạo mật khẩu đăng nhập.
        </div>
      `
    : "";
  const invitedAtHtml = application.invitedAt
    ? `<p><strong>Đã cấp mã:</strong> ${formatDate(application.invitedAt)}</p>`
    : "";
  const activatedAtHtml = application.activatedAt
    ? `<p><strong>Kích hoạt lúc:</strong> ${formatDate(application.activatedAt)}</p>`
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
        <p><strong>Điện thoại:</strong> ${safePhone}</p>
        <p><strong>Chuyên môn:</strong> ${safeExpertise}</p>
        <p><strong>Ngày nộp:</strong> ${formatDate(application.createdAt)}</p>
        ${invitedAtHtml}
        ${activatedAtHtml}
      </div>

      <div class="admin-request-body">
        <div class="admin-request-block">
          <span>Kinh nghiệm</span>
          <p>${safeExperience}</p>
        </div>
        <div class="admin-request-block">
          <span>Động lực ứng tuyển</span>
          <p>${safeMotivation}</p>
        </div>
      </div>

      <div class="admin-request-body">
        <div class="admin-request-online">
          <span>Portfolio / LinkedIn</span>
          <div class="admin-request-link">${portfolioHtml}</div>
        </div>
        <div class="admin-request-online">
          <span>Mã kích hoạt</span>
          <div class="admin-request-link">${activationHtml}</div>
          ${activationGuideHtml}
        </div>
      </div>

      <form class="admin-mentor-application-form">
        <label class="auth-field">
          <span>Trạng thái</span>
          <select name="status">
            <option value="pending" ${application.status === "pending" ? "selected" : ""}>pending</option>
            <option value="interviewing" ${application.status === "interviewing" ? "selected" : ""}>interviewing</option>
            <option value="approved" ${application.status === "approved" ? "selected" : ""}>approved</option>
            <option value="rejected" ${application.status === "rejected" ? "selected" : ""}>rejected</option>
            <option value="activated" ${application.status === "activated" ? "selected" : ""}>activated</option>
          </select>
        </label>

        <label class="auth-field">
          <span>Cấp mã kích hoạt</span>
          <select name="generateActivation">
            <option value="no">Không</option>
            <option value="yes">Có, tạo mã mới</option>
          </select>
        </label>

        <label class="auth-field">
          <span>Ghi chú admin</span>
          <textarea name="adminNote" rows="4" placeholder="Ví dụ: Đã phỏng vấn ổn, gửi mã kích hoạt qua email.">${safeAdminNote}</textarea>
        </label>

        <button type="submit" class="mentor-primary-btn">Lưu hồ sơ mentor</button>
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
        <span>Tổng hồ sơ mentor</span>
        <strong>${counts.total}</strong>
        <p>Toàn bộ hồ sơ ứng tuyển đang có trong hệ thống.</p>
      </article>
      <article class="admin-summary-card">
        <span>Chờ xử lý</span>
        <strong>${counts.pending}</strong>
        <p>Các hồ sơ mới cần sàng lọc hoặc liên hệ ban đầu.</p>
      </article>
      <article class="admin-summary-card">
        <span>Đang phỏng vấn</span>
        <strong>${counts.interviewing}</strong>
        <p>Ứng viên đang ở vòng trao đổi, đánh giá và chọn lọc.</p>
      </article>
      <article class="admin-summary-card">
        <span>Đã cấp quyền</span>
        <strong>${counts.approved + counts.activated}</strong>
        <p>Mentor đã được duyệt hoặc đã kích hoạt tài khoản thành công.</p>
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
        <p><strong>Gửi lúc:</strong> ${formatDate(request.createdAt)}</p>
        <p><strong>Headline:</strong> ${escapeHtml(profile.role || "Chưa cập nhật")}</p>
        <p><strong>Nơi làm việc / học tập:</strong> ${escapeHtml(profile.workplace || "Chưa cập nhật")}</p>
        <p><strong>Lịch rảnh:</strong> ${escapeHtml(profile.availabilityText || "Chưa cập nhật")}</p>
      </div>

      <div class="admin-request-body">
        <div class="admin-request-block">
          <span>Dịch vụ & giá</span>
          <p>${escapeHtml((profile.serviceText || "Chưa cập nhật") + " | " + (profile.pricing || "Chưa cập nhật"))}</p>
        </div>
        <div class="admin-request-block">
          <span>Đối tượng phù hợp</span>
          <p>${escapeHtml(profile.fit || "Chưa cập nhật")}</p>
        </div>
      </div>

      <div class="admin-request-body">
        <div class="admin-request-block">
          <span>Giới thiệu mentor</span>
          <p>${escapeHtml(profile.intro || "Chưa cập nhật")}</p>
        </div>
        <div class="admin-request-block">
          <span>Thành tích nổi bật</span>
          <p>${escapeHtml(String(profile.achievements || "").split("\n").filter(Boolean).join(" | ") || "Chưa cập nhật")}</p>
        </div>
      </div>

      <form class="admin-mentor-profile-update-form">
        <label class="auth-field">
          <span>Trạng thái</span>
          <select name="status">
            <option value="pending" ${request.status === "pending" ? "selected" : ""}>pending</option>
            <option value="approved" ${request.status === "approved" ? "selected" : ""}>approved</option>
            <option value="rejected" ${request.status === "rejected" ? "selected" : ""}>rejected</option>
          </select>
        </label>

        <label class="auth-field">
          <span>Ghi chú admin</span>
          <textarea name="adminNote" rows="4" placeholder="Ví dụ: Đã duyệt, có thể cập nhật ra trang tìm kiếm mentor.">${safeAdminNote}</textarea>
        </label>

        <button type="submit" class="mentor-primary-btn">Duyệt cập nhật</button>
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
      showMessage("mentorApplicationMessage", "error", "Vui lòng nhập họ và tên hợp lệ.");
      return;
    }

    if (!payload.email.includes("@")) {
      showMessage("mentorApplicationMessage", "error", "Email chưa đúng định dạng.");
      return;
    }

    if (payload.phone.length < 10) {
      showMessage("mentorApplicationMessage", "error", "Số điện thoại cần có ít nhất 10 chữ số.");
      return;
    }

    if (payload.expertise.length < 4) {
      showMessage("mentorApplicationMessage", "error", "Hãy mô tả lĩnh vực chuyên môn rõ hơn.");
      return;
    }

    if (payload.motivation.length < 20) {
      showMessage("mentorApplicationMessage", "error", "Hãy chia sẻ kỹ hơn lý do bạn muốn trở thành mentor.");
      return;
    }

    try {
      await submitMentorApplication(payload);
      form.reset();
      showMessage(
        "mentorApplicationMessage",
        "success",
        "Hồ sơ ứng tuyển mentor đã được gửi. Nếu phù hợp, admin sẽ liên hệ và cấp mã kích hoạt tài khoản."
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
      showMessage("mentorActivationMessage", "error", "Vui lòng nhập họ và tên hợp lệ.");
      return;
    }

    if (!email.includes("@")) {
      showMessage("mentorActivationMessage", "error", "Email chưa đúng định dạng.");
      return;
    }

    if (!activationCode) {
      showMessage("mentorActivationMessage", "error", "Vui lòng nhập mã kích hoạt mentor.");
      return;
    }

    if (password.length < 8) {
      showMessage("mentorActivationMessage", "error", "Mật khẩu cần có tối thiểu 8 ký tự.");
      return;
    }

    if (password !== confirmPassword) {
      showMessage("mentorActivationMessage", "error", "Mật khẩu xác nhận chưa khớp.");
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
        throw new Error("Không thể tạo tài khoản mentor lúc này.");
      }

      if (data.session) {
        await activateMentorApplication({
          email: email,
          activationCode: activationCode
        });

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
        showMessage("mentorActivationMessage", "success", "Kích hoạt tài khoản mentor thành công. Đang chuyển tới dashboard mentor...");
        window.setTimeout(function () {
          window.location.href = "mentor-dashboard.html";
        }, 900);
        return;
      }

      showMessage(
        "mentorActivationMessage",
        "success",
        "Tài khoản mentor đã được tạo. Nếu hệ thống vẫn yêu cầu xác thực email, hãy kiểm tra thiết lập xác thực trong Supabase."
      );
    } catch (error) {
      showMessage("mentorActivationMessage", "error", error.message || "Không thể kích hoạt tài khoản mentor lúc này.");
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

  if (!accessForm || !dashboard || !listElement) return;

  const currentUser = getCurrentUser();
  if (!currentUser) {
    showMessage("adminConsultationMessage", "error", "Hãy đăng nhập bằng tài khoản admin để truy cập khu vực này.");
    accessForm.hidden = true;
    return;
  }

  if (normalizeRole(currentUser.role) !== "admin") {
    showMessage("adminConsultationMessage", "error", "Chỉ tài khoản admin mới có thể truy cập dashboard tư vấn.");
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
            <h3>Chưa có yêu cầu tư vấn nào</h3>
            <p>Khi người dùng gửi form ở trang dịch vụ, danh sách sẽ xuất hiện tại đây.</p>
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
            <h3>Chưa có hồ sơ ứng tuyển mentor</h3>
            <p>Khi có mentor nộp hồ sơ, danh sách sẽ xuất hiện tại đây.</p>
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
          <h3>Chưa có đăng ký học nào với mentor</h3>
          <p>Khi mentee gửi yêu cầu đặt lịch, admin sẽ thấy toàn bộ luồng tại đây để tiện theo dõi.</p>
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
          <h3>Chưa có yêu cầu cập nhật hồ sơ mentor</h3>
          <p>Khi mentor bấm lưu hồ sơ, yêu cầu sẽ được chuyển tới admin để duyệt trước khi cập nhật ra trang tìm kiếm.</p>
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
      showMessage("adminConsultationMessage", "error", "Vui lòng nhập mật khẩu quản trị.");
      return;
    }

    sessionStorage.setItem("mentorMeAdminKey", currentAdminKey);
    await loadRequests();
    await loadMentorApplications();
    loadBookingRequestsForAdmin();
    loadMentorProfileUpdates();
  });

  if (refreshButton) {
    refreshButton.addEventListener("click", loadRequests);
  }

  if (mentorRefreshButton) {
    mentorRefreshButton.addEventListener("click", loadMentorApplications);
  }

  if (bookingRefreshButton) {
    bookingRefreshButton.addEventListener("click", loadBookingRequestsForAdmin);
  }

  if (mentorProfileUpdateRefreshButton) {
    mentorProfileUpdateRefreshButton.addEventListener("click", loadMentorProfileUpdates);
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
      showMessage("adminConsultationMessage", "success", "Đã cập nhật yêu cầu tư vấn.");
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
        showMessage("adminConsultationMessage", "success", "Đã cập nhật hồ sơ ứng tuyển mentor.");
      } catch (error) {
        showMessage("adminConsultationMessage", "error", error.message);
      }
    });
  }

  if (mentorProfileUpdateList) {
    mentorProfileUpdateList.addEventListener("submit", function (e) {
      const form = e.target.closest(".admin-mentor-profile-update-form");
      if (!form) return;

      e.preventDefault();

      const card = form.closest(".admin-request-card");
      if (!card) return;

      const requestId = card.getAttribute("data-mentor-profile-update-id");
      const formData = new FormData(form);
      const status = normalizeWhitespace(formData.get("status"));
      const adminNote = normalizeWhitespace(formData.get("adminNote"));
      const request = updatePendingMentorProfileUpdate(requestId, {
        status: status,
        adminNote: adminNote
      });

      if (request && status === "approved") {
        const approvedStore = getApprovedMentorProfiles();
        approvedStore[request.mentorId] = Object.assign({}, approvedStore[request.mentorId] || {}, request.profile || {});
        saveApprovedMentorProfiles(approvedStore);
      }

      loadMentorProfileUpdates();
      showMessage("adminConsultationMessage", "success", "Đã cập nhật yêu cầu chỉnh sửa hồ sơ mentor.");
    });
  }

  if (bookingListElement) {
    bookingListElement.addEventListener("submit", function (e) {
      const form = e.target.closest(".admin-booking-request-form");
      if (!form) return;

      e.preventDefault();

      const card = form.closest(".admin-request-card");
      if (!card) return;

      const requestId = card.getAttribute("data-admin-booking-id");
      const formData = new FormData(form);
      updateBookingRequest(requestId, {
        status: normalizeWhitespace(formData.get("status")),
        adminNote: normalizeWhitespace(formData.get("adminNote"))
      });
      loadBookingRequestsForAdmin();
      showMessage("adminConsultationMessage", "success", "Đã cập nhật đăng ký học với mentor.");
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
    showMessage("mentorDashboardMessage", "error", "Chỉ tài khoản mentor hoặc admin mới có thể dùng dashboard này.");
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
    previewElements.name.textContent = payload.displayName || currentUser.name || "Tên mentor";
    previewElements.headline.textContent = payload.headline || "Headline chuyên môn sẽ hiển thị ở đây.";
    previewElements.workplace.textContent = payload.workplace || "Chưa cập nhật";
    previewElements.expertise.textContent = payload.expertise || "Chưa cập nhật";
    previewElements.services.textContent = payload.services || "Chưa cập nhật";
    previewElements.pricing.textContent = payload.pricing || "Chưa cập nhật";
    previewElements.availability.textContent = payload.availability || "Chưa cập nhật";
    previewElements.intro.textContent = payload.intro || "Phần giới thiệu mentor sẽ xuất hiện ở đây để bạn xem trước cách hiển thị.";
    previewElements.fit.textContent = payload.fit || "Mô tả nhóm mentee phù hợp sẽ hiển thị tại đây.";
    previewElements.statusBadge.textContent =
      payload.visibility === "public" ? "Sẵn sàng công khai" : "Lưu nháp nội bộ";
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
      : "<li>Chưa có thành tích nổi bật.</li>";
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

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    clearMessage("mentorDashboardMessage");
    syncFromForm();

    if ((draftProfile.displayName || currentUser.name).length < 2) {
      showMessage("mentorDashboardMessage", "error", "Tên hiển thị mentor cần có ít nhất 2 ký tự.");
      return;
    }

    if (!draftProfile.headline) {
      showMessage("mentorDashboardMessage", "error", "Hãy thêm headline chuyên môn để hồ sơ rõ ràng hơn.");
      return;
    }

    saveMentorProfileByUserId(currentUser.id, draftProfile);
    upsertPendingMentorProfileUpdate({
      id: "mentor-profile-update-" + (mentorContext.mentorId || slugifyText(draftProfile.displayName || currentUser.name)),
      mentorId: mentorContext.mentorId || slugifyText(draftProfile.displayName || currentUser.name),
      mentorName: draftProfile.displayName || currentUser.name,
      status: "pending",
      adminNote: "",
      profile: {
        displayName: draftProfile.displayName || currentUser.name,
        name: draftProfile.displayName || currentUser.name,
        image: approvedMentor ? approvedMentor.image : currentUser.avatar,
        role: draftProfile.headline,
        workplace: draftProfile.workplace,
        focus: draftProfile.expertise,
        serviceText: draftProfile.services,
        pricing: draftProfile.pricing,
        availabilityText: draftProfile.availability,
        bio: draftProfile.intro,
        achievements: String(draftProfile.achievements || "").split("\n").map(function (item) { return item.trim(); }).filter(Boolean),
        fit: draftProfile.fit,
        rating: Number(draftProfile.rating || (approvedMentor && approvedMentor.rating) || 4.8),
        studentsTaught: Number(draftProfile.studentsTaught || (approvedMentor && approvedMentor.studentsTaught) || 0),
        reviews: approvedMentor ? approvedMentor.reviews : []
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    showMessage("mentorDashboardMessage", "success", "Hồ sơ mentor đã được gửi về admin để duyệt. Sau khi approved, trang tìm kiếm mentor sẽ tự cập nhật.");
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
      showMessage("registerMessage", "error", "Họ và tên cần có ít nhất 2 ký tự.");
      return;
    }

    if (!email.includes("@")) {
      showMessage("registerMessage", "error", "Email chưa đúng định dạng.");
      return;
    }

    if (phone.length < 10) {
      showMessage("registerMessage", "error", "Số điện thoại cần có ít nhất 10 chữ số.");
      return;
    }

    if (password.length < 8) {
      showMessage("registerMessage", "error", "Mật khẩu cần có tối thiểu 8 ký tự.");
      return;
    }

    if (password !== confirmPassword) {
      showMessage("registerMessage", "error", "Mật khẩu xác nhận chưa khớp.");
      return;
    }

    if (!agreed) {
      showMessage("registerMessage", "error", "Bạn cần đồng ý với điều khoản lưu trữ thông tin để tiếp tục.");
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
        throw new Error("Không thể tạo tài khoản lúc này.");
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
        showMessage("registerMessage", "success", "Tạo tài khoản thành công. Bạn đang được chuyển tới hồ sơ cá nhân...");
        window.setTimeout(function () {
          window.location.href = "profile.html";
        }, 900);
        return;
      }

      showMessage("registerMessage", "success", "Tài khoản đã được tạo. Hãy kiểm tra email để xác nhận trước khi đăng nhập.");
    } catch (error) {
      showMessage("registerMessage", "error", error.message || "Không thể tạo tài khoản trên Supabase.");
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
      showMessage("loginMessage", "error", "Vui lòng nhập đầy đủ thông tin đăng nhập.");
      return;
    }

    const demoUser = createDemoSessionUser(identifier);
    const isDemoAdminOrMentor = demoUser && ["admin", "mentor"].includes(normalizeRole(demoUser.role)) && password === identifier;
    const isDemoMentee = demoUser && normalizeRole(demoUser.role) === "mentee" && normalizeEmail(identifier) === DEMO_MENTEE_EMAIL && password === DEMO_MENTEE_PASSWORD;

    if (demoUser && (isDemoAdminOrMentor || isDemoMentee)) {
      if (demoUser.role === "admin") {
        sessionStorage.setItem("mentorMeAdminKey", DEMO_ADMIN_ACCESS_CODE);
      }

      if (demoUser.role === "mentor") {
        const mentor = mentorData["tien-dung"];
        saveMentorProfileByUserId(demoUser.id, Object.assign({
          displayName: mentor ? mentor.name : demoUser.name,
          headline: mentor ? mentor.role : "Mentor học tập và định hướng",
          workplace: mentor ? mentor.workplace : "Đang cập nhật",
          expertise: mentor ? mentor.focus : "Thuyết trình, hoạt động học đường, định hướng hồ sơ",
          services: mentor ? mentor.serviceText : "1:1 mentoring, mentor theo nhóm, tư vấn định hướng",
          pricing: "250.000 - 350.000 VNĐ / buổi",
          availability: mentor ? mentor.availabilityText : "Buổi chiều và buổi tối",
          intro: "Đồng hành với mentee trong các chủ đề học tập, kỹ năng và định hướng hồ sơ.",
          achievements: mentor ? mentor.achievements.join("\n") : "Giải Nhất thuyết trình\nGiải Nhì sáng kiến học đường\nTrưởng ban Nội dung cộng đồng HS14",
          fit: mentor ? mentor.fit : "Học sinh cần cải thiện kỹ năng thuyết trình, xây hồ sơ hoạt động hoặc cần mentor đồng hành.",
          visibility: "public"
        }, getMentorProfileByUserId(demoUser.id) || {}));
      }

      saveAuthSession(demoUser);
      showMessage("loginMessage", "success", "Đăng nhập tài khoản test thành công. Đang chuyển đến trang phù hợp...");
      window.setTimeout(function () {
        window.location.href = getRedirectTarget() || getRoleHomePath(demoUser.role);
      }, 500);
      return;
    }

    if (!ensureSupabaseReady("loginMessage")) return;

    if (!identifier.includes("@")) {
      showMessage("loginMessage", "error", "Với tài khoản thật, vui lòng dùng email đã đăng ký. Tài khoản test đang hỗ trợ mã ADMIN2026, mentor0001 hoặc email demo mentee.");
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
        throw new Error("Đăng nhập thành công nhưng không tải được hồ sơ.");
      }

      showMessage("loginMessage", "success", "Đăng nhập thành công. Đang chuyển đến trang tiếp theo...");
      window.setTimeout(function () {
        window.location.href = getRedirectTarget() || getRoleHomePath(sessionUser.role);
      }, 700);
    } catch (error) {
      showMessage("loginMessage", "error", error.message || "Không thể đăng nhập lúc này.");
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
      profileBioLabel.textContent = normalizedRole === "mentee" ? "Giới thiệu ngắn" : "Mô tả ngắn";
    }

    if (profileBioInput) {
      profileBioInput.placeholder = getRoleBioPlaceholder(normalizedRole);
    }

    if (profileRoleHint) {
      profileRoleHint.textContent = normalizedRole === "mentee"
        ? "Tài khoản mentee được đăng ký công khai. Mentor và admin được cấp riêng sau khi chọn lọc hoặc phân quyền nội bộ."
        : "Loại tài khoản này được cấp riêng theo quy trình nội bộ nên không đổi trực tiếp tại hồ sơ cá nhân.";
    }

    if (profileBannerTitle) {
      profileBannerTitle.textContent = normalizedRole === "mentor"
        ? "Quản lý tài khoản mentor và sẵn sàng hoàn thiện dashboard chuyên môn."
        : normalizedRole === "admin"
          ? "Quản lý tài khoản admin để vận hành lead tư vấn và kiểm duyệt mentor."
          : "Quản lý thông tin và sẵn sàng kết nối với mentor phù hợp.";
    }

    if (profileBannerDescription) {
      profileBannerDescription.textContent = normalizedRole === "mentor"
        ? "Giữ thông tin liên hệ nhất quán để admin dễ xác minh và mentee dễ nhận diện khi hồ sơ được mở công khai."
        : normalizedRole === "admin"
          ? "Hồ sơ admin tập trung vào liên hệ nội bộ và phạm vi phụ trách, còn phần vận hành chính nằm ở dashboard admin."
          : "Cập nhật mục tiêu, cách học và thông tin liên hệ để trải nghiệm tìm mentor trở nên sát nhu cầu hơn.";
    }

    if (profileSectionDescription) {
      profileSectionDescription.textContent = normalizedRole === "mentor"
        ? "Cập nhật thông tin tài khoản cơ bản. Phần chuyên môn, dịch vụ và lịch rảnh nằm ở dashboard mentor."
        : normalizedRole === "admin"
          ? "Cập nhật thông tin tài khoản quản trị cơ bản. Việc xử lý lead và hồ sơ mentor được thực hiện ở dashboard admin."
          : "Cập nhật hồ sơ để mentor hiểu rõ hơn về nhu cầu và mục tiêu học tập của bạn.";
    }
  }

  function fillProfile(account) {
    const normalizedRole = normalizeRole(account.role);
    profileAvatar.src = account.avatar || createAvatarFallback(account.name);
    profileDisplayName.textContent = account.name;
    profileHeadline.textContent = account.bio || "Hồ sơ cá nhân Mentor Me";
    profileGoalPreview.textContent = account.goal
      ? (normalizedRole === "mentee" ? "Mục tiêu hiện tại: " : "Định hướng hiện tại: ") + account.goal
      : normalizedRole === "mentor"
        ? "Bạn chưa thêm định hướng mentoring. Hãy cập nhật để admin và mentee hiểu rõ hơn về vai trò của bạn."
        : normalizedRole === "admin"
          ? "Bạn chưa thêm phạm vi quản trị. Hãy cập nhật để nội bộ dễ nhận biết vai trò của tài khoản này."
          : "Bạn chưa thêm mục tiêu học tập. Hãy cập nhật để mentor hiểu rõ hơn về nhu cầu của bạn.";
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
      showMessage("profileMessage", "error", "Tên hiển thị cần có ít nhất 2 ký tự.");
      return;
    }

    if (updatedPhone.length < 10) {
      showMessage("profileMessage", "error", "Số điện thoại cần có ít nhất 10 chữ số.");
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
        showMessage("profileMessage", "success", "Đã cập nhật hồ sơ tài khoản test.");
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
      showMessage("profileMessage", "success", "Hồ sơ đã được cập nhật thành công.");
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
        showMessage("profileMessage", "error", "Mật khẩu mới cần có tối thiểu 8 ký tự.");
        return;
      }

      if (newPassword !== confirmNewPassword) {
        showMessage("profileMessage", "error", "Mật khẩu mới và xác nhận mật khẩu chưa khớp.");
        return;
      }

      try {
        if (demoMode) {
          changePasswordForm.reset();
          showMessage("profileMessage", "success", "Đã đổi mật khẩu giả lập cho tài khoản test.");
          return;
        }

        const { error: reauthError } = await supabaseClient.auth.signInWithPassword({
          email: currentProfileUser.email,
          password: currentPassword
        });

        if (reauthError) {
          throw new Error("Mật khẩu hiện tại chưa chính xác.");
        }

        const { error: updateError } = await supabaseClient.auth.updateUser({
          password: newPassword
        });

        if (updateError) {
          throw updateError;
        }

        changePasswordForm.reset();
        showMessage("profileMessage", "success", "Mật khẩu đã được cập nhật thành công.");
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
  if (normalizedStatus === "accepted") return "Đã nhận";
  if (normalizedStatus === "rejected") return "Đã từ chối";
  if (normalizedStatus === "completed") return "Đã hoàn thành";
  return "Chờ phản hồi";
}

function buildMenteeScheduleCard(request) {
  const submittedReview = getSubmittedReviewByBookingId(request.id);
  const canReview = request.status === "accepted" || request.status === "completed";
  const reviewHtml = !canReview
    ? `
        <div class="schedule-review-box is-muted">
          <span>Đánh giá mentor</span>
          <p>Bạn có thể đánh giá mentor sau khi yêu cầu đã được nhận.</p>
        </div>
      `
    : submittedReview
      ? `
          <div class="schedule-review-box">
            <span>Đánh giá của bạn</span>
            <div class="schedule-review-summary">
              <strong>${Number(submittedReview.rating || 0).toFixed(1)} / 5 sao</strong>
              <p>${escapeHtml(submittedReview.content || "Bạn đã gửi đánh giá cho mentor này.")}</p>
            </div>
          </div>
        `
      : `
          <form class="schedule-review-form" data-booking-review-id="${request.id}">
            <div class="schedule-review-form-head">
              <span>Đánh giá mentor</span>
              <p>Chia sẻ nhanh trải nghiệm của bạn để hồ sơ mentor hiển thị chân thực hơn.</p>
            </div>
            <div class="schedule-review-fields">
              <label class="auth-field">
                <span>Số sao</span>
                <select name="rating" required>
                  <option value="">Chọn số sao</option>
                  <option value="5">5 sao</option>
                  <option value="4">4 sao</option>
                  <option value="3">3 sao</option>
                  <option value="2">2 sao</option>
                  <option value="1">1 sao</option>
                </select>
              </label>
              <label class="auth-field profile-full-width">
                <span>Nhận xét</span>
                <textarea name="content" rows="4" placeholder="Ví dụ: Mentor giải thích rõ, theo sát và giúp mình tự tin hơn." required></textarea>
              </label>
            </div>
            <button type="submit" class="mentor-primary-btn">Gửi đánh giá</button>
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
        <p><strong>Mục tiêu:</strong> ${escapeHtml(request.goal)}</p>
        <p><strong>Thời gian mong muốn:</strong> ${escapeHtml(request.preferredTime)}</p>
        <p><strong>Gửi lúc:</strong> ${formatDate(request.createdAt)}</p>
        <p><strong>Lĩnh vực:</strong> ${escapeHtml(request.mentorFocus || "Chưa cập nhật")}</p>
      </div>
      <div class="schedule-card-note">
        <span>Ghi chú</span>
        <p>${escapeHtml(request.note || "Không có ghi chú thêm.")}</p>
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
          <span class="schedule-card-label">Yêu cầu mới</span>
          <h3>${escapeHtml(request.menteeName)}</h3>
        </div>
        <span class="admin-request-status status-${escapeHtml(request.status)}">${buildBookingStatusLabel(request.status)}</span>
      </div>
      <div class="schedule-card-grid">
        <p><strong>Email:</strong> ${escapeHtml(request.menteeEmail)}</p>
        <p><strong>Mentor được chọn:</strong> ${escapeHtml(request.mentorName)}</p>
        <p><strong>Thời gian mong muốn:</strong> ${escapeHtml(request.preferredTime)}</p>
        <p><strong>Ngày gửi:</strong> ${formatDate(request.createdAt)}</p>
      </div>
      <div class="schedule-card-note">
        <span>Mục tiêu mentee</span>
        <p>${escapeHtml(request.goal)}</p>
      </div>
      <div class="schedule-card-actions">
        <button type="button" class="mentor-primary-btn" data-booking-action="accept" data-booking-id="${request.id}">Nhận mentee</button>
        <button type="button" class="mentor-secondary-btn" data-booking-action="reject" data-booking-id="${request.id}">Từ chối</button>
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
        <p><strong>Khung giờ:</strong> ${escapeHtml(request.preferredTime)}</p>
        <p><strong>Ngày gửi:</strong> ${formatDate(request.createdAt)}</p>
      </div>

      <div class="admin-request-body">
        <div class="admin-request-block">
          <span>Mục tiêu học</span>
          <p>${escapeHtml(request.goal || "Chưa cập nhật")}</p>
        </div>
        <div class="admin-request-block">
          <span>Ghi chú mentee</span>
          <p>${escapeHtml(request.note || "Không có ghi chú thêm.")}</p>
        </div>
      </div>

      <form class="admin-booking-request-form">
        <label class="auth-field">
          <span>Trạng thái</span>
          <select name="status">
            <option value="pending" ${request.status === "pending" ? "selected" : ""}>pending</option>
            <option value="accepted" ${request.status === "accepted" ? "selected" : ""}>accepted</option>
            <option value="rejected" ${request.status === "rejected" ? "selected" : ""}>rejected</option>
            <option value="completed" ${request.status === "completed" ? "selected" : ""}>completed</option>
          </select>
        </label>

        <label class="auth-field">
          <span>Ghi chú admin</span>
          <textarea name="adminNote" rows="4" placeholder="Ví dụ: Đã xác nhận đây là lead phù hợp cho mentor.">${escapeHtml(request.adminNote || "")}</textarea>
        </label>

        <button type="submit" class="mentor-primary-btn">Lưu cập nhật</button>
      </form>
    </article>
  `;
}

function buildAcceptedMenteeCard(request) {
  return `
    <article class="schedule-card">
      <div class="schedule-card-head">
        <div>
          <span class="schedule-card-label">Mentee đã nhận</span>
          <h3>${escapeHtml(request.menteeName)}</h3>
        </div>
        <span class="admin-request-status status-${escapeHtml(request.status)}">${buildBookingStatusLabel(request.status)}</span>
      </div>
      <div class="schedule-card-grid">
        <p><strong>Email:</strong> ${escapeHtml(request.menteeEmail)}</p>
        <p><strong>Mentor:</strong> ${escapeHtml(request.mentorName)}</p>
        <p><strong>Lịch dạy:</strong> ${escapeHtml(request.preferredTime)}</p>
        <p><strong>Mục tiêu:</strong> ${escapeHtml(request.goal)}</p>
      </div>
      <div class="schedule-card-note">
        <span>Ghi chú của mentee</span>
        <p>${escapeHtml(request.note || "Không có ghi chú thêm.")}</p>
      </div>
    </article>
  `;
}

function buildAcceptedMenteeDetailCard(request) {
  return `
    <a class="schedule-card schedule-card-link" href="mentor-booking-detail.html?id=${encodeURIComponent(request.id)}">
      <div class="schedule-card-head">
        <div>
          <span class="schedule-card-label">Mentee đã nhận</span>
          <h3>${escapeHtml(request.menteeName)}</h3>
        </div>
        <span class="admin-request-status status-${escapeHtml(request.status)}">${buildBookingStatusLabel(request.status)}</span>
      </div>
      <div class="schedule-card-grid">
        <p><strong>Email:</strong> ${escapeHtml(request.menteeEmail)}</p>
        <p><strong>Khung giờ:</strong> ${escapeHtml(request.preferredTime)}</p>
        <p><strong>Mục tiêu:</strong> ${escapeHtml(request.goal)}</p>
        <p><strong>Mentor:</strong> ${escapeHtml(request.mentorName)}</p>
      </div>
      <div class="schedule-card-note">
        <span>Đi tới chi tiết</span>
        <p>Bấm vào ô này để xem đầy đủ thông tin mentee, buổi học và hồ sơ mentor liên quan.</p>
      </div>
    </a>
  `;
}

function parsePreferredTimeToWeekday(timeText) {
  const text = normalizeWhitespace(timeText).toLowerCase();
  if (text.includes("thứ 2")) return 1;
  if (text.includes("thứ 3")) return 2;
  if (text.includes("thứ 4")) return 3;
  if (text.includes("thứ 5")) return 4;
  if (text.includes("thứ 6")) return 5;
  if (text.includes("thứ 7")) return 6;
  if (text.includes("cn") || text.includes("chủ nhật")) return 0;
  return null;
}

function getNextCalendarDateForRequest(request) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const weekday = parsePreferredTimeToWeekday(request.preferredTime);

  if (weekday === null) {
    return new Date(year, month, Math.min(28, today.getDate() + 2));
  }

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();

  for (let day = 1; day <= lastDayOfMonth; day += 1) {
    const currentDate = new Date(year, month, day);
    if (currentDate.getDay() === weekday && currentDate >= new Date(year, month, today.getDate())) {
      return currentDate;
    }
  }

  for (let fallbackDay = 1; fallbackDay <= lastDayOfMonth; fallbackDay += 1) {
    const fallbackDate = new Date(year, month, fallbackDay);
    if (fallbackDate.getDay() === weekday) {
      return fallbackDate;
    }
  }

  return new Date(year, month, today.getDate());
}

function getAcceptedRequestsForCurrentMentor(currentUser) {
  return filterRequestsForCurrentMentor(getBookingRequests(), currentUser).filter(function (request) {
    return request.status === "accepted" || request.status === "completed";
  });
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

function initializeMenteeSchedulePage() {
  const scheduleList = document.getElementById("menteeScheduleList");
  const summary = document.getElementById("menteeScheduleSummary");
  if (!scheduleList || !summary) return;

  const currentUser = getCurrentUser();
  if (!currentUser) {
    window.location.href = "login.html?redirect=mentee-schedule.html";
    return;
  }

  const requests = getBookingRequests().filter(function (request) {
    return request.menteeUserId === currentUser.id || normalizeEmail(request.menteeEmail) === normalizeEmail(currentUser.email);
  });

  summary.innerHTML = `
    <article class="schedule-summary-card">
      <span>Tổng yêu cầu</span>
      <strong>${requests.length}</strong>
    </article>
    <article class="schedule-summary-card">
      <span>Đã nhận</span>
      <strong>${requests.filter(function (request) { return request.status === "accepted"; }).length}</strong>
    </article>
    <article class="schedule-summary-card">
      <span>Chờ phản hồi</span>
      <strong>${requests.filter(function (request) { return request.status === "pending"; }).length}</strong>
    </article>
  `;

  if (!requests.length) {
    scheduleList.innerHTML = `
      <div class="admin-empty-state">
        <h3>Bạn chưa có lịch học nào</h3>
        <p>Hãy đặt lịch với mentor để các buổi học và trạng thái xử lý xuất hiện tại đây.</p>
      </div>
    `;
    return;
  }

  scheduleList.innerHTML = requests.map(buildMenteeScheduleCard).join("");

  if (!scheduleList.dataset.reviewBound) {
    scheduleList.addEventListener("submit", function (event) {
      const form = event.target.closest(".schedule-review-form");
      if (!form) return;

      event.preventDefault();

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

      saveSubmittedReview({
        bookingId: currentRequest.id,
        mentorId: currentRequest.mentorId,
        mentorName: currentRequest.mentorName,
        author: activeUser.name || currentRequest.menteeName,
        role: "Mentee Mentor Me",
        rating: rating,
        content: content,
        createdAt: new Date().toISOString()
      });

      initializeMenteeSchedulePage();
    });
    scheduleList.dataset.reviewBound = "true";
  }
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
      ? "Đang hiển thị yêu cầu đăng ký dành cho mentor: " + mentorContext.mentorName + "."
      : "Tài khoản này chưa được gắn với một hồ sơ mentor cụ thể, nên đang hiển thị toàn bộ yêu cầu để tiện theo dõi nội bộ.";

    summary.innerHTML = `
      <article class="schedule-summary-card">
        <span>Yêu cầu mới</span>
        <strong>${pendingRequests.length}</strong>
      </article>
      <article class="schedule-summary-card">
        <span>Đã nhận</span>
        <strong>${scopedRequests.filter(function (request) { return request.status === "accepted"; }).length}</strong>
      </article>
      <article class="schedule-summary-card">
        <span>Đã từ chối</span>
        <strong>${scopedRequests.filter(function (request) { return request.status === "rejected"; }).length}</strong>
      </article>
    `;

    if (!pendingRequests.length) {
      listElement.innerHTML = `
        <div class="admin-empty-state">
          <h3>Chưa có mentee mới muốn đăng ký</h3>
          <p>Khi mentee gửi yêu cầu đặt lịch, danh sách này sẽ cập nhật để mentor xử lý.</p>
        </div>
      `;
      return;
    }

    listElement.innerHTML = pendingRequests.map(buildMentorLeadCard).join("");
  }

  listElement.addEventListener("click", function (event) {
    const button = event.target.closest("[data-booking-action]");
    if (!button) return;

    const bookingId = button.getAttribute("data-booking-id");
    const action = button.getAttribute("data-booking-action");
    updateBookingRequest(bookingId, {
      status: action === "accept" ? "accepted" : "rejected"
    });
    render();
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
    ? "Đang hiển thị mentee và lịch dạy của mentor: " + mentorContext.mentorName + "."
    : "Tài khoản này chưa được gắn với một hồ sơ mentor cụ thể, nên đang hiển thị toàn bộ khu quản lý đã nhận trong hệ thống.";

  summary.innerHTML = `
    <article class="schedule-summary-card">
      <span>Mentee đã nhận</span>
      <strong>${acceptedRequests.length}</strong>
    </article>
    <article class="schedule-summary-card">
      <span>Lịch dạy sắp tới</span>
      <strong>${acceptedRequests.length}</strong>
    </article>
    <article class="schedule-summary-card">
      <span>Đã hoàn thành</span>
      <strong>${acceptedRequests.filter(function (request) { return request.status === "completed"; }).length}</strong>
    </article>
  `;
  acceptedPreview.textContent = acceptedRequests.length + " mentee";
  teachingPreview.textContent = acceptedRequests.length + " buổi";
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
    ? "Đang hiển thị danh sách mentee đã nhận cho mentor: " + mentorContext.mentorName + "."
    : "Tài khoản này chưa được gắn mentor cụ thể nên đang hiển thị toàn bộ mentee đã nhận.";

  summary.innerHTML = `
    <article class="schedule-summary-card">
      <span>Mentee đã nhận</span>
      <strong>${acceptedRequests.length}</strong>
    </article>
    <article class="schedule-summary-card">
      <span>Đã hoàn thành</span>
      <strong>${acceptedRequests.filter(function (request) { return request.status === "completed"; }).length}</strong>
    </article>
    <article class="schedule-summary-card">
      <span>Mở chi tiết</span>
      <strong>${acceptedRequests.length}</strong>
    </article>
  `;

  if (!acceptedRequests.length) {
    listElement.innerHTML = `
      <div class="admin-empty-state">
        <h3>Chưa có mentee đã nhận</h3>
        <p>Sau khi mentor nhận yêu cầu đăng ký, danh sách mentee sẽ xuất hiện tại đây.</p>
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
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const firstDate = new Date(year, month, 1);
  const startOffset = (firstDate.getDay() + 6) % 7;
  const totalDays = new Date(year, month + 1, 0).getDate();

  note.textContent = mentorContext.mentorId
    ? "Calendar đang hiển thị lịch dạy của mentor: " + mentorContext.mentorName + "."
    : "Calendar đang hiển thị toàn bộ các lịch dạy đã được nhận trong hệ thống.";
  monthLabel.textContent = firstDate.toLocaleDateString("vi-VN", {
    month: "long",
    year: "numeric"
  });

  summary.innerHTML = `
    <article class="schedule-summary-card">
      <span>Buổi đã nhận</span>
      <strong>${acceptedRequests.length}</strong>
    </article>
    <article class="schedule-summary-card">
      <span>Tuần này</span>
      <strong>${acceptedRequests.length}</strong>
    </article>
    <article class="schedule-summary-card">
      <span>Calendar events</span>
      <strong>${acceptedRequests.length}</strong>
    </article>
  `;

  if (!acceptedRequests.length) {
    calendarGrid.innerHTML = `
      <div class="admin-empty-state mentor-calendar-empty">
        <h3>Chưa có lịch dạy nào</h3>
        <p>Khi mentor nhận mentee, buổi học sẽ xuất hiện ở đây dưới dạng calendar.</p>
      </div>
    `;
    return;
  }

  const eventsByDay = acceptedRequests.reduce(function (map, request) {
    const eventDate = getNextCalendarDateForRequest(request);
    const day = eventDate.getDate();
    if (!map[day]) {
      map[day] = [];
    }
    map[day].push(request);
    return map;
  }, {});

  const cells = [];
  for (let i = 0; i < startOffset; i += 1) {
    cells.push('<div class="mentor-calendar-cell is-empty"></div>');
  }

  for (let day = 1; day <= totalDays; day += 1) {
    const events = eventsByDay[day] || [];
    const isToday = day === today.getDate();
    cells.push(`
      <div class="mentor-calendar-cell ${isToday ? "is-today" : ""}">
        <div class="mentor-calendar-date">${day}</div>
        <div class="mentor-calendar-events">
          ${events.map(function (request) {
            return `
              <a href="mentor-booking-detail.html?id=${encodeURIComponent(request.id)}" class="mentor-calendar-event">
                <strong>${escapeHtml(request.menteeName)}</strong>
                <span>${escapeHtml(request.preferredTime)}</span>
              </a>
            `;
          }).join("")}
        </div>
      </div>
    `);
  }

  calendarGrid.innerHTML = cells.join("");
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
        <h3>Không tìm thấy buổi dạy</h3>
        <p>Buổi học này không còn tồn tại hoặc không thuộc mentor hiện tại.</p>
      </div>
    `;
    return;
  }

  const mentor = getResolvedMentorById(request.mentorId);
  note.textContent = "Đây là trang chi tiết của buổi dạy giữa " + request.mentorName + " và " + request.menteeName + ".";

  content.innerHTML = `
    <article class="mentor-booking-detail-card">
      <span class="schedule-card-label">Mentee đã nhận</span>
      <h2>${escapeHtml(request.menteeName)}</h2>
      <div class="schedule-card-grid">
        <p><strong>Email:</strong> ${escapeHtml(request.menteeEmail)}</p>
        <p><strong>Khung giờ:</strong> ${escapeHtml(request.preferredTime)}</p>
        <p><strong>Trạng thái:</strong> ${escapeHtml(buildBookingStatusLabel(request.status))}</p>
        <p><strong>Ngày gửi:</strong> ${escapeHtml(formatDate(request.createdAt))}</p>
      </div>
      <div class="schedule-card-note">
        <span>Mục tiêu học tập</span>
        <p>${escapeHtml(request.goal || "Chưa cập nhật")}</p>
      </div>
      <div class="schedule-card-note">
        <span>Ghi chú của mentee</span>
        <p>${escapeHtml(request.note || "Không có ghi chú thêm.")}</p>
      </div>
    </article>
    <article class="mentor-booking-detail-card">
      <span class="schedule-card-label">Mentor phụ trách</span>
      <h2>${escapeHtml(request.mentorName)}</h2>
      <div class="schedule-card-grid">
        <p><strong>Nơi làm việc / học tập:</strong> ${escapeHtml((mentor && mentor.workplace) || "Đang cập nhật")}</p>
        <p><strong>Lĩnh vực:</strong> ${escapeHtml((mentor && mentor.focus) || request.mentorFocus || "Đang cập nhật")}</p>
        <p><strong>Đánh giá:</strong> ${escapeHtml(mentor ? Number(mentor.rating || 0).toFixed(1) + " / 5 sao" : "Đang cập nhật")}</p>
        <p><strong>Đã đồng hành:</strong> ${escapeHtml(mentor ? String(mentor.studentsTaught || 0) + " học sinh" : "Đang cập nhật")}</p>
      </div>
      <div class="schedule-card-note">
        <span>Giới thiệu ngắn</span>
        <p>${escapeHtml((mentor && mentor.bio) || "Thông tin mentor sẽ hiển thị tại đây sau khi hồ sơ được cập nhật.")}</p>
      </div>
      <div class="schedule-card-actions">
        <a href="mentor-detail.html?id=${encodeURIComponent(request.mentorId)}" class="mentor-primary-btn">Xem chi tiết mentor</a>
        <a href="mentor-accepted.html" class="mentor-secondary-btn">Quay lại mentee đã nhận</a>
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
      showMessage("forgotPasswordMessage", "error", "Vui lòng nhập đúng email đã đăng ký.");
      return;
    }

    try {
      const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/reset-password.html"
      });

      if (error) {
        throw error;
      }

      showMessage("forgotPasswordMessage", "success", "Đã gửi email đặt lại mật khẩu. Hãy kiểm tra hộp thư của bạn.");
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
      showMessage("resetPasswordMessage", "error", "Mật khẩu mới cần có tối thiểu 8 ký tự.");
      return;
    }

    if (newPassword !== confirmPassword) {
      showMessage("resetPasswordMessage", "error", "Mật khẩu xác nhận chưa khớp.");
      return;
    }

    try {
      const session = await getSupabaseSession();
      if (!session) {
        throw new Error("Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.");
      }

      const { error } = await supabaseClient.auth.updateUser({
        password: newPassword
      });

      if (error) {
        throw error;
      }

      showMessage("resetPasswordMessage", "success", "Mật khẩu mới đã được lưu thành công. Bạn có thể đăng nhập lại.");
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
  ensureDemoBookingRequests();
  if (isSupabaseReady()) {
    await loadCurrentUserFromSupabase();
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
  initializeMentorRequestsPage();
  initializeMentorMenteesPage();
  initializeMentorAcceptedPage();
  initializeMentorTeachingCalendarPage();
  initializeMentorBookingDetailPage();
  initializeProfilePage();
}

bootstrapApp();
