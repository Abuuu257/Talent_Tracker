import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-storage.js";
import { showLoading, hideLoading, showSuccessModal } from "./ui-utils.js";

// --- 1. FIREBASE CONFIGURATION ---
const firebaseConfig = {
    apiKey: "AIzaSyBtIlIV-FGmM2hZh0NcuK78N9EafqpcGTQ",
    authDomain: "athletesystem-61615.firebaseapp.com",
    projectId: "athletesystem-61615",
    storageBucket: "athletesystem-61615.appspot.com",
    messagingSenderId: "646599639422",
    appId: "1:646599639422:web:33f0f059a0e7112d9f332f"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

let currentUID = null;
const form = document.getElementById("coachProfileForm");

// --- 2. AUTHENTICATION ---
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "index.html";
        return;
    }
    currentUID = user.uid;

    // Set email and read-only
    const emailInput = document.getElementById("email");
    if (emailInput) {
        emailInput.value = user.email;
    }

    // Optional: Fetch existing coach data to pre-fill
    try {
        const docRef = doc(db, "coaches", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            // Pre-fill logic can go here (similar to athlete-edit)
            if (data.fullName) document.getElementById("fullName").value = data.fullName;
            if (data.gender) document.getElementById("gender").value = data.gender;
            if (data.dob) document.getElementById("dob").value = data.dob;
            if (data.nationality) document.getElementById("nationality").value = data.nationality;
            if (data.nic) document.getElementById("nic").value = data.nic;
            if (data.phone) document.getElementById("phone").value = data.phone;
            if (data.street) document.getElementById("street").value = data.street;
            if (data.city) document.getElementById("city").value = data.city;
            if (data.district) document.getElementById("district").value = data.district;
            if (data.province) document.getElementById("province").value = data.province;
            if (data.sports) document.getElementById("sports").value = data.sports;
            if (data.coachingLevel) document.getElementById("coachingLevel").value = data.coachingLevel;
            if (data.coachingRole) document.getElementById("coachingRole").value = data.coachingRole;
            if (data.experience) document.getElementById("experience").value = data.experience;
            if (data.organization) document.getElementById("organization").value = data.organization;
            if (data.highestQual) document.getElementById("highestQual").value = data.highestQual;
            if (data.issuingAuthority) document.getElementById("issuingAuthority").value = data.issuingAuthority;
            if (data.certId) document.getElementById("certId").value = data.certId;
            if (data.availDays) document.getElementById("availDays").value = data.availDays;
            if (data.timeSlots) document.getElementById("timeSlots").value = data.timeSlots;
            if (data.locationPref) document.getElementById("locationPref").value = data.locationPref;

            if (data.profilePic) {
                const previewImg = document.getElementById("previewImg");
                const previewIcon = document.querySelector("#photoPreview svg");
                previewImg.src = data.profilePic;
                previewImg.classList.remove("hidden");
                previewIcon.classList.add("hidden");
            }
        }

        // --- UPDATE NAVBAR (Username & Pic) ---
        const navBtnText = document.getElementById("navBtnText");
        const navUserPic = document.getElementById("navUserPic");
        const navUserImg = document.getElementById("navUserImg");

        let username = user.displayName || localStorage.getItem("tt_username") || user.email.split("@")[0];
        let profilePic = null;

        if (docSnap.exists()) {
            const data = docSnap.data();
            username = data.username || data.personalInfo?.fullName?.split(" ")[0] || username;
            profilePic = data.documents?.profilePic || data.profilePic || null;
            if (username) localStorage.setItem("tt_username", username);
        }

        if (navBtnText) navBtnText.textContent = username;

        if (navUserPic && navUserImg) {
            navUserPic.classList.remove("hidden");
            const avatar = profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=012A61&color=fff`;
            navUserImg.src = avatar;
            navUserImg.classList.remove("hidden");
        }

    } catch (err) {
        console.error("Error checking coach profile:", err);
    }
});

// --- 3. PHOTO PREVIEW ---
const photoInput = document.getElementById("coachPhoto");
const previewImg = document.getElementById("previewImg");
const photoPreviewIcon = document.querySelector("#photoPreview svg");

if (photoInput) {
    photoInput.addEventListener("change", function () {
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                previewImg.src = e.target.result;
                previewImg.classList.remove("hidden");
                photoPreviewIcon.classList.add("hidden");
            }
            reader.readAsDataURL(file);
        }
    });
}

// --- 4. FILE HELPER (Base64) ---
async function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}

// --- 5. FORM SUBMISSION ---
form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Reset errors
    document.querySelectorAll(".error-text").forEach(el => el.classList.remove("visible"));
    document.querySelectorAll(".input, .textarea, .checkbox-container").forEach(el => el.classList.remove("input-error"));

    let isValid = true;

    // Simple validation helper for text/select
    const validateField = (id) => {
        const el = document.getElementById(id);
        const err = document.getElementById(`error-${id}`);
        if (!el.value) {
            if (err) err.classList.add("visible");
            el.classList.add("input-error");
            isValid = false;
        }
    };

    // Required fields check (except optional ones)
    const requiredFields = [
        "fullName", "gender", "dob", "nationality", "nic",
        "phone", "street", "city", "district", "province",
        "sports", "coachingLevel", "coachingRole", "experience", "organization",
        "highestQual", "issuingAuthority", "certId"
    ];

    requiredFields.forEach(validateField);

    // DOB check (Min 14)
    const dobInput = document.getElementById("dob");
    if (dobInput.value) {
        const dob = new Date(dobInput.value);
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        if (today.getMonth() < dob.getMonth() || (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate())) age--;
        if (age < 14 || age > 100) {
            document.getElementById("error-dob").textContent = "Invalid age (Min 14)";
            document.getElementById("error-dob").classList.add("visible");
            isValid = false;
        }
    }

    // Experience check
    const expInput = document.getElementById("experience");
    if (expInput.value && parseInt(expInput.value) < 0) {
        document.getElementById("error-experience").textContent = "Experience cannot be negative";
        document.getElementById("error-experience").classList.add("visible");
        isValid = false;
    }

    // Phone check
    const phoneInput = document.getElementById("phone");
    if (phoneInput.value && !/^\+?[0-9\s-]{10,15}$/.test(phoneInput.value)) {
        document.getElementById("error-phone").textContent = "Invalid phone format";
        document.getElementById("error-phone").classList.add("visible");
        isValid = false;
    }

    // NIC check
    const nicInput = document.getElementById("nic");
    if (nicInput.value && nicInput.value.length < 5) {
        document.getElementById("error-nic").textContent = "Invalid NIC/Passport";
        document.getElementById("error-nic").classList.add("visible");
        isValid = false;
    }

    // Check certificate file (mandatory)
    const certInput = document.getElementById("certDoc");
    const certErr = document.getElementById("error-certDoc");
    // Only mandatory if not already uploaded (merging logic simplified for now)
    if (!certInput.files.length) {
        // If we want to allow existing cert, we'd check if a doc already exists
        // For now, let's keep it mandatory on every submit to ensure fresh verification
        certErr.classList.add("visible");
        certInput.classList.add("input-error");
        isValid = false;
    } else {
        const file = certInput.files[0];
        if (file.size > 2 * 1024 * 1024) {
            certErr.textContent = "File too large (Max 2MB)";
            certErr.classList.add("visible");
            isValid = false;
        }
    }

    // Check checkboxes
    const terms = document.getElementById("termsConsent");
    const dataUsage = document.getElementById("dataConsent");
    const auth = document.getElementById("authConsent");
    const consentErr = document.getElementById("error-consents");

    if (!terms.checked || !dataUsage.checked || !auth.checked) {
        consentErr.classList.add("visible");
        // Highlight missing ones
        if (!terms.checked) terms.closest('.checkbox-container').classList.add('input-error');
        if (!dataUsage.checked) dataUsage.closest('.checkbox-container').classList.add('input-error');
        if (!auth.checked) auth.closest('.checkbox-container').classList.add('input-error');
        isValid = false;
    }

    if (!isValid) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
    }

    try {
        showLoading();

        // Convert files to Base64 (Only if within limit)
        let photoBase64 = null;
        if (photoInput.files.length > 0) {
            const file = photoInput.files[0];
            if (file.size > 2 * 1024 * 1024) {
                alert("Profile photo exceeds 2MB limit.");
                hideLoading();
                return;
            }
            photoBase64 = await fileToBase64(file);
        } else {
            // Keep old pic if exists
            const previewImgEl = document.getElementById("previewImg");
            if (previewImgEl && !previewImgEl.classList.contains("hidden")) {
                photoBase64 = previewImgEl.src;
            }
        }

        let certUrl = null;
        if (certInput.files.length > 0) {
            const file = certInput.files[0];
            const filePath = `coaches/${currentUID}/cert_${Date.now()}_${file.name}`;
            const storageRef = ref(storage, filePath);
            const snapshot = await uploadBytes(storageRef, file);
            certUrl = await getDownloadURL(snapshot.ref);
        } else {
            // Check if we already have a cert (in case of re-submission)
            const coachSnap = await getDoc(doc(db, "coaches", currentUID));
            if (coachSnap.exists()) {
                certUrl = coachSnap.data().certDoc;
            }
        }

        const profileData = {
            // 1. Personal
            fullName: document.getElementById("fullName").value,
            gender: document.getElementById("gender").value,
            dob: document.getElementById("dob").value,
            nationality: document.getElementById("nationality").value,
            nic: document.getElementById("nic").value,
            profilePic: photoBase64,

            // 2. Contact
            email: document.getElementById("email").value,
            phone: document.getElementById("phone").value,
            street: document.getElementById("street").value,
            city: document.getElementById("city").value,
            district: document.getElementById("district").value,
            province: document.getElementById("province").value,

            // 3. Coaching
            sports: document.getElementById("sports").value,
            coachingLevel: document.getElementById("coachingLevel").value,
            coachingRole: document.getElementById("coachingRole").value,
            experience: parseInt(document.getElementById("experience").value),
            organization: document.getElementById("organization").value,

            // 4. Qualifications
            highestQual: document.getElementById("highestQual").value,
            issuingAuthority: document.getElementById("issuingAuthority").value,
            certId: document.getElementById("certId").value,
            certDoc: certUrl,

            // 5. Availability (Optional)
            availDays: document.getElementById("availDays").value || "",
            timeSlots: document.getElementById("timeSlots").value || "",
            locationPref: document.getElementById("locationPref").value || "",

            // 6. System (Auto-set)
            status: "Pending", // Default status
            verifiedBy: "",
            verificationDate: "",
            adminRemarks: "",

            // 7. Metadata
            role: "coach",
            updatedAt: new Date().toISOString()
        };

        // Save to Firestore 'coaches' collection
        await setDoc(doc(db, "coaches", currentUID), profileData, { merge: true });

        hideLoading();
        showSuccessModal("Your coach profile has been submitted for verification!", () => {
            window.location.href = "coach-home.html";
        });

    } catch (error) {
        console.error("Error saving coach profile:", error);
        hideLoading();
        alert("An error occurred while saving your profile: " + error.message);
    }
});
