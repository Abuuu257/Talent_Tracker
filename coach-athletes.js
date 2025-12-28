import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore, collection, getDocs, doc, getDoc, updateDoc, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

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
let filteredAthletes = [];
let coachFavorites = [];
let currentCoachId = null;

// DOM Elements
const grid = document.getElementById("athletesGrid");
const searchInput = document.getElementById("athleteSearch");
const sportFilter = document.getElementById("filterSport");
const categoryFilter = document.getElementById("filterCategory");
const favoritesToggle = document.getElementById("filterFavorites");
const noResults = document.getElementById("noResults");

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
                coachFavorites = data.favorites || [];
                name = data.username || data.personalInfo?.fullName?.split(" ")[0] || name;
                profilePic = data.profilePic || data.documents?.profilePic || null;
                if (name) localStorage.setItem("tt_username", name);
            }
        } catch (error) {
            console.error("Error fetching coach data:", error);
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

async function fetchCoachData() {
    try {
        const coachDoc = await getDoc(doc(db, "coaches", currentCoachId));
        if (coachDoc.exists()) {
            coachFavorites = coachDoc.data().favorites || [];
        }
    } catch (error) {
        console.error("Error fetching coach data:", error);
    }
}

// --- 3. DATA FETCHING ---
async function fetchAthletes() {
    try {
        const athletesCol = collection(db, "athletes");
        const snapshot = await getDocs(athletesCol);

        allAthletes = snapshot.docs
            .map(doc => ({
                id: doc.id,
                ...doc.data()
            }))
            .filter(athlete => athlete.personal && athlete.personal.fullName); // Only show fully registered athletes

        filteredAthletes = [...allAthletes];
        renderAthletes();
    } catch (error) {
        console.error("Error fetching athletes:", error);
        grid.innerHTML = `<p class="col-span-full text-center text-red-600 font-bold">Failed to load athletes. Please refresh.</p>`;
    }
}

// --- 4. RENDERING ---
function renderAthletes() {
    grid.innerHTML = "";

    if (filteredAthletes.length === 0) {
        noResults.classList.remove("hidden");
        return;
    }

    noResults.classList.add("hidden");

    filteredAthletes.forEach(athlete => {
        const data = athlete;
        const isFavorited = coachFavorites.includes(athlete.id);

        // Priority: Full Name > Username > "Athlete"
        const displayName = data.personal?.fullName || data.username || "Athlete #" + athlete.id.slice(-4);

        const city = data.personal?.address?.city || "Not Specified";
        const category = data.athletic?.category || "TBD";
        const profilePic = data.documents?.profilePic || "https://via.placeholder.com/150?text=No+Photo";
        const events = data.athletic?.events || [];
        const mainSport = events.length > 0 ? events[0].event : "No Events";

        // Check if profile is actually complete for a cleaner badge
        const isComplete = !!(data.personal?.fullName && data.documents?.profilePic);
        const statusHTML = isComplete
            ? `<div class="absolute top-4 left-4 bg-green-500/90 text-white px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest shadow-sm">Verified Profile</div>`
            : `<div class="absolute top-4 left-4 bg-amber-500/90 text-white px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest shadow-sm">Registered Only</div>`;

        const card = document.createElement("div");
        card.className = "athlete-card bg-white rounded-[2rem] overflow-hidden shadow-sm border border-blue-50 flex flex-col hover:border-[var(--secondary)] relative";

        card.innerHTML = `
            <div class="relative h-48 overflow-hidden">
                <img src="${profilePic}" class="w-full h-full object-cover" alt="${displayName}">
                ${statusHTML}
                
                <button onclick="toggleFavorite('${athlete.id}')" class="absolute top-4 right-4 z-20 p-2 rounded-full bg-white/80 backdrop-blur shadow-sm hover:scale-110 transition-all">
                    <svg class="w-5 h-5 ${isFavorited ? 'fill-red-500 stroke-red-500' : 'fill-none stroke-slate-400'}" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                </button>

                <div class="absolute bottom-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-black uppercase text-[var(--primary)] shadow-sm">
                    ${category}
                </div>
            </div>
            <div class="p-6 flex-grow flex flex-col">
                <div class="mb-4">
                    <h3 class="text-xl font-bold text-[var(--primary)] mb-1 truncate">${displayName}</h3>
                    <p class="text-xs font-semibold text-slate-400 flex items-center gap-1">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        ${city}
                    </p>
                </div>
                
                <div class="grid grid-cols-2 gap-2 mb-6">
                    <div class="bg-blue-50 p-3 rounded-2xl">
                        <p class="text-[9px] font-bold text-blue-400 uppercase tracking-wider mb-1">Main Event</p>
                        <p class="text-sm font-bold text-blue-900">${mainSport}</p>
                    </div>
                    <div class="bg-orange-50 p-3 rounded-2xl">
                        <p class="text-[9px] font-bold text-orange-400 uppercase tracking-wider mb-1">Rank</p>
                        <p class="text-sm font-bold text-orange-900">National</p>
                    </div>
                </div>
 
                <a href="view-athlete.html?id=${athlete.id}" class="mt-auto w-full py-3 rounded-xl bg-slate-900 text-white text-center text-sm font-bold hover:bg-[var(--primary)] transition-all">
                    View Dashboard
                </a>
            </div>
        `;
        grid.appendChild(card);
    });
}

// --- 5. FAVORITING LOGIC ---
window.toggleFavorite = async function (athleteId) {
    if (!currentCoachId) return;

    const isFav = coachFavorites.includes(athleteId);
    const coachRef = doc(db, "coaches", currentCoachId);

    try {
        if (isFav) {
            coachFavorites = coachFavorites.filter(id => id !== athleteId);
            await updateDoc(coachRef, {
                favorites: arrayRemove(athleteId)
            });
        } else {
            coachFavorites.push(athleteId);
            await updateDoc(coachRef, {
                favorites: arrayUnion(athleteId)
            });
        }
        renderAthletes(); // Immediate UI update
    } catch (error) {
        console.error("Error updating favorites:", error);
    }
}

// --- 6. FILTERING LOGIC ---
function applyFilters() {
    const searchTerm = searchInput.value.toLowerCase();
    const selectedSport = sportFilter.value;
    const selectedCategory = categoryFilter.value;
    const showOnlyFavs = favoritesToggle.checked;

    filteredAthletes = allAthletes.filter(athlete => {
        const fullName = (athlete.personal?.fullName || "").toLowerCase();
        const category = athlete.athletic?.category || "";
        const events = athlete.athletic?.events || [];

        // 1. Race Event Matching
        const matchesSport = selectedSport === "all" || events.some(e => e.event === selectedSport);

        // 2. Category Matching
        const matchesCategory = selectedCategory === "all" || category === selectedCategory;

        // 3. Search Term Matching (Name or City)
        const city = (athlete.personal?.address?.city || "").toLowerCase();
        const matchesSearch = fullName.includes(searchTerm) || city.includes(searchTerm);

        // 4. Favorites Matching
        const matchesFav = !showOnlyFavs || coachFavorites.includes(athlete.id);

        return matchesSearch && matchesSport && matchesCategory && matchesFav;
    });

    renderAthletes();
}

// Event Listeners
searchInput.addEventListener("input", applyFilters);
sportFilter.addEventListener("change", applyFilters);
categoryFilter.addEventListener("change", applyFilters);
favoritesToggle.addEventListener("change", applyFilters);

// Event Listeners
searchInput.addEventListener("input", applyFilters);
sportFilter.addEventListener("change", applyFilters);
categoryFilter.addEventListener("change", applyFilters);
