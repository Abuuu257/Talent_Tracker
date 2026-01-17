import {
    auth,
    onAuthChange,
    signOut,
    getCoachProfile,
    getAllAthletes,
    createSquad,
    assignToSquad,
    updateSquad,
    removeFromSquad,
    deleteSquad,
    BACKEND_URL
} from "./register.js";
import { updateNavbar, showAlert, showConfirm } from "./ui-utils.js";

// State
let allAthletes = [];
let coachSquads = {}; // athleteId -> squadName
let coachSquadIds = {}; // squadName -> squadId
let coachSquadPlans = {}; // squadName -> workoutPlan
let currentCoachId = null;
let availableSquads = []; // Array of squad names

// DOM
const unassignedPool = document.getElementById("unassignedPool");
const unassignedCount = document.getElementById("unassignedCount");
const squadsContainer = document.getElementById("squadsContainer");

const createSquadBtn = document.getElementById("createSquadBtn");
const createSquadModal = document.getElementById("createSquadModal");
const modalContent = document.getElementById("modalContent");
const cancelSquadBtn = document.getElementById("cancelSquadBtn");
const confirmSquadBtn = document.getElementById("confirmSquadBtn");
const newSquadNameInput = document.getElementById("newSquadName");

const workoutPlanModal = document.getElementById("workoutPlanModal");
const planModalContent = document.getElementById("planModalContent");
const cancelPlanBtn = document.getElementById("cancelPlanBtn");
const savePlanBtn = document.getElementById("savePlanBtn");
const squadWorkoutPlan = document.getElementById("squadWorkoutPlan");
const editSquadName = document.getElementById("editSquadName");
const planSquadId = document.getElementById("planSquadId");
const planSquadNameHidden = document.getElementById("planSquadNameHidden");

// WhatsApp Modal DOM
const whatsappModal = document.getElementById("whatsappModal");
const whatsappModalContent = document.getElementById("whatsappModalContent");
const waCount = document.getElementById("waCount");
const waNumbersList = document.getElementById("waNumbersList");
const closeWaBtn = document.getElementById("closeWaBtn");
const openWaBtn = document.getElementById("openWaBtn");

const navUserBtn = document.getElementById("navUserBtn");
const navUserDropdown = document.getElementById("navUserDropdown");
const logoutBtn = document.getElementById("logoutBtn");

onAuthChange(async (user) => {
    if (!user) {
        window.location.href = "index.html";
        return;
    }

    currentCoachId = user.uid;
    let name = user.displayName || localStorage.getItem("tt_username");
    let profilePic = null;

    try {
        // Update Navbar immediately
        updateNavbar(user, null);

        const data = await getCoachProfile(currentCoachId);
        if (data && data.exists) {
            // Data has squads array and assignments array
            // Available Squads
            const sList = data.squads || [];
            availableSquads = sList.map(s => s.name);
            sList.forEach(s => {
                coachSquadIds[s.name] = s.id;
                coachSquadPlans[s.name] = s.workout_plan || "";
            });

            // Coach Squads Map (athleteId -> squadName)
            coachSquads = {};
            const assigns = data.assignments || [];
            assigns.forEach(a => {
                coachSquads[a.athlete_id] = a.squad_name;
            });

            name = data.username || data.fullName.split(" ")[0] || name;
            profilePic = data.profilePic || null;
            if (name) localStorage.setItem("tt_username", name);

            updateNavbar(user, data);

            await fetchAthletes();
        } else {
            // Profile doesn't exist
            await showAlert("Please complete your coach profile first.", "Profile Missing");
            window.location.href = "create-coach-profile.html";
        }
    } catch (e) {
        console.error("Error loading coach data", e);
    }

    if (!name) name = user.email.split("@")[0];

    if (!name) name = user.email.split("@")[0];

    // Manual navbar update removed, handled by updateNavbar above
});

async function fetchAthletes() {
    try {
        const athletes = await getAllAthletes();
        // Filter valid athletes
        allAthletes = athletes.filter(a => a.username || (a.personal && a.personal.fullName));
        renderPools();
    } catch (err) {
        console.error("Error fetching athletes", err);
    }
}

function renderPools() {
    // 1. Unassigned
    unassignedPool.innerHTML = "";
    let unassignedCountVal = 0;

    const unassigned = allAthletes.filter(a => !coachSquads[a.id]);

    unassigned.forEach(a => {
        const card = createAthleteCard(a);
        unassignedPool.appendChild(card);
        unassignedCountVal++;
    });
    unassignedCount.textContent = unassignedCountVal;

    setupPoolDnD(unassignedPool, "unassigned");

    // 2. Squads
    squadsContainer.innerHTML = "";
    if (availableSquads.length === 0) {
        squadsContainer.innerHTML = `
            <div class="col-span-full flex flex-col items-center justify-center py-20 opacity-50">
                <p class="text-slate-500 font-bold">No squads yet.</p>
            </div>`;
    }

    availableSquads.forEach((sName, idx) => {
        const colDiv = document.createElement("div");
        const colorClass = getSquadColor(idx);

        let count = 0;
        allAthletes.forEach(a => { if (coachSquads[a.id] === sName) count++; });

        colDiv.innerHTML = `
            <div class="flex items-center gap-2 mb-4 px-2">
                <div class="w-3 h-3 rounded-full ${colorClass}"></div>
                <h2 class="text-xs font-black text-slate-800 uppercase tracking-[0.2em] truncate" title="${sName}">${sName}</h2>
                <span class="ml-auto ${colorClass.replace('bg-', 'bg-opacity-20 text-').replace('500', '600')} bg-gray-100 px-2 py-0.5 rounded text-[10px] font-bold">${count}</span>
                <button onclick="createWhatsAppGroup('${sName}')" class="ml-auto mr-1 p-1.5 rounded-lg hover:bg-green-50 text-green-500 hover:text-green-600 transition-colors" title="Create WhatsApp Group">
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.658-.698c.968.585 1.961.89 2.802.89l.003-.001c3.181 0 5.768-2.586 5.768-5.766.001-3.18-2.585-5.776-5.765-5.776zm.3 10.353c-.768 0-1.59-.204-1.928-.316l-1.372.36.366-1.338c-.376-.598-.63-1.246-.63-1.638 0-2.502 2.035-4.538 4.538-4.538 2.503 0 4.538 2.036 4.538 4.538s-2.035 4.538-4.538 4.538zm2.493-3.402c-.136-.068-.804-.397-.929-.443-.124-.046-.215-.068-.305.068-.09.137-.352.443-.431.534-.08.09-.158.102-.294.034-.136-.068-.574-.212-1.093-.675-.407-.363-.682-.812-.762-.948-.08-.137-.008-.21.06-.278.062-.061.136-.159.204-.239.068-.079.09-.136.136-.227.045-.091.022-.17-.011-.239-.034-.068-.305-.737-.418-1.01-.11-.264-.222-.228-.305-.232-.08-.005-.17-.005-.26-.005-.09 0-.237.034-.362.17-.125.137-.476.465-.476 1.135 0 .67.487 1.317.555 1.409.068.092.958 1.463 2.321 2.051.324.14.577.223.776.286.326.103.623.088.857.054.263-.039.804-.329.918-.646.113-.318.113-.591.079-.646-.034-.055-.124-.09-.26-.159z"/>
                    </svg>
                </button>
                <button onclick="openPlanModal('${sName}')" class="mr-2 p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-[var(--primary)] transition-colors" title="Manage Plan">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                </button>
                <div class="relative group/del">
                    <button onclick="confirmDeleteSquad('${sName}')" class="p-1.5 rounded-lg hover:bg-red-50 text-red-500 hover:text-red-600 transition-colors" title="Delete Squad">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>
            </div>
            <div class="squad-column p-4 rounded-[2.5rem] space-y-4" data-squad="${sName}"></div>
        `;

        const poolContainer = colDiv.querySelector(".squad-column");

        allAthletes.filter(a => coachSquads[a.id] === sName).forEach(a => {
            poolContainer.appendChild(createAthleteCard(a));
        });

        setupPoolDnD(poolContainer, sName);
        squadsContainer.appendChild(colDiv);
    });
}

function getSquadColor(index) {
    const colors = ["bg-red-500", "bg-blue-500", "bg-amber-500", "bg-emerald-500", "bg-purple-500", "bg-pink-500", "bg-indigo-500"];
    return colors[index % colors.length];
}

function createAthleteCard(a) {
    const card = document.createElement("div");
    card.className = "athlete-card bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-all";
    card.draggable = true;
    card.dataset.id = a.id;

    const p = a.personal || {};
    let img = a.documents?.profilePic || a.profilePic || "https://via.placeholder.com/100?text=No+Photo";

    // Fix relative paths
    if (img && img.startsWith('/')) {
        img = BACKEND_URL + img;
    }

    const name = a.username || p.fullName || "Athlete";
    // Check if events exists (it might not in list view unless backend returns it)
    // My list endpoint returns minimal info, maybe not events. 
    // Wait, backend list endpoint: returns personal, etc. I didn't include events array in list endpoint.
    // So 'mainEvent' might be missing.
    const mainEvent = "TBD";

    card.innerHTML = `
        <div class="w-12 h-12 rounded-xl overflow-hidden shrink-0">
            <img src="${img}" class="w-full h-full object-cover">
        </div>
        <div class="min-w-0">
            <h4 class="font-bold text-slate-800 text-sm truncate">${name}</h4>
            <p class="text-[10px] font-black text-slate-400">EVT: ${mainEvent}</p>
        </div>
    `;

    card.addEventListener("dragstart", () => card.classList.add("dragging"));
    card.addEventListener("dragend", () => card.classList.remove("dragging"));

    return card;
}

function setupPoolDnD(pool, squadName) {
    pool.addEventListener("dragover", (e) => {
        e.preventDefault();
        pool.classList.add("drag-over");
    });
    pool.addEventListener("dragleave", () => pool.classList.remove("drag-over"));
    pool.addEventListener("drop", async (e) => {
        e.preventDefault();
        pool.classList.remove("drag-over");

        const draggingCard = document.querySelector(".dragging");
        if (!draggingCard) return;

        const athleteId = draggingCard.dataset.id;
        const oldSquad = coachSquads[athleteId];

        if (oldSquad === squadName) return;

        // Optimistic Update
        if (squadName === "unassigned") {
            delete coachSquads[athleteId];
        } else {
            coachSquads[athleteId] = squadName;
        }
        renderPools();

        try {
            // If was assigned, remove first?
            // My API `assignToSquad` handles re-assignment logic on backend?
            // Backend `POST .../assign` removes from other squads of same coach first.
            // But if moving TO unassigned, we must call DELETE explicitly.

            if (squadName === "unassigned") {
                // Remove from old squad
                const oldSquadId = coachSquadIds[oldSquad];
                if (oldSquadId) {
                    await removeFromSquad(currentCoachId, oldSquadId, athleteId);
                }
            } else {
                const newSquadId = coachSquadIds[squadName];
                await assignToSquad(currentCoachId, newSquadId, athleteId);
            }
            showToast(`Reassigned to ${squadName}`);
        } catch (err) {
            console.error("Move failed", err);
            alert("Failed to move athlete");
            // Revert state?
            // For now, reload page or ignore
        }
    });
}

// Create Squad
if (createSquadBtn) {
    createSquadBtn.addEventListener("click", () => {
        createSquadModal.classList.remove("hidden");
        setTimeout(() => {
            modalContent.classList.remove("scale-95", "opacity-0");
            modalContent.classList.add("scale-100", "opacity-100");
        }, 10);
        newSquadNameInput.focus();
    });
}

function closeModal() {
    modalContent.classList.remove("scale-100", "opacity-100");
    modalContent.classList.add("scale-95", "opacity-0");
    setTimeout(() => {
        createSquadModal.classList.add("hidden");
        newSquadNameInput.value = "";
    }, 300);
}

if (cancelSquadBtn) cancelSquadBtn.addEventListener("click", closeModal);

if (confirmSquadBtn) {
    confirmSquadBtn.addEventListener("click", async () => {
        const name = newSquadNameInput.value.trim();
        if (!name) return alert("Enter Name");
        if (availableSquads.includes(name)) return alert("Duplicate Name");

        try {
            const res = await createSquad(currentCoachId, name);
            availableSquads.push(name);
            // res comes with { message, squadId }? 
            // My backend returns { message: 'Squad created', id: result.insertId }
            coachSquadIds[name] = res.id;
            coachSquadPlans[name] = "";

            closeModal();
            renderPools();
            showToast(`Squad "${name}" created!`);
        } catch (err) {
            console.error(err);
            if (err.message && err.message.includes('foreign key constraint')) {
                await showAlert("It usually means your coach profile is not fully set up. Please go to your profile page and save your details.", "Coach Profile Missing");
            } else {
                await showAlert(err.message || "Failed to create squad", "Error");
            }
        }
    });
}

function showToast(msg) {
    const toast = document.getElementById("toast");
    const toastMsg = document.getElementById("toastMsg");
    if (!toast) return;
    if (toastMsg) toastMsg.textContent = msg;

    // Show toast
    toast.classList.remove("hidden", "opacity-0", "translate-y-20");

    // Hide after 3 seconds
    setTimeout(() => {
        toast.classList.add("translate-y-20", "opacity-0");
        setTimeout(() => toast.classList.add("hidden"), 500); // Wait for animation
    }, 3000);
}

// PDF Export
const exportBtn = document.getElementById("exportPdfBtn");
if (exportBtn) {
    exportBtn.addEventListener("click", () => {
        try {
            // Access jsPDF from window
            const { jsPDF } = window.jspdf;

            if (!jsPDF) {
                alert("PDF library not loaded. Please refresh the page.");
                return;
            }

            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();

            // Title
            doc.setFontSize(20);
            doc.setFont(undefined, 'bold');
            doc.text("Squad Roster Report", pageWidth / 2, 20, { align: 'center' });

            // Coach info
            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');
            const coachName = localStorage.getItem("tt_username") || "Coach";
            doc.text(`Coach: ${coachName}`, 14, 30);
            doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 36);

            let yPosition = 45;

            // Unassigned Athletes
            const unassigned = allAthletes.filter(a => !coachSquads[a.id]);
            if (unassigned.length > 0) {
                doc.setFontSize(14);
                doc.setFont(undefined, 'bold');
                doc.text("Unassigned Athletes", 14, yPosition);
                yPosition += 7;

                const unassignedData = unassigned.map(a => {
                    const name = a.username || a.personal?.fullName || "Unknown";
                    const category = a.athletic?.category || "N/A";
                    return [name, category];
                });

                doc.autoTable({
                    startY: yPosition,
                    head: [['Athlete Name', 'Category']],
                    body: unassignedData,
                    theme: 'grid',
                    headStyles: { fillColor: [100, 100, 100] },
                    margin: { left: 14, right: 14 }
                });

                yPosition = doc.lastAutoTable.finalY + 10;
            }

            // Each Squad
            availableSquads.forEach((squadName, index) => {
                const squadAthletes = allAthletes.filter(a => coachSquads[a.id] === squadName);

                if (squadAthletes.length === 0) return;

                // Check if we need a new page
                if (yPosition > 250) {
                    doc.addPage();
                    yPosition = 20;
                }

                doc.setFontSize(14);
                doc.setFont(undefined, 'bold');
                doc.text(`${squadName} (${squadAthletes.length} athletes)`, 14, yPosition);
                yPosition += 7;

                const squadData = squadAthletes.map(a => {
                    const name = a.username || a.personal?.fullName || "Unknown";
                    const category = a.athletic?.category || "N/A";
                    const city = a.personal?.city || "N/A";
                    return [name, category, city];
                });

                const colors = [
                    [239, 68, 68],   // red
                    [59, 130, 246],  // blue
                    [251, 191, 36],  // amber
                    [16, 185, 129],  // emerald
                    [168, 85, 247],  // purple
                    [236, 72, 153],  // pink
                    [99, 102, 241]   // indigo
                ];
                const color = colors[index % colors.length];

                doc.autoTable({
                    startY: yPosition,
                    head: [['Athlete Name', 'Category', 'City']],
                    body: squadData,
                    theme: 'striped',
                    headStyles: { fillColor: color },
                    margin: { left: 14, right: 14 }
                });

                yPosition = doc.lastAutoTable.finalY + 10;
            });

            // Footer
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setFont(undefined, 'normal');
                doc.text(
                    `Page ${i} of ${pageCount} | Generated by Talent Tracker`,
                    pageWidth / 2,
                    doc.internal.pageSize.getHeight() - 10,
                    { align: 'center' }
                );
            }

            // Save
            const filename = `Squad_Roster_${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(filename);

            showToast("PDF exported successfully!");
        } catch (error) {
            console.error("PDF Export Error:", error);
            alert(`Failed to export PDF: ${error.message}`);
        }
    });
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

// Delete Squad Function
window.confirmDeleteSquad = async function (squadName) {
    if (!currentCoachId) return;

    const confirmed = await showConfirm(
        `Are you sure you want to delete the squad "${squadName}"?\n\nAll athletes in this squad will be moved back to the unassigned pool.`,
        "Delete Squad"
    );
    if (!confirmed) return;

    try {
        // Get the squad ID from coachSquadIds mapping
        const squadId = coachSquadIds[squadName];
        console.log('Deleting squad:', { squadName, squadId, currentCoachId });

        if (!squadId) {
            await showAlert('Squad not found. Please refresh the page and try again.', 'Error');
            console.error('Squad ID not found for:', squadName);
            return;
        }

        await deleteSquad(currentCoachId, squadId);
        console.log('Squad deleted successfully');

        // Update local state - remove squad and unassign athletes
        delete coachSquadIds[squadName];
        availableSquads = availableSquads.filter(s => s !== squadName);

        // Move all athletes from this squad back to unassigned
        Object.keys(coachSquads).forEach(athleteId => {
            if (coachSquads[athleteId] === squadName) {
                delete coachSquads[athleteId];
            }
        });

        renderPools();
        showToast(`Squad "${squadName}" deleted successfully`);
    } catch (error) {
        console.error('Error deleting squad:', error);
        await showAlert(`Failed to delete squad: ${error.message}`, 'Error');
    }
};

// Plan Modal Functions
window.openPlanModal = function (squadName) {
    const squadId = coachSquadIds[squadName];
    const plan = coachSquadPlans[squadName] || "";

    planSquadId.value = squadId;
    planSquadNameHidden.value = squadName; // store old name
    editSquadName.value = squadName;
    squadWorkoutPlan.value = plan;

    workoutPlanModal.classList.remove("hidden");
    setTimeout(() => {
        planModalContent.classList.remove("scale-95", "opacity-0");
        planModalContent.classList.add("scale-100", "opacity-100");
    }, 10);
};

function closePlanModal() {
    planModalContent.classList.remove("scale-100", "opacity-100");
    planModalContent.classList.add("scale-95", "opacity-0");
    setTimeout(() => {
        workoutPlanModal.classList.add("hidden");
    }, 300);
}

if (cancelPlanBtn) cancelPlanBtn.addEventListener("click", closePlanModal);

if (savePlanBtn) {
    savePlanBtn.addEventListener("click", async () => {
        const squadId = planSquadId.value;
        const oldName = planSquadNameHidden.value;
        const newName = editSquadName.value.trim();
        const newPlan = squadWorkoutPlan.value;

        if (!newName) return alert("Squad name cannot be empty");

        // If name changed, check duplicates
        if (newName !== oldName && availableSquads.includes(newName)) {
            return alert("Squad name already exists");
        }

        try {
            await updateSquad(currentCoachId, squadId, { name: newName, workoutPlan: newPlan });

            // Update local state
            if (newName !== oldName) {
                // Remove old
                delete coachSquadIds[oldName];
                delete coachSquadPlans[oldName];
                const idx = availableSquads.indexOf(oldName);
                if (idx !== -1) availableSquads[idx] = newName;

                // Update assignments
                Object.keys(coachSquads).forEach(aid => {
                    if (coachSquads[aid] === oldName) coachSquads[aid] = newName;
                });
            }

            coachSquadIds[newName] = squadId;
            coachSquadPlans[newName] = newPlan;

            showToast("Squad plan updated!");
            closePlanModal();
            renderPools(); // Re-render in case name changed
        } catch (err) {
            console.error(err);
            await showAlert(err.message || "Failed to save plan", "Error");
        }
    });
}


// WhatsApp Group Functionality
window.createWhatsAppGroup = async function (squadName) {
    const athletes = allAthletes.filter(a => coachSquads[a.id] === squadName);
    if (athletes.length === 0) {
        return showAlert("This squad has no athletes.", "Info");
    }

    const phones = athletes
        .map(a => a.personal?.phone || a.phone)
        .filter(p => p && p.trim().length > 0);

    if (phones.length === 0) {
        return showAlert("None of the athletes in this squad have a phone number in their profile.", "No Numbers Found");
    }

    // Populate Modal
    waCount.textContent = phones.length;
    waNumbersList.value = phones.join(','); // Comma separated for easy bulk add

    // Try creating a friendly clipboard text too
    try {
        await navigator.clipboard.writeText(waNumbersList.value);
        // We can show a small tooltip or just the modal instruction implies it
    } catch (err) {
        console.error("Clipboard failed", err);
    }

    // Show Modal
    whatsappModal.classList.remove("hidden");
    setTimeout(() => {
        whatsappModalContent.classList.remove("scale-95", "opacity-0");
        whatsappModalContent.classList.add("scale-100", "opacity-100");
    }, 10);
};

// WhatsApp Modal Listeners
if (closeWaBtn) {
    closeWaBtn.addEventListener("click", () => {
        whatsappModalContent.classList.remove("scale-100", "opacity-100");
        whatsappModalContent.classList.add("scale-95", "opacity-0");
        setTimeout(() => {
            whatsappModal.classList.add("hidden");
        }, 300);
    });
}

if (openWaBtn) {
    openWaBtn.addEventListener("click", () => {
        window.open('https://web.whatsapp.com', '_blank');
        // Optional: Close modal after opening
        // closeWaBtn.click();
    });
}
