import {
    registerUser,
    logoutUser
} from "./register.js";
import { showLoading, hideLoading, showSuccessModal } from "./ui-utils.js";

const form = document.getElementById("signupForm");
const errorText = document.getElementById("signupError");

function showError(message) {
    if (errorText) {
        errorText.textContent = message;
        errorText.classList.remove("hidden");
    } else {
        alert(message);
    }
}

function clearError() {
    if (errorText) {
        errorText.textContent = "";
        errorText.classList.add("hidden");
    }
}

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
        await registerUser(email, password, username, "coach");
        await logoutUser();

        showSuccessModal("Coach account created successfully! Please login.", () => {
            window.location.href = "index.html";
        });

    } catch (err) {
        console.error(err);
        showError(err.message || "Registration failed.");
    } finally {
        hideLoading();
    }
});
