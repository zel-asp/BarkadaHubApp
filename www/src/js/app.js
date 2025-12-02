import { checkConnection } from './functions.js';
import HeaderComponent from "./components/header.js";
import supabaseClient from './supabase.js';
import AlertSystem from './render/Alerts.js';
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
        offlinePage.innerHTML = `
            <div class="h-screen bg-linear-to-b from-gray-50 to-white flex items-center justify-center p-4">
                <div class="max-w-md w-full text-center">
                    <!-- Animated icon -->
                    <div class="relative w-32 h-32 mx-auto mb-8">
                        <div class="absolute inset-0 bg-linear-to-r from-red-100 to-red-50 rounded-full animate-pulse"></div>
                        <div class="relative w-full h-full flex items-center justify-center">
                            <div class="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-lg">
                                <i class="fas fa-wifi-slash text-4xl text-red-500"></i>
                            </div>
                        </div>
                        <div class="absolute -inset-4">
                            <div class="absolute inset-0 border-2 border-red-200 rounded-full animate-ping"></div>
                            <div class="absolute inset-2 border-2 border-red-100 rounded-full animate-ping"
                                style="animation-delay: 0.5s"></div>
                        </div>
                    </div>

                    <h1 class="text-2xl font-bold text-gray-800 mb-3">No Internet Connection</h1>
                    <p class="text-gray-600 mb-8 leading-relaxed">
                        You're currently offline. Please check your network connection and try again.
                    </p>

                    <button id="retryBtn"
                        class="retry-btn w-full max-w-xs mx-auto px-6 py-3.5 bg-primary text-white font-semibold rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-md hover:shadow-lg active:scale-95 flex items-center justify-center">
                        <i class="fas fa-sync-alt mr-3"></i>
                        <span class="btn-text">Retry Connection</span>
                    </button>

                    <div class="mt-10 p-5 bg-gray-50 rounded-xl border border-gray-200 text-left">
                        <h3 class="font-semibold text-gray-700 mb-3 flex items-center">
                            <i class="fas fa-lightbulb text-amber-500 mr-2"></i>
                            Try these steps:
                        </h3>
                        <ul class="space-y-2 text-sm text-gray-600">
                            <li class="flex items-start"><i class="fas fa-check-circle text-green-500 mt-0.5 mr-2"></i>Check your Wi-Fi or mobile data connection</li>
                            <li class="flex items-start"><i class="fas fa-check-circle text-green-500 mt-0.5 mr-2"></i>Turn airplane mode on and off</li>
                            <li class="flex items-start"><i class="fas fa-check-circle text-green-500 mt-0.5 mr-2"></i>Restart your router or modem</li>
                            <li class="flex items-start"><i class="fas fa-check-circle text-green-500 mt-0.5 mr-2"></i>Try accessing other websites to confirm</li>
                        </ul>
                    </div>
                </div>
            </div>
        `;
    }

    appBody.classList.add('hidden');
    offlinePage.classList.remove('hidden');

    // rtry button 
    const retryBtn = document.getElementById('retryBtn');
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

//render te page
async function loadPageComponents() {
    const { data, error } = await supabaseClient.auth.getUser();
    if (error || !data?.user) {
        alertSystem.show("You must be logged in.", 'error');
        setTimeout(() => window.location.href = '../../index.html', 1500);
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

    const file = window.location.pathname.split("/").pop();
    const currentPage = file.split(".")[0];

    document.querySelectorAll(".mobile-nav-item").forEach(item => {
        const page = item.getAttribute("data-page");
        if (page === currentPage) {
            item.classList.remove("text-gray-500");
            item.classList.add("text-primary");
        } else {
            item.classList.remove("text-primary");
            item.classList.add("text-gray-500");
        }
    });
}

//initialize all
document.addEventListener('DOMContentLoaded', async function () {
    storeCurrentPage();

    const isOnline = await checkConnection();

    if (!isOnline) {
        showOfflinePage();
    } else {
        hideOfflinePage();
        await loadPageComponents();
    }

    // Listen for connection changes
    window.addEventListener('online', async () => {
        alertSystem.show('Connection restored', 'success');
        const isOnline = await checkConnection();
        if (isOnline) {
            hideOfflinePage();
            await loadPageComponents();
        }
    });

    window.addEventListener('offline', () => {
        alertSystem.show("Connection Lost", 'error');
        showOfflinePage();
    });
});
