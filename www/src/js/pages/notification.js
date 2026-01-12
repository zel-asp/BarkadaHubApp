import supabaseClient from '../supabase.js';
import { lost_found } from '../render/post.js';
import AlertSystem from '../render/Alerts.js';
// ----------------------
// Global variables
// ----------------------
let userId;
let notifications = []; // store notifications array

// ----------------------
// DOM Loaded
// ----------------------
document.addEventListener('DOMContentLoaded', async () => {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    userId = user.id;

    // Fetch initial notifications
    notifications = await fetchNotifications(userId);
    renderNotifications(notifications);

    // Setup mark all read button
    setupMarkAllRead();

    // Setup real-time updates
    setupRealtimeNotifications();
});

// ----------------------
// Update Badge
// ----------------------
function updateNotificationBadge(data) {
    const badge = document.getElementById('notificationBadge');
    if (!badge) return;

    const unreadCount = data.filter(n => !n.is_read).length;
    if (unreadCount > 0) {
        badge.textContent = unreadCount;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

// ----------------------
// Mark All Read
// ----------------------
function setupMarkAllRead() {
    const markAllReadBtn = document.getElementById('markAllRead');
    if (!markAllReadBtn) return;

    markAllReadBtn.addEventListener('click', async () => {
        // Update UI
        document.querySelectorAll('.notification-item').forEach(item => item.classList.remove('unread'));
        document.querySelectorAll('.unread-dot').forEach(dot => dot.remove());

        markAllReadBtn.innerHTML = `<i class="fas fa-check"></i> All marked as read`;
        markAllReadBtn.disabled = true;
        markAllReadBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
        markAllReadBtn.classList.add('bg-gray-400');

        // Update DB
        if (userId) {
            await markAllNotificationsRead(userId);
            // Update badge
            updateNotificationBadge([]);
        }
    });
}

async function markAllNotificationsRead(userId) {
    const { error } = await supabaseClient
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

    if (error) console.error('Error marking all read:', error);
}

// ----------------------
// Render Notifications
// ----------------------
function renderNotifications(data) {
    const container = document.getElementById('notificationContainer');
    if (!container) return;

    container.innerHTML = '';

    data.forEach(n => {
        const isUnread = !n.is_read ? 'unread' : '';
        const unreadDot = !n.is_read
            ? '<span class="unread-dot rounded-full w-2 h-2 bg-red-500 absolute top-3 right-3"></span>'
            : '';

        // Icon based on type
        let iconHtml = '';
        switch (n.type) {
            case 'friend_request':
                iconHtml = `
                <div class="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <i class="fas fa-user-plus text-blue-600 text-lg"></i>
                </div>`;
                break;
            case 'like':
                iconHtml = `
                <div class="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                    <i class="fas fa-heart text-red-500 text-lg"></i>
                </div>`;
                break;
            case 'comment':
                iconHtml = `
                <div class="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                    <i class="fas fa-comment text-purple-600 text-lg"></i>
                </div>`;
                break;
            default:
                iconHtml = `
                <div class="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                    <i class="fas fa-bell text-gray-600 text-lg"></i>
                </div>`;
        }

        // Buttons for friend requests
        const buttonsHtml = n.type === 'friend_request' ? `
            <div class="flex flex-col gap-2">
                <button class="confirm-friend bg-primary text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-blue-700 transition">
                    Confirm
                </button>
                <button class="delete-friend bg-gray-200 text-gray-700 px-4 py-1.5 rounded text-sm font-medium hover:bg-gray-300 transition">
                    Delete
                </button>
            </div>` : '';

        // Avatar image
        const avatarUrl = n.avatar_url || `https://i.pravatar.cc/150?img=${Math.floor(Math.random() * 70) + 1}`;

        // Notification HTML
        const html = `
            <div class="notification-item ${isUnread} p-4 hover:bg-gray-50 transition duration-200 relative border-b border-gray-200 cursor-pointer">
                <div class="flex items-start gap-3">
                    <div class="flex-0">
                        ${iconHtml}
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 mb-1">
                            <span class="font-semibold text-gray-900">${n.username}</span>
                            ${unreadDot}
                        </div>
                        <p class="text-gray-700 text-sm mb-2">${n.message}</p>
                        <span class="text-xs text-gray-500">${timeAgo(n.created_at)}</span>
                    </div>
                    ${buttonsHtml}
                    <div class="flex-0 ml-3">
                        <img src="${avatarUrl}" alt="${n.username}" class="w-10 h-10 rounded-full">
                    </div>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', html);
    });

    attachNotificationListeners();
    updateNotificationBadge(data);

    // Make the whole notification clickable
    document.querySelectorAll('.notification-item').forEach(item => {
        item.addEventListener('click', (e) => {
            // Prevent click if button inside was clicked
            if (e.target.closest('button')) return;

            const index = Array.from(item.parentNode.children).indexOf(item);
            const notif = data[index];

            if (!notif) return;

            // Determine URL based on type
            let url = '#';
            switch (notif.type) {
                case 'friend_request':
                    url = `/profile/${notif.target_user_id}`; // friend profile
                    break;
                case 'like':
                case 'comment':
                    url = `/post/${notif.target_post_id}`; // post page 
                    break;
                default:
                    url = '/notifications'; // default page
            }

            window.location.href = url;
        });
    });
}
// Helper function to show "5 minutes ago", "2 hours ago", etc.
function timeAgo(timestamp) {
    const now = new Date();
    const then = new Date(timestamp);
    const diff = Math.floor((now - then) / 1000); // seconds

    if (diff < 60) return `${diff} seconds ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return `${Math.floor(diff / 86400)} days ago`;
}



// ----------------------
// Button Listeners
// ----------------------
function attachNotificationListeners() {
    document.querySelectorAll('.confirm-friend').forEach(button => {
        button.addEventListener('click', () => {
            const notification = button.closest('.notification-item');
            notification.style.opacity = '0.6';
            button.textContent = 'Confirmed';
            button.disabled = true;
            button.classList.remove('bg-blue-600', 'hover:bg-blue-700');
            button.classList.add('bg-gray-400');
        });
    });

    document.querySelectorAll('.delete-friend').forEach(button => {
        button.addEventListener('click', () => {
            const notification = button.closest('.notification-item');
            notification.remove();
        });
    });
}

// ----------------------
// Fetch Notifications
// ----------------------
async function fetchNotifications(userId) {
    try {
        const { data, error } = await supabaseClient
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('Error fetching notifications:', err);
        return [];
    }
}

// ----------------------
// Real-time Notifications
// ----------------------
function setupRealtimeNotifications() {
    if (!userId) return;

    const channel = supabaseClient
        .channel('notifications-channel')
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
            (payload) => {
                notifications = [payload.new, ...notifications];
                renderNotifications(notifications);
            }
        )
        .subscribe();
}

/* -------------------------------------------
end of fetch and render notifications
------------------------------------------- */

document.addEventListener('DOMContentLoaded', () => {
    const markAllReadBtn = document.getElementById('markAllRead');
    const notificationItems = document.querySelectorAll('.notification-item');
    const unreadDots = document.querySelectorAll('.unread-dot');
    const filterButtons = document.querySelectorAll('.notification-filter');

    /* -------------------------------------------
    MARK ALL AS READ
    ------------------------------------------- */
    if (markAllReadBtn) {
        markAllReadBtn.addEventListener('click', () => {
            notificationItems.forEach(item => item.classList.remove('unread'));

            unreadDots.forEach(dot => dot.remove());

            // Update button UI
            markAllReadBtn.innerHTML = `<i class="fas fa-check"></i> All marked as read`;
            markAllReadBtn.disabled = true;
            markAllReadBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
            markAllReadBtn.classList.add('bg-gray-400');
        });
    }

    /* -------------------------------------------
    FILTER BUTTONS (All, Unread, Friend Requests)
    ------------------------------------------- */
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Reset all
            filterButtons.forEach(btn => {
                btn.classList.remove('active', 'border-blue-600', 'text-blue-600');
                btn.classList.add('text-gray-500');
            });

            // Set active
            button.classList.add('active', 'border-blue-600', 'text-blue-600');
            button.classList.remove('text-gray-500');

            // Filtering logic placeholder (you can add later)
            notificationItems.forEach(item => item.style.display = 'block');
        });
    });

    /* -------------------------------------------
    FRIEND REQUEST: CONFIRM
    ------------------------------------------- */
    document.querySelectorAll('.confirm-friend').forEach(button => {
        button.addEventListener('click', () => {
            const notification = button.closest('.notification-item');
            if (!notification) return;

            notification.style.opacity = '0.6';
            button.textContent = 'Confirmed';
            button.disabled = true;

            button.classList.remove('bg-blue-600', 'hover:bg-blue-700');
            button.classList.add('bg-gray-400');
        });
    });

    /* -------------------------------------------
    FRIEND REQUEST: DELETE
    ------------------------------------------- */
    document.querySelectorAll('.delete-friend').forEach(button => {
        button.addEventListener('click', () => {
            const notification = button.closest('.notification-item');
            if (notification) {
                notification.style.display = 'none';
            }
        });
    });
});
