import {
  registerUser,
  saveUserAccount,
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
    // 1️⃣ CHECK USERNAME UNIQUENESS
    const usernameQuery = query(
      collection(db, "athletes"),
      where("username", "==", username)
    );
    const usernameSnap = await getDocs(usernameQuery);

    if (!usernameSnap.empty) {
      showError("Username already exists.");
      return;
    }

    // 2️⃣ (OMITTED) EMAIL UNIQUENESS IS HANDLED BY FIREBASE AUTH AUTOMATICALLY

    // 3️⃣ CREATE FIREBASE AUTH USER
    const cred = await registerUser(email, password, username);

    // 4️⃣ STORE USER IN DATABASE
    // Explicitly using 'athletes' collection
    await saveUserAccount(cred.user.uid, {
      username: username,
      email: email,
      role: "athlete"
    }, "athletes");

    // 5️⃣ SUCCESS → SHOW MODAL + REDIRECT
    showSuccessModal("Account created successfully! Please login.", () => {
      window.location.href = "index.html";
    });

  } catch (err) {
    console.error(err);

    if (err.message) {
      showError(err.message);
    } else {
      showError("Registration failed. Please try again.");
    }
  } finally {
    hideLoading();
  }
});
