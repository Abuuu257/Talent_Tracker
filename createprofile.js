import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-storage.js";
import { showLoading, hideLoading } from "./ui-utils.js";

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

// Global Variables
let currentUID = null;
const form = document.getElementById("athleteForm");
const submitBtn = form?.querySelector("button[type='button']"); // The button you click

// Limits for Event Validation (Min/Max seconds)
const eventTimeLimits = { "100m": { min: 9.0, max: 20.0 }, "200m": { min: 19.0, max: 45.0 }, "400m": { min: 43.0, max: 120.0 }, "800m": { min: 100.0, max: 300.0 }, "1500m": { min: 200.0, max: 600.0 } };

// --- 2. UI HELPERS (Messages & Errors) ---

// Displays the pop-up message at top right
function displayMessage(message, type = 'info') {
    let msgBox = document.getElementById('customMessageBox');
    if (!msgBox) {
        msgBox = document.createElement('div');
        msgBox.id = 'customMessageBox';
        msgBox.className = 'fixed top-4 right-4 p-4 rounded-lg shadow-xl z-50 transition-opacity duration-300 opacity-0 text-white font-bold tracking-wide';
        document.body.appendChild(msgBox);
    }
    msgBox.textContent = message;

    // Reset colors
    msgBox.classList.remove('msg-success', 'msg-error', 'msg-warning');

    // Apply color based on type
    if (type === 'error') msgBox.classList.add('msg-error'); // Red
    else if (type === 'warning') msgBox.classList.add('msg-warning'); // Orange
    else msgBox.classList.add('msg-success'); // Blue/Green

    // Show animation
    msgBox.classList.remove('opacity-0');
    setTimeout(() => msgBox.classList.add('opacity-0'), 4000);
}

// Shows red text under specific inputs
function toggleError(id, message) {
    const el = document.getElementById(id);
    // Safety Check: Only try to show error if element exists
    if (el) {
        el.textContent = message || "";
        el.classList.toggle('visible', !!message);
    }
}

// --- 3. NAVBAR & MOBILE MENU LOGIC ---
const mobileMenuBtn = document.getElementById("mobileMenuButton");
const mobileMenu = document.getElementById("mobileMenu");
const mobileBackBtn = document.getElementById("mobileBackBtn");
const navLoginBtn = document.getElementById("navLoginBtn");
const navUserDropdown = document.getElementById("navUserDropdown");
const mobileLoginBtn = document.getElementById("mobileLoginBtn");
const mobileUserDropdown = document.getElementById("mobileUserDropdown");

// Add event listeners ONLY if elements exist (Prevents crashes on different pages)
if (mobileMenuBtn) mobileMenuBtn.addEventListener("click", () => mobileMenu?.classList.remove("translate-x-full"));
if (mobileBackBtn) mobileBackBtn.addEventListener("click", () => mobileMenu?.classList.add("translate-x-full"));
if (navLoginBtn) navLoginBtn.addEventListener("click", (e) => { e.stopPropagation(); navUserDropdown?.classList.toggle("hidden"); });

// --- 4. AUTHENTICATION ---
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        // If not logged in, kick back to home
        window.location.href = "index.html";
        return;
    }
    currentUID = user.uid;

    // Update Navbar with Name
    let name = user.displayName || localStorage.getItem("tt_username") || user.email.split("@")[0];
    let profilePic = null;

    try {
        const docRef = doc(db, "athletes", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            name = data.username || data.personal?.fullName?.split(" ")[0] || name;
            profilePic = data.documents?.profilePic || null;
            if (name) localStorage.setItem("tt_username", name);
        }
    } catch (err) { console.error("Error fetching name", err); }

    const navBtnText = document.getElementById("navBtnText");
    const navPic = document.getElementById("navUserPic");
    const navImg = document.getElementById("navUserImg");
    const mobilePic = document.getElementById("mobileUserPic");
    const mobileImg = document.getElementById("mobileUserImg");

    if (navBtnText) navBtnText.textContent = name;
    if (document.getElementById("mobileUserName")) document.getElementById("mobileUserName").textContent = name;

    // Show Profile Pics
    if (navPic) navPic.classList.remove("hidden");
    if (mobilePic) mobilePic.classList.remove("hidden");

    if (profilePic) {
        if (navImg) { navImg.src = profilePic; navImg.classList.remove("hidden"); }
        if (mobileImg) { mobileImg.src = profilePic; mobileImg.classList.remove("hidden"); }
    } else {
        if (navImg) navImg.classList.add("hidden");
        if (mobileImg) mobileImg.classList.add("hidden");
    }

    // Fill hidden/readonly email fields
    if (document.getElementById("navUserEmail")) document.getElementById("navUserEmail").textContent = user.email;
    if (document.getElementById("mobileUserEmail")) document.getElementById("mobileUserEmail").textContent = user.email;
    if (document.getElementById("email")) {
        document.getElementById("email").value = user.email;
        document.getElementById("email").readOnly = true;
    }

    // CHECK URL: Are we in Edit Mode? (?edit=true)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('edit') === 'true') {
        loadProfileForEdit();
    }
});

// Logout Handlers
document.getElementById("logoutBtn")?.addEventListener("click", async () => { await signOut(auth); window.location.href = "index.html"; });
document.getElementById("mobileLogoutBtn")?.addEventListener("click", async () => { await signOut(auth); window.location.href = "index.html"; });

// --- 5. EDIT PROFILE: AUTO-FILL FORM ---
async function loadProfileForEdit() {
    try {
        showLoading();
        const docSnap = await getDoc(doc(db, "athletes", currentUID));
        if (docSnap.exists()) {
            const data = docSnap.data();

            // Get data sections (supports old & new structure)
            const p = data.personal || data.personalInfo || {};
            const m = data.medicalPhysical || data.physicalMedical || {};
            const a = data.athletic || data.athleticInfo || {};
            const l = data.playingLevel || {};
            const docs = data.documents || {};

            // --- Fill Text Inputs (Only if element exists in HTML) ---
            const safeSet = (id, val) => {
                const el = document.getElementById(id);
                if (el) el.value = val || "";
            };

            safeSet("fullName", p.fullName);
            safeSet("dob", p.dob);
            safeSet("gender", p.gender);
            safeSet("phone", p.phone);

            // Address (Handle missing Country field safely)
            if (p.address) {
                safeSet("street", p.address.street);
                safeSet("city", p.address.city);
                // Country removed from HTML, so we just ignore it
            }

            safeSet("height", m.height);
            safeSet("weight", m.weight);
            safeSet("blood", m.blood || "Unknown");
            safeSet("allergies", m.allergies);
            safeSet("medical", m.medical);
            safeSet("mealPlan", m.mealPlan); // New field

            safeSet("category", a.category);
            safeSet("coachName", a.coach || a.coachName);

            // Clean up "5 days/week" to just "5" for dropdown
            let tDays = a.trainingDays || "";
            if (tDays.includes(" ")) tDays = tDays.split(" ")[0];
            safeSet("trainDays", tDays);

            safeSet("school", l.school);
            safeSet("club", l.club);

            // --- Fill Events (Dynamic Rows) ---
            const eventsContainer = document.getElementById("eventsContainer");
            if (eventsContainer) {
                eventsContainer.innerHTML = ""; // Clear existing
                if (a.events && a.events.length > 0) {
                    a.events.forEach(evt => {
                        addEventRow(evt); // Create row with data
                    });
                } else {
                    addEventRow(); // Create empty row
                }
            }

            // --- SHOW FILE PREVIEWS (Crucial for Edit Mode) ---
            const showFilePreview = (key, inputId) => {
                if (docs[key]) {
                    const inputEl = document.getElementById(inputId);
                    if (!inputEl) return; // Skip if input removed from HTML (like perfDocs)

                    let prevDiv = document.getElementById("preview_" + inputId);
                    if (!prevDiv) {
                        // Create preview div if missing
                        const inputDiv = inputEl.parentElement;
                        prevDiv = document.createElement("div");
                        prevDiv.id = "preview_" + inputId;
                        prevDiv.className = "mb-2";
                        inputDiv.insertBefore(prevDiv, inputEl);
                    }

                    prevDiv.classList.remove('hidden');
                    let src = docs[key];

                    if (key === 'profilePic') {
                        // Add timestamp to image URL to stop caching old pics
                        if (src.startsWith('http')) src += "?t=" + new Date().getTime();
                        prevDiv.innerHTML = `<img src="${src}" class="w-20 h-20 rounded border border-gray-300 object-cover"><span class="text-xs text-green-600 font-bold block mt-1">✓ Current Saved</span>`;
                    } else {
                        prevDiv.innerHTML = `<a href="${src}" target="_blank" class="text-blue-600 underline text-sm">View Saved File</a> <span class="text-xs text-green-600 font-bold">✓ Saved</span>`;
                    }
                    // IMPORTANT: File already exists, so input is NOT required now
                    inputEl.removeAttribute("required");
                }
            };

            showFilePreview('profilePic', 'profilePic');
            showFilePreview('idDoc', 'idDoc');
            showFilePreview('clubIDDoc', 'clubIDDoc');
            showFilePreview('consentDoc', 'consentDoc');

            // (Removed perfDocs logic since you removed the input from HTML)

            // --- Consent Logic Check ---
            // If editing a U12-U18 profile, make sure consent box is visible
            if (["U12", "U14", "U16", "U18"].includes(a.category)) {
                const conContainer = document.getElementById("consentContainer");
                if (conContainer) conContainer.classList.remove("hidden");

                // If we don't have a doc saved, mark it required
                if (!docs.consentDoc) {
                    const conInput = document.getElementById("consentDoc");
                    if (conInput) conInput.setAttribute("required", "true");
                }
            }

            // Update Button Text
            if (submitBtn) submitBtn.textContent = "Update Profile";
            displayMessage("Profile data loaded for editing.", "success");
        }
    } catch (err) {
        console.error("Error loading profile for edit:", err);
    } finally {
        hideLoading();
    }
}

// --- 6. DYNAMIC EVENTS ROW GENERATOR ---
window.addEventRow = function (data = null) {
    const container = document.getElementById("eventsContainer");
    if (!container) return; // Safety

    const div = document.createElement("div");
    div.className = "flex flex-col gap-3 p-4 bg-white border-2 border-gray-200 rounded-lg shadow-sm event-row relative mb-4";

    div.innerHTML = `
        <div class="flex justify-between items-center border-b pb-2 mb-2">
            <h4 class="font-bold text-gray-700">Event Entry</h4>
            <button type="button" onclick="this.closest('.event-row').remove()" class="text-red-500 font-bold hover:text-red-700 text-sm">Remove</button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
                <label class="text-xs font-semibold text-gray-500 uppercase">Event Type <span class="text-red-500">*</span></label>
                <select class="input event-select">
                    <option value="">Select</option>
                    <option value="100m">100m</option><option value="200m">200m</option><option value="400m">400m</option>
                    <option value="800m">800m</option><option value="1500m">1500m</option><option value="Other">Other</option>
                </select>
            </div>
            <div>
                <label class="text-xs font-semibold text-gray-500 uppercase">PB (Sec) <span class="text-red-500">*</span></label>
                <input type="number" step="0.01" class="input event-time" placeholder="e.g. 10.5">
            </div>
            <div>
                <label class="text-xs font-semibold text-gray-500 uppercase">Experience</label>
                <select class="input event-experience">
                    <option value="">Select</option><option value="Regional Novice">Beginner</option>
                    <option value="National Competitor">Intermediate</option><option value="International Elite">National level</option>
                </select>
            </div>
            <div>
                <label class="text-xs font-semibold text-gray-500 uppercase">Best Comp</label>
                <select class="input event-level">
                    <option value="">Select</option><option value="All-Island School Sports Festival">All-Island School Sports Festival</option>
                    <option value="National Sports Festival">National Sports Festival</option><option value="Divisional">Divisional</option><option value="District">District</option><option value="Provincial">Provincial</option><option value="All-Island">All-Island</option>
                </select>
            </div>
        </div>
        <p class="text-red-500 text-xs hidden event-row-error">Fill all 4 fields</p>
    `;

    container.appendChild(div);

    // If data passed (Edit Mode), select the values
    if (data) {
        div.querySelector(".event-select").value = data.event || "";
        div.querySelector(".event-time").value = data.pb || "";
        div.querySelector(".event-experience").value = data.experience || "";
        div.querySelector(".event-level").value = data.bestCompetition || "";
    }
};

// Add initial row if empty and not editing
if (document.getElementById("eventsContainer") && !new URLSearchParams(window.location.search).get('edit')) {
    window.addEventRow();
}

// --- 7. INPUT VALIDATION LOGIC ---

// DOB: Age Limit 10+
const dobInput = document.getElementById("dob");
if (dobInput) {
    dobInput.addEventListener("change", function () {
        const dob = new Date(this.value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let age = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
            age--;
        }

        if (dob > today) {
            toggleError("err-dob", "Date cannot be in future.");
            this.value = "";
        } else if (age < 10) {
            toggleError("err-dob", "You must be at least 10 years old to register.");
            this.value = "";
        } else {
            toggleError("err-dob", "");
        }
    });
}

// Category: Show/Hide Consent
const categorySelect = document.getElementById("category");
const consentContainer = document.getElementById("consentContainer");
const consentInput = document.getElementById("consentDoc");
const under18Categories = ["U12", "U14", "U16", "U18"];

if (categorySelect) {
    categorySelect.addEventListener("change", function () {
        if (under18Categories.includes(this.value)) {
            consentContainer.classList.remove("hidden");
            // Only make required if no preview exists (not already uploaded)
            const preview = document.getElementById("preview_consentDoc");
            if (!preview || preview.classList.contains('hidden')) {
                consentInput.setAttribute("required", "true");
            }
        } else {
            consentContainer.classList.add("hidden");
            consentInput.removeAttribute("required");
        }
    });
}

// --- 8. FILE HELPER ---
async function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}

// --- 9. SUBMIT FUNCTION (The Core) ---
window.submitProfile = async function () {
    // 1. Reset visual errors
    document.querySelectorAll('.error-text').forEach(e => e.classList.remove('visible'));
    document.querySelectorAll('.event-row').forEach(e => e.classList.remove('border-red-500'));

    // 2. Check if Form is Blank
    let isFormBlank = true;
    const allInputs = document.querySelectorAll('#athleteForm input, #athleteForm select');
    for (let input of allInputs) {
        if (input.value && input.type !== 'submit' && input.type !== 'button') { isFormBlank = false; break; }
    }
    if (isFormBlank) { displayMessage("Please fill the form before submitting.", 'warning'); return; }

    // 3. Define Required Fields
    // NOTE: 'country' and 'perfDocs' removed from this list to prevent crashes
    const requiredIds = ["fullName", "dob", "gender", "phone", "email", "street", "city", "category", "height", "weight"];
    let hasRequiredError = false;

    // Helper: Check File Inputs (Require only if empty AND no preview)
    const checkFile = (id, prevId) => {
        const input = document.getElementById(id);
        const prev = document.getElementById(prevId);
        // Only run if input exists in HTML
        if (input) {
            // Error if: Files empty AND (Preview missing OR Preview hidden)
            if (input.files.length === 0 && (!prev || prev.classList.contains('hidden'))) {
                toggleError(`err-${id}`, "Required");
                hasRequiredError = true;
            }
        }
    };

    checkFile("profilePic", "preview_profilePic");
    checkFile("idDoc", "preview_idDoc");

    // Check consent only if visible
    if (consentContainer && !consentContainer.classList.contains("hidden")) {
        checkFile("consentDoc", "preview_consentDoc");
    }

    // Check Text Inputs
    requiredIds.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return; // Skip if element not found in HTML
        if (!el.value) {
            toggleError(`err-${id}`, "Required");
            hasRequiredError = true;
        }
    });

    if (hasRequiredError) {
        displayMessage("Please complete all required fields.", 'warning');
        document.querySelector('.error-text.visible')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
    }

    // 4. Logic Checks (BMI & Events)
    let hasLogicError = false;
    const h = parseFloat(document.getElementById("height").value);
    const w = parseFloat(document.getElementById("weight").value);

    // BMI Validation
    if (h < 50 || h > 280) { toggleError("err-height", "Invalid Height."); hasLogicError = true; }
    if (w < 20 || w > 300) { toggleError("err-weight", "Invalid Weight."); hasLogicError = true; }
    const heightInMeters = h / 100;
    const bmi = w / (heightInMeters * heightInMeters);
    if (bmi < 10 || bmi > 60) {
        toggleError("err-bmi", "Please verify your height and weight — the BMI calculation shows the values are unrealistic.");
        hasLogicError = true;
    }

    // Event Validation
    const eventRows = document.querySelectorAll(".event-row");
    const eventData = [];
    if (eventRows.length === 0) {
        toggleError("err-events", "Please add at least one event.");
        hasLogicError = true;
    } else {
        let hasValidEvent = false;
        eventRows.forEach(row => {
            const evt = row.querySelector(".event-select").value;
            const time = parseFloat(row.querySelector(".event-time").value);
            const exp = row.querySelector(".event-experience").value;
            const lvl = row.querySelector(".event-level").value;

            // Check if row is complete
            if (evt && time && exp && lvl) {
                // Check if time is realistic
                if (eventTimeLimits[evt]) {
                    if (time < eventTimeLimits[evt].min || time > eventTimeLimits[evt].max) {
                        displayMessage(`This personal best time is impossible so enter correct value`, 'error');
                        hasLogicError = true; row.classList.add('border-red-500');
                    } else {
                        eventData.push({ event: evt, pb: time, experience: exp, bestCompetition: lvl });
                        hasValidEvent = true;
                    }
                } else {
                    eventData.push({ event: evt, pb: time, experience: exp, bestCompetition: level });
                    hasValidEvent = true;
                }
            } else {
                // Row is incomplete
                row.classList.add('border-red-500');
                row.querySelector('.event-row-error').classList.remove('hidden');
                hasLogicError = true;
            }
        });

        if (!hasValidEvent && !hasLogicError) {
            toggleError("err-events", "Please add a valid event.");
            hasLogicError = true;
        }
    }

    if (hasLogicError) {
        document.querySelector('.error-text.visible')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
    }

    // 5. UPLOAD & SAVE
    submitBtn.textContent = "Uploading...";
    submitBtn.disabled = true;

    try {
        showLoading();
        // Fetch OLD data first (To merge files)
        let existingDocs = {};
        if (currentUID) {
            const snap = await getDoc(doc(db, "athletes", currentUID));
            if (snap.exists()) existingDocs = snap.data().documents || {};
        }

        // Process NEW files only
        const fileData = {};
        const singleFiles = ["profilePic", "idDoc", "consentDoc", "clubIDDoc"];

        for (const id of singleFiles) {
            const input = document.getElementById(id);
            if (input && input.files.length > 0) {
                fileData[id] = await fileToBase64(input.files[0]);
            }
        }

        // Merge: Keep old docs, overwrite with new uploads
        const finalDocs = { ...existingDocs, ...fileData };

        // Construct Data Object (Note: Country removed from address)
        const profileData = {
            personal: {
                fullName: document.getElementById("fullName").value,
                dob: document.getElementById("dob").value,
                gender: document.getElementById("gender").value,
                phone: document.getElementById("phone").value,
                email: document.getElementById("email").value,
                address: {
                    street: document.getElementById("street").value,
                    city: document.getElementById("city").value
                }
            },
            athletic: {
                category: document.getElementById("category").value,
                events: eventData,
                coach: document.getElementById("coachName").value || "N/A",
                trainingDays: document.getElementById("trainDays").value + " days/week"
            },
            medicalPhysical: {
                height: parseFloat(document.getElementById("height").value),
                weight: parseFloat(document.getElementById("weight").value),
                blood: document.getElementById("blood").value,
                allergies: document.getElementById("allergies").value,
                medical: document.getElementById("medical").value,
                mealPlan: document.getElementById("mealPlan").value
            },
            playingLevel: {
                school: document.getElementById("school").value,
                club: document.getElementById("club").value
            },
            documents: finalDocs,
            status: "Pending",
            updatedAt: new Date().toISOString()
        };

        // Save to Database
        await setDoc(doc(db, "athletes", currentUID), profileData, { merge: true });

        displayMessage("Profile saved successfully!", "success");
        setTimeout(() => window.location.href = "dashboard.html", 2000);

    } catch (error) {
        console.error(error);
        displayMessage("Error uploading profile: " + error.message, 'error');
        submitBtn.textContent = "Submit Profile";
        submitBtn.disabled = false;
    } finally {
        hideLoading();
    }
};