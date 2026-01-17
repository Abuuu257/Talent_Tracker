import {
    auth,
    onAuthChange,
    signOut,
    getCoachProfile,
    getAllAthletes,
    addFavorite,
    removeFavorite,
    BACKEND_URL
} from "./register.js";
import { updateNavbar } from "./ui-utils.js";

// State
let allAthletes = [];
let filteredAthletes = [];
let coachFavorites = [];
let currentCoachId = null;

// DOM
const grid = document.getElementById("athletesGrid");
const searchInput = document.getElementById("athleteSearch");
const sportFilter = document.getElementById("filterSport");
const categoryFilter = document.getElementById("filterCategory");
const favoritesToggle = document.getElementById("filterFavorites");
const noResults = document.getElementById("noResults");
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

    // Update Navbar immediately
    updateNavbar(user, null);

    try {
        const data = await getCoachProfile(currentCoachId);
        if (data && data.exists) {
            coachFavorites = data.favorites || [];
            name = data.username || data.fullName.split(" ")[0] || name;
            profilePic = data.profilePic || null;
            if (name) localStorage.setItem("tt_username", name);

            updateNavbar(user, data);
        } else {
            // Profile doesn't exist
            window.location.href = "create-coach-profile.html";
            return;
        }
    } catch (e) {
        console.error("Error fetching coach data", e);
    }

    if (!name) name = user.email.split("@")[0];

    // Manual navbar update removed, handled by updateNavbar above

    await fetchAthletes();
});

async function fetchAthletes() {
    try {
        const athletes = await getAllAthletes();
        // Filter those with names
        allAthletes = athletes.filter(a => a.username || (a.personal && a.personal.fullName));
        filteredAthletes = [...allAthletes];
        renderAthletes();
        updateFavoritesCount();
    } catch (err) {
        console.error("Error fetching athletes", err);
        if (grid) grid.innerHTML = `<p class="col-span-full text-center text-red-600 font-bold">Failed to load athletes.</p>`;
    }
}

function updateFavoritesCount() {
    const countBadge = document.getElementById("favoritesCount");
    const countNumber = document.getElementById("favCountNumber");

    if (countBadge && countNumber) {
        const count = coachFavorites.length;
        countNumber.textContent = count;

        if (count > 0) {
            countBadge.classList.remove("hidden");
        } else {
            countBadge.classList.add("hidden");
        }
    }
}

function renderAthletes() {
    if (!grid) return;
    grid.innerHTML = "";

    if (filteredAthletes.length === 0) {
        if (noResults) {
            // Check if the favorites filter is active
            const isFavoritesFilterActive = favoritesToggle && favoritesToggle.checked;

            if (isFavoritesFilterActive && coachFavorites.length === 0) {
                // Show a special message for empty watchlist
                noResults.innerHTML = `
                    <div class="bg-white/50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg class="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                    </div>
                    <h3 class="text-xl font-bold text-slate-800 mb-2">Your Watchlist is Empty</h3>
                    <p class="text-slate-600 mb-4">Click the ❤️ heart icon on athlete cards to add them to your watchlist.</p>
                    <button onclick="document.getElementById('filterFavorites').click()" class="px-6 py-2 bg-[var(--primary)] text-white rounded-xl font-semibold hover:bg-[var(--secondary)] transition-all">
                        Show All Athletes
                    </button>
                `;
            } else {
                // Show default no results message
                noResults.innerHTML = `
                    <div class="bg-white/50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg class="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 9.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h3 class="text-xl font-bold text-slate-800">No athletes found matching your filters</h3>
                    <p class="text-slate-600">Try adjusting your search or filters.</p>
                `;
            }
            noResults.classList.remove("hidden");
        }
        return;
    }

    if (noResults) noResults.classList.add("hidden");

    filteredAthletes.forEach(athlete => {
        // Convert both to strings for consistent comparison
        const athleteIdStr = String(athlete.id);
        const isFavorited = coachFavorites.some(favId => String(favId) === athleteIdStr);

        const displayName = athlete.personal?.fullName || athlete.username || "Athlete " + athlete.id;
        const city = athlete.personal?.city || "Not Specified";
        const category = athlete.athletic?.category || "TBD";
        let profilePic = athlete.documents?.profilePic || "https://via.placeholder.com/150?text=No+Photo";

        // Fix relative paths
        if (profilePic && profilePic.startsWith('/')) {
            profilePic = BACKEND_URL + profilePic;
        }

        const events = athlete.athletic?.events || [];
        const mainSport = events.length > 0 ? events[0].event : "No Events";
        const isComplete = true; // Assuming SQL user is complete if listed

        const statusHTML = isComplete
            ? `<div class="absolute top-4 left-4 bg-green-500/90 text-white px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest shadow-sm">Verified Profile</div>`
            : `<div class="absolute top-4 left-4 bg-amber-500/90 text-white px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest shadow-sm">Pending</div>`;

        const card = document.createElement("div");
        card.className = "athlete-card bg-white rounded-[2rem] overflow-hidden shadow-sm border border-blue-50 flex flex-col hover:border-[var(--secondary)] relative";

        card.innerHTML = `
            <div class="relative h-48 overflow-hidden">
                <img src="${profilePic}" class="w-full h-full object-cover" alt="${displayName}">
                ${statusHTML}
                
                <button onclick="toggleFavorite('${athleteIdStr}')" class="absolute top-4 right-4 z-20 p-2 rounded-full bg-white/80 backdrop-blur shadow-sm hover:scale-110 transition-all">
                    <svg class="w-5 h-5 transition-all ${isFavorited ? 'fill-red-500 stroke-red-500' : 'fill-none stroke-slate-400'}" viewBox="0 0 24 24">
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
                </div>
 
                <a href="view-athlete.html?id=${athlete.id}" class="mt-auto w-full py-3 rounded-xl bg-slate-900 text-white text-center text-sm font-bold hover:bg-[var(--primary)] transition-all">
                    View Dashboard
                </a>
            </div>
        `;
        grid.appendChild(card);
    });
}

window.toggleFavorite = async function (athleteId) {
    if (!currentCoachId) {
        alert("Please log in to add favorites");
        return;
    }

    // Find the button that was clicked
    const button = event.target.closest('button');
    if (!button) return;

    const heartIcon = button.querySelector('svg');

    // Convert to string for consistent comparison
    const athleteIdStr = String(athleteId);
    const wasFavorited = coachFavorites.some(favId => String(favId) === athleteIdStr);

    try {
        // Add loading state
        button.disabled = true;
        button.classList.add('opacity-50');

        if (wasFavorited) {
            await removeFavorite(currentCoachId, athleteIdStr);
            coachFavorites = coachFavorites.filter(id => String(id) !== athleteIdStr);

            // Animate heart removal
            heartIcon.classList.remove('fill-red-500', 'stroke-red-500');
            heartIcon.classList.add('fill-none', 'stroke-slate-400');

            // Show feedback
            showToast("Removed from favorites", "info");
        } else {
            await addFavorite(currentCoachId, athleteIdStr);
            coachFavorites.push(athleteIdStr);

            // Animate heart addition
            heartIcon.classList.remove('fill-none', 'stroke-slate-400');
            heartIcon.classList.add('fill-red-500', 'stroke-red-500');

            // Add bounce animation
            button.classList.add('animate-bounce');
            setTimeout(() => button.classList.remove('animate-bounce'), 500);

            // Show feedback
            showToast("Added to favorites ❤️", "success");
        }

        // Remove loading state
        button.disabled = false;
        button.classList.remove('opacity-50');

        // Update the favorites count badge
        updateFavoritesCount();

        // Re-apply filters to update the view if watchlist filter is active
        applyFilters();

    } catch (err) {
        console.error("Favorite error:", err);
        button.disabled = false;
        button.classList.remove('opacity-50');
        showToast("Failed to update favorites. Please try again.", "error");
    }
}

// Toast notification function
function showToast(message, type = "info") {
    const toast = document.createElement('div');
    const bgColor = type === "success" ? "bg-green-500" : type === "error" ? "bg-red-500" : "bg-blue-500";

    toast.className = `fixed bottom-8 right-8 ${bgColor} text-white px-6 py-3 rounded-2xl shadow-2xl z-[200] font-semibold text-sm flex items-center gap-2 animate-slide-up`;
    toast.innerHTML = `
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
        ${message}
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

function applyFilters() {
    const term = searchInput.value.toLowerCase();
    const sport = sportFilter.value;
    const cat = categoryFilter.value;
    const favs = favoritesToggle.checked;

    filteredAthletes = allAthletes.filter(a => {
        const name = (a.personal?.fullName || "").toLowerCase();
        const city = (a.personal?.city || "").toLowerCase();
        const matchesTerm = name.includes(term) || city.includes(term);

        const events = a.athletic?.events || [];
        const matchesSport = sport === "all" || events.some(e => e.event === sport);

        const matchesCat = cat === "all" || (a.athletic?.category === cat);

        // Convert both to strings for consistent comparison
        const matchesFav = !favs || coachFavorites.some(favId => String(favId) === String(a.id));

        return matchesTerm && matchesSport && matchesCat && matchesFav;
    });
    renderAthletes();
}

if (searchInput) searchInput.addEventListener("input", applyFilters);
if (sportFilter) sportFilter.addEventListener("change", applyFilters);
if (categoryFilter) categoryFilter.addEventListener("change", applyFilters);
if (favoritesToggle) favoritesToggle.addEventListener("change", applyFilters);

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
