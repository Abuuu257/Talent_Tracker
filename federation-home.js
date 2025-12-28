import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore, doc, getDoc, getDocs, collection, addDoc, query, where, updateDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { initWhatsAppSupport, sendWhatsAppNotification } from "./ui-utils.js";

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

// --- GLOBAL STATE ---
let currentTab = 'coaches';
let allUsers = [];
let filteredUsers = [];

// --- DOM ELEMENTS ---
const userTableBody = document.getElementById("userTableBody");
const colSpecific1 = document.getElementById("colSpecific1");
const userSearch = document.getElementById("userSearch");
const statusFilter = document.getElementById("statusFilter");
const heroUserDisplay = document.getElementById("heroUserDisplay");

onAuthStateChanged(auth, async (user) => {
    const isAdmin = localStorage.getItem("tt_role") === "federation";

    // STRICT CHECK: Only allow if tt_role is 'federation'
    if (!isAdmin) {
        window.location.href = "index.html";
        return;
    }

    let name = "Admin";
    if (heroUserDisplay) heroUserDisplay.textContent = name;

    // Update Navbar UI
    const navBtnText = document.getElementById("navBtnText");
    const navPic = document.getElementById("navUserPic");
    const navImg = document.getElementById("navUserImg");
    const mobilePic = document.getElementById("mobileUserPic");
    const mobileImg = document.getElementById("mobileUserImg");
    const mobileUserName = document.getElementById("mobileUserName");
    const navUserEmail = document.getElementById("navUserEmail");

    if (navBtnText) navBtnText.textContent = name;
    if (mobileUserName) mobileUserName.textContent = name;
    if (navUserEmail) navUserEmail.textContent = user?.email || "admin@talenttracker.lk";

    // Show Default Profile Pic for Federation Admin
    const defaultPic = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=012A61&color=fff`;
    if (navPic) navPic.classList.remove("hidden");
    if (mobilePic) mobilePic.classList.remove("hidden");
    if (navImg) { navImg.src = defaultPic; navImg.classList.remove("hidden"); }
    if (mobileImg) { mobileImg.src = defaultPic; mobileImg.classList.remove("hidden"); }

    // Initial Fetch
    fetchUsers();

    // SECURITY: Ensure this admin exists in 'federations' collection for Rules
    try {
        const adminRef = doc(db, "federations", user.uid);
        const adminSnap = await getDoc(adminRef);
        if (!adminSnap.exists()) {
            await setDoc(adminRef, {
                email: user.email,
                role: "federation",
                createdAt: new Date().toISOString()
            });
            console.log("Federation Admin document created for Security Rules.");
        }
    } catch (e) {
        console.error("Auto-create admin doc failed:", e);
    }

    // Init Support
    initWhatsAppSupport("Federation Admin");
});

// --- MANAGEMENT LOGIC ---

window.switchManagementTab = (tab) => {
    currentTab = tab;

    // Update UI Buttons
    const btnCoaches = document.getElementById("tabCoaches");
    const btnAthletes = document.getElementById("tabAthletes");

    if (tab === 'coaches') {
        btnCoaches.classList.add("bg-[var(--primary)]", "text-white", "shadow-lg");
        btnCoaches.classList.remove("text-slate-500");
        btnAthletes.classList.remove("bg-[var(--primary)]", "text-white", "shadow-lg");
        btnAthletes.classList.add("text-slate-500");
        if (colSpecific1) colSpecific1.textContent = "Specialization";
    } else {
        btnAthletes.classList.add("bg-[var(--primary)]", "text-white", "shadow-lg");
        btnAthletes.classList.remove("text-slate-500");
        btnCoaches.classList.remove("bg-[var(--primary)]", "text-white", "shadow-lg");
        btnCoaches.classList.add("text-slate-500");
        if (colSpecific1) colSpecific1.textContent = "Location";
    }

    fetchUsers();
};

async function fetchUsers() {
    if (!userTableBody) return;

    userTableBody.innerHTML = `
        <tr>
            <td colspan="4" class="px-8 py-20 text-center">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)] mx-auto mb-4"></div>
                <p class="text-sm font-bold text-slate-400">Fetching ${currentTab}...</p>
            </td>
        </tr>
    `;

    try {
        const colRef = collection(db, currentTab);
        const snapshot = await getDocs(colRef);
        allUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        applyFilters();
    } catch (err) {
        console.error("Error fetching users:", err);
        userTableBody.innerHTML = `<tr><td colspan="4" class="px-8 py-10 text-center text-red-500 font-bold">Failed to load directory.</td></tr>`;
    }
}

function applyFilters() {
    const searchTerm = userSearch.value.toLowerCase();
    const statusVal = statusFilter.value;

    filteredUsers = allUsers.filter(u => {
        const name = (u.fullName || u.personal?.fullName || u.username || "").toLowerCase();
        const email = (u.email || "").toLowerCase();
        const matchesSearch = name.includes(searchTerm) || email.includes(searchTerm);

        // CHECK IF PROFILE IS COMPLETE
        // Coaches have 'personalInfo', Athletes have 'personal'
        const isProfileComplete = (u.personalInfo?.fullName) || (u.personal?.fullName) || false;

        if (!isProfileComplete) return false; // Hide incomplete profiles

        const isApproved = u.federationApproval?.status === "approved";
        if (statusVal === 'pending') return matchesSearch && !isApproved;
        if (statusVal === 'approved') return matchesSearch && isApproved;
        return matchesSearch;
    });

    renderTable();
}

function renderTable() {
    if (filteredUsers.length === 0) {
        userTableBody.innerHTML = `<tr><td colspan="4" class="px-8 py-20 text-center text-slate-400 font-medium">No results found matching your criteria.</td></tr>`;
        return;
    }

    userTableBody.innerHTML = filteredUsers.map(user => {
        const name = user.fullName || user.personal?.fullName || user.username || "Unknown User";
        const email = user.email || "No Email";
        const pic = user.profilePic || user.documents?.profilePic || "https://ui-avatars.com/api/?name=" + name;
        const isApproved = user.federationApproval?.status === "approved";

        let spec = "";
        if (currentTab === 'coaches') {
            spec = user.coachingBio?.specialization || user.personalInfo?.specialization || "Generalist";
        } else {
            spec = user.personal?.city || user.personal?.district || "Unknown";
        }

        return `
            <tr class="hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0">
                <td class="px-8 py-4">
                    <div class="flex items-center gap-4">
                        <img src="${pic}" class="w-10 h-10 rounded-xl object-cover shrink-0 border border-slate-100">
                        <div class="min-w-0">
                            <p class="font-bold text-[var(--primary)] truncate">${name}</p>
                            <p class="text-[10px] font-medium text-slate-400 truncate">${email}</p>
                        </div>
                    </div>
                </td>
                <td class="px-8 py-4">
                    <span class="text-xs font-bold text-slate-600">${spec}</span>
                </td>
                <td class="px-8 py-4 text-center">
                    <span class="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${isApproved ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}">
                        ${isApproved ? 'Approved' : 'Pending'}
                    </span>
                </td>
                <td class="px-8 py-4 text-right">
                    <button onclick="toggleApproval('${user.id}', ${isApproved})" 
                        class="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isApproved ? 'text-red-500 hover:bg-red-50' : 'text-blue-500 hover:bg-blue-50'}">
                        ${isApproved ? 'Revoke Approval' : 'Approve Access'}
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

window.toggleApproval = async (uid, currentStatus) => {
    console.log("Toggle Approval Cliked:", uid, currentStatus);
    try {
        // 1. SECURITY FIX: Ensure Admin Document Exists
        // Using global 'auth' object directly without alert since redirection happens on load
        // if (!auth.currentUser) return; // Silent fail if not logged in (auth listener handles redirect)

        const userRef = doc(db, currentTab, uid);
        const newStatus = currentStatus ? "pending" : "approved";

        // Prepare update object
        const updateData = {
            "federationApproval.status": newStatus,
            "federationApproval.updatedAt": new Date().toISOString()
        };

        // Use setDoc with merge: true for robustness
        await setDoc(userRef, updateData, { merge: true });

        // Optimistic Update
        const userIdx = allUsers.findIndex(u => u.id === uid);
        if (userIdx > -1) {
            allUsers[userIdx].federationApproval = { status: newStatus };
            const userData = allUsers[userIdx];

            // --- AUTOMATED EMAIL NOTIFICATION VIA FIREBASE TRIGGER ---
            if (newStatus === "approved") {
                const email = userData.email;
                const name = userData.fullName || userData.personal?.fullName || userData.username;

                if (email) {
                    // Create a document in the 'mail' collection.
                    // This assumes you have the 'Trigger Email' extension installed in Firebase.
                    try {
                        const mailCollection = collection(db, "mail"); // Standard collection name for the extension
                        await addDoc(mailCollection, {
                            to: [email],
                            message: {
                                subject: "Federation Approval - Talent Tracker",
                                text: `Dear ${name},\n\nCongratulations! Your Talent Tracker profile has been APPROVED by the Federation.\n\nYou now have full access to the platform. Check your dashboard: ${window.location.origin}/index.html\n\nBest Regards,\nThe Federation`,
                                html: `<p>Dear ${name},</p><p>Congratulations! Your Talent Tracker profile has been <strong>APPROVED</strong> by the Federation.</p><p>You now have full access to the platform.</p><p><a href="${window.location.origin}/index.html">Click here to Login</a></p><p>Best Regards,<br>The Federation</p>`
                            }
                        });
                        alert("Access Approved! Automated email sent via Firebase.");
                    } catch (mailError) {
                        console.error("Failed to queue email:", mailError);
                        alert("Access approved, but failed to queue automated email.");
                    }
                }
            }
            applyFilters();
        }
    } catch (err) {
        console.error("Approval Error:", err);
        alert("Action failed: " + err.message);
    }
};

// --- EVENTS ---
if (userSearch) userSearch.addEventListener("input", applyFilters);
if (statusFilter) statusFilter.addEventListener("change", applyFilters);

// Dropdown Toggle Logic (Fixes "Broken" Logout Button)
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

// Mobile Menu Logic
const mobileMenuButton = document.getElementById("mobileMenuButton");
const mobileMenu = document.getElementById("mobileMenu");
const mobileBackdrop = document.getElementById("mobileMenuBackdrop");
const mobileBackBtn = document.getElementById("mobileBackBtn");

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

if (mobileMenuButton) mobileMenuButton.addEventListener('click', () => toggleMobileMenu(true));
if (mobileBackBtn) mobileBackBtn.addEventListener('click', () => toggleMobileMenu(false));
if (mobileBackdrop) mobileBackdrop.addEventListener('click', () => toggleMobileMenu(false));

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

document.getElementById("logoutBtn")?.addEventListener("click", handleLogout);
document.getElementById("mobileLogoutBtn")?.addEventListener("click", handleLogout);
