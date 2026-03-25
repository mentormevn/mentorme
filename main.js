// ================= MENU MOBILE =================
const hamburger = document.querySelector(".hamburger");
const menu = document.querySelector(".menu");
const CURRENT_USER_STORAGE_KEY = "currentUser";
const appConfig = window.MENTOR_ME_CONFIG || {};
const SUPABASE_URL = appConfig.SUPABASE_URL || "";
const SUPABASE_PUBLISHABLE_KEY = appConfig.SUPABASE_ANON_KEY || "";
const supabaseClient = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
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

function isSupabaseReady() {
  return Boolean(supabaseClient);
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
  return {
    id: authUser.id,
    name: profileData.full_name || authUser.user_metadata?.full_name || authUser.email?.split("@")[0] || "Mentor Me User",
    email: authUser.email || "",
    phone: profileData.phone || "",
    goal: profileData.goal || "",
    bio: profileData.bio || "",
    avatar: profileData.avatar_url || createAvatarFallback(profileData.full_name || authUser.email || "MM"),
    createdAt: profileData.created_at || authUser.created_at || new Date().toISOString()
  };
}

async function loadCurrentUserFromSupabase() {
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
        <a href="profile.html">Hồ sơ</a>
        <a href="#">Lịch học</a>
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
    image: "mentor1.jpg",
    tag: "Mentor tiếng Trung",
    role: "Đồng hành luyện thi HSK và xây dựng lộ trình học tiếng Trung",
    bio: "Trà My phù hợp với học sinh cần một mentor nhẹ nhàng nhưng theo sát, vừa hỗ trợ lên lộ trình vừa giúp giữ nhịp học đều trong tuần.",
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

function createMentorCard(mentor) {
  return `
    <a class="mentor-card mentor-grid-card mentor-card-link" href="mentor-detail.html?id=${mentor.id}">
      <img src="${mentor.image}" alt="${mentor.name}">
      <h3>${mentor.name}</h3>
      <p>Chuyên môn: ${mentor.focus}</p>
      <p>Thời gian rảnh: ${mentor.availabilityText}</p>
      <p>Dịch vụ: ${mentor.serviceText}</p>
    </a>
  `;
}

function renderMentorList(mentors, keyword) {
  const mentorGrid = document.getElementById("mentorGrid");
  const summary = document.getElementById("mentorResultsSummary");

  if (!mentorGrid || !summary) return;

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
    return;
  }

  mentorGrid.innerHTML = mentors.map(createMentorCard).join("");
  typeTextSlowly(
    summary,
    keyword
      ? `Tìm thấy ${mentors.length} mentor phù hợp với mô tả: "${keyword}".`
      : `Đang hiển thị ${mentors.length} mentor phù hợp.`,
    26
  );
}

function initializeHomeMentorSection() {
  const homeMentorTrack = document.getElementById("homeMentorTrack");
  if (!homeMentorTrack) return;

  const featuredMentors = Object.values(mentorData);
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

  const mentors = Object.values(mentorData)
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
  renderMentorList(mentors, keyword);
}

function initializeSearchPage() {
  const mentorGrid = document.getElementById("mentorGrid");
  if (!mentorGrid) return;

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
    searchField.addEventListener("input", filterMentors);
  }

  if (searchButtonElement) {
    searchButtonElement.addEventListener("click", filterMentors);
  }

  [fieldFilter, availabilityFilter, serviceFilter].forEach(function (selectElement) {
    if (selectElement) {
      selectElement.addEventListener("change", filterMentors);
    }
  });

  filterMentors();
}

function renderMentorDetail() {
  const nameElement = document.getElementById("mentorDetailName");
  if (!nameElement) return;

  const params = new URLSearchParams(window.location.search);
  const mentorId = params.get("id");
  const mentor = mentorData[mentorId] || mentorData["tra-my"];

  document.getElementById("mentorDetailImage").src = mentor.image;
  document.getElementById("mentorDetailImage").alt = mentor.name;
  document.getElementById("mentorDetailTag").textContent = mentor.tag;
  nameElement.textContent = mentor.name;
  document.getElementById("mentorDetailRole").textContent = mentor.role;
  document.getElementById("mentorDetailBio").textContent = mentor.bio;
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
}

function initializeBookingPage() {
  const bookingForm = document.getElementById("bookingForm");
  if (!bookingForm) return;

  const params = new URLSearchParams(window.location.search);
  const mentorId = params.get("id");
  const mentor = mentorData[mentorId] || mentorData["tra-my"];

  document.getElementById("bookingMentorImage").src = mentor.image;
  document.getElementById("bookingMentorImage").alt = mentor.name;
  document.getElementById("bookingMentorName").textContent = mentor.name;
  document.getElementById("bookingMentorRole").textContent = mentor.role;
  document.getElementById("bookingMentorFocus").textContent = mentor.focus;
  document.getElementById("bookingMentorAvailability").textContent = mentor.availabilityText;
  document.getElementById("bookingMentorService").textContent = mentor.serviceText;

  bookingForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const name = document.getElementById("bookingName").value.trim();
    const email = document.getElementById("bookingEmail").value.trim();
    const goal = document.getElementById("bookingGoal").value.trim();
    const time = document.getElementById("bookingTime").value;
    const note = document.getElementById("bookingNote").value.trim();
    const successBox = document.getElementById("bookingSuccessMessage");

    successBox.hidden = false;
    successBox.innerHTML = `
      Yêu cầu giả lập đã được gửi tới <strong>${mentor.name}</strong>.<br>
      Người gửi: <strong>${name}</strong> (${email})<br>
      Mục tiêu: <strong>${goal}</strong><br>
      Thời gian mong muốn: <strong>${time}</strong>${note ? `<br>Ghi chú: <strong>${note}</strong>` : ""}
    `;

    bookingForm.reset();
  });
}

function getRedirectTarget() {
  const params = new URLSearchParams(window.location.search);
  return params.get("redirect") || "index.html";
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
    window.location.href = "profile.html";
  }
}

function initializeRegisterPage() {
  const registerForm = document.getElementById("registerForm");
  if (!registerForm) return;

  registerForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    clearMessage("registerMessage");

    const name = document.getElementById("registerName").value.trim();
    const email = normalizeEmail(document.getElementById("registerEmail").value);
    const phone = normalizePhone(document.getElementById("registerPhone").value);
    const goal = document.getElementById("registerGoal").value.trim();
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
            full_name: name
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

    if (!identifier.includes("@")) {
      showMessage("loginMessage", "error", "Vui lòng dùng email đã đăng ký để đăng nhập với Supabase.");
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
        window.location.href = getRedirectTarget();
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

  let currentProfileUser = sessionUser;

  const profileAvatar = document.getElementById("profileAvatar");
  const profileDisplayName = document.getElementById("profileDisplayName");
  const profileHeadline = document.getElementById("profileHeadline");
  const profileGoalPreview = document.getElementById("profileGoalPreview");
  const profileEmailText = document.getElementById("profileEmailText");
  const profilePhoneText = document.getElementById("profilePhoneText");
  const profileCreatedAt = document.getElementById("profileCreatedAt");
  const profileNameInput = document.getElementById("profileNameInput");
  const profileEmailInput = document.getElementById("profileEmailInput");
  const profilePhoneInput = document.getElementById("profilePhoneInput");
  const profileGoalInput = document.getElementById("profileGoalInput");
  const profileBioInput = document.getElementById("profileBioInput");
  const profileAvatarUpload = document.getElementById("profileAvatarUpload");
  const profileLogoutBtn = document.getElementById("profileLogoutBtn");

  function fillProfile(account) {
    profileAvatar.src = account.avatar || createAvatarFallback(account.name);
    profileDisplayName.textContent = account.name;
    profileHeadline.textContent = account.bio || "Hồ sơ cá nhân Mentor Me";
    profileGoalPreview.textContent = account.goal
      ? "Mục tiêu hiện tại: " + account.goal
      : "Bạn chưa thêm mục tiêu học tập. Hãy cập nhật để mentor hiểu rõ hơn về nhu cầu của bạn.";
    profileEmailText.textContent = account.email;
    profilePhoneText.textContent = account.phone;
    profileCreatedAt.textContent = formatDate(account.createdAt);
    profileNameInput.value = account.name || "";
    profileEmailInput.value = account.email || "";
    profilePhoneInput.value = account.phone || "";
    profileGoalInput.value = account.goal || "";
    profileBioInput.value = account.bio || "";
  }

  let draftAvatar = currentProfileUser.avatar || createAvatarFallback(currentProfileUser.name);
  fillProfile(currentProfileUser);

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
      await upsertProfile({
        id: currentProfileUser.id,
        full_name: updatedName,
        phone: updatedPhone,
        goal: updatedGoal,
        bio: updatedBio,
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
      await supabaseClient.auth.signOut();
    } catch (error) {
      // Ignore sign-out errors and clear local session anyway.
    }
    clearAuthSession();
    window.location.href = "index.html";
  });
}

function initializeForgotPasswordPage() {
  const forgotPasswordForm = document.getElementById("forgotPasswordForm");
  if (!forgotPasswordForm) return;

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
  initializeProfilePage();
}

bootstrapApp();
