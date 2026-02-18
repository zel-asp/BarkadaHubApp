import { checkConnection } from './functions.js';
import HeaderComponent, { info } from "./components/header.js";
import { updateNotificationBadge, updateMessageBadge } from './render/notification.js';
import supabaseClient from './supabase.js';
import AlertSystem from './render/Alerts.js';
import offline, { Loading } from './render/offline.js';
import { searchUser } from './render/post.js';
import { mobileNavigations, leftSideBar } from "./components/navigations.js";

// initialize notification system
const alertSystem = new AlertSystem();
// const App = window.Capacitor?.Plugins?.App || null;
// if (App) {
//     let lastBackTime = 0;

//     App.addListener('backButton', ({ canGoBack }) => {
//         const now = Date.now();

//         if (canGoBack) {
//             // Go to previous page inside your app
//             window.history.back();
//         } else {
//             // Double press to exit
//             if (now - lastBackTime < 2000) {
//                 App.exitApp();
//             } else {
//                 lastBackTime = now;
//                 alert('Press back again to exit');
//             }
//         }
//     });
// }


// Admin user IDs
const ADMIN_IDS = new Map([
    ['c1517366-9c04-41af-bf32-d0db2b2bab85', 1],
    ['d35072cd-9fe3-43bf-9dc8-adb050384154', 2]
]);

// all modal/popup ids in the app
const MODAL_IDS = [
    'commentModal',
    'ellipsisMenuModal',
    'deleteConfirmationModal',
    'fullImageModal'
];

// app state to track what's happening
const state = {
    openModals: new Set(),
    isAdmin: false,
    userId: null,
    isOnline: false,
    isLoading: true
};

// ===================== helper functions =====================
// save current page to localStorage
const storeCurrentPage = () => {
    localStorage.setItem('lastVisitedPage', window.location.pathname);
};

// get current page name from url
const getCurrentPageName = () => {
    const path = window.location.pathname;
    return path.substring(path.lastIndexOf('/') + 1).split('.')[0];
};

// ===================== loading management =====================
// show loading screen
const showLoading = () => {
    const appBody = document.getElementById('app');
    const offlinePage = document.getElementById('offlinePage');

    // hide main content during loading
    appBody?.classList.add('hidden');
    offlinePage?.classList.add('hidden');

    // create loading element if it doesn't exist
    const loadingHtml = Loading();
    let loadingContainer = document.getElementById('loadingContainer');

    if (!loadingContainer) {
        loadingContainer = document.createElement('div');
        loadingContainer.id = 'loadingContainer';
        document.body.appendChild(loadingContainer);
    }

    loadingContainer.innerHTML = loadingHtml;
    loadingContainer.classList.remove('hidden');

    state.isLoading = true;

    setTimeout(() => {
        if (state.isLoading) {
            const loadingMessage = document.querySelector('#loadingContainer p[id="loadingMessage"]');
            if (loadingMessage) {
                loadingMessage.innerHTML = 'Connection slow. Please check your internet<span class="loading-dots"></span>';
                loadingMessage.classList.add('text-amber-600');
            }
        }
    }, 3000);
};
// hide loading screen with fade animation
const hideLoading = () => {
    const loadingContainer = document.getElementById('loadingContainer');
    if (loadingContainer) {
        // fade out animation
        loadingContainer.style.opacity = '0';
        loadingContainer.style.transition = 'opacity 0.3s ease-out';

        setTimeout(() => {
            loadingContainer.classList.add('hidden');
            setTimeout(() => {
                loadingContainer.remove();
            }, 300);
        }, 300);
    }

    state.isLoading = false;
};

// ===================== offline management =====================
// show offline page when no internet
const showOfflinePage = async () => {
    const appBody = document.getElementById('app');
    const offlinePage = document.getElementById('offlinePage');

    // create offline page content once
    if (!offlinePage.innerHTML.trim()) {
        offlinePage.innerHTML = offline();
    }

    appBody?.classList.add('hidden');
    offlinePage.classList.remove('hidden');

    const retryBtn = document.getElementById('retryBtn');
    if (!retryBtn) return;

    // handle retry button click
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

// hide offline page
const hideOfflinePage = () => {
    document.getElementById('offlinePage')?.classList.add('hidden');
    document.getElementById('app')?.classList.remove('hidden');
};

// ===================== modal management =====================
// track which modals are open
const recordOpenModals = () => {
    state.openModals.clear();
    MODAL_IDS.forEach(id => {
        const modal = document.getElementById(id);
        if (modal && !modal.classList.contains('hidden')) {
            state.openModals.add(id);
        }
    });
};

// close all modals
const hideAllModals = () => {
    MODAL_IDS.forEach(id => {
        document.getElementById(id)?.classList.add('hidden');
    });
};

// reopen modals that were closed due to offline
const restoreModals = () => {
    state.openModals.forEach(id => {
        document.getElementById(id)?.classList.remove('hidden');
    });
    state.openModals.clear();
};

// ===================== user session =====================
// check if user is logged in
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

// ===================== page rendering =====================
// update active navigation item
const updateNavigationActiveState = () => {
    const currentPage = getCurrentPageName();
    document.querySelectorAll(".mobile-nav-item").forEach(item => {
        const isActive = item.dataset.page === currentPage;
        item.classList.toggle("text-primary", isActive);
        item.classList.toggle("text-gray-500", !isActive);
    });
};

// render all page components
const renderComponents = async () => {
    const components = [
        { id: 'header', html: HeaderComponent(state.isAdmin) },
        { id: 'mobileNav', html: mobileNavigations() },
        { id: 'leftSideBar', html: leftSideBar() }
    ];

    components.forEach(({ id, html }) => {
        const element = document.getElementById(id);
        if (element) {
            element.replaceChildren();
            element.insertAdjacentHTML('afterbegin', html);
        }
    });
    openSearchModal();
    updateNavigationActiveState();

    // update notification badge after header is in dom
    try {
        const user = await supabaseClient.auth.getUser();
        if (user.data?.user?.id) {
            // fetch unread notifications
            const { data: notifications } = await supabaseClient
                .from('notifications')
                .select('id, is_read')
                .eq('user_id', user.data.user.id)
                .order('created_at', { ascending: false });

            if (notifications) {
                updateNotificationBadge(notifications);
            }
        }
    } catch (error) {
        console.error('Failed to update badges:', error);
    }
};

// ===================== app initialization =====================
// main app initialization
const initializeApp = async () => {
    showLoading();
    const startTime = Date.now();

    try {
        storeCurrentPage();

        // check connection and wait at least 1 second
        const [isOnline] = await Promise.all([
            checkConnection(),
            new Promise(resolve => setTimeout(resolve, 1000))
        ]);

        state.isOnline = isOnline;

        if (!state.isOnline) {
            showOfflinePage();
            return;
        }

        hideOfflinePage();

        const user = await checkUserSession();
        if (user) {
            await renderComponents();
            await messageCount();
            await subscribeToUnreadMessages();
        }

        // ensure loading shows for at least 1 second
        const elapsed = Date.now() - startTime;
        if (elapsed < 1000) {
            await new Promise(resolve => setTimeout(resolve, 1000 - elapsed));
        }

    } catch (error) {
        console.error('Initialization error:', error);
        alertSystem.show("Something went wrong. Please try again.", 'error');
    } finally {
        hideLoading();
    }
};

// ===================== event handlers =====================
// handle auth state changes
const handleAuthStateChange = (event) => {
    if (event === 'SIGNED_OUT' && document.body.dataset.page !== 'auth') {
        window.location.replace('../../index.html');
    }
};

// handle going offline
const handleOffline = () => {
    if (state.isLoading) {
        hideLoading();
    }
    alertSystem.show("Connection Lost", 'error');
    recordOpenModals();
    hideAllModals();
    showOfflinePage();
};

// handle coming back online
const handleOnline = async () => {
    if (state.isLoading) {
        showLoading();
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    alertSystem.show("Connection restored", 'success');
    hideOfflinePage();
    restoreModals();

    if (document.body.dataset.page !== 'auth') {
        await checkUserSession();
    }

    if (state.isLoading) {
        hideLoading();
    }
};

const messageCount = async () => {
    try {
        const { data: userData } = await supabaseClient.auth.getUser();
        const userId = userData?.user?.id;
        if (!userId) return;

        // get all conversations of this user
        const { data: conversations, error: convoError } = await supabaseClient
            .from('message')
            .select('conversation_id')
            .or(`user_id.eq.${userId},friends_id.eq.${userId}`);

        if (convoError || !conversations?.length) return;

        const conversationIds = conversations
            .map(c => c.conversation_id)
            .filter(Boolean);

        if (!conversationIds.length) return;

        // count unread messages (sender is not current user)
        const { data, count, error: chatError } = await supabaseClient
            .from('chat_messages')
            .select('id', { count: 'exact', head: true })
            .eq('is_seen', false)
            .neq('sender_id', userId)
            .in('conversation_id', conversationIds);

        if (chatError) {
            console.error('Unread messages error:', chatError);
            return;
        }

        // update badge
        const badge = document.getElementById('messageBadge');
        if (!badge) return;

        if (!count || count === 0) {
            badge.textContent = '';
            badge.classList.add('hidden');
        } else {
            badge.textContent = count;
            badge.classList.remove('hidden');
        }
    } catch (err) {
        console.error('Error in messageCount():', err);
    }
};

const subscribeToUnreadMessages = async () => {
    try {
        const { data: userData } = await supabaseClient.auth.getUser();
        const userId = userData?.user?.id;
        if (!userId) return;

        // get all conversations of this user
        const { data: conversations, error: convoError } = await supabaseClient
            .from('message')
            .select('conversation_id')
            .or(`user_id.eq.${userId},friends_id.eq.${userId}`);

        if (convoError || !conversations?.length) return;

        const conversationIds = conversations
            .map(c => c.conversation_id)
            .filter(Boolean);

        if (!conversationIds.length) return;

        // wrap uuids in quotes
        const formattedIds = conversationIds.map(id => `'${id}'`);

        // create a single channel for all conversations
        const channel = supabaseClient.channel('unread-messages');

        channel.on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'chat_messages',
                filter: `conversation_id=in.(${formattedIds.join(',')})`
            },
            (payload) => {
                // only count messages not sent by the current user
                if (payload.new.sender_id !== userId) {
                    messageCount();
                }
            }
        );

        await channel.subscribe();

    } catch (err) {
        console.error('Error in subscribeToUnreadMessages():', err);
    }
};

// ===================== search modal =====================
const openSearchModal = () => {
    const search = document.getElementById('search');
    const searchModal = document.getElementById('searchModal');
    const closeSearchModal = document.getElementById('closeSearchModal');
    if (!searchModal || !search) return;

    search.addEventListener('click', () => {
        searchModal.classList.remove('hidden');
        document.getElementById('searchInput')?.focus();

        handleUserSearch();
    });

    if (!closeSearchModal) return;
    closeSearchModal.addEventListener('click', () => {
        searchModal.classList.add('hidden');
    });
};

const handleUserSearch = async () => {
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');

    if (!searchInput || !searchResults) return;

    searchInput.addEventListener('input', async (e) => {
        const query = e.target.value.trim();

        // clear previous results
        searchResults.innerHTML = '';

        if (!query) return;

        try {
            const { data: users, error } = await supabaseClient
                .from('profile')
                .select('id, avatar_url, name')
                .ilike('name', `%${query}%`);

            if (error) throw error;

            if (!users || users.length === 0) {
                searchResults.innerHTML = `<p class="text-gray-400 text-center py-4">No users found</p>`;
                return;
            }

            users.forEach(user => {
                searchResults.insertAdjacentHTML(
                    'beforeend',
                    searchUser(user.id, user.avatar_url || user.name[0], user.name)
                );
            });

        } catch (err) {
            console.error('Search error:', err);
            searchResults.innerHTML = `<p class="text-red-500 text-center py-4">Error searching users</p>`;
        }
    });
};

// ===================== page load =====================
document.addEventListener('DOMContentLoaded', () => {
    const infoLink = document.getElementById('infoLink');
    infoLink?.insertAdjacentHTML('beforeend', info());

    supabaseClient.auth.onAuthStateChange(handleAuthStateChange);
    showLoading();
    initializeApp();

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
});

// detect page refresh
window.addEventListener('beforeunload', () => {
    sessionStorage.setItem('isRefreshing', 'true');
});

if (performance.navigation.type === 1 || sessionStorage.getItem('isRefreshing')) {
    sessionStorage.removeItem('isRefreshing');
}