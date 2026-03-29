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
const navbar = document.querySelector(".navbar");
let hamburger = document.querySelector(".hamburger");
const menu = document.querySelector(".menu");
const authArea = document.getElementById("authArea");
const DEMO_ADMIN_ACCESS_CODE = "ADMIN2026";
const DEMO_MENTEE_EMAIL = "";
const DEMO_MENTEE_PASSWORD = "trang2007";
const SEARCH_PAGE_SIZE = 12;
const REAL_MENTOR_DATA_VERSION = "2026-03-26-real-v2";
const REVIEW_CLEANUP_VERSION = "2026-03-26-clear-trang-dung";
const WEEKLY_SCHEDULE_DAYS = [
  { key: "mon", label: "Thứ 2", shortLabel: "2" },
  { key: "tue", label: "Thứ 3", shortLabel: "3" },
  { key: "wed", label: "Thứ 4", shortLabel: "4" },
  { key: "thu", label: "Thứ 5", shortLabel: "5" },
  { key: "fri", label: "Thứ 6", shortLabel: "6" },
  { key: "sat", label: "Thứ 7", shortLabel: "7" },
  { key: "sun", label: "Chủ nhật", shortLabel: "CN" }
];
const WEEKLY_SCHEDULE_HOURS = Array.from({ length: 15 }, function (_, index) {
  const hour = 7 + index;
  return String(hour).padStart(2, "0") + ":00";
});
const SERVICE_LABELS = {
  "1-1": "Mentoring 1-1",
  course: "Mini Course/ Course/ Class",
  coaching: "Career Package/ Coaching",
  "quick-service": "Quick service (Sửa bài luận, Review CV,...)",
  "qa-chat": "Hỏi đáp nhanh (Q&A/ Chat)"
};
const FIELD_CATEGORY_ALIASES = {
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
const FIELD_CATEGORY_OPTIONS = [
  { value: "hoc-tap", label: "Học tập (Toán, Văn,..)" },
  { value: "ngoai-ngu", label: "Ngoại ngữ và chứng chỉ" },
  { value: "ngoai-khoa", label: "Hoạt động ngoại khóa" },
  { value: "cuoc-thi-nghien-cuu", label: "Cuộc thi học thuật, nghiên cứu khoa học" },
  { value: "dinh-huong-ky-nang", label: "Định hướng nghề nghiệp & kỹ năng" },
  { value: "kinh-doanh-khoi-nghiep", label: "Kinh doanh & khởi nghiệp" },
  { value: "cong-nghe", label: "Công nghệ" },
  { value: "phat-trien-ban-than", label: "Phát triển bản thân" }
];
let currentSearchPage = 1;
let currentSessionUser = null;
let mentorProfileDraftStore = {};
let bookingRequestsCache = null;
let bookingOccupiedSlotsCache = {};
let mentorProfilesCache = {};
let mentorSubmittedReviewsCache = [];
let notificationsCache = [];
const appConfig = browserWindow.MENTOR_ME_CONFIG || {};
const SUPABASE_URL = appConfig.SUPABASE_URL || "";
const SUPABASE_PUBLISHABLE_KEY = appConfig.SUPABASE_ANON_KEY || "";
const supabaseClient =
  browserWindow.supabase && SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY
    ? browserWindow.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
    : null;

if (navbar && menu && !hamburger) {
  hamburger = document.createElement("button");
  hamburger.type = "button";
  hamburger.className = "hamburger";
  hamburger.setAttribute("aria-label", "Mở menu");
  hamburger.innerHTML = "<span></span><span></span><span></span>";
  menu.parentNode.insertBefore(hamburger, menu);
}

if (hamburger && menu) {
  hamburger.addEventListener("click", () => {
    const isActive = menu.classList.toggle("active");
    if (authArea) {
      authArea.classList.toggle("active", isActive);
    }
    if (navbar) {
      navbar.classList.toggle("mobile-open", isActive);
    }
    hamburger.setAttribute("aria-expanded", isActive ? "true" : "false");
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

function normalizeFieldCategory(field) {
  const normalized = slugifyText(field);
  return FIELD_CATEGORY_ALIASES[normalized] || normalized;
}

function normalizeFieldCategoryList(values) {
  const rawValues = Array.isArray(values) ? values : [values];
  return rawValues
    .map(function (value) {
      return normalizeFieldCategory(value);
    })
    .filter(Boolean)
    .filter(function (value, index, list) {
      return list.indexOf(value) === index;
    });
}

function getFieldCategoryLabel(field) {
  const normalized = normalizeFieldCategory(field);
  const found = FIELD_CATEGORY_OPTIONS.find(function (item) {
    return item.value === normalized;
  });
  return found ? found.label : normalized || "Chưa cập nhật";
}

function buildFieldCategorySummary(values) {
  const normalized = normalizeFieldCategoryList(values);
  return normalized.length
    ? normalized.map(getFieldCategoryLabel).join(", ")
    : "Chưa cập nhật";
}

function formatRoleLabel(role) {
  if (role === "mentor") return "Mentor";
  if (role === "admin") return "Nội bộ";
  return "Mentee";
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

function hasProfileDetails(details) {
  const normalized = normalizeProfileDetails(details);
  return Object.keys(normalized).some(function (key) {
    return Boolean(normalized[key]);
  });
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
  if (normalizedRole === "mentor") return "Định hướng mentoring";
  if (normalizedRole === "admin") return "Phạm vi nội bộ";
  return "Mục tiêu học tập";
}

function getRoleGoalPlaceholder(role) {
  const normalizedRole = normalizeRole(role);
  if (normalizedRole === "mentor") {
    return "Ví dụ: Muốn hoàn thiện hồ sơ mentor, mở lịch nhận mentee và chuẩn hóa dịch vụ";
  }

  if (normalizedRole === "admin") {
    return "Ví dụ: Theo dõi vận hành nội bộ, kiểm duyệt hồ sơ và xử lý các yêu cầu hệ thống";
  }

  return "Ví dụ: Muốn cải thiện speaking và tìm mentor buổi tối";
}

function getRoleBioPlaceholder(role) {
  const normalizedRole = normalizeRole(role);
  if (normalizedRole === "mentor") {
    return "Chia sẻ ngắn về phong cách mentoring, điểm mạnh chuyên môn hoặc nhóm mentee bạn muốn đồng hành.";
  }

  if (normalizedRole === "admin") {
    return "Chia sẻ ngắn về vai trò nội bộ hoặc phạm vi phụ trách của tài khoản này.";
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

function buildMentorAvailabilityText(availability) {
  const labels = {
    sang: "Buổi sáng",
    chieu: "Buổi chiều",
    toi: "Buổi tối",
    "cuoi-tuan": "Cuối tuần"
  };
  const list = (availability || []).map(function (item) {
    return labels[item];
  }).filter(Boolean);
  return list.length ? list.join(", ") : "Linh hoạt theo lịch hẹn";
}

function buildMentorServiceText(services) {
  const labels = {
    "1-1": "mentoring 1-1",
    course: "mini course/ course/ class",
    coaching: "career package/ coaching",
    "quick-service": "quick service",
    "qa-chat": "hỏi đáp nhanh"
  };
  const list = (services || []).map(function (item) {
    return labels[item];
  }).filter(Boolean);
  return list.length ? list.join(", ") : "Mentoring 1-1";
}

function getServiceLabel(serviceKey) {
  return SERVICE_LABELS[serviceKey] || "Dịch vụ mentoring";
}

function formatCurrencyVnd(amount) {
  const value = Number(amount || 0);
  if (!Number.isFinite(value) || value <= 0) {
    return "";
  }

  return value.toLocaleString("vi-VN") + " VNĐ";
}

function formatDurationLabel(durationMinutes) {
  const totalMinutes = Number(durationMinutes || 0);
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) {
    return "Chưa cập nhật";
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours && minutes) {
    return hours + " giờ " + minutes + " phút";
  }

  if (hours) {
    return hours + " giờ";
  }

  return minutes + " phút";
}

function createWeeklySlotId(dayKey, hourLabel) {
  return dayKey + "-" + hourLabel;
}

function parseWeeklySlotId(slotId) {
  const rawValue = String(slotId || "");
  const separatorIndex = rawValue.indexOf("-");
  if (separatorIndex < 0) {
    return null;
  }

  const dayKey = rawValue.slice(0, separatorIndex);
  const hourLabel = rawValue.slice(separatorIndex + 1);
  if (!dayKey || !hourLabel) {
    return null;
  }

  return {
    dayKey: dayKey,
    hourLabel: hourLabel
  };
}

function getWeekdayMeta(dayKey) {
  return WEEKLY_SCHEDULE_DAYS.find(function (day) {
    return day.key === dayKey;
  }) || null;
}

function getHourIndex(hourLabel) {
  return WEEKLY_SCHEDULE_HOURS.indexOf(hourLabel);
}

function getSlotLabel(slotId) {
  const slot = parseWeeklySlotId(slotId);
  if (!slot) {
    return "Chưa chọn";
  }

  const day = getWeekdayMeta(slot.dayKey);
  return (day ? day.label : slot.dayKey) + " - " + slot.hourLabel;
}

function getSlotRangeLabel(slotId, durationMinutes) {
  const slot = parseWeeklySlotId(slotId);
  if (!slot) {
    return "Chưa chọn";
  }

  const startIndex = getHourIndex(slot.hourLabel);
  if (startIndex < 0) {
    return getSlotLabel(slotId);
  }

  const blockCount = Math.max(1, Math.ceil(Number(durationMinutes || 60) / 60));
  const endHour = 7 + startIndex + blockCount;
  const endLabel = String(endHour).padStart(2, "0") + ":00";
  const day = getWeekdayMeta(slot.dayKey);
  return (day ? day.label : slot.dayKey) + " - " + slot.hourLabel + " đến " + endLabel;
}

function buildAvailabilitySlotsFromLegacy(availability) {
  const values = Array.isArray(availability) ? availability : [];
  const slots = [];

  WEEKLY_SCHEDULE_DAYS.forEach(function (day) {
    const isWeekend = day.key === "sat" || day.key === "sun";

    WEEKLY_SCHEDULE_HOURS.forEach(function (hourLabel) {
      const hour = Number(hourLabel.slice(0, 2));
      let included = false;

      if (values.includes("sang") && hour >= 7 && hour <= 11) {
        included = true;
      }
      if (values.includes("chieu") && hour >= 13 && hour <= 17) {
        included = true;
      }
      if (values.includes("toi") && hour >= 18 && hour <= 21) {
        included = true;
      }
      if (values.includes("cuoi-tuan") && isWeekend) {
        included = true;
      }

      if (included) {
        slots.push(createWeeklySlotId(day.key, hourLabel));
      }
    });
  });

  return slots;
}

function getMentorAvailabilitySlots(mentor) {
  const slots = Array.isArray(mentor && mentor.availabilitySlots) ? mentor.availabilitySlots.filter(Boolean) : [];
  if (slots.length) {
    return slots;
  }

  return buildAvailabilitySlotsFromLegacy(mentor && mentor.availability);
}

function buildLegacyAvailabilityFromSlots(slots) {
  const normalizedSlots = Array.isArray(slots) ? slots.filter(Boolean) : [];
  if (!normalizedSlots.length) {
    return [];
  }

  const nextAvailability = [];
  const hasWeekend = normalizedSlots.some(function (slotId) {
    const parsedSlot = parseWeeklySlotId(slotId);
    return parsedSlot && (parsedSlot.dayKey === "sat" || parsedSlot.dayKey === "sun");
  });
  const hasMorning = normalizedSlots.some(function (slotId) {
    const parsedSlot = parseWeeklySlotId(slotId);
    const hour = parsedSlot ? Number(parsedSlot.hourLabel.slice(0, 2)) : 0;
    return hour >= 7 && hour <= 11;
  });
  const hasAfternoon = normalizedSlots.some(function (slotId) {
    const parsedSlot = parseWeeklySlotId(slotId);
    const hour = parsedSlot ? Number(parsedSlot.hourLabel.slice(0, 2)) : 0;
    return hour >= 13 && hour <= 17;
  });
  const hasEvening = normalizedSlots.some(function (slotId) {
    const parsedSlot = parseWeeklySlotId(slotId);
    const hour = parsedSlot ? Number(parsedSlot.hourLabel.slice(0, 2)) : 0;
    return hour >= 18 && hour <= 21;
  });

  if (hasMorning) nextAvailability.push("sang");
  if (hasAfternoon) nextAvailability.push("chieu");
  if (hasEvening) nextAvailability.push("toi");
  if (hasWeekend) nextAvailability.push("cuoi-tuan");

  return nextAvailability;
}

function buildAvailabilitySummaryFromSlots(slots) {
  const normalizedSlots = Array.isArray(slots) ? slots.filter(Boolean) : [];
  if (!normalizedSlots.length) {
    return "Chưa mở lịch cụ thể";
  }

  const daySummaries = WEEKLY_SCHEDULE_DAYS.map(function (day) {
    const dayHours = normalizedSlots
      .map(parseWeeklySlotId)
      .filter(function (slot) {
        return slot && slot.dayKey === day.key;
      })
      .map(function (slot) {
        return slot.hourLabel;
      });

    if (!dayHours.length) {
      return "";
    }

    const firstHour = dayHours[0];
    const lastHour = dayHours[dayHours.length - 1];
    return day.label + " (" + firstHour + " - " + String(Number(lastHour.slice(0, 2)) + 1).padStart(2, "0") + ":00)";
  }).filter(Boolean);

  return daySummaries.length ? daySummaries.join(", ") : "Chưa mở lịch cụ thể";
}

function createServicePackage(serviceKey, index, overrides) {
  const payload = overrides || {};
  const durationMinutes = Number(payload.durationMinutes || 60);
  const priceValue = Number(payload.priceValue || 0);
  const title = normalizeWhitespace(payload.title || getServiceLabel(serviceKey));
  const packageId = payload.id || "package-" + serviceKey + "-" + index;

  return {
    id: packageId,
    serviceKey: serviceKey,
    title: title || getServiceLabel(serviceKey),
    durationMinutes: durationMinutes > 0 ? durationMinutes : 60,
    priceValue: Number.isFinite(priceValue) && priceValue > 0 ? priceValue : 0,
    priceText: normalizeWhitespace(payload.priceText || formatCurrencyVnd(priceValue) || "Admin duyệt sau")
  };
}

function buildServicePackagesFromLegacy(services, pricingText) {
  const serviceKeys = Array.isArray(services) && services.length ? services : ["1-1"];
  return serviceKeys.map(function (serviceKey, index) {
    return createServicePackage(serviceKey, index + 1, {
      priceText: pricingText || "Admin duyệt sau"
    });
  });
}

function getMentorServicePackages(mentor) {
  const packages = Array.isArray(mentor && mentor.servicePackages) ? mentor.servicePackages.filter(Boolean) : [];
  if (packages.length) {
    return packages.map(function (item, index) {
      return createServicePackage(item.serviceKey || "1-1", index + 1, item);
    });
  }

  return buildServicePackagesFromLegacy(mentor && mentor.service, mentor && mentor.pricing);
}

function buildLegacyServiceKeysFromPackages(packages) {
  const keys = (packages || []).map(function (item) {
    return item && item.serviceKey ? item.serviceKey : "";
  }).filter(Boolean);

  return keys.length ? Array.from(new Set(keys)) : ["1-1"];
}

function buildServicePackageSummary(packages) {
  const list = (packages || []).map(function (item) {
    return item.title + " - " + formatDurationLabel(item.durationMinutes) + " - " + (item.priceText || "Admin duyệt sau");
  });

  return list.length ? list.join(", ") : "Chưa cập nhật";
}

function buildCompactServicePackageSummary(packages) {
  const items = (packages || []).filter(Boolean);
  if (!items.length) {
    return "Chưa cập nhật";
  }

  const titles = items.slice(0, 3).map(function (item) {
    return item.title;
  });

  return items.length + " gói dịch vụ: " + titles.join(", ");
}

function buildProposedTimeSummary(proposedOptions) {
  const options = Array.isArray(proposedOptions) ? proposedOptions.filter(Boolean) : [];
  if (!options.length) {
    return "Chưa chọn khung giờ";
  }

  return options.map(function (item) {
    return item.label;
  }).join(" | ");
}

function getOccupiedSlotIdsForMentor(mentorId) {
  if (bookingOccupiedSlotsCache[mentorId] && bookingOccupiedSlotsCache[mentorId].length) {
    return bookingOccupiedSlotsCache[mentorId].slice();
  }

  const occupied = [];

  getBookingRequests().forEach(function (request) {
    if (request.mentorId !== mentorId) {
      return;
    }

    if (!["accepted", "completed"].includes(request.status)) {
      return;
    }

    const slotIds = Array.isArray(request.slotIds) ? request.slotIds : [];
    slotIds.forEach(function (slotId) {
      if (!occupied.includes(slotId)) {
        occupied.push(slotId);
      }
    });
  });

  bookingOccupiedSlotsCache[mentorId] = occupied.slice();
  return occupied;
}

function getSlotIdsForBooking(startSlotId, durationMinutes) {
  const slot = parseWeeklySlotId(startSlotId);
  if (!slot) {
    return [];
  }

  const startIndex = getHourIndex(slot.hourLabel);
  if (startIndex < 0) {
    return [];
  }

  const blockCount = Math.max(1, Math.ceil(Number(durationMinutes || 60) / 60));
  const slotIds = [];

  for (let offset = 0; offset < blockCount; offset += 1) {
    const hourLabel = WEEKLY_SCHEDULE_HOURS[startIndex + offset];
    if (!hourLabel) {
      break;
    }
    slotIds.push(createWeeklySlotId(slot.dayKey, hourLabel));
  }

  return slotIds;
}

function canBookSlot(mentorId, availableSlots, occupiedSlots, startSlotId, durationMinutes) {
  const requestedSlots = getSlotIdsForBooking(startSlotId, durationMinutes);
  if (!requestedSlots.length) {
    return false;
  }

  return requestedSlots.every(function (slotId) {
    return availableSlots.includes(slotId) && !occupiedSlots.includes(slotId);
  });
}

function buildMentorScheduleLegendHtml() {
  return `
    <div class="mentor-schedule-legend">
      <span><i class="is-available"></i> Rảnh để nhận mentee</span>
      <span><i class="is-booked"></i> Đã có lịch dạy</span>
      <span><i class="is-selected"></i> Mentee đang chọn</span>
    </div>
  `;
}

function buildMentorScheduleTable(mentorId, availableSlots, occupiedSlots, options) {
  const config = options || {};
  const selectedSlotId = config.selectedSlotId || "";
  const selectedSlotIds = Array.isArray(config.selectedSlotIds) ? config.selectedSlotIds : (selectedSlotId ? [selectedSlotId] : []);
  const selectable = Boolean(config.selectable);
  const durationMinutes = Number(config.durationMinutes || 60);

  const headerCells = WEEKLY_SCHEDULE_DAYS.map(function (day) {
    return "<div class=\"mentor-weekly-schedule-head-cell\">" + day.shortLabel + "</div>";
  }).join("");

  const bodyRows = WEEKLY_SCHEDULE_HOURS.map(function (hourLabel) {
    const hourCell = "<div class=\"mentor-weekly-schedule-time-cell\">" + hourLabel + "</div>";
    const dayCells = WEEKLY_SCHEDULE_DAYS.map(function (day) {
      const slotId = createWeeklySlotId(day.key, hourLabel);
      const isAvailable = availableSlots.includes(slotId);
      const isBooked = occupiedSlots.includes(slotId);
      const isSelected = selectedSlotIds.includes(slotId);
      const isSelectable = selectable && isAvailable && !isBooked && canBookSlot(mentorId, availableSlots, occupiedSlots, slotId, durationMinutes);
      const classes = [
        "mentor-weekly-schedule-cell",
        isAvailable ? "is-available" : "is-unavailable",
        isBooked ? "is-booked" : "",
        isSelected ? "is-selected" : "",
        isSelectable ? "is-selectable" : ""
      ].filter(Boolean).join(" ");

      const attrs = [
        "class=\"" + classes + "\"",
        "data-slot-id=\"" + slotId + "\"",
        "data-slot-label=\"" + getSlotRangeLabel(slotId, durationMinutes) + "\""
      ];

      if (isSelectable) {
        attrs.push("role=\"button\"");
        attrs.push("tabindex=\"0\"");
      }

      return "<div " + attrs.join(" ") + "></div>";
    }).join("");

    return "<div class=\"mentor-weekly-schedule-row\">" + hourCell + dayCells + "</div>";
  }).join("");

  return `
    <div class="mentor-weekly-schedule" data-mentor-schedule="${mentorId}">
      <div class="mentor-weekly-schedule-head">
        <div class="mentor-weekly-schedule-head-cell is-time">Thời gian</div>
        ${headerCells}
      </div>
      <div class="mentor-weekly-schedule-body">
        ${bodyRows}
      </div>
    </div>
  `;
}

function buildMentorAvailabilityEditor(selectedSlots, occupiedSlots) {
  const headerCells = WEEKLY_SCHEDULE_DAYS.map(function (day) {
    return "<div class=\"mentor-weekly-schedule-head-cell\">" + day.shortLabel + "</div>";
  }).join("");

  const bodyRows = WEEKLY_SCHEDULE_HOURS.map(function (hourLabel) {
    const hourCell = "<div class=\"mentor-weekly-schedule-time-cell\">" + hourLabel + "</div>";
    const dayCells = WEEKLY_SCHEDULE_DAYS.map(function (day) {
      const slotId = createWeeklySlotId(day.key, hourLabel);
      const isSelected = selectedSlots.includes(slotId);
      const isBooked = occupiedSlots.includes(slotId);
      const classes = [
        "mentor-weekly-schedule-cell",
        isSelected ? "is-available" : "is-unavailable",
        isBooked ? "is-booked" : "",
        !isBooked ? "is-toggleable" : ""
      ].filter(Boolean).join(" ");

      const attrs = [
        "class=\"" + classes + "\"",
        "data-slot-id=\"" + slotId + "\""
      ];

      if (!isBooked) {
        attrs.push("role=\"checkbox\"");
        attrs.push("aria-checked=\"" + (isSelected ? "true" : "false") + "\"");
        attrs.push("tabindex=\"0\"");
      }

      return "<div " + attrs.join(" ") + "></div>";
    }).join("");

    return "<div class=\"mentor-weekly-schedule-row\">" + hourCell + dayCells + "</div>";
  }).join("");

  return `
    <div class="mentor-weekly-schedule mentor-weekly-schedule-editor">
      <div class="mentor-weekly-schedule-head">
        <div class="mentor-weekly-schedule-head-cell is-time">Thời gian</div>
        ${headerCells}
      </div>
      <div class="mentor-weekly-schedule-body">
        ${bodyRows}
      </div>
    </div>
  `;
}

function renderServicePackageBuilder(container, packages) {
  if (!container) {
    return;
  }

  const safePackages = (packages && packages.length ? packages : [createServicePackage("1-1", 1)]).slice(0, 6);

  container.innerHTML = safePackages.map(function (item, index) {
    return `
      <div class="mentor-package-row" data-package-index="${index}">
        <label class="auth-field">
          <span>Dịch vụ</span>
          <select data-package-field="serviceKey">
            ${Object.keys(SERVICE_LABELS).map(function (key) {
              return "<option value=\"" + key + "\" " + (item.serviceKey === key ? "selected" : "") + ">" + getServiceLabel(key) + "</option>";
            }).join("")}
          </select>
        </label>
        <label class="auth-field">
          <span>Thời lượng 1 buổi</span>
          <select data-package-field="durationMinutes">
            ${[45, 60, 90, 120].map(function (duration) {
              return "<option value=\"" + duration + "\" " + (Number(item.durationMinutes) === duration ? "selected" : "") + ">" + formatDurationLabel(duration) + "</option>";
            }).join("")}
          </select>
        </label>
        <label class="auth-field">
          <span>Chi phí 1 buổi</span>
          <input type="number" min="0" step="1000" data-package-field="priceValue" value="${Number(item.priceValue || 0)}" placeholder="Ví dụ: 250000">
        </label>
        <button type="button" class="mentor-package-remove" data-remove-package="${index}" ${safePackages.length === 1 ? "disabled" : ""}>Xóa</button>
      </div>
    `;
  }).join("");
}

function collectServicePackagesFromContainer(container) {
  if (!container) {
    return [];
  }

  return Array.from(container.querySelectorAll(".mentor-package-row")).map(function (row, index) {
    const serviceKey = row.querySelector("[data-package-field=\"serviceKey\"]").value || "1-1";
    const durationMinutes = Number(row.querySelector("[data-package-field=\"durationMinutes\"]").value || 60);
    const priceValue = Number(row.querySelector("[data-package-field=\"priceValue\"]").value || 0);
    return createServicePackage(serviceKey, index + 1, {
      durationMinutes: durationMinutes,
      priceValue: priceValue
    });
  }).filter(function (item) {
    return Boolean(item.serviceKey);
  });
}

function buildMentorSearchableText(mentor) {
  return [
    mentor.name,
    mentor.tag,
    mentor.role,
    mentor.bio,
    mentor.focus,
    buildFieldCategorySummary(mentor.fields || mentor.field),
    mentor.fit,
    mentor.workplace,
    mentor.experience,
    mentor.education,
    mentor.activities,
    mentor.awards,
    mentor.skills
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

  if (user && user.mentorId) {
    const mentorProfile = getResolvedMentorById(user.mentorId);
    return {
      mentorId: user.mentorId,
      mentorName: (mentorProfile && mentorProfile.name) || user.name || "Mentor"
    };
  }

  const savedProfile = getMentorProfileByUserId(user.id) || {};
  const possibleNames = [
    savedProfile.displayName,
    user.name
  ]
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

function readFileAsDataUrl(file) {
  return new Promise(function (resolve, reject) {
    if (!file) {
      resolve("");
      return;
    }

    const reader = new FileReader();
    reader.onload = function (event) {
      resolve(String((event && event.target && event.target.result) || ""));
    };
    reader.onerror = function () {
      reject(new Error("Không thể đọc file ảnh đã chọn."));
    };
    reader.readAsDataURL(file);
  });
}

function getCurrentUser() {
  return currentSessionUser;
}

function getMentorProfileStore() {
  return mentorProfileDraftStore || {};
}

function getMentorProfileByUserId(userId) {
  if (!userId) return null;
  const store = getMentorProfileStore();
  return store[userId] || null;
}

function saveMentorProfileByUserId(userId, payload) {
  if (!userId) return;
  const store = Object.assign({}, getMentorProfileStore());
  store[userId] = payload;
  mentorProfileDraftStore = store;
}

function getBookingRequests() {
  if (Array.isArray(bookingRequestsCache)) {
    return bookingRequestsCache;
  }
  return [];
}

function saveBookingRequests(requests) {
  bookingRequestsCache = Array.isArray(requests) ? requests : [];
}

function getMentorSubmittedReviews() {
  return Array.isArray(mentorSubmittedReviewsCache) ? mentorSubmittedReviewsCache : [];
}

function saveMentorSubmittedReviews(reviews) {
  mentorSubmittedReviewsCache = Array.isArray(reviews) ? reviews : [];
}

function getNotifications() {
  return Array.isArray(notificationsCache) ? notificationsCache : [];
}

function saveNotifications(notifications) {
  notificationsCache = Array.isArray(notifications) ? notifications : [];
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
  const cleanedReviews = getMentorSubmittedReviews().filter(function (review) {
    return !["tra-my", "thuy-trang"].includes(review.mentorId);
  });
  saveMentorSubmittedReviews(cleanedReviews);
}

function addBookingRequest(request) {
  const requests = getBookingRequests();
  requests.unshift(request);
  saveBookingRequests(requests);
}

function ensureDemoBookingRequests() {
  return;
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
  return mentorProfilesCache || {};
}

function saveApprovedMentorProfiles(store) {
  mentorProfilesCache = Object.assign({}, store || {});
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
  return [];
}

function savePendingMentorProfileUpdates(requests) {
  void requests;
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
  currentSessionUser = sanitizeSessionUser(user);
}

function saveAuthSession(user) {
  saveCurrentUser(user);
  renderAuthArea(user);
}

function clearAuthSession() {
  currentSessionUser = null;
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

async function getAccessToken() {
  const session = await getSupabaseSession();
  return session && session.access_token ? session.access_token : "";
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
    details: normalizeProfileDetails(profileData.details || {}),
    role: role,
    mentorId: profileData.mentor_id || "",
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

  if (!input) return;

  const isPassword = input.type === "password";
  input.type = isPassword ? "text" : "password";
  button.textContent = isPassword ? "Ẩn" : "Hiện";
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
function renderAuthArea(user) {
  if (!authArea) return;

  if (!user) {
    authArea.innerHTML = `
      <a href="login.html">Đăng nhập</a>
      <a href="register.html" class="btn-register">Đăng ký</a>
    `;
    return;
  }

  const normalizedRole = normalizeRole(user.role);
  let dropdownLinks = "";

  if (normalizedRole === "mentor") {
    dropdownLinks = `
      <a href="profile.html">Hồ sơ tài khoản</a>
      <a href="notifications.html">Thông báo</a>
      <a href="mentor-dashboard.html">Hồ sơ mentor</a>
      <a href="mentee-schedule.html">Lịch học</a>
      <a href="mentor-accepted.html">Mentee đã nhận</a>
      <a href="mentor-teaching-calendar.html">Lịch dạy</a>
      <a href="mentor-requests.html">Mentee muốn đăng ký</a>
    `;
  } else if (normalizedRole === "admin") {
    dropdownLinks = `
      <a href="profile.html">Hồ sơ nội bộ</a>
      <a href="notifications.html">Thông báo</a>
      <a href="admin-consultations.html">Quản trị nội bộ</a>
      <a href="mentor-dashboard.html">Hồ sơ mentor</a>
      <a href="mentor-teaching-calendar.html">Lịch dạy</a>
    `;
  } else {
    dropdownLinks = `
      <a href="profile.html">Hồ sơ mentee</a>
      <a href="notifications.html">Thông báo</a>
      <a href="mentee-schedule.html">Lịch học</a>
    `;
  }

  authArea.innerHTML = `
    <div class="user-menu">
      <img src="${user.avatar || createAvatarFallback(user.name)}" class="avatar">
      <span>${user.name}</span>

      <div class="dropdown">
        ${dropdownLinks}
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
  "tien-dung": {
    id: "tien-dung",
    name: "NGUYỄN TIẾN DŨNG",
    image: "mentor2.jpg",
    workplace: "Học viện Báo chí và Tuyên truyền - Chuyên ngành Truyền thông chính sách",
    tag: "Mentor Ngữ văn, truyền thông và hồ sơ",
    role: "Mentor Ngữ văn, truyền thông, thuyết trình và hoạt động ngoại khóa",
    bio: "Nguyễn Tiến Dũng hiện theo học chuyên ngành Truyền thông chính sách tại Học viện Báo chí và Tuyên truyền, có nền tảng học thuật mạnh ở môn Ngữ văn và nhiều trải nghiệm thực tế trong truyền thông, tổ chức hoạt động học sinh.",
    focus: "Ngữ văn, truyền thông, thuyết trình, hoạt động ngoại khóa",
    field: "hoc-tap",
    availability: ["sang", "chieu", "toi", "cuoi-tuan"],
    availabilityText: "Linh hoạt theo lịch hẹn",
    service: ["1-1", "course", "coaching", "quick-service"],
    serviceText: "Mentoring 1-1, mini course/ course/ class, career package/ coaching, quick service",
    achievements: [
      "Học sinh giỏi Tỉnh môn Ngữ văn cấp THPT năm học 2023 - 2024 và 2024 - 2025, cùng danh hiệu Học sinh giỏi Thành phố môn Ngữ văn cấp THCS năm học 2021 - 2022.",
      "Giải Nhất thuyết trình Ngày hội Văn hóa Đọc năm học 2024 - 2025.",
      "Giải Nhì cuộc thi Sáng kiến phòng, chống bạo lực học đường năm học 2024 - 2025.",
      "Thành viên ACC - Câu lạc bộ truyền thông Học viện Báo chí và Tuyên truyền, thành viên Đội Báo chí - Truyền thông Spotlight 2025 và Trưởng ban Nội dung HS14 năm 2023 - 2024."
    ],
    fit: "Phù hợp với học sinh cần học tốt môn Văn, muốn cải thiện kỹ năng thuyết trình, tham gia hoạt động ngoại khóa, làm truyền thông học đường hoặc xây dựng hồ sơ cá nhân chỉn chu hơn.",
    searchableText: "nguyen tien dung ngu van van hoc truyen thong thuyet trinh ky nang mem hoat dong ngoai khoa hoc vien bao chi truyen thong chinh sach spotlight hs14 ho so"
  }
};

const mentorExperienceData = {
  "tien-dung": {
    rating: 0,
    studentsTaught: 0,
    reviews: []
  }
};

const querySynonyms = [
  { phrases: ["em yeu speaking", "yeu speaking", "ngai noi", "so noi tieng anh"], tags: ["speaking", "giao tiep", "tieng anh", "ielts"] },
  { phrases: ["muon tang band", "tang band", "can len band"], tags: ["ielts", "writing", "speaking", "luyen thi"] },
  { phrases: ["mentor nhe nhang", "nhe nhang", "de tam su"], tags: ["mentor nhe nhang", "theo sat", "coaching"] },
  { phrases: ["can nguoi theo sat", "theo sat", "kem sat"], tags: ["theo sat", "1 kem 1", "coaching"] },
  { phrases: ["mat goc", "moi bat dau", "nguoi moi"], tags: ["mat goc", "co ban", "giai thich ky"] },
  { phrases: ["luyen thi", "on thi", "thi cu"], tags: ["luyen thi", "course"] },
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
  const baseMentor = approvedProfile.id ? approvedProfile : (mentorData[mentorId] || null);
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

  const resolvedMentor = Object.assign({}, baseMentor, approvedProfile, {
    rating: Number(computedRating.toFixed(1)),
    studentsTaught: baseStudents + acceptedCount,
    reviews: mergedReviews
  });

  const availabilitySlots = getMentorAvailabilitySlots(resolvedMentor);
  const servicePackages = getMentorServicePackages(resolvedMentor);
  const availability = Array.isArray(resolvedMentor.availability) && resolvedMentor.availability.length
    ? resolvedMentor.availability
    : buildLegacyAvailabilityFromSlots(availabilitySlots);
  const service = Array.isArray(resolvedMentor.service) && resolvedMentor.service.length
    ? resolvedMentor.service
    : buildLegacyServiceKeysFromPackages(servicePackages);

  return Object.assign({}, resolvedMentor, {
    field: normalizeFieldCategoryList(resolvedMentor.fields || resolvedMentor.field || [])[0] || normalizeFieldCategory(resolvedMentor.field || ""),
    fields: normalizeFieldCategoryList(resolvedMentor.fields || resolvedMentor.field || []),
    availability: availability,
    availabilitySlots: availabilitySlots,
    availabilityText: buildAvailabilitySummaryFromSlots(availabilitySlots),
    service: service,
    servicePackages: servicePackages,
    serviceText: buildMentorServiceText(servicePackages.map(function (item) {
      return item.serviceKey;
    })),
    pricing: buildServicePackageSummary(servicePackages)
  });
}

function getResolvedMentorList() {
  const approvedStore = getApprovedMentorProfiles();
  const baseIds = Object.keys(mentorData);
  const extraIds = Object.keys(approvedStore).filter(function (mentorId) {
    return !mentorData[mentorId] && approvedStore[mentorId];
  });
  return baseIds.concat(extraIds)
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
          <span>${Number(safeMentor.rating || 0).toFixed(1)}/ 5 sao</span>
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
  const prevButton = document.querySelector(".mentor-home-prev");
  const nextButton = document.querySelector(".mentor-home-next");
  let currentPage = 0;

  function getMentorPages() {
    let mentorsPerPage = 3;

    if (window.matchMedia("(max-width: 768px)").matches) {
      mentorsPerPage = 1;
    } else if (window.matchMedia("(max-width: 1180px)").matches) {
      mentorsPerPage = 2;
    }

    const pages = [];

    for (let i = 0; i < featuredMentors.length; i += mentorsPerPage) {
      pages.push(featuredMentors.slice(i, i + mentorsPerPage));
    }

    return pages;
  }

  function renderHomeMentorPages() {
    const mentorPages = getMentorPages();
    homeMentorTrack.innerHTML = mentorPages
      .map(function (page) {
        return `
          <div class="mentor-slide">
            ${page.map(createMentorCard).join("")}
          </div>
        `;
      })
      .join("");

    currentPage = Math.min(currentPage, Math.max(mentorPages.length - 1, 0));
    return mentorPages;
  }

  let mentorPages = renderHomeMentorPages();

  function updateHomeMentorSlider() {
    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    homeMentorTrack.style.transform = isMobile ? "translateX(0)" : `translateX(-${currentPage * 100}%)`;

    if (isMobile) {
      homeMentorTrack.scrollTo({
        left: currentPage * homeMentorTrack.clientWidth,
        behavior: "smooth"
      });
    }

    if (prevButton) {
      prevButton.disabled = currentPage === 0;
      prevButton.style.opacity = currentPage === 0 ? "0.5" : "1";
      prevButton.hidden = isMobile;
    }

    if (nextButton) {
      nextButton.disabled = currentPage === mentorPages.length - 1;
      nextButton.style.opacity = currentPage === mentorPages.length - 1 ? "0.5" : "1";
      nextButton.hidden = isMobile;
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

  window.addEventListener("resize", function () {
    const nextPages = getMentorPages();
    if (nextPages.length !== mentorPages.length) {
      mentorPages = renderHomeMentorPages();
    }
    updateHomeMentorSlider();
  });

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
      const mentorFields = normalizeFieldCategoryList(mentor.fields || mentor.field || []);
      const matchesField = !selectedField || mentorFields.includes(selectedField);
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
  const mentor = getResolvedMentorById(mentorId) || getResolvedMentorById("tien-dung");

  document.getElementById("mentorDetailImage").src = mentor.image;
  document.getElementById("mentorDetailImage").alt = mentor.name;
  nameElement.textContent = mentor.name;
  document.getElementById("mentorDetailHeadline").textContent = mentor.role;
  document.getElementById("mentorDetailRating").textContent = Number(mentor.rating || 0).toFixed(1) + "/ 5 sao";
  document.getElementById("mentorDetailStudents").textContent = (mentor.studentsTaught || 0) + " học sinh";
  document.getElementById("mentorDetailWorkplace").textContent = mentor.workplace || "Đang cập nhật";
  document.getElementById("mentorDetailFocus").textContent = mentor.focus;
  const fieldSummaryElement = document.getElementById("mentorDetailFieldSummary");
  if (fieldSummaryElement) {
    fieldSummaryElement.textContent = buildFieldCategorySummary(mentor.fields || mentor.field);
  }
  const availabilityElement = document.getElementById("mentorDetailAvailability");
  if (availabilityElement) {
    availabilityElement.textContent = "Xem bảng lịch phía dưới";
  }
  document.getElementById("mentorDetailService").textContent = buildCompactServicePackageSummary(mentor.servicePackages || []);
  const introElement = document.getElementById("mentorDetailIntro");
  if (introElement) introElement.textContent = mentor.intro || mentor.bio || "Mentor chưa cập nhật phần giới thiệu bản thân.";
  const experienceElement = document.getElementById("mentorDetailExperience");
  if (experienceElement) experienceElement.textContent = mentor.experience || "Mentor chưa cập nhật kinh nghiệm làm việc.";
  const educationElement = document.getElementById("mentorDetailEducation");
  if (educationElement) educationElement.textContent = mentor.education || "Mentor chưa cập nhật quá trình học tập.";
  const activitiesElement = document.getElementById("mentorDetailActivities");
  if (activitiesElement) activitiesElement.textContent = mentor.activities || "Mentor chưa cập nhật hoạt động ngoại khóa.";
  const awardsElement = document.getElementById("mentorDetailAwards");
  if (awardsElement) awardsElement.textContent = mentor.awards || "Mentor chưa cập nhật giải thưởng.";
  const skillsElement = document.getElementById("mentorDetailSkills");
  if (skillsElement) skillsElement.textContent = mentor.skills || "Mentor chưa cập nhật kỹ năng và chứng chỉ.";
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

  const scheduleContainer = document.getElementById("mentorDetailScheduleGrid");
  if (scheduleContainer) {
    const availableSlots = getMentorAvailabilitySlots(mentor);
    const occupiedSlots = getOccupiedSlotIdsForMentor(mentor.id);
    scheduleContainer.innerHTML =
      buildMentorScheduleLegendHtml() +
      buildMentorScheduleTable(mentor.id, availableSlots, occupiedSlots, {
        selectable: false
      });
  }
}

async function initializeBookingPage() {
  const bookingForm = document.getElementById("bookingForm");
  if (!bookingForm) return;

  const params = new URLSearchParams(window.location.search);
  const mentorId = params.get("id");
  const mentor = getResolvedMentorById(mentorId) || getResolvedMentorById("tien-dung");
  const currentUser = getCurrentUser();

  document.getElementById("bookingMentorImage").src = mentor.image;
  document.getElementById("bookingMentorImage").alt = mentor.name;
  document.getElementById("bookingMentorName").textContent = mentor.name;
  document.getElementById("bookingMentorFocus").textContent = mentor.focus;
  document.getElementById("bookingMentorAvailability").textContent = mentor.availabilityText;
  document.getElementById("bookingMentorService").textContent = buildCompactServicePackageSummary(mentor.servicePackages || []);

  const serviceSelect = document.getElementById("bookingServicePackage");
  const serviceSummary = document.getElementById("bookingServiceSummary");
  const scheduleGrid = document.getElementById("bookingAvailabilityGrid");
  const selectedSlotText = document.getElementById("bookingSelectedSlot");
  const hiddenTimeInput = document.getElementById("bookingTime");
  const availableSlots = getMentorAvailabilitySlots(mentor);
  let occupiedSlots = getOccupiedSlotIdsForMentor(mentor.id);
  const packages = getMentorServicePackages(mentor);
  let selectedPackage = packages[0] || null;
  let selectedSlotIds = [];

  function renderPackageOptions() {
    if (!serviceSelect) {
      return;
    }

    serviceSelect.innerHTML = [
      '<option value="">Chọn dịch vụ và mức giá</option>'
    ].concat(packages.map(function (item) {
      return "<option value=\"" + item.id + "\">" + escapeHtml(item.title + " - " + formatDurationLabel(item.durationMinutes) + " - " + (item.priceText || "Admin duyệt sau")) + "</option>";
    })).join("");
  }

  function renderSelectedPackage() {
    if (!serviceSummary) {
      return;
    }

    if (!selectedPackage) {
      serviceSummary.innerHTML = "<strong>Chưa chọn dịch vụ.</strong> Mentor sẽ set sẵn thời lượng và chi phí cho từng lựa chọn.";
      return;
    }

    serviceSummary.innerHTML = `
      <strong>${escapeHtml(selectedPackage.title)}</strong>
      <span>${escapeHtml(formatDurationLabel(selectedPackage.durationMinutes))}</span>
      <span>${escapeHtml(selectedPackage.priceText || "Admin duyệt sau")}</span>
    `;
  }

  function renderScheduleChooser() {
    if (!scheduleGrid) {
      return;
    }

    selectedSlotIds = selectedSlotIds.filter(function (slotId) {
      return canBookSlot(mentor.id, availableSlots, occupiedSlots, slotId, selectedPackage ? selectedPackage.durationMinutes : 60);
    });

    scheduleGrid.innerHTML =
      buildMentorScheduleLegendHtml() +
      buildMentorScheduleTable(mentor.id, availableSlots, occupiedSlots, {
        selectable: true,
        selectedSlotIds: selectedSlotIds,
        durationMinutes: selectedPackage ? selectedPackage.durationMinutes : 60
      });

    if (selectedSlotText) {
      selectedSlotText.textContent = selectedSlotIds.length && selectedPackage
        ? buildProposedTimeSummary(selectedSlotIds.map(function (slotId) {
            return {
              label: getSlotRangeLabel(slotId, selectedPackage.durationMinutes)
            };
          }))
        : "Chưa chọn khung giờ";
    }

    if (hiddenTimeInput) {
      hiddenTimeInput.value = selectedSlotIds.length && selectedPackage
        ? buildProposedTimeSummary(selectedSlotIds.map(function (slotId) {
            return {
              label: getSlotRangeLabel(slotId, selectedPackage.durationMinutes)
            };
          }))
        : "";
    }
  }

  renderPackageOptions();
  if (serviceSelect && selectedPackage) {
    serviceSelect.value = selectedPackage.id;
  }
  renderSelectedPackage();
  renderScheduleChooser();

  if (!isDemoAccount(currentUser || null) && isSupabaseReady()) {
    fetchOccupiedSlotIdsForMentor(mentor.id)
      .then(function (slotIds) {
        occupiedSlots = Array.isArray(slotIds) ? slotIds : [];
        renderScheduleChooser();
      })
      .catch(function () {
        // Keep local fallback if remote occupancy cannot be loaded.
      });
  }

  if (serviceSelect && !serviceSelect.dataset.boundServicePicker) {
    serviceSelect.addEventListener("change", function () {
      selectedPackage = packages.find(function (item) {
        return item.id === serviceSelect.value;
      }) || null;
      renderSelectedPackage();
      renderScheduleChooser();
    });
    serviceSelect.dataset.boundServicePicker = "true";
  }

  if (scheduleGrid && !scheduleGrid.dataset.boundSchedulePicker) {
    function handleScheduleSelection(target) {
      const cell = target.closest(".mentor-weekly-schedule-cell.is-selectable");
      if (!cell) {
        return;
      }

      const slotId = cell.getAttribute("data-slot-id") || "";
      if (!slotId) {
        return;
      }

      if (selectedSlotIds.includes(slotId)) {
        selectedSlotIds = selectedSlotIds.filter(function (item) {
          return item !== slotId;
        });
      } else {
        selectedSlotIds.push(slotId);
      }
      renderScheduleChooser();
    }

    scheduleGrid.addEventListener("click", function (event) {
      handleScheduleSelection(event.target);
    });

    scheduleGrid.addEventListener("keydown", function (event) {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }
      handleScheduleSelection(event.target);
      event.preventDefault();
    });

    scheduleGrid.dataset.boundSchedulePicker = "true";
  }

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
    const createdAt = new Date().toISOString();

    if (!selectedPackage) {
      successBox.hidden = false;
      successBox.textContent = "Hãy chọn dịch vụ phù hợp trước khi gửi yêu cầu.";
      return;
    }

    if (!selectedSlotIds.length || !time) {
      successBox.hidden = false;
      successBox.textContent = "Hãy chọn ít nhất một khung giờ màu xanh trong bảng lịch.";
      return;
    }

    const proposedOptions = selectedSlotIds.map(function (slotId) {
      return {
        startSlotId: slotId,
        slotIds: getSlotIdsForBooking(slotId, selectedPackage.durationMinutes),
        label: getSlotRangeLabel(slotId, selectedPackage.durationMinutes)
      };
    });

    const bookingRequest = {
      id: "booking-" + Date.now(),
      mentorId: mentor.id,
      mentorName: mentor.name,
      mentorImage: mentor.image,
      mentorFocus: mentor.focus,
      menteeUserId: currentUser && normalizeRole(currentUser.role) === "mentee" ? currentUser.id : "",
      menteeName: name,
      menteeEmail: email,
      servicePackageId: selectedPackage.id,
      serviceName: selectedPackage.title,
      serviceDurationMinutes: selectedPackage.durationMinutes,
      servicePriceText: selectedPackage.priceText,
      proposedOptions: proposedOptions,
      slotIds: [],
      menteeProfileSnapshot: normalizeProfileDetails(currentUser && currentUser.details),
      goal: goal,
      preferredTime: buildProposedTimeSummary(proposedOptions),
      note: note,
      status: "pending",
      createdAt: createdAt,
      updatedAt: createdAt
    };

    try {
      if (isDemoAccount(currentUser || null) || !isSupabaseReady()) {
        addBookingRequest(bookingRequest);
      } else {
        await submitBookingRequest(bookingRequest);
      }
    } catch (error) {
      successBox.hidden = false;
      successBox.textContent = error.message || "Không thể gửi yêu cầu booking lúc này.";
      return;
    }

    successBox.hidden = false;
    successBox.innerHTML = `
      Yêu cầu đã được gửi tới <strong>${mentor.name}</strong>.<br>
      Người gửi: <strong>${name}</strong> (${email})<br>
      Dịch vụ đã chọn: <strong>${selectedPackage.title}</strong> - <strong>${formatDurationLabel(selectedPackage.durationMinutes)}</strong> - <strong>${selectedPackage.priceText || "Admin duyệt sau"}</strong><br>
      Mục tiêu: <strong>${goal}</strong><br>
      Các khung giờ mentee đề xuất: <strong>${buildProposedTimeSummary(proposedOptions)}</strong><br>
      Mentor sẽ chọn 1 lịch phù hợp để chốt lại.${note ? `<br>Ghi chú: <strong>${note}</strong>` : ""}
      ${currentUser && normalizeRole(currentUser.role) === "mentee" ? '<br><a href="mentee-schedule.html">Xem lịch học của tôi</a>' : ""}
    `;

    bookingForm.reset();
    if (currentUser) {
      document.getElementById("bookingName").value = currentUser.name || "";
      document.getElementById("bookingEmail").value = currentUser.email || "";
      document.getElementById("bookingGoal").value = currentUser.goal || "";
    }
    selectedSlotIds = [];
    if (serviceSelect) {
      serviceSelect.value = "";
    }
    selectedPackage = null;
    renderSelectedPackage();
    renderScheduleChooser();
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

async function registerAccount(payload) {
  const response = await fetch("/api/auth/register", {
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
    throw new Error(data.message || "Không thể tạo tài khoản lúc này.");
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
      showMessage("consultationMessage", "error", "Hãy mô tả nhu cầu chi tiết hơn để đội ngũ tư vấn hỗ trợ chính xác.");
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
        "Yêu cầu tư vấn đã được gửi. Đội ngũ Mentor Me sẽ liên hệ và sắp xếp buổi tư vấn online nếu phù hợp."
      );
    } catch (error) {
      showMessage("consultationMessage", "error", error.message);
    }
  });
}

async function fetchAdminConsultationRequests(adminKey) {
  const accessToken = await getAccessToken();
  const headers = {};
  if (accessToken) {
    headers.Authorization = "Bearer " + accessToken;
  } else if (adminKey) {
    headers["X-Admin-Key"] = adminKey;
  }

  const response = await fetch("/api/admin/consultation-requests", {
    headers: headers
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
  const accessToken = await getAccessToken();
  const headers = {};
  if (accessToken) {
    headers.Authorization = "Bearer " + accessToken;
  } else if (adminKey) {
    headers["X-Admin-Key"] = adminKey;
  }

  const response = await fetch("/api/admin/mentor-applications", {
    headers: headers
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
  const accessToken = await getAccessToken();
  const headers = {
    "Content-Type": "application/json"
  };
  if (accessToken) {
    headers.Authorization = "Bearer " + accessToken;
  } else if (adminKey) {
    headers["X-Admin-Key"] = adminKey;
  }

  const response = await fetch("/api/admin/consultation-requests/" + requestId, {
    method: "PUT",
    headers: headers,
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
  const accessToken = await getAccessToken();
  const headers = {
    "Content-Type": "application/json"
  };
  if (accessToken) {
    headers.Authorization = "Bearer " + accessToken;
  } else if (adminKey) {
    headers["X-Admin-Key"] = adminKey;
  }

  const response = await fetch("/api/admin/mentor-applications/" + applicationId, {
    method: "PUT",
    headers: headers,
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(function () {
    return {};
  });

  if (!response.ok) {
    throw new Error(data.message || "Không thể cập nhật hồ sơ ứng tuyển mentor.");
  }

  return {
    application: data.application || null,
    publishedProfile: data.publishedProfile || null
  };
}

async function submitMentorProfileUpdate(payload) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error("Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại rồi thử gửi hồ sơ mentor.");
  }

  const response = await fetch("/api/mentor-profile-updates", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + accessToken
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(function () {
    return {};
  });

  if (!response.ok) {
    throw new Error(data.message || "Không thể gửi cập nhật hồ sơ mentor.");
  }

  return data.request;
}

async function fetchAdminMentorProfileUpdates(adminKey) {
  const accessToken = await getAccessToken();
  const headers = {};
  if (accessToken) {
    headers.Authorization = "Bearer " + accessToken;
  } else if (adminKey) {
    headers["X-Admin-Key"] = adminKey;
  }

  const response = await fetch("/api/admin/mentor-profile-updates", {
    headers: headers
  });

  const data = await response.json().catch(function () {
    return {};
  });

  if (!response.ok) {
    throw new Error(data.message || "Không thể tải danh sách cập nhật hồ sơ mentor.");
  }

  return data.requests || [];
}

async function fetchAdminMentorProfiles(adminKey) {
  const accessToken = await getAccessToken();
  const headers = {};
  if (accessToken) {
    headers.Authorization = "Bearer " + accessToken;
  } else if (adminKey) {
    headers["X-Admin-Key"] = adminKey;
  }

  const response = await fetch("/api/admin/mentor-profiles", {
    headers: headers
  });

  const data = await response.json().catch(function () {
    return {};
  });

  if (!response.ok) {
    throw new Error(data.message || "Không thể tải danh sách mentor.");
  }

  return data.profiles || [];
}

async function updateAdminMentorProfileUpdate(adminKey, requestId, payload) {
  const accessToken = await getAccessToken();
  const headers = {
    "Content-Type": "application/json"
  };
  if (accessToken) {
    headers.Authorization = "Bearer " + accessToken;
  } else if (adminKey) {
    headers["X-Admin-Key"] = adminKey;
  }

  const response = await fetch("/api/admin/mentor-profile-updates/" + encodeURIComponent(requestId), {
    method: "PUT",
    headers: headers,
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(function () {
    return {};
  });

  if (!response.ok) {
    throw new Error(data.message || "Không thể cập nhật yêu cầu chỉnh sửa hồ sơ mentor.");
  }

  return data.request;
}

async function fetchCurrentMentorProfileUpdate() {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error("Phiên đăng nhập mentor đã hết hạn. Hãy đăng nhập lại.");
  }

  const response = await fetch("/api/mentor-profile-updates/mine", {
    headers: {
      Authorization: "Bearer " + accessToken
    }
  });

  const data = await response.json().catch(function () {
    return {};
  });

  if (!response.ok) {
    throw new Error(data.message || "Không thể tải trạng thái hồ sơ mentor.");
  }

  return data.request || null;
}

function normalizeRemoteMentorProfile(record) {
  if (!record) return null;
  const profile = record.profile || {};
  const mentorId = String(record.id || profile.id || "").trim();
  if (!mentorId) return null;
  const fields = normalizeFieldCategoryList(profile.fields || profile.field || record.field || []);

  const normalizedProfile = Object.assign({}, profile, {
    id: mentorId,
    name: profile.name || record.name || "Mentor",
    field: fields[0] || normalizeFieldCategory(profile.field || record.field || ""),
    fields: fields,
    bio: profile.bio || profile.intro || "",
    intro: profile.intro || profile.bio || "",
    _origin: "supabase"
  });
  normalizedProfile.searchableText = buildMentorSearchableText(normalizedProfile);
  return normalizedProfile;
}

async function fetchPublicMentorProfiles() {
  const response = await fetch("/api/mentor-profiles");
  const data = await response.json().catch(function () {
    return {};
  });

  if (!response.ok) {
    throw new Error(data.message || "Không thể tải danh sách mentor.");
  }

  const nextStore = {};
  (data.profiles || []).forEach(function (record) {
    const normalized = normalizeRemoteMentorProfile(record);
    if (normalized) {
      nextStore[normalized.id] = normalized;
    }
  });
  mentorProfilesCache = nextStore;
  return nextStore;
}

async function createAdminMentorProfile(adminKey, payload) {
  const accessToken = await getAccessToken();
  const headers = {
    "Content-Type": "application/json"
  };
  if (accessToken) {
    headers.Authorization = "Bearer " + accessToken;
  } else if (adminKey) {
    headers["X-Admin-Key"] = adminKey;
  }

  const response = await fetch("/api/admin/mentor-profiles", {
    method: "POST",
    headers: headers,
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(function () {
    return {};
  });

  if (!response.ok) {
    throw new Error(data.message || "Không thể tạo tài khoản mentor.");
  }

  if (data.profile) {
    const normalized = normalizeRemoteMentorProfile(data.profile);
    if (normalized) {
      mentorProfilesCache = Object.assign({}, mentorProfilesCache, {
        [normalized.id]: normalized
      });
    }
  }

  return data;
}

async function updateAdminMentorProfile(adminKey, mentorId, payload) {
  const accessToken = await getAccessToken();
  const headers = {
    "Content-Type": "application/json"
  };
  if (accessToken) {
    headers.Authorization = "Bearer " + accessToken;
  } else if (adminKey) {
    headers["X-Admin-Key"] = adminKey;
  }

  const response = await fetch("/api/admin/mentor-profiles/" + encodeURIComponent(mentorId), {
    method: "PUT",
    headers: headers,
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(function () {
    return {};
  });

  if (!response.ok) {
    throw new Error(data.message || "Không thể cập nhật mentor.");
  }

  if (data.profile) {
    const normalized = normalizeRemoteMentorProfile(data.profile);
    if (normalized) {
      mentorProfilesCache = Object.assign({}, mentorProfilesCache, {
        [normalized.id]: normalized
      });
    }
  }

  return data;
}

async function submitBookingRequest(payload) {
  const response = await fetch("/api/booking-requests", {
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
    throw new Error(data.message || "Không thể gửi yêu cầu booking lúc này.");
  }

  const createdRequest = data.request || null;
  if (createdRequest) {
    bookingRequestsCache = [createdRequest].concat(getBookingRequests().filter(function (item) {
      return item.id !== createdRequest.id;
    }));
  }
  return createdRequest;
}

async function fetchOccupiedSlotIdsForMentor(mentorId) {
  const response = await fetch("/api/booking-requests/occupied?mentorId=" + encodeURIComponent(mentorId));
  const data = await response.json().catch(function () {
    return {};
  });

  if (!response.ok) {
    throw new Error(data.message || "Không thể tải lịch bận của mentor.");
  }

  bookingOccupiedSlotsCache[mentorId] = Array.isArray(data.occupiedSlotIds) ? data.occupiedSlotIds : [];
  return bookingOccupiedSlotsCache[mentorId];
}

async function fetchBookingRequestsForCurrentMentee() {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return getBookingRequests();
  }

  const response = await fetch("/api/booking-requests/mine", {
    headers: {
      Authorization: "Bearer " + accessToken
    }
  });
  const data = await response.json().catch(function () {
    return {};
  });

  if (!response.ok) {
    throw new Error(data.message || "Không thể tải booking của bạn.");
  }

  bookingRequestsCache = data.requests || [];
  return bookingRequestsCache;
}

async function fetchBookingRequestsForCurrentMentor(mentorId) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return getBookingRequests();
  }

  const response = await fetch("/api/mentor/booking-requests?mentorId=" + encodeURIComponent(mentorId), {
    headers: {
      Authorization: "Bearer " + accessToken
    }
  });
  const data = await response.json().catch(function () {
    return {};
  });

  if (!response.ok) {
    throw new Error(data.message || "Không thể tải booking của mentor.");
  }

  bookingRequestsCache = data.requests || [];
  return bookingRequestsCache;
}

async function fetchNotifications() {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return getNotifications();
  }

  const response = await fetch("/api/notifications", {
    headers: {
      Authorization: "Bearer " + accessToken
    }
  });
  const data = await response.json().catch(function () {
    return {};
  });

  if (!response.ok) {
    throw new Error(data.message || "Không thể tải thông báo.");
  }

  notificationsCache = data.notifications || [];
  return notificationsCache;
}

async function markNotificationAsRead(notificationId) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return null;
  }

  const response = await fetch("/api/notifications/" + encodeURIComponent(notificationId) + "/read", {
    method: "PUT",
    headers: {
      Authorization: "Bearer " + accessToken
    }
  });
  const data = await response.json().catch(function () {
    return {};
  });

  if (!response.ok) {
    throw new Error(data.message || "Không thể cập nhật thông báo.");
  }

  const updatedNotification = data.notification || null;
  if (updatedNotification) {
    notificationsCache = getNotifications().map(function (item) {
      return item.id === updatedNotification.id ? updatedNotification : item;
    });
  }

  return updatedNotification;
}

async function fetchAdminBookingRequests(adminKey) {
  const accessToken = await getAccessToken();
  const headers = {};
  if (accessToken) {
    headers.Authorization = "Bearer " + accessToken;
  } else if (adminKey) {
    headers["X-Admin-Key"] = adminKey;
  }

  const response = await fetch("/api/admin/booking-requests", {
    headers: headers
  });
  const data = await response.json().catch(function () {
    return {};
  });

  if (!response.ok) {
    throw new Error(data.message || "Không thể tải danh sách booking mentor.");
  }

  bookingRequestsCache = data.requests || [];
  return bookingRequestsCache;
}

async function updateAdminBookingRequest(adminKey, requestId, payload) {
  const accessToken = await getAccessToken();
  const headers = {
    "Content-Type": "application/json"
  };
  if (accessToken) {
    headers.Authorization = "Bearer " + accessToken;
  } else if (adminKey) {
    headers["X-Admin-Key"] = adminKey;
  }

  const response = await fetch("/api/admin/booking-requests/" + encodeURIComponent(requestId), {
    method: "PUT",
    headers: headers,
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(function () {
    return {};
  });

  if (!response.ok) {
    throw new Error(data.message || "Không thể cập nhật booking của admin.");
  }

  const updatedRequest = data.request || null;
  if (updatedRequest) {
    bookingRequestsCache = getBookingRequests().map(function (item) {
      return item.id === updatedRequest.id ? updatedRequest : item;
    });
  }
  return updatedRequest;
}

async function updateMentorBookingRequest(requestId, payload) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error("Phiên đăng nhập mentor đã hết hạn. Hãy đăng nhập lại.");
  }

  const response = await fetch("/api/mentor/booking-requests/" + encodeURIComponent(requestId), {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + accessToken
    },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(function () {
    return {};
  });

  if (!response.ok) {
    throw new Error(data.message || "Không thể cập nhật booking của mentor.");
  }

  const updatedRequest = data.request || null;
  if (updatedRequest) {
    bookingRequestsCache = getBookingRequests().map(function (item) {
      return item.id === updatedRequest.id ? updatedRequest : item;
    });
    if (["accepted", "completed"].includes(updatedRequest.status)) {
      bookingOccupiedSlotsCache[updatedRequest.mentorId] = getOccupiedSlotIdsForMentor(updatedRequest.mentorId);
    }
  }
  return updatedRequest;
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
          cùng email ứng tuyển và mã kích hoạt này để họ tự tạo mật khẩu đăng nhập. Bước này chưa làm hồ sơ xuất hiện trên trang tìm kiếm.
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
          <span class="admin-request-label">Bước 1 · Mentor Application #${application.id}</span>
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
          <span>Portfolio/ LinkedIn</span>
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
          <span>Trạng thái ứng tuyển ở bước 1</span>
          <select name="status">
            <option value="pending" ${application.status === "pending" ? "selected" : ""}>pending</option>
            <option value="interviewing" ${application.status === "interviewing" ? "selected" : ""}>interviewing</option>
            <option value="approved" ${application.status === "approved" ? "selected" : ""}>approved</option>
            <option value="rejected" ${application.status === "rejected" ? "selected" : ""}>rejected</option>
            <option value="activated" ${application.status === "activated" ? "selected" : ""}>activated</option>
          </select>
        </label>

        <label class="auth-field">
          <span>Ghi chú admin</span>
          <textarea name="adminNote" rows="4" placeholder="Ví dụ: Đã phỏng vấn ổn, gửi mã kích hoạt qua email. Sau khi mentor kích hoạt và gửi hồ sơ, tiếp tục duyệt ở khu hồ sơ công khai.">${safeAdminNote}</textarea>
        </label>

        <button type="submit" class="mentor-primary-btn">Lưu trạng thái ứng tuyển</button>
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
        <span>Đã cấp mã/ đã kích hoạt</span>
        <strong>${counts.approved + counts.activated}</strong>
        <p>Đây mới là bước cấp tài khoản. Mentor vẫn cần gửi hồ sơ để admin duyệt công khai lên tìm kiếm.</p>
      </article>
    </div>
  `;
}

function buildAdminMentorProfileUpdateCard(request) {
  const safeMentorName = escapeHtml(request.mentorName);
  const safeStatus = escapeHtml(request.status);
  const safeAdminNote = escapeHtml(request.adminNote || "");
  const profile = request.profile || {};
  const profilePackages = getMentorServicePackages(profile);
  const profileSlots = getMentorAvailabilitySlots(profile);
  const profileOccupiedSlots = getOccupiedSlotIdsForMentor(request.mentorId);

  return `
    <article class="admin-request-card" data-mentor-profile-update-id="${request.id}">
      <div class="admin-request-head">
        <div>
          <span class="admin-request-label">Bước 2 · Public Profile Review</span>
          <h3>${safeMentorName}</h3>
        </div>
        <span class="admin-request-status status-${safeStatus}">${safeStatus}</span>
      </div>

      <div class="admin-request-grid">
        <p><strong>Mentor ID:</strong> ${escapeHtml(request.mentorId)}</p>
        <p><strong>Gửi lúc:</strong> ${formatDate(request.createdAt)}</p>
        <p><strong>Nhóm lĩnh vực:</strong> ${escapeHtml(profile.field || "Chưa cập nhật")}</p>
        <p><strong>Headline:</strong> ${escapeHtml(profile.role || "Chưa cập nhật")}</p>
        <p><strong>Nơi làm việc/ học tập:</strong> ${escapeHtml(profile.workplace || "Chưa cập nhật")}</p>
        <p><strong>Lịch rảnh:</strong> ${escapeHtml(profile.availabilityText || "Chưa cập nhật")}</p>
      </div>

      <div class="admin-request-body">
        <div class="admin-request-block">
          <span>Dịch vụ & giá</span>
          <p>${escapeHtml(buildServicePackageSummary(profilePackages))}</p>
        </div>
        <div class="admin-request-block">
          <span>Đối tượng phù hợp</span>
          <p>${escapeHtml(profile.fit || "Chưa cập nhật")}</p>
        </div>
      </div>

      <div class="admin-request-body">
        <div class="admin-request-block">
          <span>Giới thiệu mentor</span>
          <p>${escapeHtml(profile.bio || profile.intro || "Chưa cập nhật")}</p>
        </div>
        <div class="admin-request-block">
          <span>Thành tích nổi bật</span>
          <p>${escapeHtml((Array.isArray(profile.achievements) ? profile.achievements : String(profile.achievements || "").split("\n")).filter(Boolean).join(" | ") || "Chưa cập nhật")}</p>
        </div>
      </div>

      <div class="admin-request-block admin-request-block--full">
        <span>Bảng lịch rảnh</span>
        ${buildMentorScheduleLegendHtml()}
        ${buildMentorScheduleTable(request.mentorId, profileSlots, profileOccupiedSlots, {
          selectable: false
        })}
      </div>

      <form class="admin-mentor-profile-update-form">
        <label class="auth-field">
          <span>Trạng thái hồ sơ công khai ở bước 2</span>
          <select name="status">
            <option value="pending" ${request.status === "pending" ? "selected" : ""}>pending</option>
            <option value="approved" ${request.status === "approved" ? "selected" : ""}>approved</option>
            <option value="rejected" ${request.status === "rejected" ? "selected" : ""}>rejected</option>
          </select>
        </label>

        <label class="auth-field">
          <span>Ghi chú admin</span>
          <textarea name="adminNote" rows="4" placeholder="Ví dụ: Đã duyệt hồ sơ công khai, có thể hiển thị ra trang tìm kiếm mentor.">${safeAdminNote}</textarea>
        </label>

        <button type="submit" class="mentor-primary-btn">Lưu duyệt hồ sơ công khai</button>
      </form>
    </article>
  `;
}

function buildAdminMentorManageCard(record) {
  const profile = record.profile || {};
  const mentorId = escapeHtml(record.id || "");
  const safeName = escapeHtml(record.name || profile.name || "Mentor");
  const safeEmail = escapeHtml(record.email || "");
  const safeStatus = escapeHtml(record.status || "approved");
  const safeField = escapeHtml(record.field || profile.field || "Chưa cập nhật");
  const safeRole = escapeHtml(profile.role || "Chưa cập nhật");
  const safeFocus = escapeHtml(profile.focus || "Chưa cập nhật");
  const safeWorkplace = escapeHtml(profile.workplace || "Chưa cập nhật");

  return `
    <article class="admin-request-card" data-admin-mentor-profile-id="${mentorId}">
      <div class="admin-request-head">
        <div>
          <span class="admin-request-label">Mentor Public Profile</span>
          <h3>${safeName}</h3>
        </div>
        <span class="admin-request-status status-${safeStatus}">${safeStatus}</span>
      </div>

      <div class="admin-request-grid">
        <p><strong>Mentor ID:</strong> ${mentorId}</p>
        <p><strong>Email:</strong> ${safeEmail || "Chưa cập nhật"}</p>
        <p><strong>Nhóm lĩnh vực:</strong> ${safeField}</p>
        <p><strong>Headline:</strong> ${safeRole}</p>
        <p><strong>Lĩnh vực:</strong> ${safeFocus}</p>
        <p><strong>Nơi làm việc/ học tập:</strong> ${safeWorkplace}</p>
      </div>

      <div class="profile-actions">
        <button type="button" class="mentor-primary-btn" data-edit-admin-mentor-profile="${mentorId}">Sửa mentor này</button>
        <a href="mentor-detail.html?id=${encodeURIComponent(record.id || "")}" class="mentor-secondary-btn" target="_blank" rel="noreferrer">Xem trang chi tiết</a>
      </div>
    </article>
  `;
}

function initializeMentorApplicationPage() {
  const form = document.getElementById("mentorApplicationForm");
  if (!form) return;
  const submitButton = form.querySelector('button[type="submit"]');

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
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Đang gửi hồ sơ...";
      }
      await submitMentorApplication(payload);
      form.reset();
      showMessage(
        "mentorApplicationMessage",
        "success",
        "Hồ sơ ứng tuyển mentor đã được gửi. Nếu phù hợp, đội ngũ Mentor Me sẽ liên hệ và cấp mã kích hoạt tài khoản."
      );
    } catch (error) {
      showMessage("mentorApplicationMessage", "error", error.message);
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Gửi hồ sơ ứng tuyển";
      }
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
      await activateMentorApplication({
        email: email,
        activationCode: activationCode,
        name: name,
        password: password,
      });

      const { error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (error) {
        throw error;
      }

      const sessionUser = await loadCurrentUserFromSupabase();
      if (!sessionUser) {
        throw new Error("Kích hoạt thành công nhưng chưa tải được hồ sơ mentor.");
      }

      saveAuthSession(sessionUser);
      showMessage("mentorActivationMessage", "success", "Kích hoạt tài khoản mentor thành công. Từ lần sau bạn đăng nhập bằng email ứng tuyển và mật khẩu vừa tạo.");
      window.setTimeout(function () {
        window.location.href = "mentor-dashboard.html";
      }, 900);
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
  const mentorCreateDashboard = document.getElementById("adminMentorCreateDashboard");
  const mentorCreateForm = document.getElementById("adminMentorCreateForm");
  const mentorManageList = document.getElementById("adminMentorManageList");
  const mentorManageRefreshButton = document.getElementById("adminRefreshMentorProfiles");
  const mentorEditIdField = document.getElementById("adminMentorEditId");
  const mentorCreateModeLabel = document.getElementById("adminMentorCreateModeLabel");
  const mentorCreateTitle = document.getElementById("adminMentorCreateTitle");
  const mentorCreateDescription = document.getElementById("adminMentorCreateDescription");
  const mentorCreatePasswordLabel = document.getElementById("adminMentorCreatePasswordLabel");
  const mentorCreateSubmit = document.getElementById("adminMentorCreateSubmit");
  const mentorEditCancel = document.getElementById("adminMentorEditCancel");
  const mentorCreateImageInput = document.getElementById("adminMentorCreateImage");
  const mentorCreateImageUpload = document.getElementById("adminMentorCreateImageUpload");
  const mentorCreateImagePreview = document.getElementById("adminMentorCreateImagePreview");
  let adminMentorProfilesCache = [];

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

  const isRealAdmin = !isDemoAccount(currentUser);
  let currentAdminKey = "";
  if (!currentAdminKey && isDemoAccount(currentUser) && normalizeRole(currentUser.role) === "admin") {
    currentAdminKey = DEMO_ADMIN_ACCESS_CODE;
  }

  async function loadRequests() {
    if (!isRealAdmin && !currentAdminKey) return;

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
    if ((!currentAdminKey && !isRealAdmin) || !mentorDashboard || !mentorListElement) return;

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

  async function loadBookingRequestsForAdmin() {
    if (!bookingDashboard || !bookingListElement) return;

    try {
      const requests = (!isRealAdmin && !currentAdminKey)
        ? getBookingRequests()
        : await fetchAdminBookingRequests(currentAdminKey);
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
    } catch (error) {
      bookingDashboard.hidden = true;
      showMessage("adminConsultationMessage", "error", error.message);
    }
  }

  async function loadMentorProfileUpdates() {
    if ((!currentAdminKey && !isRealAdmin) || !mentorProfileUpdateDashboard || !mentorProfileUpdateList) return;

    try {
      clearMessage("adminConsultationMessage");
      const requests = await fetchAdminMentorProfileUpdates(currentAdminKey);
      mentorProfileUpdateDashboard.hidden = false;

      if (!requests.length) {
        mentorProfileUpdateList.innerHTML = `
          <div class="admin-empty-state">
            <h3>Chưa có yêu cầu cập nhật hồ sơ mentor</h3>
            <p>Khi mentor bấm lưu hồ sơ, yêu cầu sẽ được chuyển tới đây để admin duyệt phần công khai trước khi hiển thị ra trang tìm kiếm.</p>
          </div>
        `;
        return;
      }

      mentorProfileUpdateList.innerHTML = requests.map(buildAdminMentorProfileUpdateCard).join("");
    } catch (error) {
      mentorProfileUpdateDashboard.hidden = true;
      showMessage("adminConsultationMessage", "error", error.message);
    }
  }

  async function loadAdminMentorProfiles() {
    if ((!currentAdminKey && !isRealAdmin) || !mentorCreateDashboard || !mentorManageList) return;

    try {
      const profiles = await fetchAdminMentorProfiles(currentAdminKey);
      adminMentorProfilesCache = profiles;
      mentorCreateDashboard.hidden = false;

      if (!profiles.length) {
        mentorManageList.innerHTML = `
          <div class="admin-empty-state">
            <h3>Chưa có mentor public nào</h3>
            <p>Admin có thể dùng form bên trên để tạo mentor đầu tiên lên trang tìm kiếm.</p>
          </div>
        `;
        return;
      }

      mentorManageList.innerHTML = profiles.map(buildAdminMentorManageCard).join("");
    } catch (error) {
      showMessage("adminConsultationMessage", "error", error.message);
    }
  }

  function resetAdminMentorCreateForm() {
    if (!mentorCreateForm) return;
    mentorCreateForm.reset();
    if (mentorEditIdField) mentorEditIdField.value = "";
    const passwordField = document.getElementById("adminMentorCreatePassword");
    if (passwordField) passwordField.required = true;
    if (mentorCreateImagePreview) mentorCreateImagePreview.src = "logo.png";
    if (mentorCreateImageUpload) mentorCreateImageUpload.value = "";
    if (mentorCreateModeLabel) mentorCreateModeLabel.textContent = "Mentor mới";
    if (mentorCreateTitle) mentorCreateTitle.textContent = "Đăng mentor lên tìm kiếm";
    if (mentorCreateDescription) mentorCreateDescription.textContent = "Điền thông tin cơ bản để mentor hiển thị trên trang tìm kiếm.";
    if (mentorCreatePasswordLabel) mentorCreatePasswordLabel.textContent = "Mật khẩu tạm cho mentor";
    if (mentorCreateSubmit) mentorCreateSubmit.textContent = "Tạo mentor";
    if (mentorEditCancel) mentorEditCancel.hidden = true;
  }

  function startAdminMentorEdit(mentorId) {
    const target = adminMentorProfilesCache.find(function (item) {
      return String(item.id) === String(mentorId);
    });
    if (!target || !mentorCreateForm) return;

    const profile = target.profile || {};
    if (mentorEditIdField) mentorEditIdField.value = target.id || "";
    document.getElementById("adminMentorCreateName").value = target.name || profile.name || "";
    document.getElementById("adminMentorCreateEmail").value = target.email || "";
    document.getElementById("adminMentorCreatePhone").value = profile.phone || "";
    document.getElementById("adminMentorCreatePassword").value = "";
    document.getElementById("adminMentorCreateRole").value = profile.role || "";
    document.getElementById("adminMentorCreateWorkplace").value = profile.workplace || "";
    document.getElementById("adminMentorCreateFocus").value = profile.focus || "";
    document.getElementById("adminMentorCreateField").value = normalizeFieldCategory(target.field || profile.field || "");
    document.getElementById("adminMentorCreateImage").value = profile.image || "";
    if (mentorCreateImagePreview) {
      mentorCreateImagePreview.src = profile.image || "logo.png";
    }
    document.getElementById("adminMentorCreateTag").value = profile.tag || "";
    document.getElementById("adminMentorCreateBio").value = profile.bio || "";
    document.getElementById("adminMentorCreateAchievements").value = Array.isArray(profile.achievements) ? profile.achievements.join("\n") : "";
    document.getElementById("adminMentorCreateFit").value = profile.fit || "";
    document.getElementById("adminMentorCreateRating").value = profile.rating || "";
    document.getElementById("adminMentorCreateStudents").value = profile.studentsTaught || "";

    Array.from(mentorCreateForm.querySelectorAll('input[name="adminMentorCreateAvailability"]')).forEach(function (input) {
      input.checked = Array.isArray(profile.availability) ? profile.availability.includes(input.value) : false;
    });
    Array.from(mentorCreateForm.querySelectorAll('input[name="adminMentorCreateService"]')).forEach(function (input) {
      input.checked = Array.isArray(profile.service) ? profile.service.includes(input.value) : false;
    });

    const passwordField = document.getElementById("adminMentorCreatePassword");
    if (passwordField) passwordField.required = false;
    if (mentorCreateModeLabel) mentorCreateModeLabel.textContent = "Đang chỉnh sửa";
    if (mentorCreateTitle) mentorCreateTitle.textContent = "Chỉnh sửa mentor đang hiển thị";
    if (mentorCreateDescription) mentorCreateDescription.textContent = "Lưu thay đổi để cập nhật trực tiếp hồ sơ public và dữ liệu mentor trên hệ thống.";
    if (mentorCreatePasswordLabel) mentorCreatePasswordLabel.textContent = "Đổi mật khẩu mentor (để trống nếu không đổi)";
    if (mentorCreateSubmit) mentorCreateSubmit.textContent = "Lưu chỉnh sửa mentor";
    if (mentorEditCancel) mentorEditCancel.hidden = false;
    mentorCreateForm.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (isRealAdmin) {
    accessForm.hidden = true;
    loadRequests();
    loadMentorApplications();
    loadBookingRequestsForAdmin();
    loadMentorProfileUpdates();
    loadAdminMentorProfiles();
    startAdminAutoRefresh();
    if (mentorCreateDashboard) {
      mentorCreateDashboard.hidden = false;
    }
  } else {
    accessForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      clearMessage("adminConsultationMessage");

      currentAdminKey = normalizeWhitespace(document.getElementById("adminAccessKey").value);
      if (!currentAdminKey) {
        showMessage("adminConsultationMessage", "error", "Vui lòng nhập mật khẩu quản trị.");
        return;
      }

      await loadRequests();
      await loadMentorApplications();
      loadBookingRequestsForAdmin();
      await loadMentorProfileUpdates();
      await loadAdminMentorProfiles();
      startAdminAutoRefresh();
      if (mentorCreateDashboard) {
        mentorCreateDashboard.hidden = false;
      }
    });
  }

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

  if (mentorManageRefreshButton) {
    mentorManageRefreshButton.addEventListener("click", loadAdminMentorProfiles);
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
        const result = await updateAdminMentorApplication(currentAdminKey, applicationId, {
          status: normalizeWhitespace(formData.get("status")),
          adminNote: normalizeWhitespace(formData.get("adminNote"))
        });
        const updatedApplication = result && result.application ? result.application : null;

        if (updatedApplication) {
          card.outerHTML = buildAdminMentorApplicationCard(updatedApplication);
        }
        await fetchPublicMentorProfiles();
        showMessage("adminConsultationMessage", "success", updatedApplication && updatedApplication.status === "approved"
          ? "Đã duyệt hồ sơ ứng tuyển mentor và tạo hồ sơ nháp để mentor tiếp tục hoàn thiện ở dashboard."
          : "Đã cập nhật trạng thái ứng tuyển mentor.");
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
      const status = normalizeWhitespace(formData.get("status"));
      const adminNote = normalizeWhitespace(formData.get("adminNote"));

      try {
        const request = await updateAdminMentorProfileUpdate(currentAdminKey, requestId, {
          status: status,
          adminNote: adminNote
        });

        await fetchPublicMentorProfiles();

        await loadMentorProfileUpdates();
        showMessage("adminConsultationMessage", "success", status === "approved"
          ? "Đã duyệt hồ sơ công khai. Mentor đã sẵn sàng hiển thị trên trang tìm kiếm."
          : "Đã cập nhật trạng thái duyệt hồ sơ công khai của mentor.");
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
        if (isRealAdmin && isSupabaseReady()) {
          await updateAdminBookingRequest(currentAdminKey, requestId, {
            status: normalizeWhitespace(formData.get("status")),
            adminNote: normalizeWhitespace(formData.get("adminNote"))
          });
        } else {
          updateBookingRequest(requestId, {
            status: normalizeWhitespace(formData.get("status")),
            adminNote: normalizeWhitespace(formData.get("adminNote"))
          });
        }
        await loadBookingRequestsForAdmin();
        showMessage("adminConsultationMessage", "success", "Đã cập nhật đăng ký học với mentor.");
      } catch (error) {
        showMessage("adminConsultationMessage", "error", error.message);
      }
    });
  }

  if (mentorCreateForm) {
    mentorCreateForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      clearMessage("adminConsultationMessage");

      const editMentorId = mentorEditIdField ? normalizeWhitespace(mentorEditIdField.value) : "";
      const name = normalizeWhitespace(document.getElementById("adminMentorCreateName").value);
      const email = normalizeEmail(document.getElementById("adminMentorCreateEmail").value);
      const phone = normalizePhone(document.getElementById("adminMentorCreatePhone").value);
      const password = document.getElementById("adminMentorCreatePassword").value;
      const role = normalizeWhitespace(document.getElementById("adminMentorCreateRole").value);
      const workplace = normalizeWhitespace(document.getElementById("adminMentorCreateWorkplace").value);
      const focus = normalizeWhitespace(document.getElementById("adminMentorCreateFocus").value);
      const field = normalizeFieldCategory(document.getElementById("adminMentorCreateField").value);
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
        showMessage("adminConsultationMessage", "error", "Tên mentor cần có ít nhất 2 ký tự.");
        return;
      }

      if (!focus) {
        showMessage("adminConsultationMessage", "error", "Hãy thêm lĩnh vực chính để mentor dễ tìm.");
        return;
      }

      if (!field) {
        showMessage("adminConsultationMessage", "error", "Vui lòng chọn nhóm lĩnh vực.");
        return;
      }

      if (!email.includes("@")) {
        showMessage("adminConsultationMessage", "error", "Email đăng nhập của mentor chưa đúng định dạng.");
        return;
      }

      if (!editMentorId && password.length < 8) {
        showMessage("adminConsultationMessage", "error", "Mật khẩu mentor cần tối thiểu 8 ký tự.");
        return;
      }

      if (editMentorId && password && password.length < 8) {
        showMessage("adminConsultationMessage", "error", "Mật khẩu mới của mentor cần tối thiểu 8 ký tự.");
        return;
      }

      const achievements = achievementsText
        ? achievementsText.split("\n").map(normalizeWhitespace).filter(Boolean)
        : [];

      const mentorId = buildUniqueMentorId(name);
      const finalService = service.length ? service : ["1-1"];
      const finalAvailability = availability.length ? availability : ["sang", "chieu", "toi"];
      const availabilitySlots = buildAvailabilitySlotsFromLegacy(finalAvailability);
      const servicePackages = buildServicePackagesFromLegacy(finalService, "Admin duyệt sau");
      const mentorProfile = {
        id: mentorId,
        name: name,
        image: image || "mentor2.jpg",
        workplace: workplace || "Đang cập nhật",
        tag: tag || ("Mentor " + focus),
        role: role || ("Mentor " + focus),
        bio: bio || "Thông tin mentor sẽ được bổ sung thêm.",
        focus: focus,
        field: field,
        availability: finalAvailability,
        availabilitySlots: availabilitySlots,
        availabilityText: buildAvailabilitySummaryFromSlots(availabilitySlots),
        service: finalService,
        servicePackages: servicePackages,
        serviceText: buildMentorServiceText(finalService),
        pricing: buildServicePackageSummary(servicePackages),
        achievements: achievements,
        fit: fit || "Phù hợp với mentee đang cần mentor đồng hành theo mục tiêu học tập cụ thể.",
        searchableText: ""
      };

      if (ratingValue) {
        mentorProfile.rating = Number(ratingValue);
      }

      if (studentsValue) {
        mentorProfile.studentsTaught = Number(studentsValue);
      }

      mentorProfile.searchableText = buildMentorSearchableText(mentorProfile);
      mentorProfile._createdAt = new Date().toISOString();

      try {
        if (editMentorId) {
          await updateAdminMentorProfile(currentAdminKey, editMentorId, {
            email: email,
            password: password,
            phone: phone,
            name: name,
            field: field,
            profile: mentorProfile,
            visibility: "public",
            status: "approved"
          });
        } else {
          await createAdminMentorProfile(currentAdminKey, {
            mentorId: mentorId,
            email: email,
            password: password,
            phone: phone,
            name: name,
            field: field,
            profile: mentorProfile
          });
        }
        await fetchPublicMentorProfiles();
        await loadAdminMentorProfiles();
        resetAdminMentorCreateForm();
        showMessage("adminConsultationMessage", "success", editMentorId
          ? "Đã lưu chỉnh sửa hồ sơ mentor."
          : "Đã tạo tài khoản và hồ sơ mentor. Mentor có thể đăng nhập bằng email và mật khẩu vừa cấp.");
      } catch (error) {
        showMessage("adminConsultationMessage", "error", error.message);
      }
    });
  }

  if (mentorEditCancel) {
    mentorEditCancel.addEventListener("click", function () {
      resetAdminMentorCreateForm();
    });
  }

  if (mentorCreateImageInput) {
    mentorCreateImageInput.addEventListener("input", function () {
      if (mentorCreateImagePreview) {
        mentorCreateImagePreview.src = mentorCreateImageInput.value || "logo.png";
      }
    });
  }

  if (mentorCreateImageUpload) {
    mentorCreateImageUpload.addEventListener("change", function () {
      const file = mentorCreateImageUpload.files && mentorCreateImageUpload.files[0];
      if (!file) return;
      readFileAsDataUrl(file)
        .then(function (dataUrl) {
          if (mentorCreateImageInput) mentorCreateImageInput.value = dataUrl;
          if (mentorCreateImagePreview) mentorCreateImagePreview.src = dataUrl;
        })
        .catch(function (error) {
          showMessage("adminConsultationMessage", "error", error.message);
        });
    });
  }

  if (mentorManageList) {
    mentorManageList.addEventListener("click", function (e) {
      const button = e.target.closest("[data-edit-admin-mentor-profile]");
      if (!button) return;
      startAdminMentorEdit(button.getAttribute("data-edit-admin-mentor-profile"));
    });
  }

  if (currentAdminKey && !isRealAdmin) {
    const accessInput = document.getElementById("adminAccessKey");
    if (accessInput) {
      accessInput.value = currentAdminKey;
    }
    loadRequests();
    loadMentorApplications();
    loadBookingRequestsForAdmin();
    loadMentorProfileUpdates();
    loadAdminMentorProfiles();
    if (mentorCreateDashboard) {
      mentorCreateDashboard.hidden = false;
    }
    startAdminAutoRefresh();
  }

  let adminAutoRefreshTimer = 0;
  function startAdminAutoRefresh() {
    if ((!currentAdminKey && !isRealAdmin) || adminAutoRefreshTimer) {
      return;
    }

    adminAutoRefreshTimer = window.setInterval(function () {
      loadRequests();
      loadMentorApplications();
      loadBookingRequestsForAdmin();
      loadMentorProfileUpdates();
      loadAdminMentorProfiles();
    }, 15000);
  }

  startAdminAutoRefresh();
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
    image: currentUser.avatar || "",
    headline: "",
    workplace: "",
    expertise: "",
    field: "",
    fields: [],
    services: "",
    pricing: "",
    availability: "",
    availabilitySlots: [],
    servicePackages: [],
    intro: "",
    experience: "",
    education: "",
    activities: "",
    awards: "",
    skills: "",
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
      image: approvedMentor.image || currentUser.avatar || "",
      headline: approvedMentor.role,
      workplace: approvedMentor.workplace || "",
      expertise: approvedMentor.focus,
      field: normalizeFieldCategory(approvedMentor.field),
      fields: normalizeFieldCategoryList(approvedMentor.fields || approvedMentor.field || []),
      services: buildMentorServiceText((approvedMentor.servicePackages || []).map(function (item) {
        return item.serviceKey;
      })),
      pricing: buildServicePackageSummary(approvedMentor.servicePackages || []),
      availability: approvedMentor.availabilityText,
      availabilitySlots: getMentorAvailabilitySlots(approvedMentor),
      servicePackages: getMentorServicePackages(approvedMentor),
      intro: approvedMentor.bio || "",
      experience: approvedMentor.experience || "",
      education: approvedMentor.education || "",
      activities: approvedMentor.activities || "",
      awards: approvedMentor.awards || "",
      skills: approvedMentor.skills || "",
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
    fieldOptions: document.getElementById("mentorDashboardFieldOptions"),
    services: document.getElementById("mentorDashboardServices"),
    pricing: document.getElementById("mentorDashboardPricing"),
    availability: document.getElementById("mentorDashboardAvailability"),
    intro: document.getElementById("mentorDashboardIntro"),
    experience: document.getElementById("mentorDashboardExperience"),
    education: document.getElementById("mentorDashboardEducation"),
    activities: document.getElementById("mentorDashboardActivities"),
    awards: document.getElementById("mentorDashboardAwards"),
    skills: document.getElementById("mentorDashboardSkills"),
    achievements: document.getElementById("mentorDashboardAchievements"),
    fit: document.getElementById("mentorDashboardFit"),
    visibility: document.getElementById("mentorDashboardVisibility"),
    rating: document.getElementById("mentorDashboardRating"),
    studentsTaught: document.getElementById("mentorDashboardStudents")
  };
  const imageUploadInput = document.getElementById("mentorDashboardImageUpload");
  const packageBuilder = document.getElementById("mentorDashboardPackageBuilder");
  const addPackageButton = document.getElementById("mentorDashboardAddPackage");
  const availabilityEditor = document.getElementById("mentorDashboardAvailabilityGrid");

  const previewElements = {
    avatar: document.getElementById("mentorDashboardPreviewAvatar"),
    name: document.getElementById("mentorDashboardPreviewName"),
    headline: document.getElementById("mentorDashboardPreviewHeadline"),
    workplace: document.getElementById("mentorDashboardPreviewWorkplace"),
    expertise: document.getElementById("mentorDashboardPreviewExpertise"),
    fieldSummary: document.getElementById("mentorDashboardPreviewFieldSummary"),
    services: document.getElementById("mentorDashboardPreviewServices"),
    pricing: document.getElementById("mentorDashboardPreviewPricing"),
    availability: document.getElementById("mentorDashboardPreviewAvailability"),
    packageList: document.getElementById("mentorDashboardPreviewPackages"),
    schedule: document.getElementById("mentorDashboardPreviewSchedule"),
    intro: document.getElementById("mentorDashboardPreviewIntro"),
    experience: document.getElementById("mentorDashboardPreviewExperience"),
    education: document.getElementById("mentorDashboardPreviewEducation"),
    activities: document.getElementById("mentorDashboardPreviewActivities"),
    awards: document.getElementById("mentorDashboardPreviewAwards"),
    skills: document.getElementById("mentorDashboardPreviewSkills"),
    achievements: document.getElementById("mentorDashboardPreviewAchievements"),
    fit: document.getElementById("mentorDashboardPreviewFit"),
    statusBadge: document.getElementById("mentorDashboardStatusBadge")
  };
  const reviewStatusElement = document.getElementById("mentorDashboardReviewStatus");

  function renderFieldOptions(selectedFields) {
    if (!fields.fieldOptions) return;
    const normalizedSelectedFields = normalizeFieldCategoryList(selectedFields);
    fields.fieldOptions.innerHTML = FIELD_CATEGORY_OPTIONS.map(function (option) {
      return `
        <label>
          <input type="checkbox" value="${option.value}" ${normalizedSelectedFields.includes(option.value) ? "checked" : ""}>
          <span>${option.label}</span>
        </label>
      `;
    }).join("");
  }

  function collectSelectedFieldOptions() {
    if (!fields.fieldOptions) return [];
    return Array.from(fields.fieldOptions.querySelectorAll("input[type=\"checkbox\"]:checked"))
      .map(function (input) {
        return input.value;
      });
  }

  function renderReviewStatus(reviewRequest) {
    if (!reviewStatusElement) {
      return;
    }

    if (approvedMentor) {
      reviewStatusElement.hidden = false;
      reviewStatusElement.className = "auth-message success";
      reviewStatusElement.textContent = "Hồ sơ công khai của bạn đã được duyệt và đang hiển thị trên trang tìm kiếm mentor.";
      return;
    }

    if (!reviewRequest) {
      reviewStatusElement.hidden = false;
      reviewStatusElement.className = "auth-message";
      reviewStatusElement.textContent = "Bạn chưa gửi hồ sơ công khai cho admin duyệt. Sau khi hoàn thiện thông tin bên dưới, hãy bấm lưu để đưa hồ sơ vào hàng chờ duyệt.";
      return;
    }

    const normalizedStatus = normalizeWhitespace(reviewRequest.status).toLowerCase();
    reviewStatusElement.hidden = false;

    if (normalizedStatus === "pending") {
      reviewStatusElement.className = "auth-message";
      reviewStatusElement.textContent = "Hồ sơ công khai của bạn đang chờ admin duyệt. Trong lúc chờ, mentor sẽ chưa xuất hiện trên trang tìm kiếm.";
      return;
    }

    if (normalizedStatus === "rejected") {
      reviewStatusElement.className = "auth-message error";
      reviewStatusElement.textContent = reviewRequest.adminNote
        ? "Admin đã yêu cầu chỉnh sửa hồ sơ công khai: " + reviewRequest.adminNote
        : "Admin đã yêu cầu bạn cập nhật lại hồ sơ công khai trước khi hiển thị lên tìm kiếm.";
      return;
    }

    if (normalizedStatus === "approved") {
      reviewStatusElement.className = "auth-message success";
      reviewStatusElement.textContent = "Admin đã duyệt hồ sơ công khai. Nếu trang tìm kiếm chưa kịp cập nhật, hãy tải lại trang sau ít giây.";
      return;
    }

    reviewStatusElement.className = "auth-message";
    reviewStatusElement.textContent = "Trạng thái hồ sơ công khai hiện tại: " + normalizedStatus;
  }

  function fillForm(payload) {
    fields.displayName.value = payload.displayName || "";
    fields.headline.value = payload.headline || "";
    fields.workplace.value = payload.workplace || "";
    fields.expertise.value = payload.expertise || "";
    renderFieldOptions(payload.fields || payload.field || []);
    fields.services.value = payload.services || "";
    fields.pricing.value = payload.pricing || "";
    fields.availability.value = payload.availability || "";
    fields.intro.value = payload.intro || "";
    if (fields.experience) fields.experience.value = payload.experience || "";
    if (fields.education) fields.education.value = payload.education || "";
    if (fields.activities) fields.activities.value = payload.activities || "";
    if (fields.awards) fields.awards.value = payload.awards || "";
    if (fields.skills) fields.skills.value = payload.skills || "";
    fields.achievements.value = payload.achievements || "";
    fields.fit.value = payload.fit || "";
    fields.visibility.value = payload.visibility || "draft";
    if (fields.rating) fields.rating.value = payload.rating || "";
    if (fields.studentsTaught) fields.studentsTaught.value = payload.studentsTaught || "";
    if (fields.services) fields.services.value = payload.services || "";
    if (fields.pricing) fields.pricing.value = payload.pricing || "";
    if (fields.availability) fields.availability.value = payload.availability || "";
    renderServicePackageBuilder(packageBuilder, payload.servicePackages || []);
    if (availabilityEditor) {
      availabilityEditor.innerHTML =
        buildMentorScheduleLegendHtml() +
        buildMentorAvailabilityEditor(payload.availabilitySlots || [], getOccupiedSlotIdsForMentor(mentorContext.mentorId));
    }
    if (previewElements.avatar) {
      previewElements.avatar.src = payload.image || currentUser.avatar || createAvatarFallback(payload.displayName || currentUser.name);
    }
  }

  function applyReviewRequestToDraft(reviewRequest) {
    if (!reviewRequest || !reviewRequest.profile) {
      return;
    }

    const payload = reviewRequest.profile || {};
    const reviewPackages = Array.isArray(payload.servicePackages) && payload.servicePackages.length
      ? payload.servicePackages
      : getMentorServicePackages(payload);
    const reviewSlots = Array.isArray(payload.availabilitySlots) && payload.availabilitySlots.length
      ? payload.availabilitySlots
      : getMentorAvailabilitySlots(payload);

    draftProfile = Object.assign({}, draftProfile, {
      displayName: payload.displayName || payload.name || draftProfile.displayName,
      image: payload.image || draftProfile.image,
      headline: payload.role || payload.headline || draftProfile.headline,
      workplace: payload.workplace || draftProfile.workplace,
      expertise: payload.focus || payload.expertise || draftProfile.expertise,
      field: normalizeFieldCategoryList(payload.fields || payload.field || draftProfile.field)[0] || draftProfile.field,
      fields: normalizeFieldCategoryList(payload.fields || payload.field || draftProfile.fields || draftProfile.field),
      services: payload.serviceText || buildMentorServiceText(reviewPackages.map(function (item) {
        return item.serviceKey;
      })),
      pricing: payload.pricing || buildServicePackageSummary(reviewPackages),
      availability: payload.availabilityText || buildAvailabilitySummaryFromSlots(reviewSlots),
      availabilitySlots: reviewSlots,
      servicePackages: reviewPackages,
      intro: payload.bio || payload.intro || draftProfile.intro,
      experience: payload.experience || draftProfile.experience,
      education: payload.education || draftProfile.education,
      activities: payload.activities || draftProfile.activities,
      awards: payload.awards || draftProfile.awards,
      skills: payload.skills || draftProfile.skills,
      achievements: Array.isArray(payload.achievements) ? payload.achievements.join("\n") : (payload.achievements || draftProfile.achievements),
      fit: payload.fit || draftProfile.fit,
      rating: payload.rating || draftProfile.rating,
      studentsTaught: payload.studentsTaught || draftProfile.studentsTaught,
      visibility: "public",
      updatedAt: reviewRequest.updatedAt || draftProfile.updatedAt
    });

    fillForm(draftProfile);
    renderPreview(draftProfile);
  }

  function renderPreview(payload) {
    previewElements.avatar.src = payload.image || currentUser.avatar || createAvatarFallback(payload.displayName || currentUser.name);
    previewElements.name.textContent = payload.displayName || currentUser.name || "Tên mentor";
    previewElements.headline.textContent = payload.headline || "Headline chuyên môn sẽ hiển thị ở đây.";
    previewElements.workplace.textContent = payload.workplace || "Chưa cập nhật";
    previewElements.expertise.textContent = payload.expertise || "Chưa cập nhật";
    if (previewElements.fieldSummary) {
      previewElements.fieldSummary.textContent = buildFieldCategorySummary(payload.fields || payload.field);
    }
    previewElements.services.textContent = payload.services || "Chưa cập nhật";
    previewElements.pricing.textContent = payload.pricing || "Chưa cập nhật";
    previewElements.availability.textContent = payload.availability || "Chưa cập nhật";
    if (previewElements.packageList) {
      previewElements.packageList.innerHTML = (payload.servicePackages || []).length
        ? payload.servicePackages.map(function (item) {
            return "<li>" + escapeHtml(item.title + " - " + formatDurationLabel(item.durationMinutes) + " - " + (item.priceText || "Admin duyệt sau")) + "</li>";
          }).join("")
        : "<li>Chưa có gói dịch vụ nào.</li>";
    }
    if (previewElements.schedule) {
      previewElements.schedule.innerHTML =
        buildMentorScheduleLegendHtml() +
        buildMentorScheduleTable(mentorContext.mentorId || "draft", payload.availabilitySlots || [], getOccupiedSlotIdsForMentor(mentorContext.mentorId), {
          selectable: false
        });
    }
    previewElements.intro.textContent = payload.intro || "Phần giới thiệu mentor sẽ xuất hiện ở đây để bạn xem trước cách hiển thị.";
    if (previewElements.experience) previewElements.experience.textContent = payload.experience || "Chưa cập nhật kinh nghiệm làm việc.";
    if (previewElements.education) previewElements.education.textContent = payload.education || "Chưa cập nhật quá trình học tập.";
    if (previewElements.activities) previewElements.activities.textContent = payload.activities || "Chưa cập nhật hoạt động ngoại khóa.";
    if (previewElements.awards) previewElements.awards.textContent = payload.awards || "Chưa cập nhật giải thưởng.";
    if (previewElements.skills) previewElements.skills.textContent = payload.skills || "Chưa cập nhật kỹ năng và chứng chỉ.";
    previewElements.fit.textContent = payload.fit || "Mô tả nhóm mentee phù hợp sẽ hiển thị tại đây.";
    previewElements.statusBadge.textContent =
      payload.visibility === "public" ? "Sẵn sàng gửi duyệt công khai" : "Lưu nháp nội bộ";
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
    const selectedAvailabilitySlots = availabilityEditor
      ? Array.from(availabilityEditor.querySelectorAll(".mentor-weekly-schedule-cell.is-available, .mentor-weekly-schedule-cell.is-booked"))
          .map(function (cell) {
            return cell.getAttribute("data-slot-id");
          })
          .filter(Boolean)
      : [];
    const servicePackages = collectServicePackagesFromContainer(packageBuilder);
    const servicesSummary = buildMentorServiceText(servicePackages.map(function (item) {
      return item.serviceKey;
    }));
    const pricingSummary = buildServicePackageSummary(servicePackages);
    const availabilitySummary = buildAvailabilitySummaryFromSlots(selectedAvailabilitySlots);
    const selectedFields = normalizeFieldCategoryList(collectSelectedFieldOptions());

    draftProfile = {
      displayName: normalizeWhitespace(fields.displayName.value),
      image: draftProfile.image || (approvedMentor && approvedMentor.image) || currentUser.avatar || "",
      headline: normalizeWhitespace(fields.headline.value),
      workplace: normalizeWhitespace(fields.workplace.value),
      expertise: normalizeWhitespace(fields.expertise.value),
      field: selectedFields[0] || "",
      fields: selectedFields,
      services: servicesSummary,
      pricing: pricingSummary,
      availability: availabilitySummary,
      availabilitySlots: selectedAvailabilitySlots,
      servicePackages: servicePackages,
      intro: normalizeWhitespace(fields.intro.value),
      experience: normalizeWhitespace(fields.experience && fields.experience.value),
      education: normalizeWhitespace(fields.education && fields.education.value),
      activities: normalizeWhitespace(fields.activities && fields.activities.value),
      awards: normalizeWhitespace(fields.awards && fields.awards.value),
      skills: normalizeWhitespace(fields.skills && fields.skills.value),
      achievements: fields.achievements.value.trim(),
      fit: normalizeWhitespace(fields.fit.value),
      visibility: fields.visibility.value === "public" ? "public" : "draft",
      rating: normalizeWhitespace(fields.rating && fields.rating.value),
      studentsTaught: normalizeWhitespace(fields.studentsTaught && fields.studentsTaught.value),
      updatedAt: new Date().toISOString()
    };

    if (fields.services) fields.services.value = servicesSummary;
    if (fields.pricing) fields.pricing.value = pricingSummary;
    if (fields.availability) fields.availability.value = availabilitySummary;

    renderPreview(draftProfile);
  }

  fillForm(draftProfile);
  renderPreview(draftProfile);
  renderReviewStatus(null);

  if (!isDemoAccount(currentUser) && isSupabaseReady()) {
    fetchCurrentMentorProfileUpdate()
      .then(function (request) {
        applyReviewRequestToDraft(request);
        renderReviewStatus(request);
      })
      .catch(function () {
        renderReviewStatus(null);
      });
  }

  Object.keys(fields).forEach(function (key) {
    const input = fields[key];
    if (!input) return;
    if (key === "fieldOptions") return;
    input.addEventListener("input", syncFromForm);
    input.addEventListener("change", syncFromForm);
  });

  if (fields.fieldOptions && !fields.fieldOptions.dataset.boundFieldOptions) {
    fields.fieldOptions.addEventListener("change", syncFromForm);
    fields.fieldOptions.dataset.boundFieldOptions = "true";
  }

  if (imageUploadInput) {
    imageUploadInput.addEventListener("change", function () {
      const file = imageUploadInput.files && imageUploadInput.files[0];
      if (!file) return;
      readFileAsDataUrl(file)
        .then(function (dataUrl) {
          draftProfile = Object.assign({}, draftProfile, {
            image: dataUrl,
            updatedAt: new Date().toISOString()
          });
          renderPreview(draftProfile);
        })
        .catch(function (error) {
          showMessage("mentorDashboardMessage", "error", error.message);
        });
    });
  }

  if (addPackageButton && !addPackageButton.dataset.boundAddPackage) {
    addPackageButton.addEventListener("click", function () {
      const nextPackages = collectServicePackagesFromContainer(packageBuilder);
      nextPackages.push(createServicePackage("1-1", nextPackages.length + 1, {
        durationMinutes: 60,
        priceValue: 0
      }));
      renderServicePackageBuilder(packageBuilder, nextPackages);
      syncFromForm();
    });
    addPackageButton.dataset.boundAddPackage = "true";
  }

  if (packageBuilder && !packageBuilder.dataset.boundPackageBuilder) {
    packageBuilder.addEventListener("input", syncFromForm);
    packageBuilder.addEventListener("change", syncFromForm);
    packageBuilder.addEventListener("click", function (event) {
      const button = event.target.closest("[data-remove-package]");
      if (!button) {
        return;
      }

      const nextPackages = collectServicePackagesFromContainer(packageBuilder).filter(function (_, index) {
        return String(index) !== String(button.getAttribute("data-remove-package"));
      });
      renderServicePackageBuilder(packageBuilder, nextPackages.length ? nextPackages : [createServicePackage("1-1", 1)]);
      syncFromForm();
    });
    packageBuilder.dataset.boundPackageBuilder = "true";
  }

  if (availabilityEditor && !availabilityEditor.dataset.boundAvailabilityEditor) {
    function toggleAvailabilityCell(target) {
      const cell = target.closest(".mentor-weekly-schedule-cell.is-toggleable");
      if (!cell) {
        return;
      }

      cell.classList.toggle("is-available");
      cell.classList.toggle("is-unavailable");
      cell.setAttribute("aria-checked", cell.classList.contains("is-available") ? "true" : "false");
      syncFromForm();
    }

    availabilityEditor.addEventListener("click", function (event) {
      toggleAvailabilityCell(event.target);
    });

    availabilityEditor.addEventListener("keydown", function (event) {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }
      toggleAvailabilityCell(event.target);
      event.preventDefault();
    });

    availabilityEditor.dataset.boundAvailabilityEditor = "true";
  }

  form.addEventListener("submit", async function (e) {
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

    if (!draftProfile.field) {
      showMessage("mentorDashboardMessage", "error", "Hãy chọn nhóm lĩnh vực để hồ sơ có thể hiển thị đúng trong phần tìm kiếm.");
      return;
    }

    const updateRequest = {
      mentorId: mentorContext.mentorId || slugifyText(draftProfile.displayName || currentUser.name),
      mentorName: draftProfile.displayName || currentUser.name,
      profile: {
        displayName: draftProfile.displayName || currentUser.name,
        name: draftProfile.displayName || currentUser.name,
        image: draftProfile.image || (approvedMentor && approvedMentor.image) || currentUser.avatar,
        role: draftProfile.headline,
        workplace: draftProfile.workplace,
        focus: draftProfile.expertise,
        field: draftProfile.field,
        fields: draftProfile.fields,
        serviceText: draftProfile.services,
        servicePackages: draftProfile.servicePackages,
        pricing: draftProfile.pricing,
        availabilityText: draftProfile.availability,
        availabilitySlots: draftProfile.availabilitySlots,
        bio: draftProfile.intro,
        experience: draftProfile.experience,
        education: draftProfile.education,
        activities: draftProfile.activities,
        awards: draftProfile.awards,
        skills: draftProfile.skills,
        achievements: String(draftProfile.achievements || "").split("\n").map(function (item) { return item.trim(); }).filter(Boolean),
        fit: draftProfile.fit,
        rating: Number(draftProfile.rating || (approvedMentor && approvedMentor.rating) || 4.8),
        studentsTaught: Number(draftProfile.studentsTaught || (approvedMentor && approvedMentor.studentsTaught) || 0),
        reviews: approvedMentor ? approvedMentor.reviews : [],
        searchableText: buildMentorSearchableText({
          name: draftProfile.displayName || currentUser.name,
          tag: approvedMentor ? approvedMentor.tag : "",
          role: draftProfile.headline,
          bio: draftProfile.intro,
          focus: draftProfile.expertise,
          fields: draftProfile.fields,
          fit: draftProfile.fit,
          workplace: draftProfile.workplace,
          experience: draftProfile.experience,
          education: draftProfile.education,
          activities: draftProfile.activities,
          awards: draftProfile.awards,
          skills: draftProfile.skills
        })
      }
    };

    saveMentorProfileByUserId(currentUser.id, draftProfile);

    try {
      if (isDemoAccount(currentUser) || !isSupabaseReady()) {
        upsertPendingMentorProfileUpdate(Object.assign({
          id: "mentor-profile-update-" + updateRequest.mentorId,
          status: "pending",
          adminNote: "",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }, updateRequest));
      } else {
        await submitMentorProfileUpdate(updateRequest);
      }

      renderReviewStatus({
        status: "pending",
        adminNote: ""
      });
      showMessage("mentorDashboardMessage", "success", "Hồ sơ mentor đã được gửi tới admin để duyệt phần công khai. Sau khi admin duyệt ở khu hồ sơ công khai, trang tìm kiếm sẽ tự cập nhật.");
    } catch (error) {
      showMessage("mentorDashboardMessage", "error", error.message || "Không thể gửi hồ sơ mentor lúc này.");
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
      await registerAccount({
        email: email,
        phone: phone,
        goal: goal,
        name: name,
        role: role,
        password: password,
      });

      const { error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (error) {
        throw error;
      }

      const sessionUser = await loadCurrentUserFromSupabase();
      if (!sessionUser) {
        throw new Error("Tạo tài khoản thành công nhưng chưa tải được hồ sơ.");
      }

      saveAuthSession(sessionUser);
      showMessage("registerMessage", "success", "Tạo tài khoản thành công. Bạn đang được chuyển tới hồ sơ cá nhân...");
      window.setTimeout(function () {
        window.location.href = "profile.html";
      }, 900);
    } catch (error) {
      showMessage("registerMessage", "error", error.message || "Không thể tạo tài khoản lúc này.");
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
    const isDemoAdminOnly = demoUser && normalizeRole(demoUser.role) === "admin" && password === identifier;
    const isDemoMentee = demoUser && normalizeRole(demoUser.role) === "mentee" && normalizeEmail(identifier) === DEMO_MENTEE_EMAIL && password === DEMO_MENTEE_PASSWORD;

    if (demoUser && (isDemoAdminOnly || isDemoMentee)) {
      saveAuthSession(demoUser);
      showMessage("loginMessage", "success", "Đăng nhập tài khoản test thành công. Đang chuyển đến trang phù hợp...");
      window.setTimeout(function () {
        window.location.href = getRedirectTarget() || getRoleHomePath(demoUser.role);
      }, 500);
      return;
    }

    if (!ensureSupabaseReady("loginMessage")) return;

    if (!identifier.includes("@")) {
      showMessage("loginMessage", "error", "Với tài khoản thật, vui lòng dùng email đã đăng ký. Mentor sau khi kích hoạt sẽ đăng nhập bằng email ứng tuyển và mật khẩu vừa tạo, giống như mentee.");
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
  const profileExperienceInput = document.getElementById("profileExperienceInput");
  const profileEducationInput = document.getElementById("profileEducationInput");
  const profileActivitiesInput = document.getElementById("profileActivitiesInput");
  const profileAwardsInput = document.getElementById("profileAwardsInput");
  const profileSkillsInput = document.getElementById("profileSkillsInput");
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
        ? "Tài khoản mentee được đăng ký công khai. Mentor được cấp riêng sau khi chọn lọc."
        : "Loại tài khoản này được cấp riêng theo quy trình nội bộ nên không đổi trực tiếp tại hồ sơ cá nhân.";
    }

    if (profileBannerTitle) {
      profileBannerTitle.textContent = normalizedRole === "mentor"
        ? "Quản lý tài khoản mentor và sẵn sàng hoàn thiện dashboard chuyên môn."
        : normalizedRole === "admin"
          ? "Quản lý tài khoản nội bộ và phạm vi công việc được phân quyền."
          : "Quản lý thông tin và sẵn sàng kết nối với mentor phù hợp.";
    }

    if (profileBannerDescription) {
      profileBannerDescription.textContent = normalizedRole === "mentor"
        ? "Giữ thông tin liên hệ nhất quán để đội ngũ Mentor Me dễ xác minh và mentee dễ nhận diện khi hồ sơ được mở công khai."
        : normalizedRole === "admin"
          ? "Hồ sơ nội bộ tập trung vào liên hệ công việc và phạm vi phụ trách, còn phần vận hành chính nằm ở khu quản trị nội bộ."
          : "Cập nhật mục tiêu, cách học và thông tin liên hệ để trải nghiệm tìm mentor trở nên sát nhu cầu hơn.";
    }

    if (profileSectionDescription) {
      profileSectionDescription.textContent = normalizedRole === "mentor"
        ? "Cập nhật thông tin tài khoản cơ bản. Phần chuyên môn, dịch vụ và lịch rảnh nằm ở dashboard mentor."
        : normalizedRole === "admin"
          ? "Cập nhật thông tin tài khoản nội bộ cơ bản. Việc xử lý lead và hồ sơ mentor được thực hiện ở khu quản trị nội bộ."
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
        ? "Bạn chưa thêm định hướng mentoring. Hãy cập nhật để đội ngũ Mentor Me và mentee hiểu rõ hơn về vai trò của bạn."
        : normalizedRole === "admin"
          ? "Bạn chưa thêm phạm vi phụ trách. Hãy cập nhật để nội bộ dễ nhận biết vai trò của tài khoản này."
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
    const details = normalizeProfileDetails(account.details || {});
    if (profileExperienceInput) profileExperienceInput.value = details.experience || "";
    if (profileEducationInput) profileEducationInput.value = details.education || "";
    if (profileActivitiesInput) profileActivitiesInput.value = details.activities || "";
    if (profileAwardsInput) profileAwardsInput.value = details.awards || "";
    if (profileSkillsInput) profileSkillsInput.value = details.skills || "";
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
    const updatedDetails = normalizeProfileDetails({
      experience: profileExperienceInput ? profileExperienceInput.value : "",
      education: profileEducationInput ? profileEducationInput.value : "",
      activities: profileActivitiesInput ? profileActivitiesInput.value : "",
      awards: profileAwardsInput ? profileAwardsInput.value : "",
      skills: profileSkillsInput ? profileSkillsInput.value : ""
    });
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
          details: updatedDetails,
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
        details: updatedDetails,
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
        details: updatedDetails,
        role: updatedRole,
        mentor_id: currentProfileUser.mentorId || "",
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

function renderProfileDetailsSections(details, options) {
  const normalized = normalizeProfileDetails(details);
  const title = options && options.title ? options.title : "Hồ sơ cá nhân";
  const emptyText = options && options.emptyText ? options.emptyText : "Người dùng này chưa bổ sung hồ sơ mở rộng.";
  const sections = [
    { label: "Kinh nghiệm làm việc", value: normalized.experience },
    { label: "Quá trình học tập", value: normalized.education },
    { label: "Hoạt động ngoại khóa", value: normalized.activities },
    { label: "Tên giải thưởng", value: normalized.awards },
    { label: "Kỹ năng & chứng chỉ", value: normalized.skills }
  ];

  return `
    <div class="schedule-card-note profile-detail-sections">
      <span>${escapeHtml(title)}</span>
      ${hasProfileDetails(normalized)
        ? sections.map(function (section) {
            return `
              <div class="profile-detail-block">
                <strong>${escapeHtml(section.label)}</strong>
                <p>${escapeHtml(section.value || "Chưa cập nhật")}</p>
              </div>
            `;
          }).join("")
        : `<p>${escapeHtml(emptyText)}</p>`}
    </div>
  `;
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
              <strong>${Number(submittedReview.rating || 0).toFixed(1)}/ 5 sao</strong>
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
        <p><strong>Dịch vụ:</strong> ${escapeHtml(request.serviceName || "Chưa cập nhật")}</p>
        <p><strong>Chi phí:</strong> ${escapeHtml(request.servicePriceText || "Chưa cập nhật")}</p>
        <p><strong>Gửi lúc:</strong> ${formatDate(request.createdAt)}</p>
        <p><strong>Lĩnh vực:</strong> ${escapeHtml(request.mentorFocus || "Chưa cập nhật")}</p>
      </div>
      <div class="schedule-card-note">
        <span>Ghi chú</span>
        <p>${escapeHtml(request.note || "Không có ghi chú thêm.")}</p>
      </div>
      <div class="schedule-card-actions">
        <a href="booking-chat.html?id=${encodeURIComponent(request.id)}" class="mentor-secondary-btn">Chat với mentor</a>
      </div>
      ${reviewHtml}
    </article>
  `;
}

function buildMentorLeadCard(request) {
  const proposedOptions = Array.isArray(request.proposedOptions) ? request.proposedOptions : [];
  const proposedHtml = proposedOptions.length
    ? `
        <label class="auth-field profile-full-width">
          <span>Mentor chốt 1 lịch trong các lựa chọn mentee đã gửi</span>
          <select data-booking-proposed-time="${request.id}">
            ${proposedOptions.map(function (option, index) {
              return "<option value=\"" + escapeHtml(option.startSlotId) + "\" " + (index === 0 ? "selected" : "") + ">" + escapeHtml(option.label) + "</option>";
            }).join("")}
          </select>
        </label>
      `
    : "";

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
        <p><strong>Khung giờ mentee đề xuất:</strong> ${escapeHtml(request.preferredTime)}</p>
        <p><strong>Dịch vụ:</strong> ${escapeHtml(request.serviceName || "Chưa cập nhật")}</p>
        <p><strong>Ngày gửi:</strong> ${formatDate(request.createdAt)}</p>
      </div>
      <div class="schedule-card-note">
        <span>Mục tiêu mentee</span>
        <p>${escapeHtml(request.goal)}</p>
      </div>
      ${renderProfileDetailsSections(request.menteeProfileSnapshot, {
        title: "Hồ sơ mentee",
        emptyText: "Mentee chưa bổ sung đủ hồ sơ học tập để mentor xem trước."
      })}
      ${proposedHtml}
      <div class="schedule-card-actions">
        <a href="booking-chat.html?id=${encodeURIComponent(request.id)}" class="mentor-secondary-btn">Mở chat</a>
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
        <p><strong>Dịch vụ:</strong> ${escapeHtml(request.serviceName || "Chưa cập nhật")}</p>
        <p><strong>Ngày gửi:</strong> ${formatDate(request.createdAt)}</p>
      </div>

      <div class="admin-request-body">
        <div class="admin-request-block">
          <span>Mục tiêu học</span>
          <p>${escapeHtml(request.goal || "Chưa cập nhật")}</p>
        </div>
        <div class="admin-request-block">
          <span>Thời lượng & chi phí</span>
          <p>${escapeHtml((request.serviceDurationMinutes ? formatDurationLabel(request.serviceDurationMinutes) : "Chưa cập nhật") + " | " + (request.servicePriceText || "Chưa cập nhật"))}</p>
        </div>
      </div>

      <div class="admin-request-body">
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
        <p><strong>Dịch vụ:</strong> ${escapeHtml(request.serviceName || "Chưa cập nhật")}</p>
        <p><strong>Mục tiêu:</strong> ${escapeHtml(request.goal)}</p>
      </div>
      <div class="schedule-card-note">
        <span>Ghi chú của mentee</span>
        <p>${escapeHtml(request.note || "Không có ghi chú thêm.")}</p>
      </div>
      ${renderProfileDetailsSections(request.menteeProfileSnapshot, {
        title: "Hồ sơ mentee",
        emptyText: "Mentee chưa bổ sung hồ sơ mở rộng."
      })}
      <div class="schedule-card-actions">
        <a href="booking-chat.html?id=${encodeURIComponent(request.id)}" class="mentor-secondary-btn">Chat với mentee</a>
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
        <p><strong>Dịch vụ:</strong> ${escapeHtml(request.serviceName || "Chưa cập nhật")}</p>
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
        <h3>Chưa có lịch học nào</h3>
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
}

async function initializeMenteeSchedulePage() {
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

  if (!isDemoAccount(currentUser) && isSupabaseReady()) {
    try {
      await fetchBookingRequestsForCurrentMentee();
    } catch (error) {
      scheduleList.innerHTML = `
        <div class="admin-empty-state">
          <h3>Không tải được lịch học</h3>
          <p>${escapeHtml(error.message || "Hãy thử tải lại trang.")}</p>
        </div>
      `;
      return;
    }
  }

  const requests = getRequestsForCurrentMentee(currentUser);
  renderMenteeScheduleSummary(summary, requests);

  if (!requests.length) {
    scheduleList.innerHTML = `
      <div class="admin-empty-state">
        <h3>Bạn chưa có lịch học nào</h3>
        <p>Hãy đặt lịch với mentor để các buổi học và trạng thái xử lý xuất hiện tại đây.</p>
      </div>
    `;
    renderCalendarGrid(
      calendarGrid,
      monthLabel,
      [],
      function () {
        return "search.html";
      },
      "Khi mentor nhận yêu cầu của bạn, buổi học sẽ xuất hiện ở đây dưới dạng calendar.",
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
    emptyMessage: "Khi mentor nhận yêu cầu của bạn, buổi học sẽ xuất hiện ở đây dưới dạng calendar."
  });

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

async function initializeMenteeCalendarPage() {
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

  if (!isDemoAccount(currentUser) && isSupabaseReady()) {
    try {
      await fetchBookingRequestsForCurrentMentee();
    } catch (error) {
      renderMenteeScheduleSummary(summary, []);
      renderCalendarGrid(calendarGrid, monthLabel, [], function () {
        return "search.html";
      }, error.message || "Không thể tải calendar booking.", new Date());
      return;
    }
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
    emptyMessage: "Khi mentor nhận yêu cầu của bạn, buổi học sẽ xuất hiện tại đây theo dạng calendar riêng."
  });
}

async function initializeMentorRequestsPage() {
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

  const mentorContext = getMentorContextForUser(currentUser);
  if (!isDemoAccount(currentUser) && isSupabaseReady() && mentorContext.mentorId) {
    try {
      await fetchBookingRequestsForCurrentMentor(mentorContext.mentorId);
    } catch (error) {
      listElement.innerHTML = `
        <div class="admin-empty-state">
          <h3>Không tải được yêu cầu đăng ký</h3>
          <p>${escapeHtml(error.message || "Hãy thử tải lại trang.")}</p>
        </div>
      `;
      return;
    }
  }

  let currentScopedRequests = [];

  function render() {
    currentScopedRequests = filterRequestsForCurrentMentor(getBookingRequests(), currentUser);
    const pendingRequests = currentScopedRequests.filter(function (request) {
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
        <strong>${currentScopedRequests.filter(function (request) { return request.status === "accepted"; }).length}</strong>
      </article>
      <article class="schedule-summary-card">
        <span>Đã từ chối</span>
        <strong>${currentScopedRequests.filter(function (request) { return request.status === "rejected"; }).length}</strong>
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

  listElement.addEventListener("click", async function (event) {
    const button = event.target.closest("[data-booking-action]");
    if (!button) return;

    const bookingId = button.getAttribute("data-booking-id");
    const action = button.getAttribute("data-booking-action");
    const updates = {
      status: action === "accept" ? "accepted" : "rejected"
    };

    if (action === "accept") {
      const select = listElement.querySelector("[data-booking-proposed-time=\"" + bookingId + "\"]");
      const currentRequest = currentScopedRequests.find(function (request) {
        return request.id === bookingId;
      });
      const selectedValue = select ? select.value : "";
      const chosenOption = currentRequest && Array.isArray(currentRequest.proposedOptions)
        ? currentRequest.proposedOptions.find(function (item) {
            return item.startSlotId === selectedValue;
          }) || currentRequest.proposedOptions[0]
        : null;

      if (chosenOption) {
        updates.slotId = chosenOption.startSlotId;
        updates.slotIds = chosenOption.slotIds || [];
        updates.preferredTime = chosenOption.label;
      }
    }

    try {
      if (isDemoAccount(currentUser) || !isSupabaseReady()) {
        updateBookingRequest(bookingId, updates);
      } else {
        await updateMentorBookingRequest(bookingId, updates);
      }
      render();
    } catch (error) {
      showMessage("mentorDashboardMessage", "error", error.message);
    }
  });

  render();
}

async function initializeMentorMenteesPage() {
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
  if (!isDemoAccount(currentUser) && isSupabaseReady() && mentorContext.mentorId) {
    try {
      await fetchBookingRequestsForCurrentMentor(mentorContext.mentorId);
    } catch (error) {
      summary.innerHTML = "";
      note.textContent = error.message || "Không thể tải dữ liệu mentee.";
      return;
    }
  }
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

async function initializeMentorAcceptedPage() {
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
  if (!isDemoAccount(currentUser) && isSupabaseReady() && mentorContext.mentorId) {
    try {
      await fetchBookingRequestsForCurrentMentor(mentorContext.mentorId);
    } catch (error) {
      listElement.innerHTML = `
        <div class="admin-empty-state">
          <h3>Không tải được mentee đã nhận</h3>
          <p>${escapeHtml(error.message || "Hãy thử tải lại trang.")}</p>
        </div>
      `;
      return;
    }
  }
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

async function initializeMentorTeachingCalendarPage() {
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
  if (!isDemoAccount(currentUser) && isSupabaseReady() && mentorContext.mentorId) {
    try {
      await fetchBookingRequestsForCurrentMentor(mentorContext.mentorId);
    } catch (error) {
      note.textContent = error.message || "Không thể tải lịch dạy.";
      return;
    }
  }
  const acceptedRequests = getAcceptedRequestsForCurrentMentor(currentUser);

  note.textContent = mentorContext.mentorId
    ? "Calendar đang hiển thị lịch dạy của mentor: " + mentorContext.mentorName + "."
    : "Calendar đang hiển thị toàn bộ các lịch dạy đã được nhận trong hệ thống.";

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
    renderCalendarGrid(
      calendarGrid,
      monthLabel,
      [],
      function () {
        return "mentor-booking-detail.html";
      },
      "Khi mentor nhận mentee, buổi học sẽ xuất hiện ở đây dưới dạng calendar.",
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
    emptyMessage: "Khi mentor nhận mentee, buổi học sẽ xuất hiện ở đây dưới dạng calendar."
  });
}

async function initializeMentorBookingDetailPage() {
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

  const mentorContext = getMentorContextForUser(currentUser);
  if (!isDemoAccount(currentUser) && isSupabaseReady() && mentorContext.mentorId) {
    try {
      await fetchBookingRequestsForCurrentMentor(mentorContext.mentorId);
    } catch (error) {
      content.innerHTML = `
        <div class="admin-empty-state">
          <h3>Không tải được chi tiết buổi dạy</h3>
          <p>${escapeHtml(error.message || "Hãy thử tải lại trang.")}</p>
        </div>
      `;
      return;
    }
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
        <p><strong>Dịch vụ:</strong> ${escapeHtml(request.serviceName || "Chưa cập nhật")}</p>
        <p><strong>Chi phí:</strong> ${escapeHtml(request.servicePriceText || "Chưa cập nhật")}</p>
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
      ${renderProfileDetailsSections(request.menteeProfileSnapshot, {
        title: "Hồ sơ cá nhân mentee",
        emptyText: "Mentee chưa bổ sung đủ hồ sơ mở rộng."
      })}
      <div class="schedule-card-actions">
        <a href="booking-chat.html?id=${encodeURIComponent(request.id)}" class="mentor-primary-btn">Mở chat với mentee</a>
      </div>
    </article>
    <article class="mentor-booking-detail-card">
      <span class="schedule-card-label">Mentor phụ trách</span>
      <h2>${escapeHtml(request.mentorName)}</h2>
      <div class="schedule-card-grid">
        <p><strong>Nơi làm việc/ học tập:</strong> ${escapeHtml((mentor && mentor.workplace) || "Đang cập nhật")}</p>
        <p><strong>Lĩnh vực:</strong> ${escapeHtml((mentor && mentor.focus) || request.mentorFocus || "Đang cập nhật")}</p>
        <p><strong>Đánh giá:</strong> ${escapeHtml(mentor ? Number(mentor.rating || 0).toFixed(1) + "/ 5 sao" : "Đang cập nhật")}</p>
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

async function fetchBookingChat(bookingId) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error("Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.");
  }

  const response = await fetch("/api/booking-requests/" + encodeURIComponent(bookingId) + "/chat", {
    headers: {
      Authorization: "Bearer " + accessToken
    }
  });
  const data = await response.json().catch(function () {
    return {};
  });

  if (!response.ok) {
    throw new Error(data.message || "Không thể tải đoạn chat.");
  }

  const request = data.request || null;
  if (request) {
    bookingRequestsCache = getBookingRequests()
      .filter(function (item) {
        return item.id !== request.id;
      })
      .concat([request]);
  }

  return data;
}

async function sendBookingChatMessage(bookingId, content) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error("Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.");
  }

  const response = await fetch("/api/booking-requests/" + encodeURIComponent(bookingId) + "/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + accessToken
    },
    body: JSON.stringify({
      content: content
    })
  });
  const data = await response.json().catch(function () {
    return {};
  });

  if (!response.ok) {
    throw new Error(data.message || "Không thể gửi tin nhắn.");
  }

  const request = data.request || null;
  if (request) {
    bookingRequestsCache = getBookingRequests()
      .filter(function (item) {
        return item.id !== request.id;
      })
      .concat([request]);
  }

  return data;
}

async function initializeBookingChatPage() {
  const container = document.getElementById("bookingChatPage");
  if (!container) return;

  const currentUser = getCurrentUser();
  if (!currentUser) {
    window.location.href = "login.html?redirect=booking-chat.html";
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const bookingId = params.get("id");
  const heroNote = document.getElementById("bookingChatScopeNote");
  const content = document.getElementById("bookingChatMessages");
  const form = document.getElementById("bookingChatForm");
  const input = document.getElementById("bookingChatInput");

  if (!bookingId || !content || !form || !input) {
    return;
  }

  async function renderChat() {
    const payload = await fetchBookingChat(bookingId);
    const request = payload.request || null;
    const messages = Array.isArray(payload.messages) ? payload.messages : [];

    if (!request) {
      throw new Error("Không tìm thấy booking để chat.");
    }

    if (heroNote) {
      heroNote.textContent = "Chat giữa " + request.mentorName + " và " + request.menteeName + " cho booking " + (request.serviceName || "đã chọn") + ".";
    }

    content.innerHTML = `
      <article class="mentor-booking-detail-card">
        <span class="schedule-card-label">Thông tin nhanh</span>
        <h2>${escapeHtml(request.serviceName || "Trao đổi booking")}</h2>
        <div class="schedule-card-grid">
          <p><strong>Mentor:</strong> ${escapeHtml(request.mentorName)}</p>
          <p><strong>Mentee:</strong> ${escapeHtml(request.menteeName)}</p>
          <p><strong>Khung giờ:</strong> ${escapeHtml(request.preferredTime || "Chưa cập nhật")}</p>
          <p><strong>Trạng thái:</strong> ${escapeHtml(buildBookingStatusLabel(request.status))}</p>
        </div>
      </article>
      <article class="mentor-booking-detail-card booking-chat-card">
        <span class="schedule-card-label">Đoạn chat</span>
        <div class="booking-chat-thread">
          ${messages.length
            ? messages.map(function (message) {
                const isMine = String(message.senderUserId || "") === String(currentUser.id || "");
                return `
                  <div class="booking-chat-bubble ${isMine ? "is-mine" : ""}">
                    <strong>${escapeHtml(message.senderName || "Mentor Me")}</strong>
                    <p>${escapeHtml(message.content || "")}</p>
                    <span>${escapeHtml(formatDate(message.createdAt || new Date().toISOString()))}</span>
                  </div>
                `;
              }).join("")
            : '<div class="admin-empty-state"><p>Chưa có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện.</p></div>'}
        </div>
      </article>
    `;
  }

  try {
    await renderChat();
  } catch (error) {
    content.innerHTML = `
      <div class="admin-empty-state">
        <h3>Không tải được đoạn chat</h3>
        <p>${escapeHtml(error.message || "Hãy thử tải lại trang.")}</p>
      </div>
    `;
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    const message = normalizeWhitespace(input.value);
    if (!message) {
      return;
    }

    try {
      await sendBookingChatMessage(bookingId, message);
      input.value = "";
      await renderChat();
    } catch (error) {
      alert(error.message || "Không thể gửi tin nhắn.");
    }
  });
}

async function initializeNotificationsPage() {
  const list = document.getElementById("notificationsList");
  if (!list) return;

  const currentUser = getCurrentUser();
  if (!currentUser) {
    window.location.href = "login.html?redirect=notifications.html";
    return;
  }

  try {
    const notifications = await fetchNotifications();
    if (!notifications.length) {
      list.innerHTML = `
        <div class="admin-empty-state">
          <h3>Chưa có thông báo</h3>
          <p>Khi có booking mới, tin nhắn mới hoặc cập nhật trạng thái, thông báo sẽ xuất hiện ở đây.</p>
        </div>
      `;
      return;
    }

    list.innerHTML = notifications.map(function (notification) {
      return `
        <article class="admin-request-card notification-card ${notification.isRead ? "is-read" : "is-unread"}" data-notification-id="${escapeHtml(notification.id)}">
          <div class="admin-request-head">
            <div>
              <span class="admin-request-label">${escapeHtml(notification.type || "general")}</span>
              <h3>${escapeHtml(notification.title)}</h3>
            </div>
            <span class="admin-request-status ${notification.isRead ? "status-completed" : "status-pending"}">${notification.isRead ? "Đã đọc" : "Mới"}</span>
          </div>
          <div class="schedule-card-note">
            <span>Nội dung</span>
            <p>${escapeHtml(notification.body || "")}</p>
          </div>
          <div class="schedule-card-actions">
            ${notification.link ? `<a href="${escapeHtml(notification.link)}" class="mentor-primary-btn">Mở</a>` : ""}
            ${notification.isRead ? "" : '<button type="button" class="mentor-secondary-btn" data-notification-read="true">Đánh dấu đã đọc</button>'}
          </div>
        </article>
      `;
    }).join("");
  } catch (error) {
    list.innerHTML = `
      <div class="admin-empty-state">
        <h3>Không tải được thông báo</h3>
        <p>${escapeHtml(error.message || "Hãy thử tải lại trang.")}</p>
      </div>
    `;
  }

  if (!list.dataset.boundNotifications) {
    list.addEventListener("click", async function (event) {
      const button = event.target.closest("[data-notification-read]");
      if (!button) return;

      const card = event.target.closest("[data-notification-id]");
      if (!card) return;

      try {
        await markNotificationAsRead(card.getAttribute("data-notification-id"));
        await initializeNotificationsPage();
      } catch (error) {
        alert(error.message || "Không thể cập nhật thông báo.");
      }
    });
    list.dataset.boundNotifications = "true";
  }
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
  syncSubmittedReviewsWithCurrentData();
  ensureDemoBookingRequests();
  if (isSupabaseReady()) {
    try {
      await fetchPublicMentorProfiles();
    } catch (error) {
      mentorProfilesCache = {};
    }
  }
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
  initializeMenteeCalendarPage();
  initializeMentorRequestsPage();
  initializeMentorMenteesPage();
  initializeMentorAcceptedPage();
  initializeMentorTeachingCalendarPage();
  initializeMentorBookingDetailPage();
  initializeBookingChatPage();
  initializeNotificationsPage();
  initializeProfilePage();
}

bootstrapApp();
