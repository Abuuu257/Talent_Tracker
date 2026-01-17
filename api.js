const isLocal = !window.location.hostname || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
export const BACKEND_URL = isLocal ? 'http://localhost:3000' : window.location.origin;
export const API_URL = `${BACKEND_URL}/api`;

export async function login(email, password, role) {
    const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role })
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Login failed');
    }
    return res.json();
}

export async function createSquad(coachId, name) {
    const res = await fetch(`${API_URL}/coach/${coachId}/squad`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to create squad');
    }
    return res.json();
}

export async function assignToSquad(coachId, squadId, athleteId) {
    const res = await fetch(`${API_URL}/coach/${coachId}/squad/${squadId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ athleteId })
    });
    if (!res.ok) throw new Error('Failed to assign to squad');
    return res.json();
}

export async function removeFromSquad(coachId, squadId, athleteId) {
    const res = await fetch(`${API_URL}/coach/${coachId}/squad/${squadId}/athlete/${athleteId}`, {
        method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to remove from squad');
    return res.json();
}

export async function deleteSquad(coachId, squadId) {
    const res = await fetch(`${API_URL}/coach/${coachId}/squad/${squadId}`, {
        method: 'DELETE'
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to delete squad');
    }
    return res.json();
}

export async function updateSquad(coachId, squadId, data) {
    const res = await fetch(`${API_URL}/coach/${coachId}/squad/${squadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to update squad');
    }
    return res.json();
}

export async function addFavorite(coachId, athleteId) {
    const res = await fetch(`${API_URL}/coach/${coachId}/favorite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ athleteId })
    });
    if (!res.ok) throw new Error('Failed to add favorite');
    return res.json();
}

export async function removeFavorite(coachId, athleteId) {
    const res = await fetch(`${API_URL}/coach/${coachId}/favorite/${athleteId}`, {
        method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to remove favorite');
    return res.json();
}

// Coach Notes
export async function saveCoachNote(coachId, athleteId, note) {
    console.log(`API: Saving note to ${API_URL}/coach/${coachId}/note/${athleteId}`);

    const res = await fetch(`${API_URL}/coach/${coachId}/note/${athleteId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note })
    });

    if (!res.ok) {
        const errorText = await res.text();
        console.error('Save note failed:', res.status, errorText);
        throw new Error(`Failed to save coach note (${res.status}): ${errorText}`);
    }

    return res.json();
}

export async function getCoachNote(coachId, athleteId) {
    const res = await fetch(`${API_URL}/coach/${coachId}/note/${athleteId}`);
    if (!res.ok) {
        if (res.status === 404) return { note: '' }; // No note exists yet
        const errorText = await res.text();
        console.error('Get note failed:', res.status, errorText);
        throw new Error(`Failed to fetch coach note (${res.status}): ${errorText}`);
    }
    return res.json();
}

export async function updateUserStatus(uid, status, role) {
    const endpoint = role === 'coach' ? 'coach' : 'athlete';
    // If we have a 'role' parameter, we should trust it, but defaulting is okay.
    // Ideally the frontend always passes the correct role.
    const res = await fetch(`${API_URL}/${endpoint}/${uid}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
    });
    if (!res.ok) throw new Error('Failed to update status');
    return res.json();
}

export async function register(email, password, username, role, phone) {
    const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, username, role, phone })
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Registration failed');
    }
    return res.json();
}

export async function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        body: formData
    });
    if (!res.ok) throw new Error('Upload failed');
    const data = await res.json();
    return data.url;
}

export async function saveAthleteProfile(id, data) {
    const res = await fetch(`${API_URL}/athlete/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Save failed');
    return res.json();
}

export async function getAthleteProfile(id) {
    const res = await fetch(`${API_URL}/athlete/${id}`);
    if (!res.ok) throw new Error('Fetch failed');
    return res.json();
}

export async function saveCoachProfile(id, data) {
    const res = await fetch(`${API_URL}/coach/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Save failed');
    return res.json();
}

export async function getCoachProfile(id) {
    const res = await fetch(`${API_URL}/coach/${id}`);
    if (!res.ok) throw new Error('Fetch failed');
    return res.json();
}

export async function addAchievement(id, data) {
    const res = await fetch(`${API_URL}/athlete/${id}/achievement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to add achievement');
    return res.json();
}

export async function removeAchievement(id, achId) {
    const res = await fetch(`${API_URL}/athlete/${id}/achievement/${achId}`, {
        method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to remove achievement');
    return res.json();
}

export async function addPerformance(id, data) {
    const res = await fetch(`${API_URL}/athlete/${id}/performance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to add performance');
    return res.json();
}

export async function verifyAchievement(id, achId, data) {
    const res = await fetch(`${API_URL}/athlete/${id}/achievement/${achId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to verify');
    return res.json();
}

export async function getAllAthletes() {
    const res = await fetch(`${API_URL}/athlete`);
    if (!res.ok) throw new Error('Failed to fetch athletes');
    return res.json();
}

export async function getAllCoaches() {
    const res = await fetch(`${API_URL}/coach`);
    if (!res.ok) throw new Error('Failed to fetch coaches');
    return res.json();
}

export async function getUserByUsername(username) {
    const res = await fetch(`${API_URL}/auth/user/${username}`);
    if (res.status === 404) return null;
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to fetch user');
    }
    return res.json();
}

// Events API
export async function getAllEvents() {
    const res = await fetch(`${API_URL}/events`);
    if (!res.ok) throw new Error('Failed to fetch events');
    return res.json();
}

export async function getEvent(eventId) {
    const res = await fetch(`${API_URL}/events/${eventId}`);
    if (!res.ok) throw new Error('Failed to fetch event');
    return res.json();
}

export async function createEvent(eventData) {
    const res = await fetch(`${API_URL}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData)
    });
    if (!res.ok) throw new Error('Failed to create event');
    return res.json();
}

export async function updateEvent(eventId, eventData) {
    const res = await fetch(`${API_URL}/events/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData)
    });
    if (!res.ok) throw new Error('Failed to update event');
    return res.json();
}

export async function deleteEvent(eventId) {
    const res = await fetch(`${API_URL}/events/${eventId}`, {
        method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete event');
    return res.json();
}

export async function registerForEvent(eventId, athleteId) {
    const res = await fetch(`${API_URL}/events/${eventId}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ athlete_id: athleteId })
    });
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to register for event');
    }
    return res.json();
}

export async function getAthleteRegistrations(athleteId) {
    const res = await fetch(`${API_URL}/events/athlete/${athleteId}/registrations`);
    if (!res.ok) throw new Error('Failed to fetch registrations');
    return res.json();
}

// Admin Notes API
export async function saveAdminNote(userId, role, note) {
    const endpoint = role === 'coach' ? 'coach' : 'athlete';
    const res = await fetch(`${API_URL}/${endpoint}/${userId}/admin-note`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note })
    });
    if (!res.ok) throw new Error('Failed to save admin note');
    return res.json();
}

export async function getAdminNote(userId, role) {
    const endpoint = role === 'coach' ? 'coach' : 'athlete';
    const res = await fetch(`${API_URL}/${endpoint}/${userId}/admin-note`);
    if (!res.ok) {
        if (res.status === 404) return { note: '' }; // No note exists yet
        throw new Error('Failed to fetch admin note');
    }
    return res.json();
}
