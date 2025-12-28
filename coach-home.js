// 1. IMPORTS
// Importing necessary Firebase services from the CDN.
// =======================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-storage.js";
import { initWhatsAppSupport } from "./ui-utils.js";

// =======================================================
// 2. FIREBASE CONFIGURATION
// Specific keys to connect to the 'athletesystem' project.
// =======================================================
const firebaseConfig = {
    apiKey: "AIzaSyBtIlIV-FGmM2hZh0NcuK78N9EafqpcGTQ",
    authDomain: "athletesystem-61615.firebaseapp.com",
    projectId: "athletesystem-61615",
    storageBucket: "athletesystem-61615.appspot.com",
    messagingSenderId: "646599639422",
    appId: "1:646599639422:web:33f0f059a0e7112d9f332f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// =======================================================
// 3. DOM ELEMENT SELECTION
// Capturing HTML elements to manipulate them via JS.
// =======================================================

// Navbar Elements
const navUserBtn = document.getElementById("navUserBtn");          // Button displaying username
const navUserDropdown = document.getElementById("navUserDropdown"); // The hidden dropdown menu
const navUserEmail = document.getElementById("navUserEmail");      // Email display inside dropdown
const navUserPic = document.getElementById("navUserPic");
const navProfileInput = document.getElementById("navProfileInput");

// Mobile Elements
const mobileUserName = document.getElementById("mobileUserName");
const mobileMenuButton = document.getElementById("mobileMenuButton");
const mobileMenu = document.getElementById("mobileMenu");
const mobileBackdrop = document.getElementById("mobileMenuBackdrop");
const mobileBackBtn = document.getElementById("mobileBackBtn");
const mobileLogoutBtn = document.getElementById("mobileLogoutBtn");

// Hero Section & Actions
const heroUserDisplay = document.getElementById("heroUserDisplay"); // "Welcome [Name]!" text
const logoutBtn = document.getElementById("logoutBtn");
const createProfileBtn = document.getElementById("createProfileBtn");
const contactSupportBtn = document.getElementById("contactSupportBtn");

// =======================================================
// 4. MOBILE MENU LOGIC
// Handles sliding the mobile menu in and out.
// =======================================================
const toggleMobileMenu = (show) => {
    if (show) {
        mobileBackdrop.classList.remove("hidden");
        setTimeout(() => {
            mobileBackdrop.classList.replace("opacity-0", "opacity-100");
            mobileMenu.classList.remove("translate-x-full");
        }, 10);
    } else {
        mobileBackdrop.classList.replace("opacity-100", "opacity-0");
        mobileMenu.classList.add("translate-x-full");
        setTimeout(() => mobileBackdrop.classList.add("hidden"), 300);
    }
};

if (mobileMenuButton) {
    mobileMenuButton.addEventListener('click', () => toggleMobileMenu(true));
}

if (mobileBackBtn) {
    mobileBackBtn.addEventListener('click', () => toggleMobileMenu(false));
}

if (mobileBackdrop) {
    mobileBackdrop.addEventListener('click', () => toggleMobileMenu(false));
}

// =======================================================
// 5. AUTHENTICATION STATE OBSERVER
// This runs automatically when the page loads to check
// if a user is logged in.
// =======================================================
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // --- USER IS LOGGED IN ---

        // State Selectors
        const onboarding = document.getElementById("onboardingState");
        const dashboard = document.getElementById("dashboardState");

        let name = user.displayName || localStorage.getItem("tt_username") || user.email.split("@")[0];
        let profilePic = null;
        let isProfileComplete = false;
        let isVerified = false;

        try {
            const docRef = doc(db, "coaches", user.uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                isProfileComplete = !!data.personalInfo?.fullName;
                isVerified = data.federationApproval?.status === "approved"; // Strict Admin Approval Only

                // Prioritize Username, then Full Name
                name = data.username || data.personalInfo?.fullName?.split(" ")[0] || name;
                profilePic = data.profilePic || data.documents?.profilePic || null;

                if (name) localStorage.setItem("tt_username", name);

                // Update Stats
                const statSquads = document.getElementById("statSquads");
                const statAthletes = document.getElementById("statAthletes");
                if (statSquads) statSquads.textContent = (data.squads || []).length.toString().padStart(2, '0');
                if (statAthletes) statAthletes.textContent = (data.favorites || []).length.toString().padStart(2, '0');
            }
        } catch (err) {
            console.error("Error checking profile:", err);
        }

        // 1. Toggle States & Access Control
        if (onboarding && dashboard) {

            // Logic:
            // 1. If Profile Incomplete -> ALWAYS show Onboarding (regardless of approval status).
            //    This allows new users to fill their details so Admins can see them.
            // 2. If Profile Complete BUT Pending -> Show "Under Review".
            // 3. If Profile Complete AND Approved -> Show Dashboard.

            if (!isProfileComplete) {
                // CASE 1: Profile Incomplete -> Allow Creation
                onboarding.classList.remove("hidden");
                dashboard.classList.add("hidden");

                // Ensure text is default
                const heroTitle = onboarding.querySelector("h1");
                const heroSubtitle = onboarding.querySelector("p");
                const ctaBtn = document.getElementById("createProfileBtn");

                if (heroTitle) heroTitle.textContent = "Welcome, Coach!";
                if (heroSubtitle) heroSubtitle.textContent = "Let's set up your professional profile.";
                if (ctaBtn) ctaBtn.classList.remove("hidden");

            } else if (!isVerified) {
                // CASE 2: Profile Complete BUT Pending -> Show Block Screen
                onboarding.classList.remove("hidden");
                dashboard.classList.add("hidden");

                const heroTitle = onboarding.querySelector("h1");
                const heroSubtitle = onboarding.querySelector("p");
                const ctaBtn = document.getElementById("createProfileBtn");

                if (heroTitle) heroTitle.textContent = "Profile Under Review";
                if (heroSubtitle) heroSubtitle.textContent = `Your profile is complete and waiting for Federation approval.\nStatus: ${data.federationApproval?.status?.toUpperCase() || "PENDING"}`;
                if (ctaBtn) ctaBtn.classList.add("hidden");

            } else {
                // CASE 3: Approved & Complete -> Dashboard
                onboarding.classList.add("hidden");
                dashboard.classList.remove("hidden");
                fetchWatchlist(user.uid);
            }
        }

        // 2. Toggle Verification Banner/Badge
        const vBanner = document.getElementById("verificationBanner");
        const vBadge = document.getElementById("verificationBadge");
        const vText = document.getElementById("verificationStatusText");

        if (isProfileComplete && !isVerified) {
            if (vBanner) vBanner.classList.remove("hidden");
        } else {
            if (vBanner) vBanner.classList.add("hidden");
        }

        if (vBadge) {
            if (isVerified) {
                vBadge.classList.replace("bg-amber-500", "bg-green-500");
                if (vText) vText.textContent = "Verified Professional";
            } else {
                vBadge.classList.replace("bg-green-500", "bg-amber-500");
                if (vText) vText.textContent = "Pending Verification";
            }
        }

        // Update UI with Profile Data
        const navBtnText = document.getElementById("navBtnText");
        const navImg = document.getElementById("navUserImg");
        const mobilePic = document.getElementById("mobileUserPic");
        const mobileImg = document.getElementById("mobileUserImg");

        if (navBtnText) navBtnText.textContent = name;
        if (navUserEmail) navUserEmail.textContent = user.email;
        if (mobileUserName) mobileUserName.textContent = name;
        if (heroUserDisplay) heroUserDisplay.textContent = name;

        // Show Profile Pics
        if (navUserPic) navUserPic.classList.remove("hidden");
        if (mobilePic) mobilePic.classList.remove("hidden");

        const displayPic = profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=012A61&color=fff`;

        if (navImg) { navImg.src = displayPic; navImg.classList.remove("hidden"); }
        if (mobileImg) { mobileImg.src = displayPic; mobileImg.classList.remove("hidden"); }

        // Setup Profile Pic Upload
        if (navUserPic && navProfileInput) {
            const handleUpload = async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                // Show some loading state
                // Note: we don't have a global loading spinner here easily accessible (imported from ui-utils maybe?)
                navBtnText.textContent = "Uploading...";

                try {
                    const filePath = `coaches/${user.uid}/profilePic_${Date.now()}`;
                    const storageRef = ref(storage, filePath);
                    const snapshot = await uploadBytes(storageRef, file);
                    const url = await getDownloadURL(snapshot.ref);

                    // Save
                    await updateDoc(doc(db, "coaches", user.uid), {
                        "documents.profilePic": url
                    });

                    // Update UI
                    navImg.src = url;
                    mobileImg.src = url;
                    navBtnText.textContent = name;
                    alert("Profile picture updated!");

                } catch (err) {
                    console.error(err);
                    alert("Failed to upload image.");
                    navBtnText.textContent = name;
                }
            };

            navProfileInput.onchange = handleUpload;
            navUserPic.onclick = (e) => {
                e.stopPropagation(); // Prevent dropdown toggle
                navProfileInput.click();
            }
        }

        // Init WhatsApp Support
        initWhatsAppSupport('Coach');

    } else {
        // --- USER IS NOT LOGGED IN ---
        window.location.href = "index.html";
    }
});

// =======================================================
// 6. DROPDOWN TOGGLE LOGIC
// =======================================================
if (navUserBtn) {
    navUserBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        navUserDropdown.classList.toggle('hidden');
    });
}

window.addEventListener('click', () => {
    if (navUserDropdown) navUserDropdown.classList.add('hidden');
});

// =======================================================
// 7. WATCHLIST RESUME LOGIC (Fetching Favorites)
// =======================================================
async function fetchWatchlist(uid) {
    const summaryList = document.getElementById("watchlistSummary");
    const emptyState = document.getElementById("emptyWatchlist");
    if (!summaryList) return;

    try {
        const coachRef = doc(db, "coaches", uid);
        const coachSnap = await getDoc(coachRef);

        if (coachSnap.exists()) {
            const favorites = coachSnap.data().favorites || [];

            if (favorites.length === 0) {
                summaryList.innerHTML = "";
                if (emptyState) emptyState.classList.remove("hidden");
                return;
            }

            if (emptyState) emptyState.classList.add("hidden");
            summaryList.innerHTML = ""; // Clear loader

            // Fetch first 4 favorites
            const previewIds = favorites.slice(0, 4);

            for (const athleteId of previewIds) {
                const aSnap = await getDoc(doc(db, "athletes", athleteId));
                if (aSnap.exists()) {
                    const aData = aSnap.data();
                    const aName = aData.personal?.fullName || aData.username || "Athlete";
                    const aPic = aData.documents?.profilePic || "https://ui-avatars.com/api/?name=" + transformName(aName);
                    const aCat = aData.athletic?.category || "U20";

                    const card = document.createElement("a");
                    card.href = `view-athlete.html?id=${athleteId}`;
                    card.className = "bg-white p-6 rounded-[2rem] border border-slate-100 hover:shadow-xl transition-all flex flex-col items-center text-center group";
                    card.innerHTML = `
                        <img src="${aPic}" class="w-16 h-16 rounded-2xl object-cover mb-4 border-2 border-slate-50 group-hover:scale-110 transition-transform">
                        <p class="font-black text-[var(--primary)] text-sm mb-1">${aName}</p>
                        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">${aCat} Category</span>
                    `;
                    summaryList.appendChild(card);
                }
            }
        }
    } catch (err) {
        console.error("Error fetching watchlist:", err);
        summaryList.innerHTML = `<p class="text-xs text-red-500">Failed to load watchlist.</p>`;
    }
}

function transformName(name) {
    return encodeURIComponent(name);
}

// Logout Logic
const handleLogout = async () => {
    try {
        await signOut(auth);
        localStorage.removeItem("tt_username");
        localStorage.removeItem("tt_role");
        window.location.href = "index.html";
    } catch (error) {
        console.error("Logout Error", error);
    }
};

if (logoutBtn) logoutBtn.addEventListener("click", handleLogout);
if (mobileLogoutBtn) mobileLogoutBtn.addEventListener("click", handleLogout);

// Contact Support Handler
contactSupportBtn?.addEventListener("click", () => {
    const supportNumber = "+94xxxxxxxxx";
    const msg = encodeURIComponent("Hello Talent Tracker Support, I am a coach and I need some help.");
    window.open(`https://wa.me/${supportNumber.replace(/\D/g, '')}?text=${msg}`, '_blank');
});