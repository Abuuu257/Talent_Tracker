export const PROVINCES = [
    "Western", "Central", "Southern", "North Western", "Sabaragamuwa",
    "North Central", "Uva", "Northern", "Eastern"
];

export const DISTRICTS = [
    "Colombo", "Gampaha", "Kalutara", "Kandy", "Matale", "Nuwara Eliya",
    "Galle", "Matara", "Hambantota", "Jaffna", "Kilinochchi", "Mannar",
    "Vavuniya", "Mullaitivu", "Batticaloa", "Ampara", "Trincomalee",
    "Kurunegala", "Puttalam", "Anuradhapura", "Polonnaruwa", "Badulla",
    "Monaragala", "Ratnapura", "Kegalle"
];

export const CITIES = [
    "Colombo", "Kandy", "Galle", "Jaffna", "Negombo", "Gampaha",
    "Matara", "Kurunegala", "Ratnapura", "Batticaloa", "Trincomalee",
    "Badulla", "Anuradhapura", "Nuwara Eliya", "Kalutara", "Matale",
    "Puttalam", "Chilaw", "Mannar", "Vavuniya", "Hambantota", "Tangalle",
    "Monaragala", "Ampara", "Kegalle", "Avissawella", "Dehiwala",
    "Moratuwa", "Kotte", "Mount Lavinia", "Maharagama", "Kotikawatta",
    "Kolonnawa", "Kesbewa", "Homagama", "Mulleriyawa", "Wattala",
    "Minuwangoda", "Katunayake", "Ja-Ela", "Panadura", "Horana",
    "Beruwala", "Aluthgama", "Bentota", "Ambalangoda", "Hikkaduwa",
    "Weligama", "Dickwella", "Kataragama", "Tissamaharama", "Embilipitiya",
    "Balangoda", "Eheliyagoda", "Mawanella", "Warakapola", "Dambulla",
    "Sigiriya", "Habarana", "Polonnaruwa", "Medirigiriya", "Dehiattakandiya",
    "Ampara", "Kalmunai", "Sammanthurai", "Akkaraipattu", "Pottuvil",
    "Kattankudy", "Eravur", "Valaichchenai", "Kinniya", "Mutur",
    "Kantale", "Kilinochchi", "Mullaitivu", "Point Pedro", "Chavakachcheri",
    "Bandarawela", "Haputale", "Welimada", "Mahiyanganaya", "Bibile",
    "Wellawaya", "Buttala"
].sort();

/**
 * Initializes a Select + Input combo for "Others" functionality.
 */
export function setupDropdownInput(selectId, inputId, dataList) {
    const select = document.getElementById(selectId);
    const input = document.getElementById(inputId);

    if (!select || !input) return;

    // Capture Required State
    // If input was required, we make select required, and manage input's required state
    let isRequired = input.hasAttribute("required") || input.dataset.required === "true";
    if (isRequired) {
        select.setAttribute("required", "true");
        input.setAttribute("data-required", "true");
    }

    // Clear existing options
    select.innerHTML = '<option value="">Select Location</option>';

    // Populate
    dataList.forEach(item => {
        const opt = document.createElement("option");
        opt.value = item;
        opt.textContent = item;
        select.appendChild(opt);
    });

    // Add Other
    const otherOpt = document.createElement("option");
    otherOpt.value = "Other";
    otherOpt.textContent = "Other (Specify below)";
    select.appendChild(otherOpt);

    // Initial Sync
    syncDropdown(selectId, inputId, dataList);

    // Change Listener
    select.addEventListener("change", () => {
        if (select.value === "Other") {
            input.classList.remove("hidden");
            input.value = "";
            input.focus();
            input.placeholder = "Please type your location...";
            if (input.dataset.required === "true") input.setAttribute("required", "true");
        } else {
            input.classList.add("hidden");
            input.value = select.value;
            input.removeAttribute("required");
        }
    });
}

export function syncDropdown(selectId, inputId, dataList) {
    const select = document.getElementById(selectId);
    const input = document.getElementById(inputId);
    if (!select || !input) return;

    // Ensure required logic is consistent
    if (!input.dataset.required && input.hasAttribute("required")) {
        input.setAttribute("data-required", "true");
        select.setAttribute("required", "true");
    }

    if (input.value && !dataList.includes(input.value)) {
        select.value = "Other";
        input.classList.remove("hidden");
        if (input.dataset.required === "true") input.setAttribute("required", "true");
    } else if (input.value) {
        select.value = input.value;
        input.classList.add("hidden");
        input.removeAttribute("required");
    } else {
        select.value = "";
        input.classList.add("hidden");
        input.removeAttribute("required");
    }
}
