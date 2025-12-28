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

// DOM Elements
const pools = {
    unassigned: document.getElementById("unassignedPool"),
    elite: document.getElementById("eliteSquad"),
    development: document.getElementById("devSquad"),
    trial: document.getElementById("trialSquad")
};

const counts = {
    unassigned: document.getElementById("unassignedCount"),
    elite: document.getElementById("eliteCount"),
    development: document.getElementById("devCount"),
    trial: document.getElementById("trialCount")
};

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

async function fetchCoachSquads() {
    try {
        const coachDoc = await getDoc(doc(db, "coaches", currentCoachId));
        if (coachDoc.exists()) {
            coachSquads = coachDoc.data().squads || {};
        }
    } catch (err) {
        console.error("Error fetching squads:", err);
    }
}

async function fetchAthletes() {
    try {
        const athletesCol = collection(db, "athletes");
        const snapshot = await getDocs(athletesCol);

        allAthletes = snapshot.docs
            .map(doc => ({
                id: doc.id,
                ...doc.data()
            }))
            .filter(athlete => athlete.personal && athlete.personal.fullName); // Requirements: Registered only

        renderPools();
    } catch (err) {
        console.error("Error fetching athletes:", err);
    }
}

function renderPools() {
    // Clear all pools
    Object.values(pools).forEach(p => p.innerHTML = "");

    const counters = { unassigned: 0, elite: 0, development: 0, trial: 0 };

    allAthletes.forEach(athlete => {
        const squad = coachSquads[athlete.id] || "unassigned";
        const card = createAthleteCard(athlete);
        pools[squad].appendChild(card);
        counters[squad]++;
    });

    // Update counts
    Object.keys(counters).forEach(k => {
        if (counts[k]) counts[k].textContent = counters[k];
    });
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

function setupDragAndDrop() {
    Object.values(pools).forEach(pool => {
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
            const newSquad = pool.dataset.squad || "unassigned";

            if (coachSquads[athleteId] === newSquad) return;

            // Update State
            coachSquads[athleteId] = newSquad;

            // Update UI
            renderPools();
            showToast(`Athlete reassigned to ${newSquad}`);

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
    const doc = new jsPDF();

    // 1. Header
    doc.setFillColor(1, 42, 97); // --primary
    doc.rect(0, 0, 210, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("TALENT TRACKER - SQUAD ROSTER", 15, 20);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated on: ${new Date().toLocaleDateString()} | Squad Management Report`, 15, 30);

    let currentY = 50;

    // 2. Iterate Squads
    const squadTypes = [
        { id: 'elite', label: 'ELITE SQUAD', color: [239, 68, 68] },
        { id: 'development', label: 'DEVELOPMENT SQUAD', color: [59, 130, 246] },
        { id: 'trial', label: 'TRIAL POOL', color: [245, 158, 11] }
    ];

    squadTypes.forEach(squad => {
        const squadAthletes = allAthletes.filter(a => coachSquads[a.id] === squad.id);

        if (squadAthletes.length > 0) {
            // Squad Header
            doc.setFillColor(...squad.color);
            doc.rect(15, currentY, 180, 8, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(10);
            doc.text(squad.label, 20, currentY + 5.5);

            currentY += 12;

            // Table Data
            const tableRows = squadAthletes.map((a, index) => [
                index + 1,
                a.personal?.fullName || a.username || "N/A",
                a.athletic?.category || "TBD",
                a.athletic?.events?.map(e => e.event).join(", ") || "No Events",
                a.personal?.address?.city || "N/A"
            ]);

            doc.autoTable({
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

            currentY = doc.lastAutoTable.finalY + 15;
        }
    });

    // Check for overflow or "No assigned" case
    if (Object.keys(coachSquads).length === 0) {
        doc.setTextColor(100);
        doc.text("No athletes have been assigned to squads yet.", 15, currentY);
    }

    doc.save(`TT_Squad_Roster_${new Date().toISOString().slice(0, 10)}.pdf`);
}
