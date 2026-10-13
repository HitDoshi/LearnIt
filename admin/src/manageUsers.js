const PAGE_SIZE = 50;

let usersData = [];
let filteredUsers = [];
let currentPage = 1;
let sortState = { key: "id", direction: "asc" };

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

  sortUsers();
  if (resetPage) currentPage = 1;
  saveFilters();
  renderUsers();
}

function sortUsers() {
  const { key, direction } = sortState;
  const modifier = direction === "asc" ? 1 : -1;

  filteredUsers.sort((a, b) => {
    if (key === "id") {
      return (Number(a.id) - Number(b.id)) * modifier;
    }
    if (key === "lastAccessed") {
      const first = parseServerDate(a.lastAccessed)?.getTime() || 0;
      const second = parseServerDate(b.lastAccessed)?.getTime() || 0;
      return (first - second) * modifier;
    }
    return String(a[key] || "").localeCompare(String(b[key] || ""), undefined, { sensitivity: "base" }) * modifier;
  });
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

  updateSortIcons();
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

function updateSortIcons() {
  document.querySelectorAll("#usersTable th.sortable").forEach((th) => {
    const icon = th.querySelector(".fa");
    const isSorted = th.dataset.sort === sortState.key;
    th.classList.toggle("sorted", isSorted);
    icon.className = isSorted ? `fa fa-sort-${sortState.direction}` : "fa fa-sort";
  });
}

function saveFilters() {
  sessionStorage.setItem(
    "admin-user-filters",
    JSON.stringify({ term: userSearch.value, type: userTypeFilter.value, sort: sortState, page: currentPage })
  );
}

function restoreFilters() {
  const saved = JSON.parse(sessionStorage.getItem("admin-user-filters") || "null");
  if (!saved) return;

  userSearch.value = saved.term || "";
  userTypeFilter.value = saved.type || "";
  sortState = saved.sort || sortState;
  currentPage = saved.page || 1;
}

document.querySelectorAll("#usersTable th.sortable").forEach((th) => {
  th.addEventListener("click", () => {
    const key = th.dataset.sort;
    let direction = key === "lastAccessed" ? "desc" : "asc";

    if (sortState.key === key) {
      direction = sortState.direction === "asc" ? "desc" : "asc";
    }

    sortState = { key, direction };
    sortUsers();
    saveFilters();
    renderUsers();
  });
});

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
