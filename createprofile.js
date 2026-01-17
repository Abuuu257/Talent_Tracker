import {
    auth,
    onAuthChange,
    signOut,
    getAthleteProfile,
    saveAthleteProfile,
    uploadFile
} from "./register.js";
import { showLoading, hideLoading, updateNavbar } from "./ui-utils.js";
import { setupDropdownInput, syncDropdown, CITIES } from "./locations.js";

// Global Variables
let currentUID = null;
const form = document.getElementById("athleteForm");
const submitBtn = form?.querySelector("button[type='button']");

// Limits for Event Validation
const eventTimeLimits = {
    "100m": { min: 9.0, max: 20.0 },
    "200m": { min: 19.0, max: 45.0 },
    "400m": { min: 43.0, max: 120.0 },
    "800m": { min: 100.0, max: 300.0 },
    "1200m": { min: 160.0, max: 500.0 },
    "1500m": { min: 200.0, max: 600.0 },
    "5000m": { min: 700.0, max: 1800.0 },
    "10000m": { min: 1500.0, max: 4000.0 },
    "Long Jump": { min: 3.0, max: 10.0 },
    "High Jump": { min: 1.0, max: 3.0 }
};

// UI Helpers
function displayMessage(message, type = 'info') {
    let msgBox = document.getElementById('customMessageBox');
    if (!msgBox) {
        msgBox = document.createElement('div');
        msgBox.id = 'customMessageBox';
        msgBox.className = 'fixed top-4 right-4 p-4 rounded-lg shadow-xl z-50 transition-opacity duration-300 opacity-0 text-white font-bold tracking-wide';
        document.body.appendChild(msgBox);
    }
    msgBox.textContent = message;
    msgBox.classList.remove('msg-success', 'msg-error', 'msg-warning');

    if (type === 'error') msgBox.classList.add('msg-error');
    else if (type === 'warning') msgBox.classList.add('msg-warning');
    else msgBox.classList.add('msg-success');

    msgBox.classList.remove('opacity-0');
    setTimeout(() => msgBox.classList.add('opacity-0'), 4000);
}

function toggleError(id, message) {
    const el = document.getElementById(id);
    if (el) {
        el.textContent = message || "";
        el.classList.toggle('visible', !!message);
    }
}

// Navbar Logic
const mobileMenuBtn = document.getElementById("mobileMenuButton");
const mobileMenu = document.getElementById("mobileMenu");
const mobileBackBtn = document.getElementById("mobileBackBtn");
const navLoginBtn = document.getElementById("navLoginBtn");
const navUserDropdown = document.getElementById("navUserDropdown");

if (mobileMenuBtn) mobileMenuBtn.addEventListener("click", () => mobileMenu?.classList.remove("translate-x-full"));
if (mobileBackBtn) mobileBackBtn.addEventListener("click", () => mobileMenu?.classList.add("translate-x-full"));
if (navLoginBtn) navLoginBtn.addEventListener("click", (e) => { e.stopPropagation(); navUserDropdown?.classList.toggle("hidden"); });

// Auth state
onAuthChange(async (user) => {
    if (!user) {
        window.location.href = "index.html";
        return;
    }
    currentUID = user.uid || user.id; // handle both

    let name = user.displayName || user.username || localStorage.getItem("tt_username") || user.email.split("@")[0];
    let profilePic = null;
    let data = null;

    // Update Navbar immediately
    updateNavbar(user, null);

    try {
        data = await getAthleteProfile(currentUID);
        if (data && data.exists) {
            name = data.username || data.personal?.fullName?.split(" ")[0] || name;
            profilePic = data.documents?.profilePic || null;
            if (name) localStorage.setItem("tt_username", name);
        }
    } catch (err) { console.error("Error fetching name", err); }

    updateNavbar(user, data);

    // (Note: The following manual lines are replaced by updateNavbar)
    // const navBtnText = document.getElementById("navBtnText");
    // ...
    // ...

    // BUT wait, I need to verify if `data` structure matches what `updateNavbar` expects.
    // `createprofile.js` fetches `data` via `getAthleteProfile(currentUID)`.
    // API returns object with { exists: true, personal: {...}, documents: {...}, ... }
    // `updateNavbar` handles `profileData.personal`. So passing `data` is correct.

    if (document.getElementById("navUserEmail")) document.getElementById("navUserEmail").textContent = user.email;
    if (document.getElementById("mobileUserEmail")) document.getElementById("mobileUserEmail").textContent = user.email;
    if (document.getElementById("email")) {
        document.getElementById("email").value = user.email;
        document.getElementById("email").readOnly = true;
    }

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('edit') === 'true') {
        loadProfileForEdit();
    }
});

document.getElementById("logoutBtn")?.addEventListener("click", async () => { await signOut(auth); window.location.href = "index.html"; });
document.getElementById("mobileLogoutBtn")?.addEventListener("click", async () => { await signOut(auth); window.location.href = "index.html"; });

async function loadProfileForEdit() {
    try {
        showLoading();
        const data = await getAthleteProfile(currentUID);
        if (data && data.exists) {

            const p = data.personal || {};
            const m = data.medicalPhysical || {};
            const a = data.athletic || {};
            const l = data.playingLevel || {};
            const docs = data.documents || {};

            const safeSet = (id, val) => {
                const el = document.getElementById(id);
                if (el) el.value = val || "";
            };

            safeSet("fullName", p.fullName);
            safeSet("dob", p.dob ? p.dob.substring(0, 10) : ""); // Ensure stored date handled?
            safeSet("gender", p.gender);
            safeSet("phone", p.phone);

            if (p.address) {
                safeSet("street", p.address.street);
                safeSet("city", p.address.city);
            }

            safeSet("height", m.height);
            safeSet("weight", m.weight);
            safeSet("blood", m.blood || "Unknown");
            safeSet("allergies", m.allergies);
            safeSet("medical", m.medical);
            safeSet("mealPlan", m.mealPlan);

            safeSet("category", a.category);
            safeSet("coachName", a.coach || a.coachName);

            let tDays = a.trainingDays || "";
            if (tDays.includes(" ")) tDays = tDays.split(" ")[0];
            safeSet("trainDays", tDays);

            safeSet("school", l.school);
            safeSet("club", l.club);

            const eventsContainer = document.getElementById("eventsContainer");
            if (eventsContainer) {
                eventsContainer.innerHTML = "";
                if (a.events && a.events.length > 0) {
                    a.events.forEach(evt => {
                        addEventRow(evt);
                    });
                } else {
                    addEventRow();
                }
            }

            const showFilePreview = (key, inputId) => {
                if (docs[key]) {
                    const inputEl = document.getElementById(inputId);
                    if (!inputEl) return;

                    let prevDiv = document.getElementById("preview_" + inputId);
                    if (!prevDiv) {
                        const inputDiv = inputEl.parentElement;
                        prevDiv = document.createElement("div");
                        prevDiv.id = "preview_" + inputId;
                        prevDiv.className = "mb-2";
                        inputDiv.insertBefore(prevDiv, inputEl);
                    }

                    prevDiv.classList.remove('hidden');
                    let src = docs[key];

                    if (key === 'profilePic') {
                        const isPdf = src.toLowerCase().includes('.pdf') || src.toLowerCase().includes('pdf');
                        if (isPdf) {
                            prevDiv.innerHTML = `<img src="https://cdn-icons-png.flaticon.com/512/337/337946.png" class="w-10 h-10 rounded object-contain"><span class="text-xs text-green-600 font-bold block mt-1">✓ Current Saved (PDF)</span>`;
                        } else {
                            if (src.startsWith('http')) src += "?t=" + new Date().getTime();
                            prevDiv.innerHTML = `<img src="${src}" class="w-20 h-20 rounded border border-gray-300 object-cover"><span class="text-xs text-green-600 font-bold block mt-1">✓ Current Saved</span>`;
                        }
                    } else {
                        prevDiv.innerHTML = `<a href="${src}" target="_blank" class="text-blue-600 underline text-sm">View Saved File</a> <span class="text-xs text-green-600 font-bold">✓ Saved</span>`;
                    }
                    inputEl.removeAttribute("required");
                }
            };

            showFilePreview('profilePic', 'profilePic');
            showFilePreview('idDoc', 'idDoc');
            showFilePreview('clubIDDoc', 'clubIDDoc');
            showFilePreview('consentDoc', 'consentDoc');

            if (["U12", "U14", "U16", "U18"].includes(a.category)) {
                const conContainer = document.getElementById("consentContainer");
                if (conContainer) conContainer.classList.remove("hidden");
                if (!docs.consentDoc) {
                    const conInput = document.getElementById("consentDoc");
                    if (conInput) conInput.setAttribute("required", "true");
                }
            }

            if (submitBtn) submitBtn.textContent = "Update Profile";
            displayMessage("Profile data loaded for editing.", "success");

            // Sync Dropdown
            syncDropdown("citySelect", "city", CITIES);
        }
    } catch (err) {
        console.error("Error loading profile for edit:", err);
    } finally {
        hideLoading();
    }
}

window.addEventRow = function (data = null) {
    const container = document.getElementById("eventsContainer");
    if (!container) return;

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
                    <option value="100m">100m</option>
                    <option value="200m">200m</option>
                    <option value="400m">400m</option>
                    <option value="800m">800m</option>
                    <option value="1200m">1200m</option>
                    <option value="1500m">1500m</option>
                    <option value="5000m">5000m</option>
                    <option value="Long Jump">Long Jump</option>
                    <option value="High Jump">High Jump</option>
                </select>
            </div>
            <div>
                <label class="text-xs font-semibold text-gray-500 uppercase">Personal Best <span class="text-red-500">*</span></label>
                <input type="number" step="0.01" class="input event-time" placeholder="e.g. 10.5 or 5.2">
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

    if (data) {
        div.querySelector(".event-select").value = data.event || "";
        div.querySelector(".event-time").value = data.pb || "";
        div.querySelector(".event-experience").value = data.experience || "";
        div.querySelector(".event-level").value = data.bestCompetition || "";
    }
};

if (document.getElementById("eventsContainer") && !new URLSearchParams(window.location.search).get('edit')) {
    window.addEventRow();
}

const dobInput = document.getElementById("dob");
if (dobInput) {
    const today = new Date();
    const minDate = new Date(today.getFullYear() - 100, today.getMonth(), today.getDate());
    const maxDate = new Date(today.getFullYear() - 14, today.getMonth(), today.getDate());

    dobInput.min = minDate.toISOString().split("T")[0];
    dobInput.max = maxDate.toISOString().split("T")[0];

    dobInput.addEventListener("change", function () {
        const dob = new Date(this.value);
        let age = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) { age--; }

        if (age < 14) {
            toggleError("err-dob", "You must be at least 14 years old to register.");
            this.value = "";
        } else if (age > 100) {
            toggleError("err-dob", "Please enter a realistic date of birth.");
            this.value = "";
        } else {
            toggleError("err-dob", "");
        }
    });
}

const categorySelect = document.getElementById("category");
const consentContainer = document.getElementById("consentContainer");
const consentInput = document.getElementById("consentDoc");
const under18Categories = ["U12", "U14", "U16", "U18"];

if (categorySelect) {
    categorySelect.addEventListener("change", function () {
        if (under18Categories.includes(this.value)) {
            consentContainer.classList.remove("hidden");
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

window.submitProfile = async function () {
    document.querySelectorAll('.error-text').forEach(e => e.classList.remove('visible'));
    document.querySelectorAll('.event-row').forEach(e => e.classList.remove('border-red-500'));

    let isFormBlank = true;
    const allInputs = document.querySelectorAll('#athleteForm input, #athleteForm select');
    for (let input of allInputs) {
        if (input.value && input.type !== 'submit' && input.type !== 'button') { isFormBlank = false; break; }
    }
    if (isFormBlank) { displayMessage("Please fill the form before submitting.", 'warning'); return; }

    const requiredIds = ["fullName", "dob", "gender", "phone", "email", "street", "city", "category", "height", "weight"];
    let hasRequiredError = false;

    const checkFile = (id, prevId, isOptional = false) => {
        const input = document.getElementById(id);
        const prev = document.getElementById(prevId);
        if (!input) return;

        const file = input.files[0];
        const hasExisting = prev && !prev.classList.contains('hidden');

        if (!file && !hasExisting && !isOptional) {
            toggleError(`err-${id}`, "Required");
            hasRequiredError = true;
            return;
        }

        if (file) {
            // Relaxed validation: Allow checking extension if type is missing or generic
            const isImage = file.type.startsWith("image/") || /\.(jpe?g|png)$/i.test(file.name);
            const isPdf = (file.type && file.type.toLowerCase().includes("pdf")) || /\.pdf$/i.test(file.name);

            if (!isImage && !isPdf) {
                toggleError(`err-${id}`, "Invalid format (Image or PDF only)");
                hasRequiredError = true;
            }

            if (file.size > 5 * 1024 * 1024) { // Increased to 5MB
                toggleError(`err-${id}`, "File too large (Max 5MB)");
                hasRequiredError = true;
            }
        }
    };

    checkFile("profilePic", "preview_profilePic", true);
    checkFile("idDoc", "preview_idDoc");

    if (consentContainer && !consentContainer.classList.contains("hidden")) {
        checkFile("consentDoc", "preview_consentDoc");
    }

    checkFile("clubIDDoc", "preview_clubIDDoc", true);

    requiredIds.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        if (!el.value) {
            toggleError(`err-${id}`, "Required");
            hasRequiredError = true;
        } else {
            if (id === "phone" && !/^\+?[0-9\s-]{10,15}$/.test(el.value)) {
                toggleError("err-phone", "Invalid phone format (+94XXXXXXXXX)");
                hasRequiredError = true;
            }
        }
    });

    if (hasRequiredError) {
        displayMessage("Please complete all required fields.", 'warning');
        document.querySelector('.error-text.visible')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
    }

    let hasLogicError = false;
    const h = parseFloat(document.getElementById("height").value);
    const w = parseFloat(document.getElementById("weight").value);

    if (h < 50 || h > 280) { toggleError("err-height", "Invalid Height."); hasLogicError = true; }
    if (w < 20 || w > 300) { toggleError("err-weight", "Invalid Weight."); hasLogicError = true; }
    const heightInMeters = h / 100;
    const bmi = w / (heightInMeters * heightInMeters);
    if (bmi < 10 || bmi > 60) {
        toggleError("err-bmi", "Please verify your height and weight.");
        hasLogicError = true;
    }

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

            if (evt && time && exp && lvl) {
                if (eventTimeLimits[evt]) {
                    // Relaxed check for now or keep strict
                    if (time < eventTimeLimits[evt].min || time > eventTimeLimits[evt].max) {
                        displayMessage(`This personal best time is impossible so enter correct value`, 'error');
                        hasLogicError = true; row.classList.add('border-red-500');
                    } else {
                        eventData.push({ event: evt, pb: time, experience: exp, bestCompetition: lvl });
                        hasValidEvent = true;
                    }
                } else {
                    eventData.push({ event: evt, pb: time, experience: exp, bestCompetition: lvl });
                    hasValidEvent = true;
                }
            } else {
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

    submitBtn.textContent = "Uploading...";
    submitBtn.disabled = true;

    try {
        showLoading();
        let existingDocs = {};
        if (currentUID) {
            const data = await getAthleteProfile(currentUID);
            if (data && data.exists) existingDocs = data.documents || {};
        }

        const fileData = {};
        const singleFiles = ["profilePic", "idDoc", "consentDoc", "clubIDDoc"];

        for (const id of singleFiles) {
            const input = document.getElementById(id);
            if (input && input.files.length > 0) {
                const file = input.files[0];
                const url = await uploadFile(file, currentUID, id); // using API
                fileData[id] = url;
            }
        }

        const finalDocs = { ...existingDocs, ...fileData };

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

        await saveAthleteProfile(currentUID, profileData);

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
// Init Location Dropdowns
document.addEventListener('DOMContentLoaded', () => {
    setupDropdownInput('citySelect', 'city', CITIES);
});
