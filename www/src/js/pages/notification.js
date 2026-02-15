import supabaseClient from '../supabase.js';
import { lost_found } from '../render/post.js';
import AlertSystem from '../render/Alerts.js';
import { renderNotifications, setupClickMarkRead, updateNotificationBadge, } from '../render/notification.js';

// like notification
async function likePost(postId, currentUserId) {
    try {
        // get post owner
        const { data: postData, error: postError } = await supabaseClient
            .from('posts')
            .select('user_id')
            .eq('id', postId)
            .single();
        if (postError) throw postError;

        const postOwnerId = postData.user_id;

        // avoid notifying yourself
        if (postOwnerId === currentUserId) return;

        // insert notification with only sender_id
        const { error: notifError } = await supabaseClient
            .from('notifications')
            .insert([{
                user_id: postOwnerId,
                sender_id: currentUserId,
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

// comment notification
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

        // avoid notifying yourself
        if (postOwnerId === currentUserId) return;

        // insert notification with only sender_id
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

// video notification
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

        // avoid notifying yourself
        if (videoOwnerId === currentUserId) return;

        // insert notification with only sender_id
        // don't store entity_id since videoId is numeric but entity_id expects UUID
        const { error: notifError } = await supabaseClient
            .from('notifications')
            .insert([{
                user_id: videoOwnerId,
                sender_id: currentUserId,
                type: 'video_like',
                entity_type: 'video',
                message: 'liked your video',
                is_read: false,
                created_at: new Date().toISOString()
            }]);
        if (notifError) throw notifError;
    } catch (err) {
        console.error('Error in videoLike:', err);
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
                // fetch fresh notifications to get sender data
                const updatedNotifications = await fetchNotifications(userId);
                renderNotifications(updatedNotifications);
            }
        )
        .subscribe();
}

// fetch and render notifications
document.addEventListener('DOMContentLoaded', async () => {
    const { data: userData } = await supabaseClient.auth.getUser();
    const userId = userData?.user?.id;

    if (!userId) {
        console.log('User not logged in');
        return;
    }

    // fetch + render
    const notifications = await fetchNotifications(userId);
    await renderNotifications(notifications);

    // attach listeners after render
    setupClickMarkRead();
    updateNotificationBadge(notifications);

    setupRealtimeNotifications(userId);

    const markAllReadBtn = document.getElementById('markAllRead');
    const filterButtons = document.querySelectorAll('.notification-filter');

    // mark all as read
    if (markAllReadBtn) {
        markAllReadBtn.addEventListener('click', async () => {
            try {
                const items = document.querySelectorAll('.notification-item.unread');

                if (items.length === 0) {
                    return;
                }

                // update db - get all unread notification ids first
                const { data: unreadNotifications, error: fetchError } = await supabaseClient
                    .from('notifications')
                    .select('id')
                    .eq('user_id', userId)
                    .eq('is_read', false);

                if (fetchError) throw fetchError;

                if (unreadNotifications && unreadNotifications.length > 0) {
                    // update all unread notifications
                    const { error: updateError } = await supabaseClient
                        .from('notifications')
                        .update({ is_read: true })
                        .eq('user_id', userId)
                        .eq('is_read', false);

                    if (updateError) throw updateError;
                }

                // update ui
                items.forEach(item => {
                    item.classList.remove('unread');
                    const dot = item.querySelector('.unread-dot');
                    if (dot) dot.remove();
                });

                updateNotificationBadge();

                // button ui
                markAllReadBtn.innerHTML = `<i class="fas fa-check mr-2"></i> All marked as read`;
                markAllReadBtn.disabled = true;
                markAllReadBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
                markAllReadBtn.classList.add('bg-gray-400', 'cursor-not-allowed');

            } catch (error) {
                console.error('Error marking all as read:', error);
                alertSystem?.show('Failed to mark notifications as read', 'error');
            }
        });
    }

    // filter buttons
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            const filter = button.dataset.filter;
            const items = document.querySelectorAll('.notification-item');

            // reset styles
            filterButtons.forEach(btn => {
                btn.classList.remove('active', 'border-blue-600', 'text-blue-600');
                btn.classList.add('text-gray-500');
            });

            button.classList.add('active', 'border-blue-600', 'text-blue-600');
            button.classList.remove('text-gray-500');

            // apply filter
            items.forEach(item => {
                if (filter === 'unread') {
                    item.style.display = item.classList.contains('unread') ? 'block' : 'none';
                } else {
                    item.style.display = 'block';
                }
            });
        });
    });

    // friend request actions
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