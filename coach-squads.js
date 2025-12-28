import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore, collection, getDocs, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

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

// State
let allAthletes = [];
let coachSquads = {}; // athleteId -> squadName
let currentCoachId = null;
let availableSquads = []; // Array of squad names

// DOM Elements
const unassignedPool = document.getElementById("unassignedPool");
const unassignedCount = document.getElementById("unassignedCount");
const squadsContainer = document.getElementById("squadsContainer");

// Modal Elements
const createSquadBtn = document.getElementById("createSquadBtn");
const createSquadModal = document.getElementById("createSquadModal");
const modalContent = document.getElementById("modalContent");
const cancelSquadBtn = document.getElementById("cancelSquadBtn");
const confirmSquadBtn = document.getElementById("confirmSquadBtn");
const newSquadNameInput = document.getElementById("newSquadName");

// --- 2. AUTHENTICATION ---
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "index.html";
    } else {
        currentCoachId = user.uid;

        // Update navbar with user info
        let name = user.displayName || localStorage.getItem("tt_username");
        let profilePic = null;

        try {
            const coachDoc = await getDoc(doc(db, "coaches", currentCoachId));
            if (coachDoc.exists()) {
                const data = coachDoc.data();
                coachSquads = data.squads || {};

                // Load Squad Names (empty by default if none exist)
                availableSquads = data.squadNames || [];

                name = data.username || data.personalInfo?.fullName?.split(" ")[0] || name;
                profilePic = data.profilePic || data.documents?.profilePic || null;
                if (name) localStorage.setItem("tt_username", name);
            }
        } catch (err) {
            console.error("Error fetching coach data:", err);
        }

        if (!name) name = user.email.split("@")[0];

        // Update UI
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

        await fetchAthletes();
        setupDragAndDrop();
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

// --- 3. SQUAD MANAGEMENT LOGIC ---
async function fetchAthletes() {
    try {
        const athletesCol = collection(db, "athletes");
        const snapshot = await getDocs(athletesCol);

        allAthletes = snapshot.docs
            .map(doc => ({
                id: doc.id,
                ...doc.data()
            }))
            .filter(athlete => athlete.personal && athlete.personal.fullName);

        renderPools();
    } catch (err) {
        console.error("Error fetching athletes:", err);
    }
}

function renderPools() {
    // 1. Render Unassigned Pool
    unassignedPool.innerHTML = "";
    let unassignedCountVal = 0;

    // Filter unassigned athletes
    const unassignedAthletes = allAthletes.filter(a => !coachSquads[a.id] || coachSquads[a.id] === "unassigned");

    unassignedAthletes.forEach(athlete => {
        const card = createAthleteCard(athlete);
        unassignedPool.appendChild(card);
        unassignedCountVal++;
    });
    unassignedCount.textContent = unassignedCountVal;

    // Attach DnD to Unassigned Pool
    setupPoolDnD(unassignedPool, "unassigned");


    // 2. Render Dynamic Squads
    squadsContainer.innerHTML = "";

    if (availableSquads.length === 0) {
        squadsContainer.innerHTML = `
            <div class="col-span-full flex flex-col items-center justify-center py-20 opacity-50">
                <div class="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mb-4">
                    <svg class="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>
                </div>
                <p class="text-slate-500 font-bold">No squads yet.</p>
                <p class="text-xs text-slate-400 mt-1">Create your first squad to start assigning athletes.</p>
            </div>
        `;
    }

    availableSquads.forEach((squadName, index) => {
        // Create Column HTML
        const colDiv = document.createElement("div");
        const colorClass = getSquadColor(index); // Helper for colors

        let count = 0;
        allAthletes.forEach(a => {
            if (coachSquads[a.id] === squadName) count++;
        });

        colDiv.innerHTML = `
            <div class="flex items-center gap-2 mb-4 px-2">
                <div class="w-3 h-3 rounded-full ${colorClass}"></div>
                <h2 class="text-xs font-black text-slate-800 uppercase tracking-[0.2em] truncate" title="${squadName}">${squadName}</h2>
                <span class="ml-auto ${colorClass.replace('bg-', 'bg-opacity-20 text-').replace('500', '600')} bg-gray-100 px-2 py-0.5 rounded text-[10px] font-bold">${count}</span>
            </div>
            <div class="squad-column p-4 rounded-[2.5rem] space-y-4" data-squad="${squadName}">
                <!-- Athletes Here -->
            </div>
        `;

        const poolContainer = colDiv.querySelector(".squad-column");

        // Fill Athletes
        allAthletes.filter(a => coachSquads[a.id] === squadName).forEach(athlete => {
            const card = createAthleteCard(athlete);
            poolContainer.appendChild(card);
        });

        // Attach DnD
        setupPoolDnD(poolContainer, squadName);

        squadsContainer.appendChild(colDiv);
    });
}

function getSquadColor(index) {
    const colors = ["bg-red-500", "bg-blue-500", "bg-amber-500", "bg-emerald-500", "bg-purple-500", "bg-pink-500", "bg-indigo-500"];
    return colors[index % colors.length];
}

function createAthleteCard(athlete) {
    const card = document.createElement("div");
    card.className = "athlete-card bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-all";
    card.draggable = true;
    card.id = `athlete-${athlete.id}`;
    card.dataset.id = athlete.id;

    const img = athlete.documents?.profilePic || "https://via.placeholder.com/100?text=No+Photo";
    const name = athlete.personal?.fullName || athlete.username || "Athlete";
    const mainEvent = athlete.athletic?.events?.[0]?.event || "TBD";

    card.innerHTML = `
        <div class="w-12 h-12 rounded-xl overflow-hidden shrink-0">
            <img src="${img}" class="w-full h-full object-cover">
        </div>
        <div class="min-w-0">
            <h4 class="font-bold text-slate-800 text-sm truncate">${name}</h4>
            <p class="text-[10px] font-black text-slate-400">EVT: ${mainEvent}</p>
        </div>
        <div class="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
            <svg class="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16"/></svg>
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

    pool.addEventListener("dragleave", () => {
        pool.classList.remove("drag-over");
    });

    pool.addEventListener("drop", async (e) => {
        e.preventDefault();
        pool.classList.remove("drag-over");

        const draggingCard = document.querySelector(".dragging");
        if (!draggingCard) return;

        const athleteId = draggingCard.dataset.id;

        // Prevent unnecessary update
        if (coachSquads[athleteId] === squadName) return;

        // Update State
        if (squadName === "unassigned") {
            delete coachSquads[athleteId];
        } else {
            coachSquads[athleteId] = squadName;
        }

        // Update UI
        renderPools();
        showToast(`Athlete reassigned to ${squadName === 'unassigned' ? 'Unassigned' : squadName}`);

        // Update Database
        try {
            const coachRef = doc(db, "coaches", currentCoachId);
            await updateDoc(coachRef, {
                squads: coachSquads
            });
        } catch (err) {
            console.error("Database Update Failed:", err);
        }
    });
}

// --- 4. CREATE SQUAD FLOW ---

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
        if (!name) return alert("Please enter a squad name.");

        if (availableSquads.includes(name)) return alert("Squad name already exists.");

        // Update Local State
        availableSquads.push(name);

        // Save to DB
        try {
            const coachRef = doc(db, "coaches", currentCoachId);
            await updateDoc(coachRef, {
                squadNames: availableSquads
            });

            closeModal();
            renderPools();
            showToast(`New squad "${name}" created!`);

        } catch (err) {
            console.error("Error creating squad:", err);
            alert("Failed to create squad.");
        }
    });
}


// Event Listeners
const exportBtn = document.getElementById("exportPdfBtn");
if (exportBtn) {
    exportBtn.addEventListener("click", exportToPDF);
}

function showToast(msg) {
    const toast = document.getElementById("toast");
    const toastMsg = document.getElementById("toastMsg");
    if (!toast || !toastMsg) return;
    toastMsg.textContent = msg;
    toast.classList.remove("translate-y-20");
    setTimeout(() => {
        toast.classList.add("translate-y-20");
    }, 3000);
}

// --- 7. PDF EXPORT LOGIC ---
function exportToPDF() {
    const { jsPDF } = window.jspdf;
    const docPdf = new jsPDF(); // Renamed to avoid confusion with doc() Firestore

    // 1. Header
    docPdf.setFillColor(1, 42, 97); // --primary
    docPdf.rect(0, 0, 210, 40, 'F');

    docPdf.setTextColor(255, 255, 255);
    docPdf.setFontSize(22);
    docPdf.setFont("helvetica", "bold");
    docPdf.text("TALENT TRACKER - SQUAD ROSTER", 15, 20);

    docPdf.setFontSize(10);
    docPdf.setFont("helvetica", "normal");
    docPdf.text(`Generated on: ${new Date().toLocaleDateString()} | Squad Management Report`, 15, 30);

    let currentY = 50;

    // 2. Iterate Dynamic Squads
    availableSquads.forEach(squadName => {
        const squadAthletes = allAthletes.filter(a => coachSquads[a.id] === squadName);

        if (squadAthletes.length > 0) {
            // Squad Header
            docPdf.setFillColor(39, 90, 145); // Secondary Blue
            docPdf.rect(15, currentY, 180, 8, 'F');
            docPdf.setTextColor(255, 255, 255);
            docPdf.setFontSize(10);
            docPdf.text(squadName.toUpperCase(), 20, currentY + 5.5);

            currentY += 12;

            // Table Data
            const tableRows = squadAthletes.map((a, index) => [
                index + 1,
                a.personal?.fullName || a.username || "N/A",
                a.athletic?.category || "TBD",
                a.athletic?.events?.map(e => e.event).join(", ") || "No Events",
                a.personal?.address?.city || "N/A"
            ]);

            docPdf.autoTable({
                startY: currentY,
                head: [['#', 'Athlete Name', 'Category', 'Events', 'Location']],
                body: tableRows,
                theme: 'striped',
                headStyles: { fillGray: true, textColor: 20 },
                margin: { left: 15, right: 15 },
                didDrawPage: function (data) {
                    currentY = data.cursor.y + 15;
                }
            });

            currentY = docPdf.lastAutoTable.finalY + 15;
        }
    });

    // Check for overflow or "No assigned" case
    if (Object.keys(coachSquads).length === 0) {
        docPdf.setTextColor(100);
        docPdf.text("No athletes have been assigned to squads yet.", 15, currentY);
    }

    docPdf.save(`TT_Squad_Roster_${new Date().toISOString().slice(0, 10)}.pdf`);
}
