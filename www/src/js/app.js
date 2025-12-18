import { checkConnection } from './functions.js';
import HeaderComponent, { info } from "./components/header.js";
import supabaseClient from './supabase.js';
import AlertSystem from './render/Alerts.js';
import offline from './render/offline.js';
import { mobileNavigations, rightSideBar, leftSideBar } from "./components/navigations.js";

const alertSystem = new AlertSystem();

// Store the last visited page
function storeCurrentPage() {
    localStorage.setItem('lastVisitedPage', window.location.pathname);
}

// Show offline page
function showOfflinePage() {
    const appBody = document.getElementById('app');
    const offlinePage = document.getElementById('offlinePage');

    if (!offlinePage.innerHTML.trim()) {
        offlinePage.innerHTML = offline();
    }

    appBody.classList.add('hidden');
    offlinePage.classList.remove('hidden');

    // rtry button 
    const retryBtn = document.getElementById('retryBtn');
    if (!retryBtn) return;
    retryBtn.addEventListener('click', async () => {
        const originalContent = retryBtn.innerHTML;

        retryBtn.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i>Checking...`;
        retryBtn.disabled = true;
        retryBtn.classList.add('opacity-70', 'cursor-not-allowed');

        const isOnline = await checkConnection();

        retryBtn.innerHTML = originalContent;
        retryBtn.disabled = false;
        retryBtn.classList.remove('opacity-70', 'cursor-not-allowed');

        if (isOnline) {
            hideOfflinePage();
            await loadPageComponents();
        } else {
            alertSystem.show("Still offline. Please check your connection.", 'error');
        }
    });
}

// Hide offline page
function hideOfflinePage() {
    const appBody = document.getElementById('app');
    const offlinePage = document.getElementById('offlinePage');

    offlinePage.classList.add('hidden');
    appBody.classList.remove('hidden');
}

function showInfo() {
    const infoLink = document.getElementById('infoLink');

    if (!infoLink) return;
    infoLink.innerHTML = info();
}

//render te page
async function loadPageComponents() {

    const isAuthPage = document.body.dataset.page === 'auth';
    if (isAuthPage) return;

    const { data } = await supabaseClient.auth.getSession();

    if (!data?.session) {
        alertSystem.show("You must be logged in.", 'error');
        setTimeout(() => window.location.replace('../../index.html'), 1500);
        return;
    }

    const headerElement = document.getElementById('header');
    const mobileNav = document.getElementById('mobileNav');
    const rightSideNav = document.getElementById('rightSideBar');
    const leftSideNav = document.getElementById('leftSideBar');

    if (headerElement) headerElement.innerHTML = HeaderComponent();
    if (mobileNav) mobileNav.innerHTML = mobileNavigations();
    if (rightSideNav) rightSideNav.innerHTML = rightSideBar();
    if (leftSideNav) leftSideNav.innerHTML = leftSideBar();

    // active nav
    const file = window.location.pathname.split("/").pop();
    const currentPage = file.split(".")[0];

    document.querySelectorAll(".mobile-nav-item").forEach(item => {
        const page = item.dataset.page;
        item.classList.toggle("text-primary", page === currentPage);
        item.classList.toggle("text-gray-500", page !== currentPage);
    });
}


//initialize all
document.addEventListener('DOMContentLoaded', async function () {
    supabaseClient.auth.onAuthStateChange((event, session) => {
        if (!session && document.body.dataset.page !== 'auth') {
            window.location.replace('../../index.html');
        }
    });

    storeCurrentPage();

    const isOnline = await checkConnection();

    if (!isOnline) {
        showOfflinePage();
    } else {
        hideOfflinePage();
        await loadPageComponents();
    }

    window.addEventListener('offline', () => {
        alertSystem.show("Connection Lost", 'error');
        recordOpenModals();
        hideAllModals();
        showOfflinePage();
    });

    window.addEventListener('online', async () => {
        alertSystem.show('Connection restored', 'success');
        const isOnline = await checkConnection();
        if (isOnline) {
            hideOfflinePage();
            restoreModals();
            await loadPageComponents();
        }
    });

    // List all modal IDs
    const modalIds = [
        'commentModal',
        'ellipsisMenuModal',
        'deleteConfirmationModal',
        'fullImageModal'
    ];

    // Store which modals were open
    let openModals = new Set();

    // Function to hide all modals
    function hideAllModals() {
        modalIds.forEach(id => {
            const modal = document.getElementById(id);
            if (modal) modal.classList.add('hidden');
        });
    }

    // Function to record currently open modals
    function recordOpenModals() {
        openModals.clear();
        modalIds.forEach(id => {
            const modal = document.getElementById(id);
            if (modal && !modal.classList.contains('hidden')) {
                openModals.add(id);
            }
        });
    }

    // Function to restore previously open modals
    function restoreModals() {
        openModals.forEach(id => {
            const modal = document.getElementById(id);
            if (modal) modal.classList.remove('hidden');
        });
        openModals.clear();
    }

    showInfo();

});
