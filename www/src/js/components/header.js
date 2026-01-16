// Reusable notification badge component
const NotificationBadge = ({ count, position = 'default', hidden = false }) => {
    if (hidden) return '';

    const positions = {
        default: 'absolute -top-2 -right-1',
        custom: '' // Add custom positions as needed
    };

    return `
        <span class="${positions[position]}
            text-[10px] rounded-full w-4 h-4
            flex items-center justify-center
            font-extrabold text-white bg-red-500">
            ${count || ''}
        </span>
    `;
};

// Reusable icon link component
const IconLink = ({ href, icon, badge = null, ariaLabel = '' }) => {
    return `
        <div class="relative cursor-pointer">
            <a href="${href}" class="block relative" aria-label="${ariaLabel}">
                <i class="${icon} text-primary text-xl"></i>
                ${badge || ''}
            </a>
        </div>
    `;
};

// Main Header Component
export default function HeaderComponent(isAdmin = false) {
    const userActions = [
        // Statistics (admin only)
        ...(isAdmin ? [{
            href: './auth-log.html',
            icon: 'fas fa-chart-line',
            badge: NotificationBadge({ hidden: true, position: 'custom' }),
            ariaLabel: 'View statistics'
        }] : []),

        // Notifications
        {
            href: './notification.html',
            icon: 'fas fa-bell',
            badge: NotificationBadge({ position: 'default' }),
            ariaLabel: 'View notifications'
        },

        // Messages
        {
            href: './messages.html',
            icon: 'fa-solid fa-message',
            badge: NotificationBadge({ count: 3, position: 'default' }),
            ariaLabel: 'View messages'
        }
    ];

    return `
<header class="bg-white shadow-sm fixed top-0 z-30 md:mb-10 w-full" role="banner">
    <div class="container mx-auto px-4">
        <div class="flex justify-between items-center py-4">

            <!-- LOGO -->
            <a href="javascript:void(0)" 
                class="logo flex items-center gap-2 font-extrabold text-xl cursor-pointer hover:opacity-90 transition-opacity"
                onclick="history.back()"
                data-page="home"
                aria-label="Go back">
                
                <img src="../images/image.png" alt="BarkadaHub Logo" class="w-10 h-10 object-contain" loading="eager">

                <span class="bg-linear-to-r 
                            from-indigo-600
                            to-(--color-primary)
                            bg-clip-text text-transparent">
                    BarkadaHub
                </span>
            </a>

            <!-- USER ACTIONS -->
            <div class="user-actions flex items-center gap-4" role="navigation" aria-label="User actions">
                ${userActions.map(IconLink).join('')}
            </div>
        </div>
    </div>
</header>
<div class="h-20" aria-hidden="true"></div>`;
}

// Export individual components if needed elsewhere
export { NotificationBadge, IconLink };

export function info() {
    return `
    <a href="./developers.html" class="fixed bottom-20 right-5 z-50 p-3 rounded-full shadow-lg 
    bg-primary  
    text-white text-lg flex items-center justify-center 
    hover:scale-110 hover:shadow-2xl transition-transform duration-300 
    active:scale-95 animate-bounce-slow" aria-label="Go back to top">
        <i class="fas fa-info-circle"></i>
    </a>
`
}
