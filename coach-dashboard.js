import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-storage.js";

// Firebase Configuration
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

let currentCoachId = null;

// Profile Picture Upload Handler
const profilePicInput = document.getElementById("profilePicInput");
if (profilePicInput) {
    profilePicInput.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file || !currentCoachId) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert("Please select an image file");
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert("File size must be less than 5MB");
            return;
        }

        try {
            // Show loading state
            const profilePicDisplay = document.getElementById("profilePicDisplay");
            profilePicDisplay.classList.add("skeleton");

            // Upload to Firebase Storage
            const filePath = `coaches/${currentCoachId}/profilePic_${Date.now()}_${file.name}`;
            const storageRef = ref(storage, filePath);
            const snapshot = await uploadBytes(storageRef, file);
            const downloadUrl = await getDownloadURL(snapshot.ref);

            // Update Firestore
            await setDoc(doc(db, "coaches", currentCoachId), {
                documents: { profilePic: downloadUrl }
            }, { merge: true });

            // Update UI
            profilePicDisplay.src = downloadUrl;
            profilePicDisplay.classList.remove("skeleton");

            // Update navbar
            const navImg = document.getElementById("navUserImg");
            if (navImg) navImg.src = downloadUrl;

            alert("Profile picture updated successfully!");
        } catch (error) {
            console.error("Error uploading profile picture:", error);
            alert("Failed to upload profile picture. Please try again.");
            const profilePicDisplay = document.getElementById("profilePicDisplay");
            profilePicDisplay.classList.remove("skeleton");
        }
    });
}

// Authentication
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "index.html";
        return;
    }

    currentCoachId = user.uid;

    // Update navbar
    let name = user.displayName || localStorage.getItem("tt_username");
    let profilePic = null;

    try {
        const coachDoc = await getDoc(doc(db, "coaches", currentCoachId));
        if (coachDoc.exists()) {
            const data = coachDoc.data();
            name = data.username || data.personalInfo?.fullName?.split(" ")[0] || name;
            profilePic = data.profilePic || data.documents?.profilePic || null;
            if (name) localStorage.setItem("tt_username", name);

            // Load dashboard data
            loadDashboardData(data, user);
        } else {
            // No profile found, redirect to create profile
            window.location.href = "create-coach-profile.html";
            return;
        }
    } catch (error) {
        console.error("Error fetching coach data:", error);
    }

    if (!name) name = user.email.split("@")[0];

    // Update navbar UI
    const navBtnText = document.getElementById("navBtnText");
    const navPic = document.getElementById("navUserPic");
    const navImg = document.getElementById("navUserImg");
    const navUserEmail = document.getElementById("navUserEmail");

    if (navBtnText) navBtnText.textContent = name;
    if (navUserEmail) navUserEmail.textContent = user.email;
    if (navPic) navPic.classList.remove("hidden");

    if (profilePic) {
        if (navImg) { navImg.src = profilePic; navImg.classList.remove("hidden"); }
    } else {
        const defaultPic = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=012A61&color=fff`;
        if (navImg) { navImg.src = defaultPic; navImg.classList.remove("hidden"); }
    }
});

// Dropdown toggle
const navUserBtn = document.getElementById("navUserBtn");
const navUserDropdown = document.getElementById("navUserDropdown");

if (navUserBtn) {
    navUserBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        navUserDropdown.classList.toggle('hidden');
    });
}

window.addEventListener('click', () => {
    if (navUserDropdown) navUserDropdown.classList.add('hidden');
});

// Logout handler
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
        try {
            await signOut(auth);
            localStorage.removeItem("tt_username");
            localStorage.removeItem("tt_role");
            window.location.href = "index.html";
        } catch (error) {
            console.error("Logout Error", error);
        }
    });
}

// Load Dashboard Data
function loadDashboardData(data, user) {
    const personalInfo = data.personalInfo || {};
    const coachingBio = data.coachingBio || {};
    const trainingPreferences = data.trainingPreferences || {};
    const documents = data.documents || {};
    const federationApproval = data.federationApproval || {};

    // Profile Header - Use actual username
    const username = data.username || personalInfo.fullName?.split(" ")[0] || user.displayName || user.email.split("@")[0];
    const profilePic = data.profilePic || documents.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(personalInfo.fullName || username)}&background=012A61&color=fff`;

    const profilePicDisplay = document.getElementById("profilePicDisplay");
    profilePicDisplay.src = profilePic;
    profilePicDisplay.classList.remove("skeleton");

    document.getElementById("coachName").textContent = personalInfo.fullName || username || "Coach Name";
    document.getElementById("coachSpecialization").textContent = personalInfo.specialization || "Specialization Not Set";
    document.getElementById("coachExperience").textContent = coachingBio.yearsOfExperience || "0";
    document.getElementById("coachOrganization").textContent = personalInfo.currentOrganization || "Independent";

    // Verification Badge
    const isVerified = federationApproval.status === "approved" || !!data.registrationNumber;
    const badgeElement = document.getElementById("verificationBadge");
    const badgeText = document.getElementById("badgeText");

    if (isVerified) {
        badgeElement.classList.remove("bg-amber-500");
        badgeElement.classList.add("bg-green-500");
        badgeText.textContent = "Verified";
    } else {
        badgeText.textContent = "Pending";
    }

    // Stats
    const squadsCount = data.squads ? Object.values(data.squads).filter(squad => squad && squad !== "unassigned").length : 0;
    document.getElementById("statSquads").textContent = squadsCount;
    document.getElementById("statFavorites").textContent = (data.favorites || []).length;
    document.getElementById("certificationStatus").textContent = coachingBio.highestQualification ? "Yes" : "No";

    // Personal Information Section
    const personalInfoSection = document.getElementById("personalInfoSection");
    personalInfoSection.innerHTML = `
        ${createInfoRow("Username", username)}
        ${createInfoRow("Full Name", personalInfo.fullName || "Not provided")}
        ${createInfoRow("Email", personalInfo.email || user.email)}
        ${createInfoRow("Phone", personalInfo.phone || "Not provided")}
        ${createInfoRow("Date of Birth", personalInfo.dob || "Not provided")}
        ${createInfoRow("Gender", personalInfo.gender || "Not provided")}
        ${createInfoRow("NIC/Passport", personalInfo.nicPassport || "Not provided")}
        ${createInfoRow("Registration Number", data.registrationNumber || "Not assigned")}
        ${createInfoRow("Address", personalInfo.address || "Not provided")}
        ${createInfoRow("City", personalInfo.city || "Not provided")}
        ${createInfoRow("District", personalInfo.district || "Not provided")}
    `;

    // Coaching Information Section
    const coachingInfoSection = document.getElementById("coachingInfoSection");
    coachingInfoSection.innerHTML = `
        ${createInfoRow("Specialization", personalInfo.specialization || "Not specified")}
        ${createInfoRow("Current Organization", personalInfo.currentOrganization || "Independent")}
        ${createInfoRow("Years of Experience", coachingBio.yearsOfExperience || "0")}
        ${createInfoRow("Highest Qualification", coachingBio.highestQualification || "Not provided")}
        ${createInfoRow("Coaching Philosophy", coachingBio.coachingPhilosophy || "Not provided", true)}
        ${createInfoRow("Achievements", coachingBio.achievements || "Not provided", true)}
    `;

    // Training Preferences Section
    const trainingInfoSection = document.getElementById("trainingInfoSection");
    const ageGroups = trainingPreferences.ageGroups || [];
    const eventFocus = trainingPreferences.eventFocus || [];

    trainingInfoSection.innerHTML = `
        ${createInfoRow("Preferred Age Groups", ageGroups.length > 0 ? ageGroups.join(", ") : "Not specified")}
        ${createInfoRow("Event Focus", eventFocus.length > 0 ? eventFocus.join(", ") : "Not specified")}
        ${createInfoRow("Training Location", trainingPreferences.trainingLocation || "Not specified")}
        ${createInfoRow("Availability", trainingPreferences.availability || "Not specified")}
    `;

    // Documents Section
    const documentsSection = document.getElementById("documentsSection");
    let docsHTML = '';

    if (documents.profilePic) {
        docsHTML += createDocumentCard("Profile Picture", documents.profilePic, "image");
    }

    if (documents.certificate) {
        docsHTML += createDocumentCard("Coaching Certificate", documents.certificate, "pdf");
    }

    if (docsHTML === '') {
        docsHTML = '<p class="text-gray-500 text-sm italic">No documents uploaded</p>';
    }

    documentsSection.innerHTML = docsHTML;
}

// Helper function to create info rows
function createInfoRow(label, value, isLong = false) {
    return `
        <div class="info-row p-4 rounded-xl transition-all">
            <p class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">${label}</p>
            <p class="text-sm font-semibold text-gray-800 ${isLong ? '' : 'truncate'}">${value}</p>
        </div>
    `;
}

// Helper function to create document cards
function createDocumentCard(label, url, type) {
    const icon = type === "image" ? `
        <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
        </svg>
    ` : `
        <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
        </svg>
    `;

    return `
        <div class="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                    ${icon}
                </div>
                <div>
                    <p class="text-sm font-bold text-gray-800">${label}</p>
                    <p class="text-xs text-gray-500">${type.toUpperCase()}</p>
                </div>
            </div>
            <a href="${url}" target="_blank" 
                class="px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-xs font-bold hover:bg-[var(--secondary)] transition-all">
                View
            </a>
        </div>
    `;
}
