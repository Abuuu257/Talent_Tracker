import { auth, onAuthChange, signOut } from "./register.js";
import * as API from "./api.js";
import { showAlert, showConfirm, updateNavbar, showLoading, hideLoading } from "./ui-utils.js";
import { setupDropdownInput, syncDropdown, CITIES } from "./locations.js";

// WhatsApp DOM
const waEventModal = document.getElementById("waEventModal");
const waEventModalContent = document.getElementById("waEventModalContent");
const waEventCount = document.getElementById("waEventCount");
const waEventMessage = document.getElementById("waEventMessage");
const waEventNumbers = document.getElementById("waEventNumbers");
const copyWaMsgBtn = document.getElementById("copyWaMsgBtn");
const copyWaNumBtn = document.getElementById("copyWaNumBtn");
const closeWaEventBtn = document.getElementById("closeWaEventBtn");
const openWaEventBtn = document.getElementById("openWaEventBtn");

let currentUser = null;
let currentRole = null;
let allEvents = [];
let filteredEvents = [];
let editingEventId = null;
let calendar = null;
let currentView = 'grid';

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
        populateFilters();
        applyFilters(); // This will handle rendering
    } catch (error) {
        console.error("Error loading events:", error);
        // Show empty state instead of error for better UX
        grid.innerHTML = "";
        emptyTitle.textContent = "No Events";
        emptyMsg.classList.add("hidden");
        emptyState.classList.remove("hidden");
    }
}

function populateFilters() {
    const locationSelect = document.getElementById('filterLocation');
    const categorySelect = document.getElementById('filterCategory');

    // Get unique locations and categories
    const locations = [...new Set(allEvents.map(e => e.city).filter(Boolean))].sort();
    const categories = [...new Set(allEvents.map(e => e.category).filter(Boolean))].sort();

    // Preserve current selection if possible
    const currentLoc = locationSelect.value;
    const currentCat = categorySelect.value;

    // Reset options
    locationSelect.innerHTML = '<option value="all">All Locations</option>';
    categorySelect.innerHTML = '<option value="all">All Categories</option>';

    locations.forEach(loc => {
        const option = document.createElement('option');
        option.value = loc;
        option.textContent = loc;
        if (loc === currentLoc) option.selected = true;
        locationSelect.appendChild(option);
    });

    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        if (cat === currentCat) option.selected = true;
        categorySelect.appendChild(option);
    });
}

window.applyFilters = function () {
    const locationFn = document.getElementById('filterLocation').value;
    const categoryFn = document.getElementById('filterCategory').value;

    filteredEvents = allEvents.filter(event => {
        const matchLocation = locationFn === 'all' || event.city === locationFn;
        const matchCategory = categoryFn === 'all' || event.category === categoryFn;
        return matchLocation && matchCategory;
    });

    // Update Empty State logic
    const grid = document.getElementById("eventsGrid");
    const emptyState = document.getElementById("emptyState");
    const emptyTitle = emptyState.querySelector('h3');
    const emptyMsg = emptyState.querySelector('p');

    if (filteredEvents.length === 0) {
        if (currentView === 'grid') grid.innerHTML = "";
        if (currentRole === "federation" || currentRole === "admin") {
            emptyTitle.textContent = "No Events Found";
            emptyMsg.classList.add("hidden");
        } else {
            emptyTitle.textContent = "No Events Found";
            emptyMsg.textContent = "Try adjusting your filters.";
            emptyMsg.classList.remove("hidden");
        }
        if (currentView === 'grid') emptyState.classList.remove("hidden");
    } else {
        emptyState.classList.add("hidden");
    }

    if (currentView === 'grid') {
        renderEvents();
    } else {
        updateCalendarEvents();
    }
}

window.switchView = function (view) {
    currentView = view;

    const gridBtn = document.getElementById('viewGridBtn');
    const calendarBtn = document.getElementById('viewCalendarBtn');
    const gridView = document.getElementById('eventsGrid');
    const calendarView = document.getElementById('calendarView');
    const emptyState = document.getElementById('emptyState');

    if (view === 'grid') {
        // Show Grid
        gridBtn.classList.remove('text-slate-500', 'hover:text-[var(--primary)]', 'hover:bg-slate-50');
        gridBtn.classList.add('bg-[var(--primary)]', 'text-white', 'shadow-md');

        calendarBtn.classList.add('text-slate-500', 'hover:text-[var(--primary)]', 'hover:bg-slate-50');
        calendarBtn.classList.remove('bg-[var(--primary)]', 'text-white', 'shadow-md');

        gridView.classList.remove('hidden');
        calendarView.classList.add('hidden');

        // Re-check empty state for grid
        if (filteredEvents.length === 0) emptyState.classList.remove("hidden");

        renderEvents();
    } else {
        // Show Calendar
        calendarBtn.classList.remove('text-slate-500', 'hover:text-[var(--primary)]', 'hover:bg-slate-50');
        calendarBtn.classList.add('bg-[var(--primary)]', 'text-white', 'shadow-md');

        gridBtn.classList.add('text-slate-500', 'hover:text-[var(--primary)]', 'hover:bg-slate-50');
        gridBtn.classList.remove('bg-[var(--primary)]', 'text-white', 'shadow-md');

        gridView.classList.add('hidden');
        emptyState.classList.add('hidden'); // Hide empty state in calendar view (calendar handles empty itself)
        calendarView.classList.remove('hidden');

        if (!calendar) {
            initCalendar();
        } else {
            calendar.render();
            updateCalendarEvents();
        }
    }
}

function initCalendar() {
    const calendarEl = document.getElementById('calendar');
    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,listMonth'
        },
        events: getCalendarEvents(),
        eventClick: function (info) {
            viewEventDetails(parseInt(info.event.id));
        },
        eventTimeFormat: {
            hour: '2-digit',
            minute: '2-digit',
            meridiem: 'short'
        },
        height: 'auto',
        aspectRatio: 1.8,
    });
    calendar.render();
}

function updateCalendarEvents() {
    if (calendar) {
        calendar.removeAllEvents();
        calendar.addEventSource(getCalendarEvents());
    }
}

function getCalendarEvents() {
    return filteredEvents.map(event => ({
        id: event.id,
        title: event.title,
        start: event.event_date + (event.event_time ? 'T' + event.event_time : ''),
        // You can add more props like color based on status/category if needed
        color: event.category === 'Open' ? '#012A61' : '#275A91',
        extendedProps: {
            venue: event.venue,
            city: event.city
        }
    }));
}

function renderEvents() {
    const grid = document.getElementById("eventsGrid");

    if (!filteredEvents || filteredEvents.length === 0) {
        grid.innerHTML = "";
        return;
    }

    grid.innerHTML = filteredEvents.map(event => createEventCard(event)).join("");
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
    ` : '';

    // Add to Calendar Button (Available for everyone)
    const calendarButton = `
        <button onclick="addToCalendar(${event.id})" class="w-full mt-2 py-2 bg-white border-2 border-[var(--primary)] text-[var(--primary)] rounded-xl font-semibold hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
            Add to Calendar
        </button>
    `;

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
                ${calendarButton}
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
        syncDropdown("eventCitySelect", "eventCity", CITIES);
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
            // Show custom notification logic instead of generic alert
            closeEventModal();
            await loadEvents();
            sendEventWhatsAppNotification(eventData);
            return; // Exit early as we handle UI in function above
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
        'BEGIN:VALARM',
        'TRIGGER:-PT1H',
        'DESCRIPTION:Event Reminder',
        'ACTION:DISPLAY',
        'END:VALARM',
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

// WhatsApp Event Notification Logic
async function sendEventWhatsAppNotification(event) {
    try {
        showLoading();
        // 1. Fetch all athletes to get numbers
        // Note: In a real large app, this should be paginated or handled by backend, 
        // but for this MVP/Role, we fetch all.
        const athletes = await API.getAllAthletes();
        hideLoading();

        // 2. Filter Valid Numbers
        const phones = athletes
            .map(a => a.personal?.phone || a.phone)
            .filter(p => p && p.trim().length > 0);

        // 3. Construct Message
        const msg = `*New Event Alert: ${event.title}*\n\n📅 ${new Date(event.event_date).toLocaleDateString()}\n📍 ${event.city}\n\n${event.description}\n\nRegister now on Talent Tracker!`;

        // 4. Populate Modal
        waEventCount.textContent = phones.length;
        waEventMessage.value = msg;
        waEventNumbers.value = phones.join(',');

        // 5. Show Modal
        waEventModal.classList.remove("hidden");
        setTimeout(() => {
            waEventModalContent.classList.remove("scale-95", "opacity-0");
            waEventModalContent.classList.add("scale-100", "opacity-100");
        }, 10);

    } catch (err) {
        hideLoading();
        console.error("Error preparing WA notification:", err);
        showAlert("Event created, but failed to load athlete phone numbers.", "Warning");
    }
}

// Modal Listeners
if (closeWaEventBtn) {
    closeWaEventBtn.addEventListener("click", () => {
        waEventModalContent.classList.remove("scale-100", "opacity-100");
        waEventModalContent.classList.add("scale-95", "opacity-0");
        setTimeout(() => {
            waEventModal.classList.add("hidden");
        }, 300);
    });
}

if (openWaEventBtn) {
    openWaEventBtn.addEventListener("click", () => {
        window.open('https://web.whatsapp.com');
    });
}

if (copyWaMsgBtn) {
    copyWaMsgBtn.addEventListener("click", () => {
        waEventMessage.select();
        document.execCommand('copy'); // Fallback or use Clipboard API
        navigator.clipboard.writeText(waEventMessage.value).then(() => {
            const original = copyWaMsgBtn.textContent;
            copyWaMsgBtn.textContent = "Copied!";
            setTimeout(() => copyWaMsgBtn.textContent = original, 2000);
        });
    });
}

if (copyWaNumBtn) {
    copyWaNumBtn.addEventListener("click", () => {
        waEventNumbers.select();
        navigator.clipboard.writeText(waEventNumbers.value).then(() => {
            const original = copyWaNumBtn.textContent;
            copyWaNumBtn.textContent = "Copied!";
            setTimeout(() => copyWaNumBtn.textContent = original, 2000);
        });
    });
}

// Init Location Dropdowns
document.addEventListener('DOMContentLoaded', () => {
    setupDropdownInput('eventCitySelect', 'eventCity', CITIES);
});
