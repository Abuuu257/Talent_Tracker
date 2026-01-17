import * as API from './api.js';
export const BACKEND_URL = API.BACKEND_URL;

// Shim for Firebase Auth
export const auth = {
  currentUser: null,
  onAuthStateChanged: (cb) => {
    // Check initial state
    const user = getLocalUser();
    cb(user);
    // Real auth state changes (login/logout) reload page or trigger manually.
    window.addEventListener('storage', () => {
      const currentUser = getLocalUser();
      if (auth.currentUser && !currentUser) { // Was logged in, now logged out
        auth.currentUser = null;
        cb(null);
      } else if (!auth.currentUser && currentUser) { // Was logged out, now logged in
        auth.currentUser = currentUser;
        cb(currentUser);
      }
    });
  }
};

// Helper function to get user from local storage
function getLocalUser() {
  const storedUser = localStorage.getItem('user');
  if (storedUser) {
    try {
      return JSON.parse(storedUser);
    } catch (e) {
      console.error("Error parsing stored user from localStorage", e);
      return null;
    }
  }
  return null;
}

// Listeners
let authListeners = [];

export function notifyListeners(user) {
  authListeners.forEach(cb => cb(user));
}

// Check persistence
const storedUser = localStorage.getItem('user');
if (storedUser) {
  try {
    auth.currentUser = JSON.parse(storedUser);
    setTimeout(() => notifyListeners(auth.currentUser), 0);
  } catch (e) {
    console.error("Error parsing stored user", e);
  }
} else {
  setTimeout(() => notifyListeners(null), 0);
}

export async function registerUser(email, password, username, role = 'athlete', phone = null) {
  const response = await API.register(email, password, username, role, phone);
  // Login automatically after register? Usually yes.
  const { user, token } = response;
  auth.currentUser = user;
  localStorage.setItem('user', JSON.stringify(user));
  localStorage.setItem('token', token);
  notifyListeners(auth.currentUser);

  return { user: user };
}

export async function loginUser(email, password, role) {
  const data = await API.login(email, password, role);
  auth.currentUser = data.user;
  localStorage.setItem('user', JSON.stringify(data.user));
  localStorage.setItem('token', data.token);
  notifyListeners(auth.currentUser);
  return { user: data.user };
}

export async function logoutUser() {
  auth.currentUser = null;
  localStorage.removeItem('user');
  localStorage.removeItem('token');
  notifyListeners(null);
}

export async function signOut() {
  return logoutUser();
}

export function onAuthChange(callback) {
  authListeners.push(callback);
  if (auth.currentUser) {
    callback(auth.currentUser);
  } else {
    callback(auth.currentUser);
  }
}

// DB Proxy Functions
export async function saveUserAccount(uid, data, collectionName) {
  return true;
}

export async function saveCoachProfile(uid, data) {
  return API.saveCoachProfile(uid, data);
}

export async function saveFederationProfile(uid, data) {
  return true;
}

export async function saveAthleteProfile(uid, data) {
  return API.saveAthleteProfile(uid, data);
}

export async function getAthleteProfile(uid) {
  return API.getAthleteProfile(uid);
}

export async function getCoachProfile(uid) {
  return API.getCoachProfile(uid);
}

export async function addFavorite(coachId, athleteId) {
  return API.addFavorite(coachId, athleteId);
}

export async function removeFavorite(coachId, athleteId) {
  return API.removeFavorite(coachId, athleteId);
}

export async function uploadFile(file, uid, category) {
  return API.uploadFile(file);
}

export async function addAchievement(uid, data) {
  return API.addAchievement(uid, data);
}

export async function removeAchievement(uid, achId) {
  return API.removeAchievement(uid, achId);
}

export async function addPerformance(uid, data) {
  return API.addPerformance(uid, data);
}

export async function verifyAchievement(uid, achId, data) {
  return API.verifyAchievement(uid, achId, data);
}

export async function getAllAthletes() {
  return API.getAllAthletes();
}
export async function getAllCoaches() {
  return API.getAllCoaches();
}
export async function updateUserStatus(uid, status, role) {
  return API.updateUserStatus(uid, status, role);
}



export async function createSquad(coachId, name) {
  return API.createSquad(coachId, name);
}

export async function assignToSquad(coachId, squadId, athleteId) {
  return API.assignToSquad(coachId, squadId, athleteId);
}

export async function removeFromSquad(coachId, squadId, athleteId) {
  return API.removeFromSquad(coachId, squadId, athleteId);
}

export async function deleteSquad(coachId, squadId) {
  return API.deleteSquad(coachId, squadId);
}

export async function updateSquad(coachId, squadId, data) {
  return API.updateSquad(coachId, squadId, data);
}

export async function getUserByUsername(username, role) {
  return API.getUserByUsername(username);
}

export async function isUsernameTaken(username) {
  return false;
}

export async function saveAdminNote(userId, role, note) {
  return API.saveAdminNote(userId, role, note);
}

export async function getAdminNote(userId, role) {
  return API.getAdminNote(userId, role);
}

export const db = {};
export { auth as app };
