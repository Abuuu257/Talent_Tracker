
// FIREBASE link

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { 
    getAuth, 
    signInWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    getDoc 
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBtIlIV-FGmM2hZh0NcuK78N9EafqpcGTQ",
    authDomain: "athletesystem-61615.firebaseapp.com",
    projectId: "athletesystem-61615",
    storageBucket: "athletesystem-61615.firebasestorage.app",
    messagingSenderId: "646599639422",
    appId: "1:646599639422:web:33f0f059a0e7112d9f332f"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --------------------------------------------------
// ON PAGE LOAD
// --------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {

    // -------------------------------
    // ELEMENTS
    // -------------------------------
    const navLoginBtn = document.getElementById("navLoginBtn");
    const mobileLoginBtn = document.getElementById("mobileLoginBtn");
    const getStartBtn = document.getElementById("getStartBtn");
    const loginSubmitBtn = document.getElementById("loginSubmitBtn");
    const loginCloseBtn = document.getElementById("loginCloseBtn");
    const loginSignupBtn = document.getElementById("loginSignupBtn");
    const signupCloseBtn = document.getElementById("signupCloseBtn");
    
    // Signup Role Buttons
    const signupAthleteBtn = document.getElementById("signupAthleteBtn");
    const signupCoachBtn = document.getElementById("signupCoachBtn");
    const signupFedBtn = document.getElementById("signupFedBtn");
    
    // Modals
    const loginModal = document.getElementById("loginModal");
    const signupModal = document.getElementById("signupModal");
    const signupBox = document.getElementById("signupBox");
    const msgEl = document.getElementById("msg");

    // Mobile Menu
    const mobileMenu = document.getElementById('mobileMenu');
    const mobileMenuButton = document.getElementById('mobileMenuButton');
    const mobileBackBtn = document.getElementById('mobileBackBtn');

    // -------------------------------
    // MOBILE MENU LOGIC
    // -------------------------------
    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener('click', () => {
            mobileMenu.style.transform = 'translateX(0)';
        });
    }

    if (mobileBackBtn && mobileMenu) {
        mobileBackBtn.addEventListener('click', () => {
            mobileMenu.style.transform = 'translateX(100%)';
        });
    }

    // -------------------------------
    // OPEN / CLOSE MODALS FUNCTIONS
    // -------------------------------
    function openLogin() {
        loginModal.classList.remove("pointer-events-none");
        loginModal.classList.add("pointer-auto");
        loginModal.style.opacity = "1";
        loginModal.querySelector("div").style.transform = "scale(1)";
    }

    function closeLogin() {
        loginModal.style.opacity = "0";
        loginModal.classList.add("pointer-events-none");
        loginModal.classList.remove("pointer-auto");
        loginModal.querySelector("div").style.transform = "scale(.95)";
    }

    function openSignup() {
        signupModal.classList.remove("pointer-events-none");
        signupModal.classList.add("pointer-auto");
        signupModal.style.opacity = "1";
        signupBox.classList.add("signup-active");
    }

    function closeSignup() {
        signupModal.style.opacity = "0";
        signupModal.classList.add("pointer-events-none");
        signupBox.classList.remove("signup-active");
    }

    // -------------------------------
    // BUTTON EVENT LISTENERS
    // -------------------------------
    navLoginBtn?.addEventListener("click", openLogin);
    mobileLoginBtn?.addEventListener("click", openLogin);
    getStartBtn?.addEventListener("click", openSignup);
    loginCloseBtn?.addEventListener("click", closeLogin);
    signupCloseBtn?.addEventListener("click", closeSignup);

    // Switch from Login to Signup
    loginSignupBtn?.addEventListener("click", () => {
        closeLogin();
        openSignup();
    });

    // -------------------------------
    // NAVIGATION REDIRECTS (FIXED)
    // -------------------------------
    // Restored your original redirects for registration
    signupAthleteBtn?.addEventListener("click", () => { window.location.href = "signup-athlete.html"; });
    signupCoachBtn?.addEventListener("click", () => { window.location.href = "signupcoach.html"; });
    signupFedBtn?.addEventListener("click", () => { window.location.href = "signupfed.html"; });

    // -------------------------------------------------
    // LOGIN FUNCTION (The Smart Redirect)
    // -------------------------------------------------
    loginSubmitBtn?.addEventListener("click", async () => {
        const email = document.getElementById("loginEmail").value.trim();
        const password = document.getElementById("loginPassword").value.trim();

        if (!email || !password) {
            msgEl.innerText = "Please enter email & password";
            return;
        }

        try {
            // 1. Sign In
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const uid = userCredential.user.uid;

            // 2. Check if Profile Exists in Firestore
            const profileRef = doc(db, "athletes", uid);
            const profileSnap = await getDoc(profileRef);

            // 3. Redirect Accordingly
            if (profileSnap.exists()) {
                // User has a profile -> Dashboard
                window.location.href = "dashboard.html"; 
            } else {
                // User has account but NO profile -> Non-Profile Page
                window.location.href = "nonprofile.html"; 
            }

        } catch (err) {
            console.error("Login error:", err);
            msgEl.innerText = "Invalid Email or Password"; 
        }
    });
    
    
});