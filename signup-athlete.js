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
    // 1️⃣ CHECK USERNAME UNIQUENESS
    const usernameQuery = query(
      collection(db, "users"),
      where("username", "==", username)
    );
    const usernameSnap = await getDocs(usernameQuery);

    if (!usernameSnap.empty) {
      showError("Username already exists.");
      return;
    }

    // 2️⃣ CHECK EMAIL UNIQUENESS
    const emailQuery = query(
      collection(db, "users"),
      where("email", "==", email)
    );
    const emailSnap = await getDocs(emailQuery);

    if (!emailSnap.empty) {
      showError("Email already registered.");
      return;
    }

    // 3️⃣ CREATE FIREBASE AUTH USER
    const cred = await registerUser(email, password);

    // 4️⃣ STORE USER IN DATABASE
    await saveUserAccount(cred.user.uid, {
      username: username,
      email: email,
      role: "athlete"
    });

    // 5️⃣ SUCCESS → ALERT + REDIRECT
    alert("Account created successfully! Please login.");
    window.location.href = "index.html";

  } catch (err) {
    console.error(err);

    if (err.message) {
      showError(err.message);
    } else {
      showError("Registration failed. Please try again.");
    }
  }
});
