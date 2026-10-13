const PAGE_SIZE = 50;

let usersData = [];
let filteredUsers = [];
let currentPage = 1;

const usersTableBody = document.querySelector("#usersTable tbody");
const userSearch = document.getElementById("userSearch");
const userTypeFilter = document.getElementById("userTypeFilter");

window.addEventListener("load", () => {
  restoreFilters();
  loadUsers();
});

async function loadUsers() {
  toggleLoader(true);
  try {
    const response = await adminRequest("get_users.php");
    usersData = response?.data || [];
    applyFilters(false);
  } catch (error) {
    showToast(error.message);
    renderEmptyRow("Unable to load users.");
  } finally {
    toggleLoader(false);
  }
}

function applyFilters(resetPage = true) {
  const term = userSearch.value.trim().toLowerCase();
  const type = userTypeFilter.value;

  filteredUsers = usersData.filter((user) => {
    if (type && String(user.userType) !== type) return false;
    if (!term) return true;
    return (
      String(user.id) === term ||
      (user.userName || "").toLowerCase().includes(term) ||
      (user.email || "").toLowerCase().includes(term)
    );
  });

  filteredUsers.sort((a, b) => Number(a.id) - Number(b.id));
  if (resetPage) currentPage = 1;
  saveFilters();
  renderUsers();
}

function renderUsers() {
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  currentPage = Math.min(currentPage, totalPages);

  const start = (currentPage - 1) * PAGE_SIZE;
  const pageUsers = filteredUsers.slice(start, start + PAGE_SIZE);

  if (pageUsers.length) {
    usersTableBody.innerHTML = pageUsers.map(createUserRow).join("");
  } else {
    renderEmptyRow(usersData.length ? "No users match your search." : "No users found.");
  }

  document.getElementById("userCount").textContent = `${filteredUsers.length} of ${usersData.length} users`;
  document.getElementById("pagerInfo").textContent = filteredUsers.length
    ? `Showing ${start + 1}-${start + pageUsers.length} of ${filteredUsers.length}`
    : "";
  document.getElementById("prevPage").disabled = currentPage === 1;
  document.getElementById("nextPage").disabled = currentPage === totalPages;
}

function createUserRow(user) {
  const name = user.userName?.trim() || "(no name)";
  const lastAccessed = user.lastAccessed
    ? `${formatDateTime(user.lastAccessed)}<span class="sub-text">${timeAgo(user.lastAccessed)}</span>`
    : `<span class="sub-text">No activity</span>`;

  return `
    <tr>
      <td class="col-id">${escapeHtml(user.id)}</td>
      <td>
        <a class="user-link" href="userInfo.html?id=${encodeURIComponent(user.id)}">${escapeHtml(name)}</a>
        ${getUserTypeBadge(user.userType)}
        <span class="sub-text">${escapeHtml(user.email)}</span>
      </td>
      <td>${lastAccessed}</td>
    </tr>`;
}

function renderEmptyRow(message) {
  usersTableBody.innerHTML = `<tr class="empty-row"><td colspan="3">${escapeHtml(message)}</td></tr>`;
}

function saveFilters() {
  sessionStorage.setItem(
    "admin-user-filters",
    JSON.stringify({ term: userSearch.value, type: userTypeFilter.value, page: currentPage })
  );
}

function restoreFilters() {
  const saved = JSON.parse(sessionStorage.getItem("admin-user-filters") || "null");
  if (!saved) return;

  userSearch.value = saved.term || "";
  userTypeFilter.value = saved.type || "";
  currentPage = saved.page || 1;
}

userSearch.addEventListener("input", () => applyFilters());
userTypeFilter.addEventListener("change", () => applyFilters());

document.getElementById("prevPage").addEventListener("click", () => {
  currentPage--;
  saveFilters();
  renderUsers();
  window.scrollTo(0, 0);
});

document.getElementById("nextPage").addEventListener("click", () => {
  currentPage++;
  saveFilters();
  renderUsers();
  window.scrollTo(0, 0);
});

document.getElementById("backButton").onclick = function () {
  window.location.href = "admin.html";
};
