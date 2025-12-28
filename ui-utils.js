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

/**
 * WhatsApp Notification System
 * Opens a WhatsApp link with a pre-filled message.
 */
export function sendWhatsAppNotification(phoneNumber, message) {
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  const encodedMsg = encodeURIComponent(message);
  const url = `https://wa.me/${cleanPhone}?text=${encodedMsg}`;
  window.open(url, '_blank');
}

/**
 * Floating WhatsApp Support Button
 */
export function initWhatsAppSupport(role = 'User') {
  if (document.getElementById("wa-support-btn")) return;

  const supportNumber = "+94xxxxxxxxx"; // Placeholder Support Number
  const welcomeMsg = `Hello Talent Tracker Support, I am a ${role} and I need assistance.`;

  const waBtn = document.createElement("a");
  waBtn.id = "wa-support-btn";
  waBtn.href = `https://wa.me/${supportNumber.replace(/\D/g, '')}?text=${encodeURIComponent(welcomeMsg)}`;
  waBtn.target = "_blank";
  waBtn.style.cssText = `
        position: fixed;
        bottom: 30px;
        right: 30px;
        width: 65px;
        height: 65px;
        background: #25D366;
        color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 10px 25px rgba(37, 211, 102, 0.4);
        z-index: 1000;
        transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    `;

  waBtn.innerHTML = `
        <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.438 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
    `;

  waBtn.onmouseover = () => { waBtn.style.transform = 'scale(1.1) rotate(5deg)'; };
  waBtn.onmouseout = () => { waBtn.style.transform = 'scale(1) rotate(0deg)'; };

  document.body.appendChild(waBtn);
}
