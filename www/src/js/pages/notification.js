import supabaseClient from '../supabase.js';
import { lost_found } from '../render/post.js';
import AlertSystem from '../render/Alerts.js';
import { renderNotifications, setupClickMarkRead, updateNotificationBadge, } from '../render/notification.js';

/* -------------------------------------------
like notification function (normalized)
------------------------------------------- */
async function likePost(postId, currentUserId) {
    try {
        // Get post owner
        const { data: postData, error: postError } = await supabaseClient
            .from('posts')
            .select('user_id')
            .eq('id', postId)
            .single();
        if (postError) throw postError;

        const postOwnerId = postData.user_id;

        // Avoid notifying yourself
        if (postOwnerId === currentUserId) return;

        // Insert notification with only sender_id (normalized)
        const { error: notifError } = await supabaseClient
            .from('notifications')
            .insert([{
                user_id: postOwnerId,      // receiver
                sender_id: currentUserId,  // sender
                type: 'like',
                entity_type: 'post',
                entity_id: postId,
                message: 'liked your post',
                is_read: false,
                created_at: new Date().toISOString()
            }]);
        if (notifError) throw notifError;

    } catch (err) {
        console.error('Error:', err);
    }
}

export { likePost };


/* -------------------------------------------
comments notification functions
------------------------------------------- */
async function commentPost(postId, currentUserId) {
    try {
        // get post owner
        const { data: postData, error: postError } = await supabaseClient
            .from('posts')
            .select('user_id')
            .eq('id', postId)
            .single();
        if (postError) throw postError;

        const postOwnerId = postData.user_id;

        // avoid notify to self
        if (postOwnerId === currentUserId) return;

        // insert notif with only sender_id (normalized)
        const { error: notifError } = await supabaseClient
            .from('notifications')
            .insert([{
                user_id: postOwnerId,
                sender_id: currentUserId,
                type: 'comment',
                entity_type: 'post',
                entity_id: postId,
                message: 'commented on your post',
                is_read: false,
                created_at: new Date().toISOString()
            }]);
        if (notifError) throw notifError;

    } catch (err) {
        console.error('Error:', err);
    }
}
export { commentPost };

/* -------------------------------------------
video notification functions
------------------------------------------- */
async function videoLike(videoId, currentUserId) {
    try {
        // get video owner
        const { data: videoData, error: videoError } = await supabaseClient
            .from('videos')
            .select('user_id')
            .eq('id', videoId)
            .single();
        if (videoError) throw videoError;

        const videoOwnerId = videoData.user_id;

        // avoid notify to self
        if (videoOwnerId === currentUserId) return;

        // insert notif with only sender_id (normalized)
        const { error: notifError } = await supabaseClient
            .from('notifications')
            .insert([{
                user_id: videoOwnerId,
                sender_id: currentUserId,
                type: 'video_like',
                entity_type: 'video',
                entity_id: videoId,
                message: 'liked your video',
                is_read: false,
                created_at: new Date().toISOString()
            }]);
        if (notifError) throw notifError;
    } catch (err) {
        console.error('Error:', err);
    }
}
export { videoLike };






async function fetchNotifications(userId) {
    const { data, error } = await supabaseClient
        .from('notifications')
        .select(`
            *,
            sender:sender_id(name, avatar_url)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching notifications:', error);
        return [];
    }

    return data || [];
}
function setupRealtimeNotifications(userId) {
    if (!userId) return;

    const channel = supabaseClient
        .channel('notifications-channel')
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
            async (payload) => {
                // Fetch fresh notifications to get sender data
                const updatedNotifications = await fetchNotifications(userId);
                renderNotifications(updatedNotifications);
            }
        )
        .subscribe();
}

/* -------------------------------------------
end of fetch and render notifications
------------------------------------------- */
document.addEventListener('DOMContentLoaded', async () => {
    const { data: userData } = await supabaseClient.auth.getUser();
    const userId = userData?.user?.id;

    if (!userId) {
        console.log('User not logged in');
        return;
    }

    /* -------------------------------------------
       FETCH + RENDER
    ------------------------------------------- */
    const notifications = await fetchNotifications(userId);
    await renderNotifications(notifications);

    // 🔗 Attach listeners AFTER render
    setupClickMarkRead();
    updateNotificationBadge(notifications);

    setupRealtimeNotifications(userId);

    const markAllReadBtn = document.getElementById('markAllRead');
    const filterButtons = document.querySelectorAll('.notification-filter');

    /* -------------------------------------------
       MARK ALL AS READ
    ------------------------------------------- */
    if (markAllReadBtn) {
        markAllReadBtn.addEventListener('click', async () => {
            const items = document.querySelectorAll('.notification-item');

            // Update DB
            await supabaseClient
                .from('notifications')
                .update({ is_read: true })
                .eq('user_id', userId)
                .eq('is_read', false);

            // Update UI
            items.forEach(item => {
                item.classList.remove('unread');
                const dot = item.querySelector('.unread-dot');
                if (dot) dot.remove();
            });

            updateNotificationBadge();

            // Button UI
            markAllReadBtn.innerHTML = `<i class="fas fa-check"></i> All marked as read`;
            markAllReadBtn.disabled = true;
            markAllReadBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
            markAllReadBtn.classList.add('bg-gray-400');
        });
    }

    /* -------------------------------------------
       FILTER BUTTONS
    ------------------------------------------- */
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            const filter = button.dataset.filter;
            const items = document.querySelectorAll('.notification-item');

            // Reset styles
            filterButtons.forEach(btn => {
                btn.classList.remove('active', 'border-blue-600', 'text-blue-600');
                btn.classList.add('text-gray-500');
            });

            button.classList.add('active', 'border-blue-600', 'text-blue-600');
            button.classList.remove('text-gray-500');

            // Apply filter
            items.forEach(item => {
                if (filter === 'unread') {
                    item.style.display = item.classList.contains('unread') ? 'block' : 'none';
                } else {
                    item.style.display = 'block';
                }
            });
        });
    });

    /* -------------------------------------------
       FRIEND REQUEST ACTIONS
    ------------------------------------------- */
    document.addEventListener('click', (e) => {
        const confirmBtn = e.target.closest('.confirm-friend');
        const deleteBtn = e.target.closest('.delete-friend');

        if (confirmBtn) {
            const notif = confirmBtn.closest('.notification-item');
            confirmBtn.textContent = 'Confirmed';
            confirmBtn.disabled = true;
            confirmBtn.classList.replace('bg-blue-600', 'bg-gray-400');
            notif.style.opacity = '0.6';
        }

        if (deleteBtn) {
            const notif = deleteBtn.closest('.notification-item');
            notif?.remove();
        }
    });
});
