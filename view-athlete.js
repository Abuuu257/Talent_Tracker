import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { showLoading, hideLoading, showSuccessModal, initWhatsAppSupport, sendWhatsAppNotification } from "./ui-utils.js";

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
const athleteHeight = document.getElementById("athleteHeight");
const athleteWeight = document.getElementById("athleteWeight");
const athleteBMI = document.getElementById("athleteBMI");
const athleteEmail = document.getElementById("athleteEmail");
const athleteClub = document.getElementById("athleteClub");
const eventsList = document.getElementById("eventsList");
const btnIdDoc = document.getElementById("btnIdDoc");
const btnConsentDoc = document.getElementById("btnConsentDoc");
const contactBtn = document.getElementById("contactAthleteBtn");

let currentCoachId = null;
let isFavorited = false;
let athleteData = null;

// --- 2. AUTHENTICATION ---
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "index.html";
    } else {
        currentCoachId = user.uid;
        checkIfFavorited();
        loadAthleteData();
        initWhatsAppSupport('Coach');
    }
});

async function checkIfFavorited() {
    if (!currentCoachId || !athleteId) return;
    const coachRef = doc(db, "coaches", currentCoachId);
    const coachSnap = await getDoc(coachRef);
    if (coachSnap.exists()) {
        const favorites = coachSnap.data().favorites || [];
        isFavorited = favorites.includes(athleteId);
        updateFavoriteUI();
    }
}

function updateFavoriteUI() {
    const icon = document.getElementById("heartIcon");
    const text = document.getElementById("interestText");
    if (isFavorited) {
        icon.classList.replace("fill-none", "fill-current");
        text.textContent = "In Watchlist";
    } else {
        icon.classList.replace("fill-current", "fill-none");
        text.textContent = "Add to Watchlist";
    }
}

window.toggleFavoriteQuick = async () => {
    if (!currentCoachId || !athleteId) return;
    const coachRef = doc(db, "coaches", currentCoachId);

    try {
        if (isFavorited) {
            await updateDoc(coachRef, { favorites: arrayRemove(athleteId) });
            isFavorited = false;
        } else {
            await updateDoc(coachRef, { favorites: arrayUnion(athleteId) });
            isFavorited = true;
        }
        updateFavoriteUI();
    } catch (err) {
        console.error("Favorite Toggle Error:", err);
    }
};

async function loadAthleteData() {
    try {
        const docRef = doc(db, "athletes", athleteId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            athleteData = data;

            // Personal
            const p = data.personal || {};
            athleteName.textContent = p.fullName || data.username || "Candidate Profile";
            athleteEmail.textContent = p.email || "Confidential";

            // --- WHATSAPP RECRUITMENT ---
            const phone = p.phone || data.phone || data.mobile;
            if (phone) {
                const cleanPhone = phone.replace(/\D/g, '');
                const coachName = auth.currentUser.displayName || "a Professional Coach";
                const msg = encodeURIComponent(`Hello ${p.fullName || data.username}, I am Coach ${coachName}. I saw your profile on Talent Tracker and I am interested in recruiting you.`);
                contactBtn.href = `https://wa.me/${cleanPhone}?text=${msg}`;
                contactBtn.target = "_blank";
            } else {
                contactBtn.href = `mailto:${p.email || ''}`;
            }

            // Physical
            const m = data.medicalPhysical || {};
            athleteHeight.textContent = m.height ? `${m.height} cm` : "-- cm";
            athleteWeight.textContent = m.weight ? `${m.weight} kg` : "-- kg";
            if (m.height && m.weight) {
                const heightM = m.height / 100;
                const bmi = (m.weight / (heightM * heightM)).toFixed(1);
                athleteBMI.textContent = bmi;
            } else {
                athleteBMI.textContent = "--";
            }

            // Category & Club
            athleteCategory.textContent = `${data.athletic?.category || 'TBD'} CATEGORY`;
            athleteClub.textContent = data.playingLevel?.club || data.playingLevel?.school || "Freelance Athlete";

            // Pic & Docs
            const docs = data.documents || {};
            athletePic.src = docs.profilePic || "https://via.placeholder.com/300?text=No+Photo";

            if (docs.idDoc) {
                btnIdDoc.href = docs.idDoc;
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
    if (!eventsList) return;
    eventsList.innerHTML = "";
    if (events.length === 0) {
        eventsList.innerHTML = `
            <div class="p-10 border-2 border-dashed border-slate-100 rounded-[2rem] text-center">
                <p class="text-slate-400 font-bold text-sm">No verified track records found for this candidate.</p>
            </div>
        `;
        return;
    }

    events.forEach(evt => {
        const card = document.createElement("div");
        card.className = "flex flex-col sm:flex-row items-center justify-between p-6 bg-slate-50 rounded-[2rem] border border-slate-100 hover:border-blue-200 hover:bg-white transition-all group";
        card.innerHTML = `
            <div class="flex items-center gap-6 mb-4 sm:mb-0">
                <div class="w-14 h-14 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-[var(--primary)] font-black shadow-sm group-hover:bg-[var(--primary)] group-hover:text-white transition-colors uppercase">
                    ${evt.event.replace('m', '')}
                </div>
                <div>
                    <h4 class="text-lg font-black text-slate-800 uppercase">${evt.event} Sprint</h4>
                    <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">Personal Best</p>
                </div>
            </div>
            <div class="text-center sm:text-right">
                <p class="text-3xl font-black text-[var(--secondary)]">${evt.pb}<span class="text-sm ml-1 text-slate-400">s</span></p>
                <div class="flex items-center gap-2 justify-center sm:justify-end mt-1">
                    <span class="w-2 h-2 rounded-full bg-green-500"></span>
                    <span class="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Verified Result</span>
                </div>
            </div>
        `;
        eventsList.appendChild(card);
    });
}
