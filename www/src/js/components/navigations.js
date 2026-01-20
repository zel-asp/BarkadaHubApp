// Constants for shared data
const NAV_ITEMS = [
    { page: 'home', label: 'Home', icon: 'fas fa-home' },
    { page: 'clubs', label: 'Clubs', icon: 'fas fa-users' },
    { page: 'lost-found', label: 'Lost & Found', icon: 'fas fa-search' },
    { page: 'videos', label: 'Videos', icon: 'fab fa-youtube' },
    { page: 'profile', label: 'Profile', icon: 'fas fa-circle-user' }
];

const SIDEBAR_ITEMS = [
    { page: 'home', label: 'Home', icon: 'fas fa-home' },
    { page: 'videos', label: 'Videos', icon: 'fab fa-youtube' },
    { page: 'clubs', label: 'Clubs', icon: 'fas fa-users' },
    { page: 'lost-found', label: 'Lost & Found', icon: 'fas fa-search' },
    { page: 'messages', label: 'Messages', icon: 'fas fa-comment-dots' },
    { page: 'profile', label: 'Profile', icon: 'fas fa-circle-user' }
];

const CLUBS = [
    { name: 'Computer Science Club', icon: 'fas fa-laptop-code', members: 245 },
    { name: 'Basketball Team', icon: 'fas fa-basketball-ball', members: 18 }
];

const ONLINE_FRIENDS = [
    { name: 'Janzel Dolo', avatar: 'https://i.pravatar.cc/150?img=32' },
    { name: 'Miguel Torres', avatar: 'https://i.pravatar.cc/150?img=45' }
];

// Template generators
const generateNavItem = ({ page, label, icon, isActive = false, type = 'mobile' }) => {
    const activeClass = isActive ? 'text-primary' : 'text-gray-500';

    if (type === 'mobile') {
        return `
<a href="./${page}.html" class="mobile-nav-item flex flex-col items-center ${activeClass}" data-page="${page}">
    <i class="${icon} text-xl mb-1"></i>
    <span class="text-xs">${label}</span>
</a>
`;
    }

    // For sidebar
    const bgClass = isActive ? 'bg-gray-100 text-primary font-medium' : 'text-gray-700 hover:bg-gray-100';
    return `
<li>
    <a href="./${page}.html" class="sidebar-link flex items-center gap-3 p-3 rounded-lg ${bgClass} transition"
        data-page="${page}">
        <i class="${icon} w-5 text-center"></i>${label}
    </a>
</li>
`;
};

const generateClubCard = ({ name, icon, members }) => `
<div class="club-card flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition"
    data-page="clubs">
    <div class="club-avatar w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
        <i class="${icon} text-primary"></i>
    </div>
    <div class="club-info">
        <h4 class="font-medium text-sm">${name}</h4>
        <span class="text-xs text-gray-500">${members} members</span>
    </div>
</div>
`;

const generateFriendCard = ({ name, avatar }, index) => `
<div class="friend-card flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition"
    data-page="messages">
    <div class="friend-avatar w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
        <img src="${avatar}" alt="${name}" class="w-full h-full object-cover" loading="lazy" width="40" height="40">
    </div>
    <div class="friend-info">
        <h4 class="font-medium text-sm">${name}</h4>
        <span class="text-xs text-green-500">Online</span>
    </div>
</div>
`;

// Memoization cache for static components
const componentCache = new Map();

// Mobile Navigation
export function mobileNavigations(currentPage = null) {
    if (!currentPage) {
        currentPage = window.location.pathname.split('/').pop().split('.')[0];
    }

    const cacheKey = `mobile-nav-${currentPage}`;
    if (componentCache.has(cacheKey)) {
        return componentCache.get(cacheKey);
    }

    const navItems = NAV_ITEMS.map(item =>
        generateNavItem({
            ...item,
            isActive: item.page === currentPage,
            type: 'mobile'
        })
    ).join('');

    const component = `
<nav class="lg:hidden fixed bottom-0 left-0 right-0 bg-white shadow-lg flex justify-around py-2 z-30 mt-5"
    aria-label="Mobile navigation">
    ${navItems}
</nav>
`;

    componentCache.set(cacheKey, component);
    return component;
};


// Left Sidebar
export function leftSideBar(currentPage = null) {
    if (!currentPage) {
        currentPage = window.location.pathname.split('/').pop().split('.')[0];
    }

    const cacheKey = `left-sidebar-${currentPage}`;
    if (componentCache.has(cacheKey)) {
        return componentCache.get(cacheKey);
    }

    const sidebarItems = SIDEBAR_ITEMS.map(item =>
        generateNavItem({
            ...item,
            isActive: item.page === currentPage,
            type: 'sidebar'
        })
    ).join('');

    const component = `
<aside class="lg:col-span-1 hidden lg:block" aria-label="Left navigation">
    <div class="bg-white rounded-lg shadow-sm p-5">
        <ul class="space-y-2" role="navigation">
            ${sidebarItems}
        </ul>
    </div>
</aside>
`;

    componentCache.set(cacheKey, component);
    return component;
};

// Helper function to clear cache when needed
export function clearNavigationCache() {
    componentCache.clear();
}

// For dynamic updates (e.g., when user changes page)
export function updateNavigationActiveState() {
    const currentPage = window.location.pathname.split('/').pop().split('.')[0];

    // Update mobile navigation
    const mobileNav = document.querySelector('.mobile-nav-item');
    if (mobileNav) {
        document.querySelectorAll('.mobile-nav-item').forEach(item => {
            const isActive = item.dataset.page === currentPage;
            item.classList.toggle('text-primary', isActive);
            item.classList.toggle('text-gray-500', !isActive);
        });
    }

    // Update sidebar navigation
    const sidebarLinks = document.querySelectorAll('.sidebar-link');
    if (sidebarLinks.length > 0) {
        sidebarLinks.forEach(link => {
            const isActive = link.dataset.page === currentPage;
            link.classList.toggle('bg-gray-100', isActive);
            link.classList.toggle('text-primary', isActive);
            link.classList.toggle('font-medium', isActive);
            link.classList.toggle('text-gray-700', !isActive);
            link.classList.toggle('hover:bg-gray-100', !isActive);
        });

        // Clear cache for dynamic pages
        clearNavigationCache();
    }
}