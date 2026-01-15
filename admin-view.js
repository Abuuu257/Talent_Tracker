import {
    auth,
    onAuthChange,
    getAthleteProfile,
    getCoachProfile,
    updateUserStatus,
    saveAdminNote,
    getAdminNote,
    BACKEND_URL
} from "./register.js";
import { updateNavbar } from "./ui-utils.js";

// DOM Elements
const userPic = document.getElementById("userPic");
const userName = document.getElementById("userName");
const userEmail = document.getElementById("userEmail");
const userPhone = document.getElementById("userPhone");
const statusBadge = document.getElementById("statusBadge");
const personalGrid = document.getElementById("personalGrid");
const specGrid = document.getElementById("specGrid");
const specTitle = document.getElementById("specTitle");
const docsList = document.getElementById("docsList");

const btnApprove = document.getElementById("btnApprove");
const btnRevoke = document.getElementById("btnRevoke");
const adminNotesTextarea = document.getElementById("adminNotesTextarea");
const saveNoteBtn = document.getElementById("saveNoteBtn");

let targetId = null;
let targetRole = null; // 'athlete' or 'coach'
let currentUserData = null;

// Determine if we are on athlete or coach View based on filename or we can infer?
// Simplest is to pass role via URL but better to rely on filename context if possible, 
// OR simpler: Look for URL param `type`. 
// Let's expect URL: ?id=XYZ&role=athlete or ?id=XYZ&role=coach

const urlParams = new URLSearchParams(window.location.search);
targetId = urlParams.get('id');
// If role is passed in URL, use it. If not, try to infer from filename.
const pageRole = window.location.pathname.includes('coach') ? 'coach' : 'athlete';
targetRole = urlParams.get('role') || pageRole;

if (!targetId) {
    alert("No user specified.");
    window.location.href = "federation-home.html";
}

onAuthChange(async (user) => {
    // 1. Verify Admin
    const myRole = localStorage.getItem("tt_role");
    if (myRole !== 'federation') {
        alert("Unauthorized.");
        window.location.href = "index.html";
        return;
    }

    // Update Navbar with generic "Federation" or specific user name if available
    updateNavbar({ ...user, username: "Admin", role: "admin" }, { username: "Admin" });

    // 2. Fetch Target Data
    try {
        let data = null;
        if (targetRole === 'coach') {
            data = await getCoachProfile(targetId);
            specTitle.textContent = "Coaching Credentials";
        } else {
            data = await getAthleteProfile(targetId);
            specTitle.textContent = "Athletic Profile";
        }

        if (data && data.exists) {
            currentUserData = data;
            renderProfile(data);
            loadAdminNotes(); // Load saved admin notes
        } else {
            alert("User profile not found.");
            window.location.href = "federation-home.html";
        }

    } catch (err) {
        console.error("Error loading profile", err);
        alert("Error loading profile.");
    }
});

function renderProfile(data) {
    // 1. Header Info
    const p = data.personal || {}; // Athletes often nest here
    // Coaches might be flat or nested depending on implement. 
    // Normalized Access:
    const name = data.fullName || p.fullName || data.username || "Unknown";
    const email = data.email || p.email || "No Email";
    const phone = data.phone || p.phone || "No Phone";
    let pic = data.profilePic || (data.documents ? data.documents.profilePic : null);

    // Status
    const status = data.status || (data.federationApproval ? data.federationApproval.status : 'pending');

    userName.textContent = name;
    userEmail.textContent = email;
    userPhone.textContent = phone;

    if (!pic) pic = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
    if (pic.startsWith('/')) pic = BACKEND_URL + pic;
    userPic.src = pic;

    updateStatusUI(status);

    // 2. Personal Grid
    let gridHTML = "";

    // Common Fields
    gridHTML += infoItem("Full Name", name);
    gridHTML += infoItem("Email", email);
    gridHTML += infoItem("Phone", phone);
    gridHTML += infoItem("Gender", data.gender || p.gender || "-");
    gridHTML += infoItem("DOB", data.dob || p.dob || "-");
    gridHTML += infoItem("Address", (data.street || p.street || "") + " " + (data.city || p.city || ""));
    gridHTML += infoItem("NIC / ID", data.nic || p.nic || "-");

    personalGrid.innerHTML = gridHTML;

    // 3. Specialized Grid
    let specHTML = "";
    if (targetRole === 'coach') {
        specHTML += infoItem("Sports", data.sports || "-");
        specHTML += infoItem("Organization", data.organization || "-");
        specHTML += infoItem("Experience", (data.experience || "0") + " Years");
        specHTML += infoItem("Role", data.coachingRole || "-");
        specHTML += infoItem("Qualifications", data.highestQual || "-");
        specHTML += infoItem("Active Squads", (data.squads ? data.squads.length : 0));
    } else {
        // Athlete
        const a = data.athletic || {};
        const m = data.medicalPhysical || {};
        const l = data.playingLevel || {};

        specHTML += infoItem("Category", a.category || "TBD");
        specHTML += infoItem("Club/School", l.club || l.school || "-");
        specHTML += infoItem("Height", m.height ? m.height + " cm" : "-");
        specHTML += infoItem("Weight", m.weight ? m.weight + " kg" : "-");
        specHTML += infoItem("Blood Group", m.bloodGroup || "-");

        // Performance Snapshot
        if (a.events && a.events.length > 0) {
            const eventsStr = a.events.map(e => `${e.event} (${e.pb}s)`).join(', ');
            specHTML += infoItem("Top Events", eventsStr);
        } else {
            specHTML += infoItem("Events", "None recorded");
        }
    }
    specGrid.innerHTML = specHTML;

    // 4. Documents
    let docsHTML = "";
    const docs = data.documents || {};
    // Add known doc types driven by role
    if (docs.idDoc) docsHTML += docItem("Identity Document", docs.idDoc);
    if (docs.consentDoc) docsHTML += docItem("Parental Consent", docs.consentDoc);
    if (data.certDoc) docsHTML += docItem("Coaching Cert", data.certDoc); // Coach specific root field sometimes

    // Check for other loose docs
    // (In your schema, docs are loosely defined, so explicit checks are safer)

    if (docsHTML === "") {
        docsHTML = `<p class="text-slate-500 italic opacity-50">No documents found.</p>`;
    }
    docsList.innerHTML = docsHTML;
}

function updateStatusUI(status) {
    const isApproved = status === 'approved';

    statusBadge.textContent = isApproved ? "Access Granted" : "Pending Approval";
    statusBadge.className = isApproved
        ? "absolute -bottom-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-green-500 text-white text-[10px] font-black uppercase tracking-widest shadow-lg border-2 border-white whitespace-nowrap"
        : "absolute -bottom-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-amber-400 text-white text-[10px] font-black uppercase tracking-widest shadow-lg border-2 border-white whitespace-nowrap";

    if (isApproved) {
        btnApprove.classList.add("hidden");
        btnRevoke.classList.remove("hidden");
        btnRevoke.textContent = "Revoke Access";
    } else {
        btnApprove.classList.remove("hidden");
        btnRevoke.classList.remove("hidden"); // Keep as "Reject" or similar if we implemented reject fully
        btnRevoke.textContent = "Suspend / Reject";
    }
}

// Global actions
window.updateStatus = async (newStatus) => {
    if (!targetId || !targetRole) return;

    // UI Loading state
    btnApprove.textContent = "Processing...";

    try {
        await updateUserStatus(targetId, newStatus, targetRole);
        // Refresh
        currentUserData.status = newStatus;
        if (currentUserData.federationApproval) currentUserData.federationApproval.status = newStatus;

        updateStatusUI(newStatus);

        // Reset Button Text
        btnApprove.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg> Approve Access`;

        // Slight feedback
        if (newStatus === 'approved') alert("Approved!");
        else alert("Status Updated.");

    } catch (err) {
        console.error("Update failed", err);
        alert("Failed to update status.");
        btnApprove.textContent = "Approve Access";
    }
};

// Helpers
function infoItem(label, val) {
    return `
        <div>
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">${label}</p>
            <p class="text-sm font-bold text-slate-700 break-words">${val}</p>
        </div>
    `;
}

function docItem(label, url) {
    if (url && url.startsWith('/')) url = BACKEND_URL + url;

    return `
        <div class="flex items-center justify-between bg-white/10 border border-white/10 p-4 rounded-xl hover:bg-white/20 transition-all cursor-pointer group" onclick="window.open('${url}', '_blank')">
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg bg-[var(--highlight)] text-[var(--primary)] flex items-center justify-center font-bold text-xs">PDF</div>
                <span class="text-sm font-bold">${label}</span>
            </div>
            <svg class="w-4 h-4 opacity-50 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
        </div>
    `;
}

// Load Admin Notes
async function loadAdminNotes() {
    if (!targetId || !targetRole) return;

    try {
        const response = await getAdminNote(targetId, targetRole);
        if (response && response.note) {
            adminNotesTextarea.value = response.note;
        }
    } catch (err) {
        console.error("Error loading admin notes:", err);
        // Don't show error to user, just log it
    }
}

// Save Admin Notes
async function saveAdminNoteHandler() {
    if (!targetId || !targetRole) return;

    const note = adminNotesTextarea.value.trim();
    const originalText = saveNoteBtn.textContent;

    try {
        saveNoteBtn.textContent = "Saving...";
        saveNoteBtn.disabled = true;

        await saveAdminNote(targetId, targetRole, note);

        saveNoteBtn.textContent = "Saved!";
        setTimeout(() => {
            saveNoteBtn.textContent = originalText;
        }, 2000);
    } catch (err) {
        console.error("Error saving admin note:", err);
        alert("Failed to save note. Please try again.");
        saveNoteBtn.textContent = originalText;
    } finally {
        saveNoteBtn.disabled = false;
    }
}

// Add event listener for save button
if (saveNoteBtn) {
    saveNoteBtn.addEventListener("click", saveAdminNoteHandler);
}

// Logout Logic
if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
        try {
            await signOut();
            localStorage.removeItem("tt_username");
            localStorage.removeItem("tt_role");
            window.location.href = "index.html";
        } catch (error) {
            console.error("Logout Error", error);
        }
    });
}
