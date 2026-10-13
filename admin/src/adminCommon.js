const ADMIN_API_URL = `${API_URL}/api/admin`;

const USER_TYPES = {
  1: "Admin",
  2: "Premium",
  3: "Standard",
};

(function checkAdminAccess() {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  if (!token || String(user?.userType) !== "1") {
    window.location.replace("../quiz/main.html");
  }
})();

async function adminRequest(endpoint, body = null) {
  const token = localStorage.getItem("token") || "";
  const separator = endpoint.includes("?") ? "&" : "?";
  const options = { method: body ? "POST" : "GET" };

  if (body) {
    options.headers = { "Content-Type": "application/json" };
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${ADMIN_API_URL}/${endpoint}${separator}token=${token}`, options);

  let data;
  try {
    data = await response.json();
  } catch (error) {
    throw new Error("Unexpected response from server.");
  }

  if (data?.status === 401 || data?.status === 403) {
    setTimeout(() => window.location.replace("../quiz/main.html"), 1500);
  }

  if (!data?.success) {
    throw new Error(data?.message || "Something went wrong.");
  }

  return data;
}

function toggleLoader(show) {
  const loader = document.getElementById("adminLoader");
  if (loader) {
    loader.classList.toggle("d-none", !show);
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function parseServerDate(value) {
  if (!value || String(value).startsWith("0000")) return null;
  const date = new Date(String(value).replace(" ", "T"));
  return isNaN(date.getTime()) ? null : date;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatDateTime(value) {
  const date = parseServerDate(value);
  if (!date) return "-";

  const pad = (num) => String(num).padStart(2, "0");
  const formatted = `${pad(date.getDate())} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;

  if (String(value).length <= 10) return formatted;
  return `${formatted}, ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function timeAgo(value) {
  const date = parseServerDate(value);
  if (!date) return "";

  const days = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  if (days < 365) {
    const months = Math.floor(days / 30);
    return months === 1 ? "1 month ago" : `${months} months ago`;
  }
  const years = Math.floor(days / 365);
  return years === 1 ? "1 year ago" : `${years} years ago`;
}

function getUserTypeBadge(type) {
  const label = USER_TYPES[type] || (type ? `Type ${type}` : "-");
  return `<span class="type-badge type-${escapeHtml(type)}">${escapeHtml(label)}</span>`;
}
