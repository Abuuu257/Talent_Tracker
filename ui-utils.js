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
        background: rgba(255, 255, 255, 0.4);
        backdrop-blur: 8px;
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
        opacity: 0;
        pointer-events: none;
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .loading-overlay.active {
        opacity: 1;
        pointer-events: auto;
      }
      .spinner {
        width: 60px;
        height: 60px;
        border: 4px solid rgba(1, 42, 97, 0.1);
        border-top: 4px solid #012A61;
        border-radius: 50%;
        animation: spin 0.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        box-shadow: 0 0 15px rgba(1, 42, 97, 0.1);
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
        background: rgba(0, 0, 0, 0.3);
        backdrop-blur: 4px;
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        opacity: 0;
        pointer-events: none;
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .custom-modal-overlay.active {
        opacity: 1;
        pointer-events: auto;
      }
      .custom-modal-box {
        background: white;
        padding: 3rem 2rem;
        border-radius: 2rem;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        max-width: 450px;
        width: 90%;
        text-align: center;
        transform: scale(0.9) translateY(20px);
        transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      }
      .custom-modal-overlay.active .custom-modal-box {
        transform: scale(1) translateY(0);
      }
      .custom-modal-btn {
        margin-top: 2rem;
        background: linear-gradient(135deg, #012A61 0%, #275A91 100%);
        color: white;
        padding: 1rem 3rem;
        border-radius: 1rem;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.3s ease;
        border: none;
        box-shadow: 0 10px 15px -3px rgba(1, 42, 97, 0.3);
      }
      .custom-modal-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 20px 25px -5px rgba(1, 42, 97, 0.4);
      }
      .custom-modal-btn:active {
        transform: translateY(0);
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
