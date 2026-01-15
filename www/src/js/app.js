import { checkConnection } from './functions.js';
import HeaderComponent, { info } from "./components/header.js";
import supabaseClient from './supabase.js';
import AlertSystem from './render/Alerts.js';
import offline from './render/offline.js';
import { mobileNavigations, rightSideBar, leftSideBar } from "./components/navigations.js";

const alertSystem = new AlertSystem();

/* ===================== ADMIN LIST ===================== */
const adminIds = [
    { id: 'c1517366-9c04-41af-bf32-d0db2b2bab85', level: 1 },
    { id: 'd35072cd-9fe3-43bf-9dc8-adb050384154', level: 2 }
];

/* ===================== STORE LAST PAGE ===================== */
function storeCurrentPage() {
    localStorage.setItem('lastVisitedPage', window.location.pathname);
}

/* ===================== OFFLINE PAGE ===================== */
function showOfflinePage() {
    const appBody = document.getElementById('app');
    const offlinePage = document.getElementById('offlinePage');

    if (!offlinePage.innerHTML.trim()) {
        offlinePage.innerHTML = offline();
    }

    appBody.classList.add('hidden');
    offlinePage.classList.remove('hidden');

    const retryBtn = document.getElementById('retryBtn');
    if (!retryBtn) return;

    retryBtn.onclick = async () => {
        retryBtn.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i>Checking...`;
        retryBtn.disabled = true;

        const isOnline = await checkConnection();

        retryBtn.innerHTML = `Retry`;
        retryBtn.disabled = false;

        if (isOnline) {
            hideOfflinePage();
            await loadPageComponents();
        } else {
            alertSystem.show("Still offline. Please check your connection.", 'error');
        }
    };
}

function hideOfflinePage() {
    document.getElementById('offlinePage')?.classList.add('hidden');
    document.getElementById('app')?.classList.remove('hidden');
}

/* ===================== INFO ===================== */
function showInfo() {
    const infoLink = document.getElementById('infoLink');
    if (infoLink) infoLink.innerHTML = info();
}

/* ===================== PAGE COMPONENTS ===================== */
async function loadPageComponents() {

    if (document.body.dataset.page === 'auth') return;

    // 🔒 Skip auth check if offline
    const online = await checkConnection();
    if (!online) return;

    const { data: sessionData } = await supabaseClient.auth.getSession();

    if (!sessionData?.session) {
        alertSystem.show("Session expired. Please login again.", 'error');
        setTimeout(() => window.location.replace('../../index.html'), 1500);
        return;
    }

    const { data: userData } = await supabaseClient.auth.getUser();
    const userId = userData?.user?.id;

    const isAdmin = adminIds.some(admin => admin.id === userId);

    document.getElementById('header')?.replaceChildren();
    document.getElementById('mobileNav')?.replaceChildren();
    document.getElementById('rightSideBar')?.replaceChildren();
    document.getElementById('leftSideBar')?.replaceChildren();

    document.getElementById('header')?.insertAdjacentHTML('afterbegin', HeaderComponent(isAdmin));
    document.getElementById('mobileNav')?.insertAdjacentHTML('afterbegin', mobileNavigations());
    document.getElementById('rightSideBar')?.insertAdjacentHTML('afterbegin', rightSideBar());
    document.getElementById('leftSideBar')?.insertAdjacentHTML('afterbegin', leftSideBar());

    const currentPage = window.location.pathname.split('/').pop().split('.')[0];

    document.querySelectorAll(".mobile-nav-item").forEach(item => {
        item.classList.toggle("text-primary", item.dataset.page === currentPage);
        item.classList.toggle("text-gray-500", item.dataset.page !== currentPage);
    });
}

/* ===================== MODAL HANDLING ===================== */
const modalIds = [
    'commentModal',
    'ellipsisMenuModal',
    'deleteConfirmationModal',
    'fullImageModal'
];

let openModals = new Set();

function recordOpenModals() {
    openModals.clear();
    modalIds.forEach(id => {
        const modal = document.getElementById(id);
        if (modal && !modal.classList.contains('hidden')) openModals.add(id);
    });
}

function hideAllModals() {
    modalIds.forEach(id => {
        document.getElementById(id)?.classList.add('hidden');
    });
}

function restoreModals() {
    openModals.forEach(id => {
        document.getElementById(id)?.classList.remove('hidden');
    });
    openModals.clear();
}

/* ===================== INIT ===================== */
document.addEventListener('DOMContentLoaded', async () => {

    // 🔐 Redirect ONLY on real logout
    supabaseClient.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_OUT' && document.body.dataset.page !== 'auth') {
            window.location.replace('../../index.html');
        }
    });

    storeCurrentPage();

    const online = await checkConnection();
    if (!online) showOfflinePage();
    else {
        hideOfflinePage();
        await loadPageComponents();
    }

    window.addEventListener('offline', () => {
        alertSystem.show("Connection Lost", 'error');
        recordOpenModals();
        hideAllModals();
        showOfflinePage();
    });

    window.addEventListener('online', () => {
        alertSystem.show("Connection restored", 'success');
        hideOfflinePage();
        restoreModals();
    });

    showInfo();
});
