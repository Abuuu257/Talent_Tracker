import {
    auth,
    loginUser,
    logoutUser,
    onAuthChange,
    getUserByUsername
} from "./register.js";
import { showLoading, hideLoading, updateNavbar } from "./ui-utils.js";

// DOM Elements
const loginModal = document.getElementById("loginModal");
const loginTitle = document.getElementById("loginTitle");
const loginBtn = document.getElementById("loginBtn");
const loginErr = document.getElementById("loginError");
const identifierInput = document.getElementById("login-identifier");
const passwordInput = document.getElementById("login-password");
const roleBtns = document.querySelectorAll('.role-btn');

let currentRole = "athlete";

// Role Switcher
window.switchRole = (role) => {
    currentRole = role;
    let title = role.charAt(0).toUpperCase() + role.slice(1) + " Login";
    if (role === 'federation') title = "Federation Admin Login";

    if (loginTitle) loginTitle.innerText = title;

    roleBtns.forEach(btn => {
        btn.classList.remove('bg-white', 'text-[#2E5F9E]');
        btn.classList.add('bg-white/10', 'text-white');
    });
    const activeBtn = document.getElementById(`role-${role}`);
    if (activeBtn) {
        activeBtn.classList.remove('bg-white/10', 'text-white');
        activeBtn.classList.add('bg-white', 'text-[#2E5F9E]');
    }

    if (identifierInput) identifierInput.value = "";
    if (passwordInput) passwordInput.value = "";
    clearErr();
};

document.addEventListener('DOMContentLoaded', () => {
    if (window.switchRole) window.switchRole('athlete');
});

// Modal Logic
window.openLogin = () => {
    if (loginModal) loginModal.classList.remove("hidden");
};

window.closeLogin = () => {
    if (loginModal) loginModal.classList.add("hidden");
};

function showErr(msg) {
    if (loginErr) {
        loginErr.querySelector('span').textContent = msg;
        loginErr.classList.remove("hidden");
    }
}

function clearErr() {
    if (loginErr) loginErr.classList.add("hidden");
}

// Navbar User Display
// Navbar User Display - Refactored to use updateNavbar from ui-utils.js
// function setNavbarUser removed in favor of updateNavbar

// Auth Observer
onAuthChange(async (user) => {
    const mobileDashLink = document.getElementById("mobileDashLink");
    const mobileLogoutBtn = document.getElementById("mobileLogoutBtn");

    if (user) {
        // Use unified updateNavbar
        // Pass basic user object, and let updateNavbar handle default/fallback
        // Note: updateNavbar expects (user, profileData)
        // Here we might not have profileData, so pass minimal
        const username = user.displayName || user.username || localStorage.getItem("tt_username") || user.email.split("@")[0];
        updateNavbar(user, { username: username }); // Pass username in profileData-like structure to prioritize it

        if (mobileDashLink) mobileDashLink.classList.remove("hidden");
        if (mobileLogoutBtn) mobileLogoutBtn.classList.remove("hidden");

        const currentPath = window.location.pathname;
        if (currentPath.endsWith("index.html") || currentPath === "/" || currentPath.endsWith("/")) {
            const role = localStorage.getItem("tt_role") || "athlete";
            if (role !== "federation") window.location.href = role + "-home.html";
            else window.location.href = "federation-home.html";
        }
    } else {
        // updateNavbar(null) does nothing, maybe we need to be explicit for logout state?
        // updateNavbar checks `if (!user) return;`
        // So we manually reset login text here if needed, or rely on page reload.
        // Actually, let's just reset text manually as fallback
        const textIds = ["navLoginBtnText", "mobileLoginBtnText"];
        textIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = "Login";
        });

        if (mobileDashLink) mobileDashLink.classList.add("hidden");
        if (mobileLogoutBtn) mobileLogoutBtn.classList.add("hidden");
        localStorage.removeItem("tt_username");
        localStorage.removeItem("tt_role");
    }
});

// Login Action
if (loginBtn) {
    loginBtn.addEventListener("click", async () => {
        clearErr();
        const identifier = identifierInput.value.trim();
        const password = passwordInput.value;

        if (!identifier || !password) {
            showErr("Please enter your Phone, Email, or Username and password.");
            return;
        }

        loginBtn.disabled = true;
        loginBtn.textContent = "Logging in...";
        showLoading();

        try {
            // Direct login with backend supporting Email/Phone/Username
            const data = await loginUser(identifier, password, currentRole);

            // Save user data
            localStorage.setItem("tt_username", data.user.username);
            localStorage.setItem("tt_role", currentRole);

            if (currentRole === "athlete") {
                window.location.href = "athlete-home.html";
            } else if (currentRole === "coach") {
                window.location.href = "coach-home.html";
            } else if (currentRole === "federation") {
                window.location.href = "federation-home.html";
            }

        } catch (e) {
            console.error(e);
            showErr("Login failed: " + (e.message || "Invalid credentials"));
            hideLoading();
            loginBtn.disabled = false;
            loginBtn.textContent = "Login";
        }
    });
}

// Google Login Action
const googleLoginBtn = document.getElementById("googleLoginBtn");
if (googleLoginBtn) {
    googleLoginBtn.addEventListener("click", () => {
        // Placeholder for Google Sign In
        alert("Google Sign In integration requires additional backend configuration (Client ID/Secret). Please use Phone/Email/Username for this update.");
    });
}

// Mobile Menu Listeners
const mobileMenuBtn = document.getElementById("mobileMenuButton");
const mobileBackBtn = document.getElementById("mobileBackBtn");
const mobileBackdrop = document.getElementById("mobileMenuBackdrop");
const mobileMenu = document.getElementById("mobileMenu");

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

if (mobileMenuBtn) mobileMenuBtn.addEventListener("click", () => toggleMobileMenu(true));
if (mobileBackBtn) mobileBackBtn.addEventListener("click", () => toggleMobileMenu(false));
if (mobileBackdrop) mobileBackdrop.addEventListener("click", () => toggleMobileMenu(false));

const mobileLoginBtn = document.getElementById("mobileLoginBtn");
if (mobileLoginBtn) {
    mobileLoginBtn.addEventListener("click", (e) => {
        const loggedInUser = localStorage.getItem("tt_username");
        if (loggedInUser) {
            const role = localStorage.getItem("tt_role") || "athlete";
            window.location.href = role + "-home.html";
            return;
        }
        e.preventDefault();
        toggleMobileMenu(false);
        window.openLogin();
    });
}

const navLoginBtn = document.getElementById("navLoginBtn");
if (navLoginBtn) {
    navLoginBtn.addEventListener("click", (e) => {
        const loggedInUser = localStorage.getItem("tt_username");
        if (loggedInUser) {
            e.preventDefault();
            const dropdown = document.getElementById("logoutDropdown");
            dropdown.classList.toggle("hidden");
            return;
        }
        e.preventDefault();
        window.openLogin();
    });
}

const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
        await logoutUser();
        window.location.reload();
    });
}
const mobileLogoutBtn = document.getElementById("mobileLogoutBtn");
if (mobileLogoutBtn) {
    mobileLogoutBtn.addEventListener("click", async () => {
        await logoutUser();
        window.location.reload();
    });
}

// Password Toggle
const togglePassword = document.getElementById("togglePassword");
if (togglePassword && passwordInput) {
    togglePassword.addEventListener("click", () => {
        const type = passwordInput.getAttribute("type") === "password" ? "text" : "password";
        passwordInput.setAttribute("type", type);
        const openPaths = togglePassword.querySelectorAll(".eye-open");
        const closedPath = togglePassword.querySelector(".eye-closed");
        if (type === "text") {
            openPaths.forEach(p => p.classList.add("hidden"));
            closedPath.classList.remove("hidden");
        } else {
            openPaths.forEach(p => p.classList.remove("hidden"));
            closedPath.classList.add("hidden");
        }
    });
}
