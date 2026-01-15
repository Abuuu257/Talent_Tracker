import {
    auth,
    onAuthChange,
    signOut,
    getAthleteProfile
} from "./register.js";
import { updateNavbar } from "./ui-utils.js";

// DOM Elements
const navUserBtn = document.getElementById("navUserBtn");
const navUserDropdown = document.getElementById("navUserDropdown");
const navUserEmail = document.getElementById("navUserEmail");

const mobileUserName = document.getElementById("mobileUserName");
const mobileMenuButton = document.getElementById("mobileMenuButton");
const mobileMenu = document.getElementById("mobileMenu");
const mobileBackdrop = document.getElementById("mobileMenuBackdrop");
const mobileBackBtn = document.getElementById("mobileBackBtn");
const mobileLogoutBtn = document.getElementById("mobileLogoutBtn");

const heroUserDisplay = document.getElementById("heroUserDisplay");
const logoutBtn = document.getElementById("logoutBtn");
const createProfileBtn = document.getElementById("createProfileBtn");

// Mobile Menu
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

// Auth Logic
onAuthChange(async (user) => {
    if (user) {
        let name = user.displayName || localStorage.getItem("tt_username");
        let athleteData = null;

        const navDashboardLink = document.getElementById("navDashboardLink");
        const mobileDashboardLink = document.getElementById("mobileDashboardLink");

        // Immediate Navbar Update (to clear "Loading...")
        updateNavbar(user, null);

        try {
            const data = await getAthleteProfile(user.uid);
            athleteData = data; // alias for existing logic
            if (data && data.exists) {
                if (navDashboardLink) navDashboardLink.classList.remove("hidden");
                if (mobileDashboardLink) mobileDashboardLink.classList.remove("hidden");

                name = data.username || data.personal?.fullName?.split(" ")[0] || name;
                // profilePic extract removed, handled by updateNavbar
                if (name) localStorage.setItem("tt_username", name);
            }
        } catch (err) {
            console.error(err);
        }

        if (!name) name = user.email.split("@")[0];

        updateNavbar(user, athleteData);
        if (heroUserDisplay) heroUserDisplay.textContent = name;

    } else {
        window.location.href = "index.html";
    }
});

if (navUserBtn) {
    navUserBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        navUserDropdown.classList.toggle('hidden');
    });
}
window.addEventListener('click', () => { if (navUserDropdown) navUserDropdown.classList.add('hidden'); });

createProfileBtn?.addEventListener("click", () => {
    window.location.href = "createprofile.html";
});

const handleLogout = async () => {
    try {
        await signOut();
        localStorage.removeItem("tt_username");
        localStorage.removeItem("tt_role");
        window.location.href = "index.html";
    } catch (error) { console.error("Logout Error", error); }
};
if (logoutBtn) logoutBtn.addEventListener("click", handleLogout);
if (mobileLogoutBtn) mobileLogoutBtn.addEventListener("click", handleLogout);