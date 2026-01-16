import { checkConnection } from './functions.js';
import HeaderComponent from "./components/header.js";
import supabaseClient from './supabase.js';
import AlertSystem from './render/Alerts.js';
import offline, { Loading } from './render/offline.js';
import { mobileNavigations, rightSideBar, leftSideBar } from "./components/navigations.js";

// Constants
const ADMIN_IDS = new Map([
    ['c1517366-9c04-41af-bf32-d0db2b2bab85', 1],
    ['d35072cd-9fe3-43bf-9dc8-adb050384154', 2]
]);

const MODAL_IDS = [
    'commentModal',
    'ellipsisMenuModal',
    'deleteConfirmationModal',
    'fullImageModal'
];

// State Management
const state = {
    openModals: new Set(),
    isAdmin: false,
    userId: null,
    isOnline: false,
    isLoading: true  // Add loading state
};

// Initialize Systems
const alertSystem = new AlertSystem();

/* ===================== UTILITY FUNCTIONS ===================== */
const storeCurrentPage = () => {
    localStorage.setItem('lastVisitedPage', window.location.pathname);
};

const getCurrentPageName = () => {
    const path = window.location.pathname;
    return path.substring(path.lastIndexOf('/') + 1).split('.')[0];
};

/* ===================== LOADING MANAGEMENT ===================== */
const showLoading = () => {
    const appBody = document.getElementById('app');
    const offlinePage = document.getElementById('offlinePage');

    // Hide both main app and offline page during loading
    appBody?.classList.add('hidden');
    offlinePage?.classList.add('hidden');

    // Add loading overlay to body
    const loadingHtml = Loading();
    let loadingContainer = document.getElementById('loadingContainer');

    if (!loadingContainer) {
        loadingContainer = document.createElement('div');
        loadingContainer.id = 'loadingContainer';
        document.body.appendChild(loadingContainer);
    }

    loadingContainer.innerHTML = loadingHtml;
    loadingContainer.classList.remove('hidden');

    // Set loading state
    state.isLoading = true;
};

const hideLoading = () => {
    const loadingContainer = document.getElementById('loadingContainer');
    if (loadingContainer) {
        // Add fade-out animation
        loadingContainer.style.opacity = '0';
        loadingContainer.style.transition = 'opacity 0.3s ease-out';

        setTimeout(() => {
            loadingContainer.classList.add('hidden');
            // Remove from DOM after animation
            setTimeout(() => {
                loadingContainer.remove();
            }, 300);
        }, 300);
    }

    state.isLoading = false;
};

/* ===================== OFFLINE MANAGEMENT ===================== */
const showOfflinePage = async () => {
    const appBody = document.getElementById('app');
    const offlinePage = document.getElementById('offlinePage');

    if (!offlinePage.innerHTML.trim()) {
        offlinePage.innerHTML = offline();
    }

    appBody?.classList.add('hidden');
    offlinePage.classList.remove('hidden');

    const retryBtn = document.getElementById('retryBtn');
    if (!retryBtn) return;

    // Debounced retry handler
    retryBtn.onclick = async () => {
        retryBtn.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i>Checking...`;
        retryBtn.disabled = true;

        state.isOnline = await checkConnection();

        retryBtn.innerHTML = `Retry`;
        retryBtn.disabled = false;

        if (state.isOnline) {
            hideOfflinePage();
            await loadPageComponents();
        } else {
            alertSystem.show("Still offline. Please check your connection.", 'error');
        }
    };
};

const hideOfflinePage = () => {
    document.getElementById('offlinePage')?.classList.add('hidden');
    document.getElementById('app')?.classList.remove('hidden');
};

/* ===================== MODAL MANAGEMENT ===================== */
const recordOpenModals = () => {
    state.openModals.clear();
    MODAL_IDS.forEach(id => {
        const modal = document.getElementById(id);
        if (modal && !modal.classList.contains('hidden')) {
            state.openModals.add(id);
        }
    });
};

const hideAllModals = () => {
    MODAL_IDS.forEach(id => {
        document.getElementById(id)?.classList.add('hidden');
    });
};

const restoreModals = () => {
    state.openModals.forEach(id => {
        document.getElementById(id)?.classList.remove('hidden');
    });
    state.openModals.clear();
};

/* ===================== SESSION & AUTH ===================== */
const checkUserSession = async () => {
    if (document.body.dataset.page === 'auth') return null;

    const { data: sessionData } = await supabaseClient.auth.getSession();

    if (!sessionData?.session) {
        alertSystem.show("Session expired. Please login again.", 'error');
        setTimeout(() => window.location.replace('../../index.html'), 1500);
        return null;
    }

    const { data: userData } = await supabaseClient.auth.getUser();
    state.userId = userData?.user?.id;
    state.isAdmin = ADMIN_IDS.has(state.userId);

    return userData?.user;
};

/* ===================== COMPONENT RENDERING ===================== */
const updateNavigationActiveState = () => {
    const currentPage = getCurrentPageName();
    document.querySelectorAll(".mobile-nav-item").forEach(item => {
        const isActive = item.dataset.page === currentPage;
        item.classList.toggle("text-primary", isActive);
        item.classList.toggle("text-gray-500", !isActive);
    });
};

const renderComponents = () => {
    const components = [
        { id: 'header', html: HeaderComponent(state.isAdmin) },
        { id: 'mobileNav', html: mobileNavigations() },
        { id: 'rightSideBar', html: rightSideBar() },
        { id: 'leftSideBar', html: leftSideBar() }
    ];

    components.forEach(({ id, html }) => {
        const element = document.getElementById(id);
        if (element) {
            element.replaceChildren();
            element.insertAdjacentHTML('afterbegin', html);
        }
    });

    updateNavigationActiveState();
};

/* ===================== MAIN INITIALIZATION ===================== */
const initializeApp = async () => {
    showLoading();
    const startTime = Date.now();

    try {
        storeCurrentPage();

        const [isOnline] = await Promise.all([
            checkConnection(),
            new Promise(resolve => setTimeout(resolve, 1000))
        ]);

        state.isOnline = isOnline;

        if (!state.isOnline) {
            // Loading will be hidden in finally block
            showOfflinePage();
            return;
        }

        hideOfflinePage();

        // These will run AFTER the 1 second minimum, but loading is still showing
        const user = await checkUserSession();
        if (user) {
            renderComponents();
        }

        // Ensure total loading time is at least 1 second
        const elapsed = Date.now() - startTime;
        if (elapsed < 1000) {
            await new Promise(resolve => setTimeout(resolve, 1000 - elapsed));
        }

    } catch (error) {
        console.error('Initialization error:', error);
        alertSystem.show("Something went wrong. Please try again.", 'error');
    } finally {
        // Only hide loading when EVERYTHING is done
        hideLoading();
    }
};
/* ===================== EVENT HANDLERS ===================== */
const handleAuthStateChange = (event) => {
    if (event === 'SIGNED_OUT' && document.body.dataset.page !== 'auth') {
        window.location.replace('../../index.html');
    }
};

const handleOffline = () => {
    if (state.isLoading) {
        hideLoading();
    }
    alertSystem.show("Connection Lost", 'error');
    recordOpenModals();
    hideAllModals();
    showOfflinePage();
};

const handleOnline = async () => {
    // If we were loading when connection was lost, continue loading
    if (state.isLoading) {
        showLoading();
        // Give it a moment to show loading state
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    alertSystem.show("Connection restored", 'success');
    hideOfflinePage();
    restoreModals();

    // Re-check session when coming back online
    if (document.body.dataset.page !== 'auth') {
        await checkUserSession();
    }

    // Hide loading if it was shown
    if (state.isLoading) {
        hideLoading();
    }
};

/* ===================== DOM READY ===================== */
document.addEventListener('DOMContentLoaded', () => {
    // Set up auth listener
    supabaseClient.auth.onAuthStateChange(handleAuthStateChange);

    // Show loading before anything else
    showLoading();

    // Initialize app
    initializeApp();

    // Network event listeners
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
});

// Add this for page refresh detection
window.addEventListener('beforeunload', () => {
    // Optionally save state that we're refreshing
    sessionStorage.setItem('isRefreshing', 'true');
});

// Check if this is a refresh
if (performance.navigation.type === 1 || sessionStorage.getItem('isRefreshing')) {
    sessionStorage.removeItem('isRefreshing');
    // The loading will be shown in DOMContentLoaded
}

// Export for testing or if needed elsewhere
export {
    state,
    initializeApp,
    checkUserSession,
    handleOffline,
    handleOnline
};