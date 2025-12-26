import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

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

// DOM Elements
const grid = document.getElementById("athletesGrid");
const searchInput = document.getElementById("athleteSearch");
const sportFilter = document.getElementById("filterSport");
const categoryFilter = document.getElementById("filterCategory");
const noResults = document.getElementById("noResults");

// --- 2. AUTHENTICATION ---
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "index.html";
    } else {
        fetchAthletes();
    }
});

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
            .filter(athlete => athlete.personal && athlete.personal.fullName);

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
        const fullName = data.personal?.fullName || "Unnamed Athlete";
        const city = data.personal?.address?.city || "Unknown City";
        const category = data.athletic?.category || "N/A";
        const profilePic = data.documents?.profilePic || "https://via.placeholder.com/150?text=No+Photo";
        const events = data.athletic?.events || [];
        const mainSport = events.length > 0 ? events[0].event : "N/A";

        const card = document.createElement("div");
        card.className = "athlete-card bg-white rounded-[2rem] overflow-hidden shadow-sm border border-blue-50 flex flex-col hover:border-[var(--secondary)]";

        card.innerHTML = `
            <div class="relative h-48 overflow-hidden">
                <img src="${profilePic}" class="w-full h-full object-cover" alt="${fullName}">
                <div class="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-black uppercase text-[var(--primary)] shadow-sm">
                    ${category}
                </div>
            </div>
            <div class="p-6 flex-grow flex flex-col">
                <div class="mb-4">
                    <h3 class="text-xl font-bold text-[var(--primary)] mb-1">${fullName}</h3>
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

// --- 5. FILTERING LOGIC ---
function applyFilters() {
    const searchTerm = searchInput.value.toLowerCase();
    const selectedSport = sportFilter.value;
    const selectedCategory = categoryFilter.value;

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

        return matchesSearch && matchesSport && matchesCategory;
    });

    renderAthletes();
}

// Event Listeners
searchInput.addEventListener("input", applyFilters);
sportFilter.addEventListener("change", applyFilters);
categoryFilter.addEventListener("change", applyFilters);
