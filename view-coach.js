import {
    auth,
    onAuthChange,
    signOut,
    getCoachProfile,
    saveCoachProfile,
    uploadFile,
    BACKEND_URL
} from "./register.js";
import { updateNavbar } from "./ui-utils.js";

// DOM Elements
const profilePicInput = document.getElementById("profilePicInput");
const profilePicDisplay = document.getElementById("profilePicDisplay");
const navUserBtn = document.getElementById("navUserBtn");
const navUserDropdown = document.getElementById("navUserDropdown");
const logoutBtn = document.getElementById("logoutBtn");

let currentCoachId = null;
let currentCoachData = null;

// Auth
// Auth
onAuthChange(async (user) => {
    // Check for query param ID (admin viewing specific coach)
    const urlParams = new URLSearchParams(window.location.search);
    const viewId = urlParams.get('id');

    if (!user) {
        window.location.href = "index.html";
        return;
    }

    // Determine whose data to load
    let targetCoachId = null;
    let isReadOnly = false;

    if (viewId) {
        // Admin or someone viewing another profile
        targetCoachId = viewId;
        isReadOnly = true;
        // Hide upload buttons if viewing someone else
        if (profilePicInput) profilePicInput.parentElement.classList.add('hidden'); // Assuming parent holds the button visuals or label
        // Actually the label triggers it. 
        const editLabel = document.querySelector('label[for="profilePicInput"]');
        if (editLabel) editLabel.classList.add('hidden');
    } else {
        // Viewing own profile
        targetCoachId = user.uid;
        isReadOnly = false;
        currentCoachId = user.uid; // Only set this if it's the logged-in user's own profile
    }

    // Navbar User (always the logged in user)
    updateNavbar(user, null);

    try {
        const data = await getCoachProfile(targetCoachId);
        if (data && data.exists) {
            currentCoachData = data;

            // If viewing own profile, update local storage name
            if (!isReadOnly) {
                const name = data.username || data.fullName?.split(" ")[0] || user.displayName;
                if (name) localStorage.setItem("tt_username", name);
                updateNavbar(user, currentCoachData);
            }

            loadDashboardData(data, { displayName: "Coach" }); // User obj only needed for fallback name
        } else {
            if (!isReadOnly) {
                window.location.href = "create-coach-profile.html";
            } else {
                alert("Coach profile not found.");
                window.location.href = "federation-home.html";
            }
            return;
        }
    } catch (err) {
        console.error("Error fetching coach data", err);
    }
});

// Profile Pic Upload
if (profilePicInput) {
    profilePicInput.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file || !currentCoachId) return;

        const isImage = file.type.startsWith('image/') || /\.(jpe?g|png)$/i.test(file.name);
        const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);

        if (!isImage && !isPdf) return alert("Select image or PDF");
        if (file.size > 5 * 1024 * 1024) return alert("Max 5MB");

        try {
            if (profilePicDisplay) profilePicDisplay.classList.add("skeleton");
            const url = await uploadFile(file, currentCoachId, "profilePic");

            // Update DB
            if (currentCoachData) {
                currentCoachData.profilePic = url;
                await saveCoachProfile(currentCoachId, currentCoachData);
            }

            if (profilePicDisplay && !isPdf) {
                profilePicDisplay.src = url;
                profilePicDisplay.classList.remove("skeleton");
            } else if (profilePicDisplay && isPdf) {
                profilePicDisplay.src = "https://cdn-icons-png.flaticon.com/512/337/337946.png"; // PDF Icon
                profilePicDisplay.classList.remove("skeleton");
            }
            const navImg = document.getElementById("navUserImg");
            if (navImg && !isPdf) navImg.src = url;
            else if (navImg && isPdf) navImg.src = "https://cdn-icons-png.flaticon.com/512/337/337946.png";

            alert("Updated!");
        } catch (err) {
            console.error(err);
            alert("Failed to upload");
            if (profilePicDisplay) profilePicDisplay.classList.remove("skeleton");
        }
    });
}

// Render
function loadDashboardData(data, user) {
    // Map fields
    const fullName = data.fullName || user.displayName || "Coach";
    const username = data.username || fullName;
    let profilePic = data.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=012A61&color=fff`;
    if (profilePic && profilePic.startsWith('/')) {
        profilePic = BACKEND_URL + profilePic;
    }

    if (profilePicDisplay) {
        profilePicDisplay.src = profilePic;
        profilePicDisplay.classList.remove("skeleton");
    }

    setText("coachName", fullName);
    setText("coachSpecialization", data.sports || "General");
    setText("coachExperience", data.experience || "0");
    setText("coachOrganization", data.organization || "Independent");

    // Verification
    const isVerified = data.status?.toLowerCase() === "approved";
    const badgeElement = document.getElementById("verificationBadge");
    const badgeText = document.getElementById("badgeText");
    if (badgeElement && badgeText) {
        if (isVerified) {
            badgeElement.classList.replace("bg-amber-500", "bg-green-500");
            badgeText.textContent = "Verified";
        } else {
            badgeElement.classList.replace("bg-green-500", "bg-amber-500");
            badgeText.textContent = "Pending";
        }
    }

    // Stats
    setText("statSquads", (data.squads || []).length);
    setText("statFavorites", (data.favorites || []).length);
    setText("certificationStatus", data.highestQual ? "Yes" : "No");

    // Personal Info
    const pInfoProxy = document.getElementById("personalInfoSection");
    if (pInfoProxy) {
        pInfoProxy.innerHTML = `
            ${createInfoRow("Username", username)}
            ${createInfoRow("Full Name", fullName)}
            ${createInfoRow("Email", data.email || user.email)}
            ${createInfoRow("Phone", data.phone || "Not provided")}
            ${createInfoRow("DOB", data.dob || "Not provided")}
            ${createInfoRow("Gender", data.gender || "Not provided")}
            ${createInfoRow("NIC", data.nic || "Not provided")}
            ${createInfoRow("Address", data.street || "Not provided")}
            ${createInfoRow("City", data.city || "Not provided")}
            ${createInfoRow("District", data.district || "Not provided")}
        `;
    }

    // Coaching Info
    const cInfoProxy = document.getElementById("coachingInfoSection");
    if (cInfoProxy) {
        cInfoProxy.innerHTML = `
            ${createInfoRow("Sports/Spec", data.sports || "Not specified")}
            ${createInfoRow("Organization", data.organization || "Independent")}
            ${createInfoRow("Experience", (data.experience || "0") + " Years")}
            ${createInfoRow("Qualifications", data.highestQual || "None")}
            ${createInfoRow("Role", data.coachingRole || "Head Coach")}
        `;
    }

    // Training Info
    const tInfoProxy = document.getElementById("trainingInfoSection");
    if (tInfoProxy) {
        tInfoProxy.innerHTML = `
            ${createInfoRow("Availability", data.availDays || "Not specified")}
            ${createInfoRow("Time Slots", data.timeSlots || "Not specified")}
            ${createInfoRow("Location Pref", data.locationPref || "Not specified")}
        `;
    }

    // Docs
    const docsSection = document.getElementById("documentsSection");
    if (docsSection) {
        let docsHTML = '';
        if (data.profilePic) {
            const isPdf = data.profilePic.toLowerCase().includes('.pdf') || data.profilePic.toLowerCase().includes('pdf');
            docsHTML += createDocumentCard("Profile Picture", data.profilePic, isPdf ? "pdf" : "image");
        }
        if (data.certDoc) {
            const isPdf = data.certDoc.toLowerCase().includes('.pdf') || data.certDoc.toLowerCase().includes('pdf');
            docsHTML += createDocumentCard("Certificate", data.certDoc, isPdf ? "pdf" : "image");
        }

        if (docsHTML === '') docsHTML = '<p class="text-gray-500 text-sm italic">No documents uploaded</p>';
        docsSection.innerHTML = docsHTML;
    }
}

function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

function createInfoRow(label, value) {
    return `
        <div class="info-row p-4 rounded-xl transition-all">
            <p class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">${label}</p>
            <p class="text-sm font-semibold text-gray-800 truncate" title="${value}">${value}</p>
        </div>
    `;
}

function createDocumentCard(label, url, type) {
    const icon = type === "image" ? `
        <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
    ` : `
        <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
    `;

    return `
        <div class="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">${icon}</div>
                <div><p class="text-sm font-bold text-gray-800">${label}</p><p class="text-xs text-gray-500">${type.toUpperCase()}</p></div>
            </div>
            <a href="${url}" target="_blank" class="px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-xs font-bold hover:bg-[var(--secondary)] transition-all">View</a>
        </div>
    `;
}

if (navUserBtn) {
    navUserBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        navUserDropdown.classList.toggle('hidden');
    });
}
window.addEventListener('click', () => { if (navUserDropdown) navUserDropdown.classList.add('hidden'); });

if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
        try {
            await signOut();
            localStorage.removeItem("tt_username");
            localStorage.removeItem("tt_role");
            window.location.href = "index.html";
        } catch (error) { console.error("Logout Error", error); }
    });
}
