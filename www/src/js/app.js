import { checkConnection } from './functions.js'
import HeaderComponent from "./components/header.js";
import supabaseClient from './supabase.js';
import AlertSystem from './render/Alerts.js';
import { mobileNavigations, rightSideBar, leftSideBar } from "./components/navigations.js";

const alertSystem = new AlertSystem();

function storeCurrentPage() {
    localStorage.setItem('lastVisitedPage', window.location.pathname);
}

// Show offline page
function showOfflinePage() {
    const appBody = document.body;

    const offlineHTML = `
    <div id="alertContainer" class="fixed top-5 right-5 z-40 max-w-md"></div>
        <div class="h-screen bg-linear-to-b from-gray-50 to-white flex items-center justify-center p-4">
            <div class="max-w-md w-full text-center">
                <div class="w-20 h-20 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
                    <i class="fas fa-wifi-slash text-3xl text-red-500"></i>
                </div>
                
                <h1 class="text-xl font-bold text-gray-800 mb-2">No Internet Connection</h1>
                
                <p class="text-gray-600 mb-6">
                    Please check your connection and try again.
                </p>
                
                <button id="retryBtn" 
                    class="px-5 py-3 bg-primary text-white font-medium rounded-lg hover:bg-blue-600 transition">
                    <i class="fas fa-sync-alt mr-2"></i>Try Again
                </button>
            </div>
        </div>
    `;

    appBody.innerHTML = offlineHTML;
    alertSystem.setContainer('alertContainer');

    // Add retry functionality with loading effect
    const retryBtn = document.getElementById('retryBtn');

    retryBtn.addEventListener('click', async () => {
        // Save original content
        const originalContent = retryBtn.innerHTML;

        // Show loading spinner and disable button
        retryBtn.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i>Checking...`;
        retryBtn.disabled = true;
        retryBtn.classList.add('opacity-70', 'cursor-not-allowed');

        // Check connection
        const isOnline = await checkConnection();

        // Restore button
        retryBtn.innerHTML = originalContent;
        retryBtn.disabled = false;
        retryBtn.classList.remove('opacity-70', 'cursor-not-allowed');

        if (isOnline) {
            window.location.reload();
        } else {
            alertSystem.show("Still offline. Please check your connection.", 'error');
        }
    });

}

// Load page components
async function loadPageComponents() {
    // Check authentication
    const { data, error } = await supabaseClient.auth.getUser();
    if (error || !data?.user) {
        alertSystem.show("You must be logged in.", 'error');
        setTimeout(() => {
            window.location.href = '../../index.html';
        }, 1500);
        return;
    }

    // Load components
    const headerElement = document.getElementById('header');
    const mobileNav = document.getElementById('mobileNav');
    const rightSideNav = document.getElementById('rightSideBar');
    const leftSideNav = document.getElementById('leftSideBar');

    if (headerElement) {
        headerElement.innerHTML = HeaderComponent();
    }

    if (mobileNav) {
        mobileNav.innerHTML = mobileNavigations();
    }

    if (rightSideNav) {
        rightSideNav.innerHTML = rightSideBar();
    }

    if (leftSideNav) {
        leftSideNav.innerHTML = leftSideBar();
    }

    // Highlight current mobile navigation item
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

// Main initialization
document.addEventListener('DOMContentLoaded', async function () {
    storeCurrentPage();

    // Check connection first
    const isOnline = await checkConnection();

    if (!isOnline) {
        showOfflinePage();
    } else {
        await loadPageComponents();
    }

    // Listen for connection changes
    window.addEventListener('online', async () => {
        alertSystem.show('Connection restored', 'success');
        const isOnline = await checkConnection();
        if (isOnline) {
            const appBody = document.getElementById('app');
            if (appBody.innerHTML.includes('No Internet Connection')) {
                window.location.reload();
            }
        }
    });

    window.addEventListener('offline', () => {
        alertSystem.show("Connection Lost", 'error')
        setTimeout(() => {
            showOfflinePage();
        }, 1000);
    });
});