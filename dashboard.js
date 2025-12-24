// =======================================================
// 1. IMPORTS & CONFIGURATION
// Connecting to Firebase services.
// =======================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc, arrayUnion, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { showLoading, hideLoading } from "./ui-utils.js";

const firebaseConfig = {
    apiKey: "AIzaSyBtIlIV-FGmM2hZh0NcuK78N9EafqpcGTQ",
    authDomain: "athletesystem-61615.firebaseapp.com",
    projectId: "athletesystem-61615",
    storageBucket: "athletesystem-61615.appspot.com",
    messagingSenderId: "646599639422",
    appId: "1:646599639422:web:33f0f059a0e7112d9f332f",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// =======================================================
// 2. DOM ELEMENT REFERENCES
// Storing UI elements in variables for easy access.
// =======================================================

// Navbar & User Menu
const navLoginBtn = document.getElementById("navLoginBtn");
const navUserDropdown = document.getElementById("navUserDropdown");
const navUserEmail = document.getElementById("navUserEmail");
const logoutBtn = document.getElementById("logoutBtn");

// Mobile Menu
const mobileMenuButton = document.getElementById("mobileMenuButton");
const mobileMenu = document.getElementById("mobileMenu");
const mobileMenuBackBtn = document.getElementById("mobileMenuBackBtn");
const mobileLoginBtn = document.getElementById("mobileLoginBtn");
const mobileUserDropdown = document.getElementById("mobileUserDropdown");
const mobileUserEmail = document.getElementById("mobileUserEmail");
const mobileLogoutBtn = document.getElementById("mobileLogoutBtn");

// Header / Profile Section
const dashUserName = document.getElementById("dashUserName");
const headerPBDisplay = document.getElementById("headerPBDisplay");
const profilePicEl = document.getElementById("profilePic");
const profilePicInput = document.getElementById("profilePicInput");
const editProfileBtn = document.getElementById("editProfileBtn");

// Info Containers
const fullProfileList = document.getElementById("fullProfileList");
const officialDocsGrid = document.getElementById("officialDocsGrid");
const achievementsWrapper = document.getElementById("achievementsWrapper");
const noOfficialDocsText = document.getElementById("noOfficialDocsText");

// Chart & Form Area
const performanceForm = document.getElementById("performanceForm");
const performanceEventSelect = document.getElementById("performanceEvent");
const performanceDateInput = document.getElementById("performanceDate");
const performanceTimeInput = document.getElementById("performanceTime");
const performanceSubmitBtn = document.getElementById("performanceSubmitBtn");

const eventSelect = document.getElementById("eventSelect");
const graphEventLabel = document.getElementById("graphEventLabel");
const performanceChartDiv = document.getElementById("performanceChart");
const noPerformanceText = document.getElementById("noPerformanceText");

// Modals (Document Viewer & Verification)
const docViewModal = document.getElementById("docViewModal");
const docContentArea = document.getElementById("docContentArea");
const verifyModal = document.getElementById("verifyModal");
const verifierNameInput = document.getElementById("verifierName");
const verifierNotesInput = document.getElementById("verifierNotes");
const confirmVerifyBtn = document.getElementById("confirmVerifyBtn");
const cancelVerifyBtn = document.getElementById("cancelVerifyBtn");
let currentVerifyingDoc = null; // Tracks which achievement is being verified

// Toast Notification
const messageBox = document.getElementById("messageBox");
const messageText = document.getElementById("messageText");
const messageDot = document.getElementById("messageDot");

// Realistic Time Limits (Validation Rule)
const eventTimeLimits = { "100m": { min: 9.0, max: 20.0 }, "200m": { min: 19.0, max: 45.0 }, "400m": { min: 43.0, max: 120.0 }, "800m": { min: 100.0, max: 300.0 }, "1500m": { min: 200.0, max: 600.0 } };

// Global Data
let currentUID = null;
let athleteDocData = null; // Stores the downloaded profile data

// =======================================================
// 3. UTILITY FUNCTIONS
// Helper tools for common tasks.
// =======================================================

// Convert File -> Base64 String (Allows saving images in Firestore directly)
async function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}

// Show Toast Notification (Success, Error, Info)
function showMessage(text, type = "info") {
    if (!messageBox) return;
    messageText.textContent = text;
    messageDot.className = "w-3 h-3 rounded-full";
    messageBox.classList.remove('border-red-500', 'border-green-500', 'border-[var(--primary)]');

    if (type === "error") {
        messageDot.classList.add("bg-red-500");
        messageBox.classList.add('border-red-500');
    } else if (type === "success") {
        messageDot.classList.add("bg-emerald-500");
        messageBox.classList.add('border-green-500');
    } else {
        messageDot.classList.add("bg-sky-500");
        messageBox.classList.add('border-[var(--primary)]');
    }

    // Slide in
    messageBox.classList.add("show");
    // Slide out after 3 seconds
    setTimeout(() => messageBox.classList.remove("show"), 3000);
}

// =======================================================
// 4. NAVBAR INTERACTION
// Handling clicks for dropdowns and mobile menu.
// =======================================================
navLoginBtn?.addEventListener("click", (e) => { e.stopPropagation(); navUserDropdown?.classList.toggle("hidden"); });
mobileMenuButton?.addEventListener("click", () => mobileMenu?.classList.remove("translate-x-full"));
mobileMenuBackBtn?.addEventListener("click", () => mobileMenu?.classList.add("translate-x-full"));
mobileLoginBtn?.addEventListener("click", (e) => { e.stopPropagation(); mobileUserDropdown?.classList.toggle("hidden"); });

// Close dropdowns when clicking anywhere else
window.addEventListener("click", () => { navUserDropdown?.classList.add("hidden"); mobileUserDropdown?.classList.add("hidden"); });

// =======================================================
// 5. AUTHENTICATION LOGIC
// Check who is logged in and load their data.
// =======================================================
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        // Security Check: If not logged in, kick to Home
        window.location.href = "index.html";
        return;
    }

    currentUID = user.uid;

    // 1. Check if Profile Exists (Guard Clause)
    const docRef = doc(db, "athletes", currentUID);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
        alert("Please create your profile first.");
        window.location.href = "athlete-home.html";
        return;
    }

    // 2. Update Navbar with Username (Firestore > DisplayName > Email Prefix)
    const data = docSnap.data();
    let name = data.username || user.displayName || user.email.split("@")[0];
    if (name.includes("@")) name = user.email.split("@")[0]; // Force no @ in name

    if (navLoginBtn) navLoginBtn.textContent = name;
    if (mobileLoginBtn) mobileLoginBtn.textContent = name;
    if (navUserEmail) navUserEmail.textContent = user.email;
    if (mobileUserEmail) mobileUserEmail.textContent = user.email;

    // Start Loading Data
    try {
        showLoading();
        await loadAthleteProfile();
    } catch (err) {
        console.error(err);
        if (err.code !== 'unavailable') showMessage("Error connecting", "error");
    } finally {
        hideLoading();
    }
});

// Logout Handler
const handleLogout = async () => {
    await signOut(auth);
    window.location.href = "index.html";
};
logoutBtn?.addEventListener("click", handleLogout);
mobileLogoutBtn?.addEventListener("click", handleLogout);

// Edit Button -> Redirect to Form
editProfileBtn?.addEventListener("click", () => { if (currentUID) window.location.href = `createprofile.html?edit=true`; });

// =======================================================
// 6. LOAD & DISPLAY DATA
// Fetching data from Firestore and populating the UI.
// =======================================================
async function loadAthleteProfile() {
    if (!currentUID) return;
    const ref = doc(db, "athletes", currentUID);
    const snap = await getDoc(ref);

    // --- CRITICAL CHECK: IF NO PROFILE, GO TO CREATE PAGE ---
    if (!snap.exists()) {
        window.location.href = "createprofile.html";
        return;
    }

    athleteDocData = snap.data() || {};
    const p = athleteDocData.personal || athleteDocData.personalInfo || {};

    // Set Greeting Name
    if (dashUserName) dashUserName.textContent = p.fullName || "Athlete";

    // Set Profile Picture
    if (athleteDocData.documents?.profilePic) {
        const imgUrl = athleteDocData.documents.profilePic;
        // Add timestamp to prevent caching old image
        profilePicEl.src = imgUrl.startsWith('http') ? imgUrl + "?t=" + new Date().getTime() : imgUrl;
    }

    // Populate Sections
    updateHeaderPBs();
    renderFullProfile();
    renderDocuments();
    renderAchievements();
    populateEventDropdowns();

    // Load Default Chart
    const initialEvent = eventSelect.value || "100m";
    renderPerformanceGraph(initialEvent);
}

// =======================================================
// 7. PROFILE PICTURE UPLOAD
// Saves the image as Base64 string to Firestore.
// =======================================================
profilePicInput?.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
        showLoading();
        showMessage("Updating image...", "info");
        const base64String = await fileToBase64(file);

        // Save to DB
        await setDoc(doc(db, "athletes", currentUID), { documents: { profilePic: base64String } }, { merge: true });

        // Update UI
        profilePicEl.src = base64String;
        showMessage("Image updated!", "success");
    } catch (err) {
        showMessage("Failed to upload", "error");
    } finally {
        hideLoading();
    }
});

// =======================================================
// 8. RENDER FUNCTIONS (HTML Generators)
// =======================================================

// Display Personal Bests (Pills in Header)
function updateHeaderPBs() {
    const athletic = athleteDocData.athletic || athleteDocData.athleticInfo || {};
    const events = athletic.events || [];
    headerPBDisplay.innerHTML = "";
    if (events.length > 0) {
        events.forEach(evt => {
            const pill = document.createElement("div");
            pill.className = "bg-blue-50 border-l-4 border-[var(--highlight)] px-3 py-2 rounded shadow-sm flex flex-col min-w-[80px]";
            pill.innerHTML = `<span class="text-[10px] text-gray-500 font-bold uppercase tracking-wider">${evt.event}</span><span class="text-lg font-bold text-[var(--primary)]">${evt.pb}s</span>`;
            headerPBDisplay.appendChild(pill);
        });
    } else {
        headerPBDisplay.innerHTML = `<p class="text-sm text-gray-400 italic">No events added.</p>`;
    }
}

// Display Full Profile Details (Left Column)
function renderFullProfile() {
    if (!fullProfileList) return;
    const p = athleteDocData.personal || {};
    const m = athleteDocData.medicalPhysical || {};
    const a = athleteDocData.athletic || {};
    const l = athleteDocData.playingLevel || {};

    const createRow = (label, val) => `<div class="flex flex-col pb-2 border-b border-gray-50 mb-2"><span class="text-xs text-gray-400 font-bold uppercase">${label}</span><span class="text-sm font-medium text-gray-800 break-words">${val || "-"}</span></div>`;

    let html = "";
    html += createRow("Name", p.fullName);
    html += createRow("DOB", p.dob);
    html += createRow("Gender", p.gender);
    html += createRow("Phone", p.phone);
    html += createRow("Email", p.email);
    html += createRow("Address", p.address ? `${p.address.street}, ${p.address.city}` : "-");
    html += createRow("Height", `${m.height || "-"} cm`);
    html += createRow("Weight", `${m.weight || "-"} kg`);
    html += createRow("Blood", m.blood);
    html += createRow("Medical", m.medical);
    html += createRow("Category", a.category);
    html += createRow("Coach", a.coach);
    html += createRow("Training", a.trainingDays);
    html += createRow("School", l.school);
    html += createRow("Club", l.club);
    fullProfileList.innerHTML = html;
}

// Display Official Documents (Center Column)
function renderDocuments() {
    if (officialDocsGrid) officialDocsGrid.innerHTML = "";

    const docs = athleteDocData.documents || {};
    let hasOfficial = false;

    // Helper to generate doc card HTML
    const addCard = (container, label, url) => {
        if (url && url.length > 5) {
            createDocCard(container, label, url);
            hasOfficial = true;
        }
    };

    addCard(officialDocsGrid, "ID Document", docs.idDoc);
    addCard(officialDocsGrid, "Club Letter", docs.clubIDDoc);
    addCard(officialDocsGrid, "Consent Form", docs.consentDoc);

    if (noOfficialDocsText) noOfficialDocsText.classList.toggle("hidden", hasOfficial);
}

function createDocCard(container, label, url) {
    const div = document.createElement("div");
    div.className = "bg-gray-50 border border-gray-200 rounded-xl p-3 flex flex-col gap-2";
    div.innerHTML = `
        <div class="flex items-center justify-between"><span class="text-sm font-semibold text-gray-700 truncate pr-2">${label}</span><div class="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-bold">📄</div></div>
        <div class="flex justify-between items-center mt-2"><button onclick="viewDocument('${url}')" class="text-xs text-white bg-[var(--secondary)] px-3 py-1 rounded-full font-bold hover:bg-[var(--primary)] transition">View</button><span class="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded font-medium">Official</span></div>
    `;
    container.appendChild(div);
}

// Display Achievements (Max 3 Slots)
function renderAchievements() {
    if (!achievementsWrapper) return;
    achievementsWrapper.innerHTML = "";

    const verifications = athleteDocData.verifications || {};
    const achList = athleteDocData.achievementsList || [];

    // Generate Dropdowns for Upload Mode
    const athletic = athleteDocData.athletic || {};
    const events = athletic.events || [];
    const eventNames = events.map(e => e.event);
    const historyEvents = Object.keys(athleteDocData.performanceResults || {});
    // Combine events from profile + history + defaults
    const allEvents = [...new Set([...eventNames, ...historyEvents, "100m", "200m", "400m", "800m", "1500m"])];
    const eventOptions = allEvents.map(e => `<option value="${e}">${e}</option>`).join("");
    const ageOptions = ["U12", "U14", "U16", "U18", "U20", "Open"].map(a => `<option value="${a}">${a}</option>`).join("");

    // Create 3 Slots
    for (let i = 0; i < 3; i++) {
        const ach = achList[i];
        const slotDiv = document.createElement("div");
        slotDiv.className = "border-2 border-dashed border-gray-300 rounded-xl p-4 bg-gray-50 relative";

        if (ach) {
            // -- VIEW MODE (Data Exists) --
            const isVerified = verifications[ach.id] && verifications[ach.id].verified;
            let badge = "";

            if (isVerified) {
                const vData = verifications[ach.id];
                badge = `<div class="group relative inline-block"><span class="verified-badge bg-green-100 text-green-700 border border-green-200 cursor-help">✓ Verified</span><div class="hidden group-hover:block absolute bottom-full right-0 mb-2 w-56 bg-gray-800 text-white text-xs rounded p-2 shadow-lg z-50"><p class="font-bold">Coach: ${vData.by}</p><p class="text-[10px]">ID: ${vData.coachId}</p></div></div>`;
            } else {
                badge = `<button onclick="openVerifyModal('${ach.id}')" class="text-[10px] bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1 rounded transition font-bold">Verify</button>`;
            }

            slotDiv.classList.remove("border-dashed");
            slotDiv.classList.add("border-gray-200", "bg-white", "shadow-sm");
            slotDiv.innerHTML = `
                <div class="flex justify-between items-start mb-2">
                    <h4 class="text-xs font-bold text-[var(--primary)] uppercase">Achievement ${i + 1}</h4>
                    <button onclick="removeAchievement(${i})" class="text-red-500 hover:text-red-700 text-xs font-bold bg-white px-2 py-1 rounded border border-red-100 shadow-sm">Remove</button>
                </div>
                <div class="mb-3 space-y-1">
                    <p class="text-xs text-gray-700"><b>Event:</b> ${ach.event}</p>
                    <p class="text-xs text-gray-700"><b>Meet:</b> ${ach.meet}</p>
                    <p class="text-xs text-gray-700"><b>Place:</b> ${ach.place}</p>
                    <p class="text-xs text-gray-700"><b>Category:</b> ${ach.age}</p>
                </div>
                <div class="flex justify-between items-center border-t border-gray-100 pt-2">
                    <button onclick="viewDocument('${ach.url}')" class="text-xs text-white bg-[var(--secondary)] px-3 py-1 rounded-full font-bold hover:bg-[var(--primary)] transition">View</button>
                    ${badge}
                </div>
            `;
        } else {
            // -- EDIT MODE (Empty Slot) --
            slotDiv.innerHTML = `
                <h4 class="text-xs font-bold text-gray-400 uppercase mb-3">Achievement ${i + 1}</h4>
                <p class="text-[10px] text-gray-500 mb-3 italic">Upload your past 12 month achievement</p>
                <div class="space-y-2">
                    <select id="slot_${i}_event" class="w-full text-xs p-2 rounded border border-gray-300 outline-none text-gray-500"><option value="" disabled selected>Select Event</option>${eventOptions}</select>
                    <select id="slot_${i}_age" class="w-full text-xs p-2 rounded border border-gray-300 outline-none text-gray-500"><option value="" disabled selected>Select Age Category</option>${ageOptions}</select>
                    
                    <input type="text" id="slot_${i}_meet" placeholder="Meet / Competition" class="w-full text-xs p-2 rounded border border-gray-300 outline-none">
                    <input type="text" id="slot_${i}_place" placeholder="Place (e.g. 1st)" class="w-full text-xs p-2 rounded border border-gray-300 outline-none">
                    
                    <div class="flex gap-2 items-center pt-1">
                        <input type="file" id="slot_${i}_file" accept="image/*, application/pdf" class="hidden" onchange="document.getElementById('slot_${i}_btn').textContent = this.files[0].name">
                        <button onclick="document.getElementById('slot_${i}_file').click()" id="slot_${i}_btn" class="text-[10px] bg-white text-gray-600 border border-gray-300 px-3 py-2 rounded-lg hover:bg-gray-100 flex-1 text-left truncate">Select File</button>
                        <button onclick="uploadSlot(${i}, this)" class="px-3 py-1 bg-[var(--highlight)] text-[var(--primary)] font-bold rounded-lg hover:bg-yellow-400 shadow-md transition text-xs">Add</button>
                    </div>
                </div>
            `;
        }
        achievementsWrapper.appendChild(slotDiv);
    }
}

// =======================================================
// 9. LOGIC: UPLOAD ACHIEVEMENT
// Handles saving a single achievement slot to Firestore.
// =======================================================
window.uploadSlot = async (index, btnElement) => {
    // Get values from the specific slot's inputs
    const event = document.getElementById(`slot_${index}_event`).value.trim();
    const age = document.getElementById(`slot_${index}_age`).value.trim();
    const meet = document.getElementById(`slot_${index}_meet`).value.trim();
    const place = document.getElementById(`slot_${index}_place`).value.trim();
    const fileInput = document.getElementById(`slot_${index}_file`);

    // Validation
    if (!event || !age || !meet || !place || !fileInput.files[0]) {
        return showMessage("Please fill all fields & select file", "error");
    }

    const file = fileInput.files[0];
    if (file.size > 2 * 1024 * 1024) return showMessage("File too large (Max 2MB)", "error");

    // UI Loading state
    if (btnElement) {
        btnElement.textContent = "...";
        btnElement.disabled = true;
    }

    try {
        const id = `ach_${Date.now()}`;
        const base64String = await fileToBase64(file);

        const newAch = {
            id, event, meet, place, age, url: base64String,
            date: new Date().toISOString().split('T')[0]
        };

        // Get existing array, update slot, remove nulls
        let currentList = athleteDocData.achievementsList || [];
        currentList[index] = newAch;
        currentList = currentList.filter(n => n);

        // Update DB
        await updateDoc(doc(db, "athletes", currentUID), {
            achievementsList: currentList
        });

        // Update Local & Render
        athleteDocData.achievementsList = currentList;
        renderAchievements();
        showMessage("Achievement Added!", "success");

    } catch (err) {
        console.error(err);
        showMessage("Upload Failed: " + err.message, "error");
        if (btnElement) {
            btnElement.textContent = "Add";
            btnElement.disabled = false;
        }
    }
};

// =======================================================
// 10. LOGIC: REMOVE ACHIEVEMENT
// =======================================================
window.removeAchievement = async (index) => {
    if (!confirm("Remove this achievement?")) return;
    try {
        let currentList = athleteDocData.achievementsList || [];
        currentList.splice(index, 1); // Remove item at index

        await updateDoc(doc(db, "athletes", currentUID), { achievementsList: currentList });

        athleteDocData.achievementsList = currentList;
        renderAchievements();
        showMessage("Removed", "info");
    } catch (err) {
        console.error(err);
        showMessage("Failed to remove", "error");
    }
};

// =======================================================
// 11. MODAL LOGIC (Document Viewer)
// =======================================================
window.viewDocument = (url) => {
    if (!url) return;
    docContentArea.innerHTML = '<p class="text-gray-500">Loading...</p>';
    docViewModal.classList.remove('hidden');

    const isPdf = url.includes('application/pdf') || url.includes('.pdf') || url.includes('type=pdf');
    if (isPdf) {
        docContentArea.innerHTML = `<iframe src="${url}" class="w-full h-full border-none rounded"></iframe>`;
    } else {
        docContentArea.innerHTML = `<img src="${url}" class="max-w-full max-h-full object-contain shadow-lg" alt="Document">`;
    }
};

window.closeDocViewer = () => {
    docViewModal.classList.add('hidden');
    docContentArea.innerHTML = '';
};

// =======================================================
// 12. MODAL LOGIC (Coach Verification)
// =======================================================
window.openVerifyModal = (docKey) => {
    currentVerifyingDoc = docKey;
    verifierNameInput.value = ""; verifierNotesInput.value = ""; document.getElementById("verifierID").value = "";
    verifyModal.classList.remove("hidden");
};
cancelVerifyBtn.addEventListener("click", () => verifyModal.classList.add("hidden"));

confirmVerifyBtn.addEventListener("click", async () => {
    const name = verifierNameInput.value.trim();
    const coachId = document.getElementById("verifierID").value.trim();
    const notes = verifierNotesInput.value.trim();

    if (!name || !coachId) return alert("Name & Coach ID required");

    confirmVerifyBtn.disabled = true;
    try {
        const vData = { verified: true, by: name, coachId: coachId, notes: notes, at: new Date().toISOString() };

        // Save verification to DB (Merged into 'verifications' map)
        await setDoc(doc(db, "athletes", currentUID), { verifications: { [currentVerifyingDoc]: vData } }, { merge: true });

        // Update Local State
        if (!athleteDocData.verifications) athleteDocData.verifications = {};
        athleteDocData.verifications[currentVerifyingDoc] = vData;
        renderAchievements();
        verifyModal.classList.add("hidden");
        showMessage("Verified!", "success");
    } catch (err) { console.error(err); showMessage("Failed", "error"); }
    finally { confirmVerifyBtn.disabled = false; }
});

// =======================================================
// 13. GRAPHING LOGIC (Plotly.js)
// =======================================================

// Populate Dropdown for Graph
function populateEventDropdowns() {
    const athletic = athleteDocData.athletic || {};
    const events = athletic.events || [];
    const eventNames = events.map(e => e.event);
    const historyEvents = Object.keys(athleteDocData.performanceResults || {});
    // Unique list of all events user has participated in
    const allEvents = [...new Set([...eventNames, ...historyEvents, "100m", "200m", "400m", "800m", "1500m"])];

    const opts = allEvents.map(e => `<option value="${e}">${e}</option>`).join("");
    eventSelect.innerHTML = opts;
    performanceEventSelect.innerHTML = opts;
}

// Draw Chart
function renderPerformanceGraph(eventName) {
    graphEventLabel.textContent = eventName;
    const allResults = athleteDocData.performanceResults || {};
    let dataPoints = allResults[eventName] || [];

    // Sort by Date (Oldest to Newest)
    dataPoints.sort((a, b) => new Date(a.date) - new Date(b.date));

    if (dataPoints.length === 0) {
        noPerformanceText.classList.remove("hidden");
        // Draw empty chart frame
        Plotly.newPlot(performanceChartDiv, [], { title: `No Data`, xaxis: { showgrid: false }, yaxis: { showgrid: false } });
        return;
    }
    noPerformanceText.classList.add("hidden");

    // Plotly Trace
    const trace = {
        x: dataPoints.map(d => d.date),
        y: dataPoints.map(d => d.time),
        type: 'scatter', mode: 'lines+markers',
        line: { color: '#012A61', width: 3 },
        marker: { color: '#FDC787', size: 10 }
    };
    const layout = {
        title: { text: `${eventName} Progression`, font: { size: 16, color: '#012A61', family: "Montserrat" } },
        xaxis: { title: "Date" }, yaxis: { title: "Time (s)" },
        margin: { t: 40, b: 40, l: 50, r: 20 }, font: { family: "Montserrat" }
    };
    Plotly.newPlot(performanceChartDiv, [trace], layout, { responsive: true, displayModeBar: false });
}

// Change Graph when Dropdown Changes
eventSelect.addEventListener("change", () => renderPerformanceGraph(eventSelect.value));

// =======================================================
// 14. SUBMIT PERFORMANCE RESULT
// Adds a new data point to the graph.
// =======================================================
performanceForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentUID) return;
    const evt = performanceEventSelect.value;
    const date = performanceDateInput.value;
    const time = parseFloat(performanceTimeInput.value);

    // Validate Realistic Time
    if (eventTimeLimits[evt]) {
        if (time < eventTimeLimits[evt].min || time > eventTimeLimits[evt].max) {
            showMessage(`Time unrealistic for ${evt}. Check value.`, "error");
            return;
        }
    }

    try {
        showLoading();
        performanceSubmitBtn.disabled = true;
        performanceSubmitBtn.textContent = "Saving...";
        const newEntry = { date, time, createdAt: new Date().toISOString() };

        // Add to Firestore Array
        await updateDoc(doc(db, "athletes", currentUID), { [`performanceResults.${evt}`]: arrayUnion(newEntry) });

        // Update Local & Redraw Graph
        if (!athleteDocData.performanceResults) athleteDocData.performanceResults = {};
        if (!athleteDocData.performanceResults[evt]) athleteDocData.performanceResults[evt] = [];
        athleteDocData.performanceResults[evt].push(newEntry);

        showMessage("Result Added!", "success");
        if (eventSelect.value === evt) renderPerformanceGraph(evt);
        performanceForm.reset();
    } catch (err) {
        console.error(err);
        showMessage("Error saving result", "error");
    } finally {
        hideLoading();
        performanceSubmitBtn.disabled = false;
        performanceSubmitBtn.textContent = "Save Result";
    }
});