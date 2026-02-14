import supabaseClient from '../supabase.js';
import AlertSystem from '../render/Alerts.js';
import uploadedPost from '../render/post.js';
import { getPostReactions } from './reactionUtils.js';
import { likePost, commentPost } from '../pages/notification.js';
import { subscribeToPostReactions } from './realtimeReactions.js';

export const alertSystem = new AlertSystem();

// =======================
// TIME FORMATTING
// =======================
export function formatRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = (now - date) / 1000;
    if (diff < 5) return "Just now";
    if (diff < 60) return `${Math.floor(diff)} sec ago`;
    const minutes = diff / 60;
    if (minutes < 60) return `${Math.floor(minutes)} min ago`;
    const hours = minutes / 60;
    if (hours < 24) return `${Math.floor(hours)} hour${Math.floor(hours) > 1 ? "s" : ""} ago`;
    const days = hours / 24;
    if (days < 2) return "Yesterday";
    if (days < 7) return `${Math.floor(days)} day${Math.floor(days) > 1 ? "s" : ""} ago`;
    return date.toLocaleString('en-US', { month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
}

// =======================
// LIKE BUTTONS
// =======================
export function initLikeButtons(alertSystem) {
    document.querySelectorAll('.like-btn').forEach(btn => {
        if (!btn.hasAttribute('data-bound-like')) {
            btn.setAttribute('data-bound-like', 'true');

            btn.addEventListener('click', async () => {
                if (btn.classList.contains('processing')) return;
                btn.classList.add('processing');

                const postId = btn.dataset.postId;
                const postEl = document.querySelector(`.post[data-post-id="${postId}"]`);
                const likesEl = postEl?.querySelector('.likes-count');
                const heartIcon = btn.querySelector('i');
                const likeTextSpan = btn.querySelector('span');
                let currentLikes = parseInt(likesEl?.textContent) || 0;

                const { data: userData } = await supabaseClient.auth.getUser();
                const userId = userData?.user?.id;

                if (!userId) {
                    alertSystem.show("You must be logged in to like posts", "error");
                    btn.classList.remove('processing');
                    return;
                }

                try {
                    const { data: existingLike } = await supabaseClient
                        .from('post_likes')
                        .select('id')
                        .eq('post_id', postId)
                        .eq('user_id', userId)
                        .maybeSingle();

                    if (existingLike) {
                        alertSystem.show("You already liked this post.", "info");
                        btn.classList.remove('processing');
                        return;
                    }

                    const { error: insertError } = await supabaseClient
                        .from('post_likes')
                        .insert({ post_id: postId, user_id: userId });

                    if (insertError) {
                        console.error("Error inserting like:", insertError);
                        btn.classList.remove('processing');
                        return;
                    }

                    await likePost(postId, userId);

                    likesEl.textContent = currentLikes + 1;
                    heartIcon.className = 'fas fa-heart text-red-600';
                    likeTextSpan.textContent = 'Liked';
                    btn.classList.add('text-red-600', 'opacity-50', 'cursor-not-allowed');
                    btn.disabled = true;

                } catch (error) {
                    console.error("Unexpected error:", error);
                } finally {
                    btn.classList.remove('processing');
                }
            });
        }
    });
}

// =======================
// UPDATE LIKE BUTTON STATES
// =======================
export async function updateLikeButtonStates() {
    const { data: userData } = await supabaseClient.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) return;

    const { data: userLikes, error } = await supabaseClient
        .from('post_likes')
        .select('post_id')
        .eq('user_id', userId);

    if (error) return console.error("Error fetching user likes:", error);

    const likedPostIds = new Set(userLikes.map(like => like.post_id));

    document.querySelectorAll('.post').forEach(postEl => {
        const postId = postEl.dataset.postId;
        const likeBtn = postEl.querySelector('.like-btn');
        if (!likeBtn) return;

        const heartIcon = likeBtn.querySelector('i');
        const likeText = likeBtn.querySelector('span');

        if (likedPostIds.has(postId)) {
            heartIcon.className = 'fas fa-heart text-red-600';
            likeText.textContent = 'Liked';
            likeBtn.classList.add('text-red-600', 'opacity-50', 'cursor-not-allowed');
            likeBtn.disabled = true;
        } else {
            heartIcon.className = 'fas fa-heart text-gray-400';
            likeText.textContent = 'Like';
            likeBtn.classList.remove('text-red-600');
        }
    });
}

// =======================
// RENDER SINGLE POST
// =======================
export async function renderPost(post, displayedPostIds, container, position = "beforeend", showFriendStatus = false) {
    if (!post.id || displayedPostIds.has(post.id)) return;

    const { data: userData } = await supabaseClient.auth.getUser();
    const currentUserId = userData?.user?.id;
    const owner = currentUserId === post.user_id;

    // Get user's reaction and total reactions
    const { userReaction, total } = await getPostReactions(post.id, currentUserId);

    // CHECK IF POST IS REPORTED BY CURRENT USER
    let isReported = false;
    if (currentUserId) {
        const { data: report } = await supabaseClient
            .from('reports')
            .select('id')
            .eq('post_id', post.id)
            .eq('who_reported', currentUserId)
            .maybeSingle();
        isReported = !!report;
    }

    // Get recent reactions with user names - ADD THIS COMPLETE CODE
    let formattedReactions = [];
    try {
        // First, get the reactions
        const { data: reactions, error: reactionsError } = await supabaseClient
            .from('post_reactions')
            .select('reaction, user_id')
            .eq('post_id', post.id)
            .order('created_at', { ascending: false })
            .limit(10);

        if (!reactionsError && reactions && reactions.length > 0) {
            // Then fetch profiles separately for each user
            const userIds = [...new Set(reactions.map(r => r.user_id))];

            const { data: profiles, error: profilesError } = await supabaseClient
                .from('profile')
                .select('id, name, avatar_url')
                .in('id', userIds);

            if (!profilesError && profiles) {
                // Create a map of user profiles
                const profileMap = {};
                profiles.forEach(p => {
                    profileMap[p.id] = p;
                });

                // Format reactions with profile data
                formattedReactions = reactions.map(r => ({
                    reaction: r.reaction,
                    user_name: profileMap[r.user_id]?.name || 'Someone',
                    avatar: profileMap[r.user_id]?.avatar_url || '../images/defaultAvatar.jpg'
                }));
            }
        }

    } catch (err) {
        console.warn('Error fetching recent reactions:', err);
    }

    // Get total comments
    const { count: commentCount } = await supabaseClient
        .from('post_comments')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', post.id);

    // Get profile avatar
    let avatar = post.avatar_url || '../images/defaultAvatar.jpg';
    try {
        const { data: profile } = await supabaseClient
            .from('profile')
            .select('avatar_url')
            .eq('id', post.user_id)
            .maybeSingle();

        if (profile?.avatar_url) avatar = profile.avatar_url;
    } catch (err) {
        console.warn('Failed to fetch profile avatar for user:', post.user_id, err);
    }

    const relativeTime = formatRelativeTime(post.created_at);

    let friendStatus = null;
    if (showFriendStatus) {
        friendStatus = await getFriendStatus(currentUserId, post.user_id);
    }

    const html = uploadedPost(
        avatar,
        owner,
        post.user_name,
        relativeTime,
        post.content,
        post.media_url,
        post.media_type,
        post.id,
        total,
        commentCount,
        userReaction,
        post.file_path,
        post.user_id,
        friendStatus,
        isReported,
        formattedReactions
    );

    container.insertAdjacentHTML(position, html);
    displayedPostIds.add(post.id);

    // Subscribe to real-time updates
    if (post.id) {
        subscribeToPostReactions(post.id, currentUserId);
    }

    return post.id;
}

// =======================
// GET FRIEND STATUS
// =======================
async function getFriendStatus(currentUserId, postUserId) {
    if (currentUserId === postUserId) return null;

    const { data, error } = await supabaseClient
        .from('friends_request')
        .select('sender_id, receiver_id, status')
        .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${postUserId}),and(sender_id.eq.${postUserId},receiver_id.eq.${currentUserId})`);

    if (error || !data || data.length === 0) return null;

    const sentRequest = data.find(r => r.sender_id === currentUserId);
    if (sentRequest) return sentRequest.status;

    const receivedRequest = data.find(r => r.receiver_id === currentUserId);
    if (receivedRequest) return receivedRequest.status === 'pending' ? 'accept' : receivedRequest.status;

    return null;
}