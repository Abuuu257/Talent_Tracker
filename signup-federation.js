import {
    registerUser,
    saveFederationProfile,
    logoutUser,
    isUsernameTaken,
    db
} from "./register.js";

import {
    collection,
    query,
    where,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

import { showLoading, hideLoading, showSuccessModal } from "./ui-utils.js";

const form = document.getElementById("signupForm");
const errorText = document.getElementById("signupError");

function showError(message) {
    errorText.textContent = message;
    errorText.classList.remove("hidden");
}

function clearError() {
    errorText.textContent = "";
    errorText.classList.add("hidden");
}

/* --- TOGGLE PASSWORD VISIBILITY --- */
const togglePassword = document.getElementById("togglePassword");
const passwordInput = document.getElementById("password");
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

form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError();

    const username = document.getElementById("username").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    // BASIC VALIDATION
    if (!username || !email || !password) {
        showError("All fields are required.");
        return;
    }

    if (username.length < 4) {
        showError("Username must be at least 4 characters.");
        return;
    }

    if (password.length < 6) {
        showError("Password must be at least 6 characters.");
        return;
    }

    try {
        showLoading();
        // 1️⃣ CHECK USERNAME UNIQUENESS ACROSS ALL ROLES
        const taken = await isUsernameTaken(username);
        if (taken) {
            showError("Username already exists.");
            return;
        }

        // 2️⃣ EMAIL UNIQUENESS IS HANDLED BY FIREBASE AUTH AUTOMATICALLY

        // 3️⃣ CREATE FIREBASE AUTH USER
        const cred = await registerUser(email, password, username);

        // 4️⃣ STORE USER IN DATABASE (FEDERATIONS)
        await saveFederationProfile(cred.user.uid, {
            username: username,
            email: email,
            role: "federation"
        });

        // 5️⃣ LOGOUT USER (Don't auto-login after signup)
        await logoutUser();

        // 6️⃣ SUCCESS → SHOW MODAL + REDIRECT
        showSuccessModal("Federation account created successfully! Please login.", () => {
            window.location.href = "index.html";
        });

    } catch (err) {
        console.error(err);

        if (err.message) {
            let msg = err.message;
            if (err.code === "auth/email-already-in-use") {
                msg = "Email is already registered.";
            }
            showError(msg);
        } else {
            showError("Registration failed. Please try again.");
        }
    } finally {
        hideLoading();
    }
});
