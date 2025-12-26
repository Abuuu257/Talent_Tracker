import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

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

// Get Athlete ID from URL
const urlParams = new URLSearchParams(window.location.search);
const athleteId = urlParams.get('id');

if (!athleteId) {
    window.location.href = "coach-athletes.html";
}

// DOM Elements
const athleteName = document.getElementById("athleteName");
const athleteCategory = document.getElementById("athleteCategory");
const athletePic = document.getElementById("athletePic");
const athleteLocation = document.getElementById("athleteLocation");
const athleteHeight = document.getElementById("athleteHeight");
const athleteWeight = document.getElementById("athleteWeight");
const athleteBMI = document.getElementById("athleteBMI");
const athleteEmail = document.getElementById("athleteEmail");
const athletePhone = document.getElementById("athletePhone");
const athleteClub = document.getElementById("athleteClub");
const eventsList = document.getElementById("eventsList");
const btnIdDoc = document.getElementById("btnIdDoc");
const btnConsentDoc = document.getElementById("btnConsentDoc");
const contactBtn = document.getElementById("contactAthleteBtn");

// --- 2. AUTHENTICATION ---
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "index.html";
    } else {
        loadAthleteData();
    }
});

async function loadAthleteData() {
    try {
        const docRef = doc(db, "athletes", athleteId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();

            // Personal
            const p = data.personal || {};
            athleteName.textContent = p.fullName || "Unnamed Athlete";
            athleteLocation.textContent = p.address?.city || "Unknown Location";
            athleteEmail.textContent = p.email || "N/A";
            athletePhone.textContent = p.phone || "N/A";
            contactBtn.href = `mailto:${p.email}`;

            // Physical
            const m = data.medicalPhysical || {};
            athleteHeight.textContent = m.height ? `${m.height} cm` : "N/A";
            athleteWeight.textContent = m.weight ? `${m.weight} kg` : "N/A";
            if (m.height && m.weight) {
                const bmi = (m.weight / ((m.height / 100) ** 2)).toFixed(1);
                athleteBMI.textContent = bmi;
            } else {
                athleteBMI.textContent = "N/A";
            }

            // Category & Club
            athleteCategory.textContent = data.athletic?.category || "N/A";
            athleteClub.textContent = data.playingLevel?.club || data.playingLevel?.school || "N/A";

            // Pic & Docs
            const docs = data.documents || {};
            athletePic.src = docs.profilePic || "https://via.placeholder.com/150";

            if (docs.idDoc) {
                btnIdDoc.href = docs.idDoc;
                btnIdDoc.classList.remove("hidden");
            } else {
                btnIdDoc.classList.add("hidden");
            }

            if (docs.consentDoc) {
                btnConsentDoc.href = docs.consentDoc;
                btnConsentDoc.classList.remove("hidden");
            } else {
                btnConsentDoc.classList.add("hidden");
            }

            // Events
            renderEvents(data.athletic?.events || []);

        } else {
            alert("Athlete not found.");
            window.location.href = "coach-athletes.html";
        }
    } catch (error) {
        console.error("Error loading athlete:", error);
    }
}

function renderEvents(events) {
    eventsList.innerHTML = "";
    if (events.length === 0) {
        eventsList.innerHTML = `<p class="text-slate-500 italic">No events recorded.</p>`;
        return;
    }

    events.forEach(evt => {
        const row = document.createElement("div");
        row.className = "flex items-center justify-between p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-all border border-slate-100";
        row.innerHTML = `
            <div class="flex items-center gap-4">
                <div class="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-[var(--primary)]">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <div>
                    <h4 class="font-bold text-slate-800">${evt.event}</h4>
                    <p class="text-[10px] font-bold text-slate-400 uppercase">${evt.bestCompetition || 'Best Competition'}</p>
                </div>
            </div>
            <div class="text-right">
                <p class="text-xl font-black text-[var(--secondary)]">${evt.pb}s</p>
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">${evt.experience || 'Experience'}</p>
            </div>
        `;
        eventsList.appendChild(row);
    });
}
