import { auth, onAuthChange, signOut } from "./register.js";
import * as API from "./api.js";
import { showAlert, showConfirm, updateNavbar, showLoading, hideLoading } from "./ui-utils.js";

let currentUser = null;
let currentRole = null;
let allEvents = [];
let editingEventId = null;

// Check if user is already logged in
const storedUser = localStorage.getItem('user');
const storedRole = localStorage.getItem('tt_role');

if (storedUser && storedRole) {
    try {
        currentUser = JSON.parse(storedUser);
        currentRole = storedRole;
        init();
    } catch (e) {
        console.error('Error parsing stored user:', e);
        window.location.href = "index.html";
    }
} else {
    window.location.href = "index.html";
}

// Also listen for auth changes
onAuthChange(async (user) => {
    if (!user) {
        window.location.href = "index.html";
        return;
    }

    currentUser = user;
    currentRole = localStorage.getItem("tt_role");

    if (!currentRole) {
        window.location.href = "index.html";
        return;
    }

    init();
});

async function init() {
    updateNavbar(currentUser, null);
    setupNavbarInteractions();
    setupNavigation();
    await loadEvents();
}

function setupNavbarInteractions() {
    // Desktop dropdown toggle
    const navUserBtn = document.getElementById("navUserBtn");
    const navUserDropdown = document.getElementById("navUserDropdown");

    if (navUserBtn && navUserDropdown) {
        navUserBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            navUserDropdown.classList.toggle("hidden");
        });

        // Close dropdown when clicking outside
        document.addEventListener("click", () => {
            if (!navUserDropdown.classList.contains("hidden")) {
                navUserDropdown.classList.add("hidden");
            }
        });
    }

    // Mobile menu toggle
    const mobileMenuButton = document.getElementById("mobileMenuButton");
    const mobileMenu = document.getElementById("mobileMenu");
    const mobileBackBtn = document.getElementById("mobileBackBtn");
    const mobileMenuBackdrop = document.getElementById("mobileMenuBackdrop");

    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener("click", () => {
            mobileMenu.classList.remove("translate-x-full");
            mobileMenuBackdrop.classList.remove("hidden");
            setTimeout(() => mobileMenuBackdrop.classList.remove("opacity-0"), 10);
        });

        const closeMobileMenu = () => {
            mobileMenu.classList.add("translate-x-full");
            mobileMenuBackdrop.classList.add("opacity-0");
            setTimeout(() => mobileMenuBackdrop.classList.add("hidden"), 300);
        };

        if (mobileBackBtn) mobileBackBtn.addEventListener("click", closeMobileMenu);
        if (mobileMenuBackdrop) mobileMenuBackdrop.addEventListener("click", closeMobileMenu);
    }

    // Logout buttons
    const logoutBtn = document.getElementById("logoutBtn");
    const mobileLogoutBtn = document.getElementById("mobileLogoutBtn");

    const handleLogout = async () => {
        try {
            await signOut();
            localStorage.removeItem("tt_username");
            localStorage.removeItem("tt_role");
            localStorage.removeItem("user");
            localStorage.removeItem("token");
            window.location.href = "index.html";
        } catch (error) {
            console.error("Logout Error", error);
        }
    };

    if (logoutBtn) logoutBtn.addEventListener("click", handleLogout);
    if (mobileLogoutBtn) mobileLogoutBtn.addEventListener("click", handleLogout);
}

function setupNavigation() {
    // Show admin controls and clean UI for federation or admin roles
    if (currentRole === "federation" || currentRole === "admin") {
        document.getElementById("adminControls").classList.remove("hidden");
        const subtitle = document.getElementById("eventsSubtitle");
        if (subtitle) subtitle.classList.add("hidden");
    }

    // Setup event listeners
    const createBtn = document.getElementById("createEventBtn");
    const cancelBtn = document.getElementById("cancelEventBtn");
    const eventForm = document.getElementById("eventForm");

    if (createBtn) {
        createBtn.addEventListener("click", () => openEventModal());
    }

    if (cancelBtn) {
        cancelBtn.addEventListener("click", closeEventModal);
    }

    if (eventForm) {
        eventForm.addEventListener("submit", handleEventSubmit);
    }
}

async function loadEvents() {
    const grid = document.getElementById("eventsGrid");
    const emptyState = document.getElementById("emptyState");
    const emptyTitle = emptyState.querySelector('h3');
    const emptyMsg = emptyState.querySelector('p');

    try {
        allEvents = await API.getAllEvents();

        // Hide loading state
        grid.innerHTML = "";

        if (!allEvents || allEvents.length === 0) {
            // Role-specific empty state text
            if (currentRole === "federation" || currentRole === "admin") {
                emptyTitle.textContent = "No Events";
                emptyMsg.classList.add("hidden");
            } else {
                emptyTitle.textContent = "No Events Yet";
                emptyMsg.textContent = "Check back soon for upcoming events!";
                emptyMsg.classList.remove("hidden");
            }
            emptyState.classList.remove("hidden");
        } else {
            emptyState.classList.add("hidden");
            renderEvents();
        }
    } catch (error) {
        console.error("Error loading events:", error);
        // Show empty state instead of error for better UX
        grid.innerHTML = "";
        emptyTitle.textContent = "No Events";
        emptyMsg.classList.add("hidden");
        emptyState.classList.remove("hidden");
    }
}

function renderEvents() {
    const grid = document.getElementById("eventsGrid");

    if (!allEvents || allEvents.length === 0) {
        grid.innerHTML = "";
        return;
    }

    grid.innerHTML = allEvents.map(event => createEventCard(event)).join("");
}

function createEventCard(event) {
    const eventDate = new Date(event.event_date);
    const formattedDate = eventDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
    });

    const isPast = eventDate < new Date();
    const statusColor = {
        'upcoming': 'bg-blue-500',
        'ongoing': 'bg-green-500',
        'completed': 'bg-gray-500',
        'cancelled': 'bg-red-500'
    }[event.status] || 'bg-blue-500';

    const imageUrl = event.image_url || 'https://via.placeholder.com/400x200?text=Event';

    // Admin buttons
    const adminButtons = (currentRole === "federation" || currentRole === "admin") ? `
        <div class="flex gap-2 mt-4">
            <button onclick="editEvent(${event.id})" class="flex-1 py-2 px-4 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 font-semibold text-sm">
                Edit
            </button>
            <button onclick="deleteEventConfirm(${event.id})" class="flex-1 py-2 px-4 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-semibold text-sm">
                Delete
            </button>
        </div>
    ` : '';

    // Athlete register button
    const athleteButton = currentRole === "athlete" && !isPast ? `
        <button onclick="registerForEvent(${event.id})" class="w-full mt-4 py-3 bg-[var(--primary)] text-white rounded-xl font-bold hover:bg-[var(--secondary)] transition-all">
            Register Now
        </button>
        <button onclick="addToCalendar(${event.id})" class="w-full mt-2 py-2 bg-white border-2 border-[var(--primary)] text-[var(--primary)] rounded-xl font-semibold hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
            Add to Calendar
        </button>
    ` : '';

    return `
        <div class="bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-1">
            <div class="relative h-48 overflow-hidden">
                <img src="${imageUrl}" alt="${event.title}" class="w-full h-full object-cover">
                <div class="absolute top-4 right-4 ${statusColor} text-white px-3 py-1 rounded-full text-xs font-bold uppercase">
                    ${event.status}
                </div>
                <div class="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-[var(--primary)]">
                    ${event.category}
                </div>
            </div>
            
            <div class="p-6">
                <h3 class="text-2xl font-black text-[var(--primary)] mb-2">${event.title}</h3>
                
                <div class="space-y-2 mb-4">
                    <div class="flex items-center gap-2 text-sm text-slate-600">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                        </svg>
                        <span class="font-semibold">${formattedDate}${event.event_time ? ' at ' + event.event_time : ''}</span>
                    </div>
                    
                    <div class="flex items-center gap-2 text-sm text-slate-600">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                        </svg>
                        <span class="font-semibold">${event.venue}, ${event.city}</span>
                    </div>
                </div>
                
                <p class="text-slate-600 text-sm mb-4 line-clamp-3">${event.description || ''}</p>
                
                <button onclick="viewEventDetails(${event.id})" class="w-full py-2 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-all">
                    View Full Details
                </button>
                
                ${athleteButton}
                ${adminButtons}
            </div>
        </div>
    `;
}

function openEventModal(event = null) {
    editingEventId = event ? event.id : null;
    const modal = document.getElementById("eventModal");
    const content = document.getElementById("eventModalContent");
    const title = document.getElementById("modalTitle");
    const form = document.getElementById("eventForm");

    title.textContent = event ? "Edit Event" : "Create New Event";

    if (event) {
        // Normalizing date to YYYY-MM-DD for input[type="date"]
        const formatDateForInput = (dateStr) => {
            if (!dateStr) return '';
            // If it's a date string from MySQL (YYYY-MM-DD), use it directly
            if (typeof dateStr === 'string' && dateStr.includes('T')) {
                return dateStr.split('T')[0];
            }
            if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
                return dateStr.substring(0, 10);
            }
            // Fallback for Date objects
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return '';
            return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        };

        // Pre-fill form with event data
        document.getElementById("eventTitle").value = event.title || '';
        document.getElementById("eventDescription").value = event.description || '';
        document.getElementById("eventDate").value = formatDateForInput(event.event_date);
        document.getElementById("eventTime").value = event.event_time || '';
        document.getElementById("eventVenue").value = event.venue || '';
        document.getElementById("eventCity").value = event.city || '';
        document.getElementById("eventCategory").value = event.category || '';
        document.getElementById("eventDeadline").value = formatDateForInput(event.registration_deadline);
        document.getElementById("eventEligibility").value = event.eligibility || '';
        document.getElementById("eventRules").value = event.rules || '';
        document.getElementById("eventRequirements").value = event.requirements || '';
        document.getElementById("eventMaxParticipants").value = event.max_participants || '';
        document.getElementById("eventContactEmail").value = event.contact_email || '';
        document.getElementById("eventContactPhone").value = event.contact_phone || '';
        document.getElementById("eventImageUrl").value = event.image_url || '';
        document.getElementById("eventStatus").value = event.status || 'upcoming';
    } else {
        form.reset();
        document.getElementById("eventStatus").value = 'upcoming';
    }

    modal.classList.remove("hidden");
    requestAnimationFrame(() => {
        content.classList.remove("scale-95", "opacity-0");
        content.classList.add("scale-100", "opacity-100");
    });
}

window.closeEventModal = function () {
    const modal = document.getElementById("eventModal");
    const content = document.getElementById("eventModalContent");

    if (content) {
        content.classList.add("scale-95", "opacity-0");
        content.classList.remove("scale-100", "opacity-100");
    }

    setTimeout(() => {
        if (modal) modal.classList.add("hidden");
        editingEventId = null;
    }, 200);
};

async function handleEventSubmit(e) {
    e.preventDefault();

    const eventData = {
        title: document.getElementById("eventTitle").value,
        description: document.getElementById("eventDescription").value,
        event_date: document.getElementById("eventDate").value,
        event_time: document.getElementById("eventTime").value || null,
        venue: document.getElementById("eventVenue").value,
        city: document.getElementById("eventCity").value,
        category: document.getElementById("eventCategory").value,
        eligibility: document.getElementById("eventEligibility").value || null,
        rules: document.getElementById("eventRules").value || null,
        requirements: document.getElementById("eventRequirements").value || null,
        registration_deadline: document.getElementById("eventDeadline").value || null,
        max_participants: document.getElementById("eventMaxParticipants").value || null,
        contact_email: document.getElementById("eventContactEmail").value || null,
        contact_phone: document.getElementById("eventContactPhone").value || null,
        image_url: document.getElementById("eventImageUrl").value || null,
        created_by: (currentUser.uid && !isNaN(currentUser.uid)) ? parseInt(currentUser.uid) :
            (currentUser.id && !isNaN(currentUser.id) ? parseInt(currentUser.id) : null),
        status: document.getElementById("eventStatus").value || 'upcoming'
    };

    try {
        showLoading();

        if (editingEventId) {
            await API.updateEvent(editingEventId, eventData);
            hideLoading();
            await showAlert("Event updated successfully!", "Success");
        } else {
            await API.createEvent(eventData);
            hideLoading();
            await showAlert("Event created successfully! Emails sent to all athletes.", "Success");
        }

        closeEventModal();
        await loadEvents();
    } catch (error) {
        hideLoading();
        console.error("Error saving event:", error);
        let errorMsg = "Failed to save event. Please check your connection.";
        if (error.message) {
            errorMsg = `Failed to save event: ${error.message}`;
        }
        await showAlert(errorMsg, "Error");
    }
}

window.editEvent = async function (eventId) {
    try {
        const event = await API.getEvent(eventId);
        openEventModal(event);
    } catch (error) {
        console.error("Error loading event:", error);
        await showAlert("Failed to load event details.", "Error");
    }
};

window.deleteEventConfirm = async function (eventId) {
    const confirmed = await showConfirm(
        "Are you sure you want to delete this event? This action cannot be undone.",
        "Delete Event"
    );

    if (!confirmed) return;

    try {
        showLoading();
        await API.deleteEvent(eventId);
        hideLoading();
        await showAlert("Event deleted successfully!", "Success");
        await loadEvents();
    } catch (error) {
        hideLoading();
        console.error("Error deleting event:", error);
        await showAlert("Failed to delete event. Please try again.", "Error");
    }
};

window.registerForEvent = async function (eventId) {
    try {
        showLoading();
        await API.registerForEvent(eventId, currentUser.uid || currentUser.id);
        hideLoading();
        await showAlert("Successfully registered for the event!", "Success");
    } catch (error) {
        hideLoading();
        console.error("Error registering:", error);
        await showAlert(error.message || "Failed to register for event.", "Error");
    }
};

window.addToCalendar = function (eventId) {
    const event = allEvents.find(e => e.id === eventId);
    if (!event) return;

    // Construct start date and time
    const startStr = event.event_date.split('T')[0] + ' ' + (event.event_time || '09:00:00');
    const startDate = new Date(startStr);

    // Default duration: 1 hour
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

    const formatDate = (date) => {
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Talent Tracker//Events//EN',
        'BEGIN:VEVENT',
        `UID:${event.id}@talenttracker.com`,
        `DTSTAMP:${formatDate(new Date())}`,
        `DTSTART:${formatDate(startDate)}`,
        `DTEND:${formatDate(endDate)}`,
        `SUMMARY:${event.title}`,
        `DESCRIPTION:${(event.description || '').replace(/\n/g, '\\n')}`,
        `LOCATION:${event.venue}, ${event.city}`,
        'END:VEVENT',
        'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${event.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

window.viewEventDetails = async function (eventId) {
    try {
        const event = await API.getEvent(eventId);

        const detailsHTML = `
            <div class="space-y-4">
                <h2 class="text-3xl font-black text-[var(--primary)]">${event.title}</h2>
                <p class="text-slate-600">${event.description || ''}</p>
                
                <div class="grid grid-cols-2 gap-4 py-4">
                    <div>
                        <p class="text-sm font-bold text-slate-500">Date</p>
                        <p class="text-lg font-semibold">${new Date(event.event_date).toLocaleDateString()}</p>
                    </div>
                    <div>
                        <p class="text-sm font-bold text-slate-500">Time</p>
                        <p class="text-lg font-semibold">${event.event_time || 'TBA'}</p>
                    </div>
                    <div>
                        <p class="text-sm font-bold text-slate-500">Venue</p>
                        <p class="text-lg font-semibold">${event.venue}</p>
                    </div>
                    <div>
                        <p class="text-sm font-bold text-slate-500">City</p>
                        <p class="text-lg font-semibold">${event.city}</p>
                    </div>
                    <div>
                        <p class="text-sm font-bold text-slate-500">Category</p>
                        <p class="text-lg font-semibold">${event.category}</p>
                    </div>
                    <div>
                        <p class="text-sm font-bold text-slate-500">Registration Deadline</p>
                        <p class="text-lg font-semibold">${event.registration_deadline ? new Date(event.registration_deadline).toLocaleDateString() : 'Open'}</p>
                    </div>
                </div>
                
                ${event.eligibility ? `
                    <div>
                        <h3 class="text-xl font-bold text-[var(--primary)] mb-2">Eligibility</h3>
                        <p class="text-slate-600 whitespace-pre-line">${event.eligibility}</p>
                    </div>
                ` : ''}
                
                ${event.rules ? `
                    <div>
                        <h3 class="text-xl font-bold text-[var(--primary)] mb-2">Rules & Regulations</h3>
                        <p class="text-slate-600 whitespace-pre-line">${event.rules}</p>
                    </div>
                ` : ''}
                
                ${event.requirements ? `
                    <div>
                        <h3 class="text-xl font-bold text-[var(--primary)] mb-2">Requirements</h3>
                        <p class="text-slate-600 whitespace-pre-line">${event.requirements}</p>
                    </div>
                ` : ''}
                
                ${event.contact_email || event.contact_phone ? `
                    <div>
                        <h3 class="text-xl font-bold text-[var(--primary)] mb-2">Contact Information</h3>
                        ${event.contact_email ? `<p class="text-slate-600">Email: ${event.contact_email}</p>` : ''}
                        ${event.contact_phone ? `<p class="text-slate-600">Phone: ${event.contact_phone}</p>` : ''}
                    </div>
                ` : ''}
            </div>
        `;

        await showAlert(detailsHTML, event.title);
    } catch (error) {
        console.error("Error loading event details:", error);
        await showAlert("Failed to load event details.", "Error");
    }
};
