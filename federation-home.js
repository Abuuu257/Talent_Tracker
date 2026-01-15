import {
    auth,
    onAuthChange,
    signOut,
    getAllAthletes,
    getAllCoaches,
    updateUserStatus,
    BACKEND_URL
} from "./register.js";
import { updateNavbar } from "./ui-utils.js";

// DOM Elements
const userTableBody = document.getElementById("userTableBody");
const colSpecific1 = document.getElementById("colSpecific1");
const userSearch = document.getElementById("userSearch");
const statusFilter = document.getElementById("statusFilter");
const heroUserDisplay = document.getElementById("heroUserDisplay");

const mobileMenuButton = document.getElementById("mobileMenuButton");
const mobileMenu = document.getElementById("mobileMenu");
const mobileBackdrop = document.getElementById("mobileMenuBackdrop");
const mobileBackBtn = document.getElementById("mobileBackBtn");
const logoutBtn = document.getElementById("logoutBtn");
const mobileLogoutBtn = document.getElementById("mobileLogoutBtn");

// State
let currentTab = 'coaches';
let allUsers = [];
let filteredUsers = [];

// Auth
onAuthChange(async (user) => {
    const role = localStorage.getItem("tt_role");

    // Strict Check
    if (role !== "federation") {
        window.location.href = "index.html";
        return;
    }

    let name = "Admin";
    if (heroUserDisplay) heroUserDisplay.textContent = name;

    // Update Navbar UI
    updateNavbar({ ...user, username: "Admin", role: "admin" }, { username: "Admin" });

    fetchUsers();
    // initWhatsAppSupport removed
});

// Management Logic
window.switchManagementTab = (tab) => {
    currentTab = tab;

    const btnCoaches = document.getElementById("tabCoaches");
    const btnAthletes = document.getElementById("tabAthletes");

    if (tab === 'coaches') {
        btnCoaches.classList.add("bg-[var(--primary)]", "text-white", "shadow-lg");
        btnCoaches.classList.remove("text-slate-500");
        btnAthletes.classList.remove("bg-[var(--primary)]", "text-white", "shadow-lg");
        btnAthletes.classList.add("text-slate-500");
        if (colSpecific1) colSpecific1.textContent = "Specialization";
    } else {
        btnAthletes.classList.add("bg-[var(--primary)]", "text-white", "shadow-lg");
        btnAthletes.classList.remove("text-slate-500");
        btnCoaches.classList.remove("bg-[var(--primary)]", "text-white", "shadow-lg");
        btnCoaches.classList.add("text-slate-500");
        if (colSpecific1) colSpecific1.textContent = "Location";
    }
    fetchUsers();
};

async function fetchUsers() {
    if (!userTableBody) return;

    userTableBody.innerHTML = `
        <tr>
            <td colspan="4" class="px-8 py-20 text-center">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)] mx-auto mb-4"></div>
                <p class="text-sm font-bold text-slate-400">Fetching ${currentTab}...</p>
            </td>
        </tr>
    `;

    try {
        let users = [];
        if (currentTab === 'coaches') {
            users = await getAllCoaches();
        } else {
            users = await getAllAthletes();
        }
        allUsers = users; // Results are already formatted by backend route
        applyFilters();
    } catch (err) {
        console.error("Error fetching users:", err);
        userTableBody.innerHTML = `<tr><td colspan="4" class="px-8 py-10 text-center text-red-500 font-bold">Failed to load directory.</td></tr>`;
    }
}

function applyFilters() {
    const searchTerm = userSearch.value.toLowerCase();
    const statusVal = statusFilter.value;

    filteredUsers = allUsers.filter(u => {
        const p = u.personal || u.personalInfo || {};
        const name = (u.fullName || p.fullName || u.username || "").toLowerCase();
        const email = (u.email || "").toLowerCase();
        const matchesSearch = name.includes(searchTerm) || email.includes(searchTerm);

        const isProfileComplete = !!(u.fullName || p.fullName);
        if (!isProfileComplete) return false;

        const isApproved = u.federationApproval?.status === "approved" || u.status?.toLowerCase() === "approved";

        if (statusVal === 'pending') return matchesSearch && !isApproved;
        if (statusVal === 'approved') return matchesSearch && isApproved;
        return matchesSearch;
    });

    renderTable();
}

function renderTable() {
    if (filteredUsers.length === 0) {
        userTableBody.innerHTML = `<tr><td colspan="4" class="px-8 py-20 text-center text-slate-400 font-medium">No results found matching your criteria.</td></tr>`;
        return;
    }

    userTableBody.innerHTML = filteredUsers.map(user => {
        const p = user.personal || user.personalInfo || {};
        const name = user.fullName || p.fullName || user.username || "Unknown User";
        const email = user.email || "No Email";
        const docs = user.documents || {};
        let pic = user.profilePic || docs.profilePic || "https://ui-avatars.com/api/?name=" + encodeURIComponent(name);
        if (pic && pic.startsWith('/')) {
            pic = BACKEND_URL + pic;
        }

        const isApproved = user.federationApproval?.status === "approved" || user.status?.toLowerCase() === "approved";

        let spec = "";
        if (currentTab === 'coaches') {
            spec = user.coachingBio?.specialization || p.specialization || "Generalist";
        } else {
            spec = p.city || p.district || "Unknown";
        }

        return `
            <tr class="hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0">
                <td class="px-8 py-4">
                    <div class="flex items-center gap-4">
                        <img src="${pic}" class="w-10 h-10 rounded-xl object-cover shrink-0 border border-slate-100">
                        <div class="min-w-0">
                            <p class="font-bold text-[var(--primary)] truncate">${name}</p>
                            <p class="text-[10px] font-medium text-slate-400 truncate">${email}</p>
                        </div>
                    </div>
                </td>
                <td class="px-8 py-4">
                    <span class="text-xs font-bold text-slate-600">${spec}</span>
                </td>
                <td class="px-8 py-4 text-center">
                    <span class="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${isApproved ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}">
                        ${isApproved ? 'Approved' : 'Pending'}
                    </span>
                </td>
                <td class="px-8 py-4 text-right flex items-center justify-end gap-2">
                    <button onclick="viewUserDashboard('${user.id}', '${currentTab === 'coaches' ? 'coach' : 'athlete'}')" 
                        class="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all">
                        View
                    </button>
                    <button onclick="toggleApproval('${user.id}', ${isApproved})" 
                        class="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isApproved ? 'text-red-500 hover:bg-red-50' : 'text-blue-500 hover:bg-blue-50'}">
                        ${isApproved ? 'Revoke' : 'Approve'}
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

window.viewUserDashboard = (uid, role) => {
    // Redirect to the distinct simplified Admin "Identity Verification" Dashboards
    // instead of the user-facing dashboards.

    if (role === 'athlete') {
        window.location.href = `admin-view-athlete.html?id=${uid}&role=athlete`;
    } else {
        window.location.href = `admin-view-coach.html?id=${uid}&role=coach`;
    }
};

window.toggleApproval = async (uid, currentStatus) => {
    try {
        const newStatus = currentStatus ? "pending" : "approved";

        // Use generic role helper
        const role = currentTab === 'coaches' ? 'coach' : 'athlete';

        await updateUserStatus(uid, newStatus, role);

        // Optimistic Update
        // Ensure type handling for IDs (string vs int from API)
        const userIdx = allUsers.findIndex(u => String(u.id) === String(uid) || String(u.user_id) === String(uid));

        if (userIdx > -1) {
            // Update local state directly
            allUsers[userIdx].status = newStatus;

            // Handle varying structure of backend response if it exists
            if (!allUsers[userIdx].federationApproval) allUsers[userIdx].federationApproval = {};
            allUsers[userIdx].federationApproval.status = newStatus;

            // Re-run filter logic to update the `filteredUsers` array
            applyFilters();
            // Force re-render of the table UI
            renderTable();

            if (newStatus === "approved") {
                // Optional: simpler notification than alert
                console.log("Access Approved!");
            }
        } else {
            // If not found in local array, force fetch
            fetchUsers();
        }
    } catch (err) {
        console.error("Approval Error:", err);
        alert("Action failed: " + err.message);
    }
};

// Events
if (userSearch) userSearch.addEventListener("input", applyFilters);
if (statusFilter) statusFilter.addEventListener("change", applyFilters);

const navUserBtn = document.getElementById("navUserBtn");
const navUserDropdown = document.getElementById("navUserDropdown");

if (navUserBtn) {
    navUserBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        navUserDropdown.classList.toggle('hidden');
    });
}
window.addEventListener('click', () => { if (navUserDropdown) navUserDropdown.classList.add('hidden'); });

const toggleMobileMenu = (show) => {
    if (show) {
        mobileBackdrop.classList.remove("hidden");
        setTimeout(() => {
            mobileBackdrop.classList.replace("opacity-0", "opacity-100");
            mobileMenu.classList.remove("translate-x-full");
        }, 10);
    } else {
        mobileBackdrop.classList.replace("opacity-100", "opacity-0");
        mobileMenu.classList.add("translate-x-full");
        setTimeout(() => mobileBackdrop.classList.add("hidden"), 300);
    }
};
if (mobileMenuButton) mobileMenuButton.addEventListener('click', () => toggleMobileMenu(true));
if (mobileBackBtn) mobileBackBtn.addEventListener('click', () => toggleMobileMenu(false));
if (mobileBackdrop) mobileBackdrop.addEventListener('click', () => toggleMobileMenu(false));

const handleLogout = async () => {
    try {
        await signOut();
        localStorage.removeItem("tt_username");
        localStorage.removeItem("tt_role");
        window.location.href = "index.html";
    } catch (error) { }
};
if (logoutBtn) logoutBtn.addEventListener("click", handleLogout);
if (mobileLogoutBtn) mobileLogoutBtn.addEventListener("click", handleLogout);
