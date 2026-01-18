import supabaseClient from '../supabase.js';

// Helper function to format time
function timeAgo(createdAt) {
    if (!createdAt) return 'just now';

    const now = new Date();
    const then = new Date(createdAt);
    const seconds = Math.floor((now - then) / 1000);

    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    const weeks = Math.floor(days / 7);
    if (weeks < 4) return `${weeks}w ago`;

    return then.toLocaleDateString();
}

export async function renderNotifications(notifications) {
    const container = document.getElementById('notificationContainer');
    if (!container) return;

    container.innerHTML = '';

    // Show empty state
    if (!notifications || notifications.length === 0) {
        container.innerHTML = `
            <div class="p-6 text-center text-gray-500">
                <i class="fas fa-bell text-2xl mb-2"></i>
                <p>No notifications yet</p>
            </div>
        `;
        updateNotificationBadge([]);
        return;
    }

    notifications.forEach((n) => {
        const isUnread = !n.is_read ? 'unread' : '';
        const unreadDot = !n.is_read
            ? `<span class="unread-dot rounded-full w-2 h-2 bg-red-500"></span>`
            : '';

        // Notification icon
        const iconHtml = (() => {
            switch (n.type) {
                case 'friend_request':
                    return `<div class="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                                <i class="fa-solid fa-user-plus text-blue-600 text-lg"></i>
                            </div>`;
                case 'like':
                    return `<div class="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                                <i class="fa-solid fa-heart text-red-500 text-lg"></i>
                            </div>`;
                case 'comment':
                    return `<div class="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                                <i class="fa-solid fa-comment text-purple-600 text-lg"></i>
                            </div>`;
                case 'message':
                    return `<div class="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                                <i class="fa-solid fa-envelope text-green-600 text-lg"></i>
                            </div>`;
                case 'video_like':
                    return `<div class="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                                <i class="fa-solid fa-video text-yellow-600 text-lg"></i> 
                            </div>`;
                default:
                    return `<div class="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                                <i class="fa-solid fa-bell text-gray-600 text-lg"></i>
                            </div>`;
            }
        })();

        // Friend request buttons
        const buttonsHtml = n.type === 'friend_request'
            ? `
            <div class="flex flex-col gap-2">
                <button class="confirm-friend bg-primary text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-blue-700 transition">
                    Confirm
                </button>
                <button class="delete-friend bg-gray-200 text-gray-700 px-4 py-1.5 rounded text-sm font-medium hover:bg-gray-300 transition">
                    Delete
                </button>
            </div>`
            : '';

        const username = n.sender?.name || 'User';
        const avatarUrl = n.sender?.avatar_url || `https://i.pravatar.cc/150?img=${Math.floor(Math.random() * 70) + 1}`;

        // Always assign postId / videoId attributes
        const postIdAttr = ['comment', 'like'].includes(n.type) ? n.entity_id || '' : '';
        const videoIdAttr = n.type === 'video_like' ? n.entity_id || '' : '';

        // Render notification item
        const html = `
            <div class="notification-item ${isUnread} p-4 hover:bg-gray-50 transition duration-200"
                 data-notif-id="${n.id}"
                 data-type="${n.type}"
                 data-post-id="${postIdAttr}"
                 data-video-id="${videoIdAttr}">
                <div class="flex items-start gap-3">

                    <!-- Icon -->
                    <div class="flex-0">${iconHtml}</div>

                    <!-- Text -->
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 mb-1">
                            <span class="font-semibold text-gray-900">${username}</span>
                            ${unreadDot}
                        </div>
                        <p class="text-gray-700 text-sm mb-2">${n.message}</p>
                        <span class="text-xs text-gray-500">${timeAgo(n.created_at)}</span>
                    </div>

                    ${buttonsHtml}

                    <!-- Avatar -->
                    <div class="flex-0 ml-3">
                        <img src="${avatarUrl}" alt="${username}" class="w-10 h-10 rounded-full" loading="eager">
                    </div>
                </div>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', html);
    });

    // Attach additional listeners if you have them
    attachNotificationListeners?.();
    setupClickMarkRead();
    updateNotificationBadge(notifications);
}


export function setupClickMarkRead() {
    document.querySelectorAll('.notification-item').forEach(item => {
        item.addEventListener('click', async (e) => {
            // Skip if a button inside is clicked
            if (e.target.closest('button')) return;

            const notifId = item.dataset.notifId;
            const postId = item.dataset.postId || '';
            const videoId = item.dataset.videoId || '';
            const type = item.dataset.type || '';

            if (!notifId) return;

            try {
                // Mark notification as read
                await supabaseClient
                    .from('notifications')
                    .update({ is_read: true })
                    .eq('id', notifId);

                // Update UI immediately
                item.classList.remove('unread');
                const dot = item.querySelector('.unread-dot');
                if (dot) dot.remove();

                updateNotificationBadge();

                // Redirect based on type
                if (postId) {
                    window.location.href = `../html/home.html?id=${postId}`;
                } else if (videoId) {
                    window.location.href = `../html/videos.html?id=${videoId}`;
                } else if (type === 'friend_request') {
                    window.location.href = '../html/friends.html';
                }
            } catch (err) {
                console.error('Failed to mark notification as read:', err);
            }
        });
    });
}


export function updateNotificationBadge(notifications = null) {
    const badge = document.getElementById('notificationBadge');
    if (!badge) return;

    if (!notifications) {
        notifications = Array.from(document.querySelectorAll('.notification-item'));
        notifications = notifications.map(item => ({
            is_read: !item.classList.contains('unread')
        }));
    }

    const unreadCount = notifications.filter(n => !n.is_read).length;
    console.log("Unread notifications:", unreadCount); // 🔍 check count

    if (unreadCount > 0) {
        badge.textContent = unreadCount;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}


export function attachNotificationListeners() {
    // You can put other notification-specific event listeners here
}