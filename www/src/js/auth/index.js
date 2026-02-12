import { timeout, checkConnection } from "../functions.js";
import AlertSystem from '../render/Alerts.js';
import supabaseClient from '../supabase.js';


// Initialize alert system
const alertSystem = new AlertSystem();
alertSystem.setContainer('alertContainer');

// Check connection on load
async function initConnectionCheck() {
    const isOnline = await checkConnection();

    if (!isOnline) {
        showOfflineAlert();
    }

    // Listen for connection changes
    window.addEventListener('online', async () => {
        alertSystem.show('Connection restored', 'success');
        window.location.reload();
    });

    window.addEventListener('offline', () => {
        showOfflineAlert();
    });
}

// Show offline alert with retry button
function showOfflineAlert() {
    const alertId = alertSystem.show(`
        <span>No internet connection</span> 
        <button id="retryBtn" class="ml-2 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition">
            <i class="fas fa-sync-alt mr-1"></i>Retry
        </button>
    `, 'error', 0); // 0 = persist until manually closed

    const retryBtn = document.getElementById('retryBtn');

    retryBtn.addEventListener('click', async () => {
        const originalContent = retryBtn.innerHTML;

        // Loading state
        retryBtn.innerHTML = `<i class="fas fa-spinner fa-spin mr-1"></i>Checking...`;
        retryBtn.disabled = true;
        retryBtn.classList.add('opacity-70', 'cursor-not-allowed');

        const online = await checkConnection();

        // Restore button
        retryBtn.innerHTML = originalContent;
        retryBtn.disabled = false;
        retryBtn.classList.remove('opacity-70', 'cursor-not-allowed');

        if (online) {
            alertSystem.show("Connection restored", "success");
            window.location.reload();
        } else {
            alertSystem.show("Still offline. Please check your connection.", 'error');
        }
    });
}

// Add loading effect to buttons
function addButtonLoadingEffect(button, asyncCallback) {
    button.addEventListener('click', async (e) => {
        e.preventDefault();

        const originalContent = button.innerHTML;

        button.disabled = true;
        button.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i>Loading...`;
        button.classList.add('opacity-70', 'cursor-not-allowed');

        try {
            await asyncCallback();
        } catch (err) {
            console.error(err);
        } finally {
            button.disabled = false;
            button.innerHTML = originalContent;
            button.classList.remove('opacity-70', 'cursor-not-allowed');
        }
    });
}

async function getSession() {
    const { data: { session }, } = await supabaseClient.auth.getSession();

    if (session) {
        window.location.href = './src/html/profile.html';
    }
}


document.addEventListener('DOMContentLoaded', async () => {
    // Check internet connection
    await initConnectionCheck();
    getSession();

    // Modal elements
    const modal = document.getElementById('authModal');
    const openModalBtn = document.getElementById('openModal');
    const brand = document.getElementById('brand');
    const slogan = document.getElementById('slogan');
    const loginContainer = document.getElementById('loginContainer');
    const signupContainer = document.getElementById('signupContainer');
    const loginSwitchLink = document.getElementById('loginSwitchLink');
    const signupSwitchLink = document.getElementById('signupSwitchLink');
    const closeModalBtn = document.querySelectorAll('.close-modal');

    const loginBtn = document.getElementById('loginBtn');
    const signupBtn = document.getElementById('signupBtn');

    // Open modal
    openModalBtn.addEventListener('click', () => {
        modal.classList.remove('hidden');
        modal.classList.add('active', 'flex');
        setTimeout(() => {
            brand.classList.add('-translate-y-50');
            brand.classList.remove('translate-y-0');
            slogan.classList.add('hidden');

            const firstInput = modal.querySelector('input');
            if (firstInput) firstInput.focus();
        }, 100);
    });

    // Close modal
    closeModalBtn.forEach(btn => {
        btn.classList.add('cursor-pointer');
        btn.addEventListener('click', () => {
            timeout(modal, brand, slogan);
        });
    });

    // Switch forms
    loginSwitchLink.addEventListener('click', (e) => {
        e.preventDefault();
        signupContainer.classList.remove('hidden');
        loginContainer.classList.add('hidden');
    });

    signupSwitchLink.addEventListener('click', (e) => {
        e.preventDefault();
        signupContainer.classList.add('hidden');
        loginContainer.classList.remove('hidden');
    });

});
