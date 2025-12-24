
// 1. IMPORTS
// Importing necessary Firebase services from the CDN.
// =======================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// =======================================================
// 2. FIREBASE CONFIGURATION
// Specific keys to connect to the 'athletesystem' project.
// =======================================================
const firebaseConfig = {
    apiKey: "AIzaSyBtIlIV-FGmM2hZh0NcuK78N9EafqpcGTQ",
    authDomain: "athletesystem-61615.firebaseapp.com",
    projectId: "athletesystem-61615",
    storageBucket: "athletesystem-61615.appspot.com",
    messagingSenderId: "646599639422",
    appId: "1:646599639422:web:33f0f059a0e7112d9f332f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// =======================================================
// 3. DOM ELEMENT SELECTION
// Capturing HTML elements to manipulate them via JS.
// =======================================================

// Navbar Elements
const navUserBtn = document.getElementById("navUserBtn");          // Button displaying username
const navUserDropdown = document.getElementById("navUserDropdown"); // The hidden dropdown menu
const navUserEmail = document.getElementById("navUserEmail");      // Email display inside dropdown

// Mobile Elements
const mobileUserName = document.getElementById("mobileUserName");
const mobileMenuButton = document.getElementById("mobileMenuButton");
const mobileMenu = document.getElementById("mobileMenu");
const mobileBackdrop = document.getElementById("mobileMenuBackdrop");
const mobileBackBtn = document.getElementById("mobileBackBtn");
const mobileLogoutBtn = document.getElementById("mobileLogoutBtn");

// Hero Section & Actions
const heroUserDisplay = document.getElementById("heroUserDisplay"); // "Welcome [Name]!" text
const logoutBtn = document.getElementById("logoutBtn");
const createProfileBtn = document.getElementById("createProfileBtn");

// =======================================================
// 4. MOBILE MENU LOGIC
// Handles sliding the mobile menu in and out.
// =======================================================
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

if (mobileMenuButton) {
    mobileMenuButton.addEventListener('click', () => toggleMobileMenu(true));
}

if (mobileBackBtn) {
    mobileBackBtn.addEventListener('click', () => toggleMobileMenu(false));
}

if (mobileBackdrop) {
    mobileBackdrop.addEventListener('click', () => toggleMobileMenu(false));
}

// =======================================================
// 5. AUTHENTICATION STATE OBSERVER
// This runs automatically when the page loads to check
// if a user is logged in.
// =======================================================
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // --- USER IS LOGGED IN ---

        // Use real username (Firestore > DisplayName > LocalStorage > Email Prefix)
        let name = user.displayName || localStorage.getItem("tt_username");
        if (!name || name.includes("@")) {
            const fedData = (await getDoc(doc(db, "federations", user.uid))).data();
            if (fedData && fedData.username) {
                name = fedData.username;
                localStorage.setItem("tt_username", name);
            }
        }
        if (!name) name = user.email.split("@")[0];

        // Update Desktop Navbar
        const navBtnText = document.getElementById("navBtnText");
        if (navBtnText) navBtnText.textContent = name;
        if (navUserEmail) navUserEmail.textContent = user.email;

        // Update Mobile Menu
        if (mobileUserName) mobileUserName.textContent = name;

        // Update Hero Section Welcome Message
        if (heroUserDisplay) heroUserDisplay.textContent = name;

    } else {
        // --- USER IS NOT LOGGED IN ---
        // Security Check: If someone tries to visit this page directly
        // without logging in, redirect them back to the landing page.
        window.location.href = "index.html";
    }
});

// =======================================================
// 6. DROPDOWN TOGGLE LOGIC
// Handles showing/hiding the logout menu on Desktop.
// =======================================================
if (navUserBtn) {
    navUserBtn.addEventListener('click', (e) => {
        // Stop the click from bubbling up to the window (which would close it immediately)
        e.stopPropagation();
        // Toggle the 'hidden' class to show/hide
        navUserDropdown.classList.toggle('hidden');
    });
}

// Close dropdown if user clicks anywhere else on the screen
window.addEventListener('click', () => {
    if (navUserDropdown) navUserDropdown.classList.add('hidden');
});

// =======================================================
// 7. BUTTON ACTION HANDLERS
// =======================================================

// "Create Profile" Button
// Redirects user to the form page to fill in their details
if (createProfileBtn) {
    createProfileBtn.addEventListener("click", () => {
        alert("Federation Profile creation is coming soon!");
        // window.location.href = "create-federation-profile.html";
    });
}

// Logout Logic
// Signs the user out of Firebase and redirects to Home
const handleLogout = async () => {
    try {
        await signOut(auth);
        localStorage.removeItem("tt_username");
        localStorage.removeItem("tt_role");
        window.location.href = "index.html";
    } catch (error) {
        console.error("Logout Error", error);
    }
};

// Attach logout logic to both Desktop and Mobile buttons
if (logoutBtn) logoutBtn.addEventListener("click", handleLogout);
if (mobileLogoutBtn) mobileLogoutBtn.addEventListener("click", handleLogout);