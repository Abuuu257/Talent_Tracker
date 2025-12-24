// =======================================================
// UI UTILITIES
// Shared helper functions for UI elements like loading screens.
// =======================================================

// 1. INJECT styles and HTML for the loading overlay if they don't exist
function ensureLoadingUI() {
  // Add CSS
  if (!document.getElementById("loading-styles")) {
    const style = document.createElement("style");
    style.id = "loading-styles";
    style.innerHTML = `
      .loading-overlay {
        position: fixed;
        inset: 0;
        background: rgba(255, 255, 255, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.3s ease;
      }
      .loading-overlay.active {
        opacity: 1;
        pointer-events: auto;
      }
      .spinner {
        width: 50px;
        height: 50px;
        border: 5px solid #f3f3f3;
        border-top: 5px solid #012A61; /* Primary Color */
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }

  // Add HTML
  if (!document.getElementById("loadingOverlay")) {
    const div = document.createElement("div");
    div.id = "loadingOverlay";
    div.className = "loading-overlay";
    div.innerHTML = '<div class="spinner"></div>';
    document.body.appendChild(div);
  }
}

// 2. EXPORTED FUNCTIONS
export function showLoading() {
  ensureLoadingUI();
  // Small delay to ensure DOM is ready if called immediately
  requestAnimationFrame(() => {
    const overlay = document.getElementById("loadingOverlay");
    if (overlay) overlay.classList.add("active");
  });
}

export function hideLoading() {
  const overlay = document.getElementById("loadingOverlay");
  if (overlay) overlay.classList.remove("active");
}

// =======================================================
// SUCCESS MODAL UTILITIES
// =======================================================

function ensureSuccessModalUI() {
  // Add CSS for Modal
  if (!document.getElementById("modal-styles")) {
    const style = document.createElement("style");
    style.id = "modal-styles";
    style.innerHTML = `
      .custom-modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.6);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.3s ease;
      }
      .custom-modal-overlay.active {
        opacity: 1;
        pointer-events: auto;
      }
      .custom-modal-box {
        background: white;
        padding: 2rem;
        border-radius: 1rem;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        max-width: 400px;
        width: 90%;
        text-align: center;
        transform: scale(0.9);
        transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      }
      .custom-modal-overlay.active .custom-modal-box {
        transform: scale(1);
      }
      .custom-modal-btn {
        margin-top: 1.5rem;
        background-color: #012A61;
        color: white;
        padding: 0.75rem 2rem;
        border-radius: 9999px;
        font-weight: 600;
        cursor: pointer;
        transition: background-color 0.2s;
        border: none;
      }
      .custom-modal-btn:hover {
        background-color: #275A91;
      }
    `;
    document.head.appendChild(style);
  }

  // Add HTML for Modal
  if (!document.getElementById("successModal")) {
    const div = document.createElement("div");
    div.id = "successModal";
    div.className = "custom-modal-overlay";
    div.innerHTML = `
            <div class="custom-modal-box">
                <div class="mb-4 text-green-500">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <h3 class="text-xl font-bold text-gray-800 mb-2">Success!</h3>
                <p id="successModalMessage" class="text-gray-600"></p>
                <button id="successModalBtn" class="custom-modal-btn">OK</button>
            </div>
        `;
    document.body.appendChild(div);
  }
}

export function showSuccessModal(message, onCloseCallback) {
  ensureSuccessModalUI();
  const modal = document.getElementById("successModal");
  const msgEl = document.getElementById("successModalMessage");
  const btn = document.getElementById("successModalBtn");

  if (msgEl) msgEl.textContent = message;

  // Handle Button Click
  // Clone button to remove old listeners
  const newBtn = btn.cloneNode(true);
  btn.parentNode.replaceChild(newBtn, btn);

  newBtn.addEventListener("click", () => {
    modal.classList.remove("active");
    if (onCloseCallback) onCloseCallback();
  });

  // Show Modal
  requestAnimationFrame(() => {
    modal.classList.add("active");
  });
}
