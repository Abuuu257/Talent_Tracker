
// 1. IMPORTS
// Importing necessary Firebase services from the CDN.
// =======================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

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
const mobileMenuBackBtn = document.getElementById("mobileMenuBackBtn");
const mobileLogoutBtn = document.getElementById("mobileLogoutBtn");

// Hero Section & Actions
const heroUserDisplay = document.getElementById("heroUserDisplay"); // "Welcome [Name]!" text
const logoutBtn = document.getElementById("logoutBtn");
const createProfileBtn = document.getElementById("createProfileBtn");

// =======================================================
// 4. MOBILE MENU LOGIC
// Handles sliding the mobile menu in and out.
// =======================================================
if (mobileMenuButton) {
    mobileMenuButton.addEventListener('click', () => {
        // Remove 'translate-x-full' to slide menu INTO view
        mobileMenu.classList.remove('translate-x-full');
    });
}

if (mobileMenuBackBtn) {
    mobileMenuBackBtn.addEventListener('click', () => {
        // Add 'translate-x-full' to slide menu OUT of view
        mobileMenu.classList.add('translate-x-full');
    });
}

// =======================================================
// 5. AUTHENTICATION STATE OBSERVER
// This runs automatically when the page loads to check
// if a user is logged in.
// =======================================================
onAuthStateChanged(auth, (user) => {
    if (user) {
        // --- USER IS LOGGED IN ---
        
        // Extract Name from Email (e.g., "john@gmail.com" -> "john")
        const name = user.email.substring(0, user.email.indexOf("@"));
        
        // Update Desktop Navbar
        if(navUserBtn) navUserBtn.textContent = name;
        if(navUserEmail) navUserEmail.textContent = user.email;
        
        // Update Mobile Menu
        if(mobileUserName) mobileUserName.textContent = name;

        // Update Hero Section Welcome Message
        if(heroUserDisplay) heroUserDisplay.textContent = name;

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
if(createProfileBtn) {
    createProfileBtn.addEventListener("click", () => {
        window.location.href = "createprofile.html";
    });
}

// Logout Logic
// Signs the user out of Firebase and redirects to Home
const handleLogout = async () => {
    try {
        await signOut(auth);
        window.location.href = "index.html";
    } catch (error) {
        console.error("Logout Error", error);
    }
};

// Attach logout logic to both Desktop and Mobile buttons
if(logoutBtn) logoutBtn.addEventListener("click", handleLogout);
if(mobileLogoutBtn) mobileLogoutBtn.addEventListener("click", handleLogout);