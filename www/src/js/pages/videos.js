import supabaseClient from '../supabase.js';
import AlertSystem from '../render/Alerts.js';
import { createVideoItem, createEmptyVideoState } from '../render/videos.js';
import { videoLike } from './notification.js';
import { renderNotifications, setupClickMarkRead } from '../render/notification.js';

async function initNotifications() {
    const notifications = await fetchNotifications();
    renderNotifications(notifications);
    setupClickMarkRead();
}

/* ------------------------------------------------------
    POST LOADING
------------------------------------------------------ */
function startPostLoading() {
    const btn = document.getElementById('postVideoBtn');
    if (!btn) return () => { };

    const html = btn.innerHTML;
    btn.innerHTML = `
        <div class="flex items-center gap-2">
            <div class="animate-spin h-4 w-4 border-b-2 border-white rounded-full"></div>
            Uploading...
        </div>`;
    btn.disabled = true;

    return () => {
        btn.innerHTML = html;
        btn.disabled = false;
    };
}

document.addEventListener('DOMContentLoaded', async () => {
    const alertSystem = new AlertSystem();

    /* ------------------------------------------------------
        ELEMENTS
    ------------------------------------------------------ */
    const createModal = document.getElementById('createVideoModal');
    const openCreateBtn = document.getElementById('openCreateVideoBtn');
    const closeModalBtn = document.getElementById('closeCreateModalBtn');
    const cancelBtn = document.getElementById('cancelCreateBtn');
    const videoFileInput = document.getElementById('videoFile');
    const selectVideoBtn = document.getElementById('selectVideoBtn');
    const videoPreview = document.getElementById('videoPreview');
    const videoPreviewPlayer = document.getElementById('videoPreviewPlayer');
    const removeVideoBtn = document.getElementById('removeVideoBtn');
    const videoCaption = document.getElementById('videoCaption');
    const charCount = document.getElementById('charCount');
    const postVideoBtn = document.getElementById('postVideoBtn');
    const createVideoForm = document.getElementById('createVideoForm');
    const videoContainer = document.getElementById('videoContainer');

    const { data, error } = await supabaseClient.auth.getUser();
    const userId = data?.user?.id;

    /* ------------------------------------------------------
        ADD NEW VIDEO (INSTEAD OF FULL RE-RENDER)
    ------------------------------------------------------ */
    async function addNewVideo(videoId) {
        // Fetch only the new video
        const { data: video, error } = await supabaseClient
            .from('videos')
            .select('*')
            .eq('id', videoId)
            .single();

        if (error || !video) {
            console.error('Error fetching new video:', error);
            return;
        }

        const { data: authData } = await supabaseClient.auth.getUser();
        const userId = authData?.user?.id;

        // Get friend status and like data for the new video
        const friendStatus = await getFriendStatus(userId, video.user_id);

        const { count: likeCount } = await supabaseClient
            .from('video_likes')
            .select('id', { count: 'exact' })
            .eq('video_id', video.id);

        const userLiked = await checkUserLiked(video.id, userId);

        const videoWithData = {
            ...video,
            friendStatus,
            likeCount: Number(likeCount) || 0,
            userLiked
        };

        // Create the HTML for the new video
        const postOwner = userId === video.user_id;
        const newVideoHTML = createVideoItem(
            videoWithData.video_url,
            videoWithData.avatar_url || '../images/image.png',
            videoWithData.auth_name,
            videoWithData.user_id,
            videoWithData.caption,
            videoWithData.id,
            videoWithData.likeCount,
            postOwner,
            videoWithData.friendStatus,
            videoWithData.userLiked
        );

        // Store current scroll position before adding new video
        const isUserNearTop = window.scrollY < 100; // Check if user is near top of page
        const currentActiveVideo = document.querySelector('.video-barkadahub-item video:not([paused])');

        // Insert new video at the top
        videoContainer.insertAdjacentHTML('afterbegin', newVideoHTML);

        // Reinitialize playback for the new video only
        const newVideoElement = document.querySelector(`.video-barkadahub-item[data-id="${videoId}"]`);
        if (newVideoElement && window.userInteracted) {
            const video = newVideoElement.querySelector('video');
            if (video && isUserNearTop) {
                video.play().catch(() => { });
            }
        }
    }

    /* ------------------------------------------------------
        DELETE VIDEO (INSTEAD OF FULL RE-RENDER)
    ------------------------------------------------------ */
    function removeVideoFromDOM(videoId) {
        const videoElement = document.querySelector(`.video-barkadahub-item[data-id="${videoId}"]`);
        if (videoElement) {
            videoElement.remove();
        }
    }

    /* ------------------------------------------------------
        MODAL LOGIC
    ------------------------------------------------------ */
    function resetVideoModal() {
        videoFileInput.value = '';
        videoPreviewPlayer.src = '';
        videoPreview.classList.add('hidden');
        videoCaption.value = '';
        charCount.textContent = '0/150';
        postVideoBtn.disabled = true;
        selectVideoBtn.disabled = false;
        selectVideoBtn.classList.remove('cursor-not-allowed', 'bg-gray-400');
    }

    function openVideoModal() {
        createModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    function closeVideoModal() {
        createModal.classList.add('hidden');
        document.body.style.overflow = '';
        resetVideoModal();
    }

    openCreateBtn?.addEventListener('click', openVideoModal);
    closeModalBtn?.addEventListener('click', closeVideoModal);
    cancelBtn?.addEventListener('click', closeVideoModal);
    createModal?.addEventListener('click', e => e.target === createModal && closeVideoModal());

    /* ------------------------------------------------------
        VIDEO SELECTION
    ------------------------------------------------------ */
    selectVideoBtn?.addEventListener('click', () => videoFileInput.click());

    videoFileInput?.addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;

        selectVideoBtn.disabled = true;
        selectVideoBtn.classList.add('cursor-not-allowed', 'bg-gray-400');

        videoPreviewPlayer.src = URL.createObjectURL(file);
        videoPreview.classList.remove('hidden');
        postVideoBtn.disabled = false;
    });

    removeVideoBtn?.addEventListener('click', resetVideoModal);

    videoCaption?.addEventListener('input', () => {
        const len = videoCaption.value.length;
        charCount.textContent = `${len}/150`;
        postVideoBtn.disabled = !(len > 0 || videoFileInput.files.length > 0);
    });

    /* ------------------------------------------------------
        UPLOAD VIDEO
    ------------------------------------------------------ */
    createVideoForm?.addEventListener('submit', async e => {
        e.preventDefault();

        const file = videoFileInput.files[0];
        const caption = videoCaption.value.trim();

        if (!file && !caption) {
            alertSystem.show('Please choose a video or enter a caption', 'error');
            return;
        }

        const { data: userData } = await supabaseClient.auth.getUser();
        if (!userData?.user) {
            alertSystem.show('User not authenticated', 'error');
            return;
        }

        const restore = startPostLoading();

        try {
            let videoUrl = null;
            let filePath = null;

            if (file) {
                const ext = file.name.split('.').pop();
                filePath = `${userData.user.id}/${crypto.randomUUID()}.${ext}`;

                await supabaseClient.storage.from('videos').upload(filePath, file);
                videoUrl = supabaseClient.storage.from('videos').getPublicUrl(filePath).data.publicUrl;
            }

            const { data: newVideo, error: insertError } = await supabaseClient
                .from('videos')
                .insert([{
                    video_url: videoUrl,
                    file_path: filePath,
                    caption,
                    user_id: userData.user.id,
                    auth_name: userData.user.user_metadata?.display_name || 'Anonymous'
                }])
                .select()
                .single();

            if (insertError) throw insertError;

            alertSystem.show('Video uploaded successfully!', 'success');
            closeVideoModal();

            // Add the new video to the top instead of re-rendering everything
            if (newVideo) {
                await addNewVideo(newVideo.id);
            }
        } catch (err) {
            console.error(err);
            alertSystem.show(err.message, 'error');
        } finally {
            restore();
        }
    });

    /* ------------------------------------------------------
        DELETE VIDEO FROM DATABASE
    ------------------------------------------------------ */
    async function deleteVideo(postId) {
        const { data } = await supabaseClient
            .from('videos')
            .select('file_path')
            .eq('id', postId)
            .maybeSingle();

        if (data?.file_path) {
            await supabaseClient.storage.from('videos').remove([data.file_path]);
        }

        await supabaseClient.from('videos').delete().eq('id', postId);
    }

    /* ------------------------------------------------------
        FRIEND SYSTEM
    ------------------------------------------------------ */
    async function getFriendStatus(currentUserId, videoUserId) {
        if (currentUserId === videoUserId) return null;

        const { data, error } = await supabaseClient
            .from('friends_request')
            .select('sender_id, receiver_id, status')
            .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${videoUserId}),and(sender_id.eq.${videoUserId},receiver_id.eq.${currentUserId})`);

        if (error) {
            console.error('Error fetching friend status:', error);
            return null;
        }

        if (!data || data.length === 0) return null;

        const sentRequest = data.find(r => r.sender_id === currentUserId);
        if (sentRequest) return sentRequest.status;

        const receivedRequest = data.find(r => r.receiver_id === currentUserId);
        if (receivedRequest) return receivedRequest.status === 'pending' ? 'accept' : receivedRequest.status;

        return null;
    }

    function initFollowButtons() {
        document.addEventListener('click', async (e) => {
            const btn = e.target.closest('.followBtn');
            if (!btn) return;

            const receiverId = btn.dataset.userPostId;
            const currentStatus = btn.dataset.status;

            try {
                const { data: userData, error: authError } = await supabaseClient.auth.getUser();
                if (authError) throw authError;

                const senderId = userData?.user?.id;
                if (!senderId) throw new Error('User not logged in');

                const { data: existingRequests, error: fetchError } = await supabaseClient
                    .from('friends_request')
                    .select('id, status, sender_id, receiver_id')
                    .or(
                        `and(sender_id.eq.${senderId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${senderId})`
                    );

                if (fetchError) throw fetchError;

                if (existingRequests && existingRequests.length > 0) {
                    const existingRequest = existingRequests[0];

                    if (existingRequest.sender_id === senderId) {
                        if (existingRequest.status === 'pending') {
                            alertSystem.show('You already sent a follow request', 'info');
                            return;
                        }
                        if (existingRequest.status === 'friends') {
                            alertSystem.show('You are already friends', 'info');
                            return;
                        }
                    }

                    if (
                        existingRequest.receiver_id === senderId &&
                        existingRequest.status === 'pending'
                    ) {
                        const { error: updateError } = await supabaseClient
                            .from('friends_request')
                            .update({
                                status: 'friends',
                                responded_at: new Date().toISOString()
                            })
                            .eq('id', existingRequest.id);

                        if (updateError) throw updateError;

                        const { error: friendsError } = await supabaseClient
                            .from('friends')
                            .insert([
                                {
                                    user_id: existingRequest.sender_id,
                                    friends_id: existingRequest.receiver_id,
                                    friendReq_id: existingRequest.id
                                },
                                {
                                    user_id: existingRequest.receiver_id,
                                    friends_id: existingRequest.sender_id,
                                    friendReq_id: existingRequest.id
                                }
                            ]);

                        if (friendsError) throw friendsError;

                        const { data: profiles, error: profileError } = await supabaseClient
                            .from('profile')
                            .select('id, name, avatar_url')
                            .in('id', [
                                existingRequest.sender_id,
                                existingRequest.receiver_id
                            ]);

                        if (profileError) throw profileError;

                        const profileMap = {};
                        profiles.forEach(p => {
                            profileMap[p.id] = {
                                name: p.name || 'User',
                                avatar: p.avatar_url || '../images/defaultAvatar.jpg'
                            };
                        });

                        const { error: messageError } = await supabaseClient
                            .from('message')
                            .insert([
                                {
                                    user_id: existingRequest.sender_id,
                                    friends_id: existingRequest.receiver_id,
                                    friend_name: profileMap[existingRequest.receiver_id].name,
                                    friend_avatar: profileMap[existingRequest.receiver_id].avatar,
                                    relation: 'friend',
                                    friendRequest_id: existingRequest.id
                                },
                                {
                                    user_id: existingRequest.receiver_id,
                                    friends_id: existingRequest.sender_id,
                                    friend_name: profileMap[existingRequest.sender_id].name,
                                    friend_avatar: profileMap[existingRequest.sender_id].avatar,
                                    relation: 'friend',
                                    friendRequest_id: existingRequest.id
                                }
                            ]);

                        if (messageError && messageError.code !== '23505') {
                            throw messageError;
                        }

                        updateFollowButtonUI(btn, 'friends');
                        alertSystem.show('Friend request accepted!', 'success');
                        return;
                    }

                    if (existingRequest.status === 'friends') {
                        alertSystem.show('You are already friends', 'info');
                        return;
                    }
                }

                if (
                    (!currentStatus || currentStatus === 'null' || currentStatus === 'undefined') &&
                    (!existingRequests || existingRequests.length === 0)
                ) {
                    const { error: insertError } = await supabaseClient
                        .from('friends_request')
                        .insert({
                            sender_id: senderId,
                            receiver_id: receiverId,
                            status: 'pending'
                        });

                    if (insertError) throw insertError;

                    updateFollowButtonUI(btn, 'pending');
                    alertSystem.show('Follow request sent!', 'success');
                }

            } catch (err) {
                console.error('Error handling friend request:', err);
                alertSystem.show('An error occurred. Please try again.', 'error');
            }
        });
    }

    function updateFollowButtonUI(btn, status) {
        const container = btn.querySelector('.relative > div:last-child');
        if (!container) return;

        let icon = '';
        switch (status) {
            case 'pending':
                icon = `<i class="fas fa-user-minus text-sm text-white drop-shadow-lg"></i>`;
                btn.dataset.status = 'pending';
                break;
            case 'accept':
                icon = `<i class="fas fa-user-check text-sm text-white drop-shadow-lg"></i>`;
                btn.dataset.status = 'accept';
                break;
            case 'friends':
                icon = `<i class="fas fa-user-friends text-sm text-white drop-shadow-lg"></i>`;
                btn.dataset.status = 'friends';
                break;
            default:
                icon = `<i class="fas fa-user-plus text-sm text-white drop-shadow-lg"></i>`;
        }

        container.innerHTML = icon;
    }

    /* ------------------------------------------------------
        REALTIME: FRIEND REQUESTS
    ------------------------------------------------------ */
    function initFriendRealtime(currentUserId) {
        supabaseClient
            .channel('friends-request-realtime-videos')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'friends_request' }, (payload) => {
                if (payload.new.sender_id === currentUserId || payload.new.receiver_id === currentUserId) {
                    updateFollowButtonsRealtime(payload.new);
                }
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'friends_request' }, (payload) => {
                if (payload.new.sender_id === currentUserId || payload.new.receiver_id === currentUserId) {
                    updateFollowButtonsRealtime(payload.new);
                }
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'friends_request' }, (payload) => {
                if (payload.old.sender_id === currentUserId || payload.old.receiver_id === currentUserId) {
                    updateFollowButtonsRealtime(payload.old);
                }
            })
            .subscribe();

    }

    function updateFollowButtonsRealtime(row) {
        if (row.status === 'friends') {
            document.querySelectorAll(
                `.followBtn[data-user-post-id="${row.sender_id}"],
                .followBtn[data-user-post-id="${row.receiver_id}"]`
            ).forEach(btn => {
                updateFollowButtonUI(btn, 'friends');
            });
        }
    }

    /* ------------------------------------------------------
        ELLIPSIS MENU FOR OWNER
    ------------------------------------------------------ */
    function openEllipsisMenuBtn() {
        const ellipsisModal = document.getElementById('ellipsisMenuModal');
        const deletePostBtn = document.getElementById('deletePostBtn');
        const deleteConfirmModal = document.getElementById('deleteConfirmationModal');
        const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
        const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
        const closeEllipsisMenu = document.getElementById('closeEllipsisMenu');

        let selectedPostId = null;

        document.addEventListener('click', e => {
            const btn = e.target.closest('.openEllipsisMenuBtn');
            if (!btn) return;

            e.stopPropagation();
            selectedPostId = btn.dataset.id;
            confirmDeleteBtn.disabled = false;
            confirmDeleteBtn.textContent = 'Delete permanently';
            ellipsisModal.classList.remove('hidden');
        });

        deletePostBtn?.addEventListener('click', () => {
            ellipsisModal.classList.add('hidden');
            deleteConfirmModal.classList.remove('hidden');
        });

        confirmDeleteBtn?.addEventListener('click', async () => {
            if (!selectedPostId) return;

            confirmDeleteBtn.disabled = true;
            confirmDeleteBtn.textContent = 'Deleting...';

            try {
                await deleteVideo(selectedPostId);
                alertSystem.show('Deleted', 'success');
                removeVideoFromDOM(selectedPostId);
            } catch (err) {
                console.error(err);
                alertSystem.show('Failed to delete', 'error');
            }

            deleteConfirmModal.classList.add('hidden');
            selectedPostId = null;
            confirmDeleteBtn.disabled = false;
            confirmDeleteBtn.textContent = 'Delete permanently';
        });

        cancelDeleteBtn?.addEventListener('click', () => {
            deleteConfirmModal.classList.add('hidden');
            selectedPostId = null;
            confirmDeleteBtn.disabled = false;
            confirmDeleteBtn.textContent = 'Delete permanently';
        });

        closeEllipsisMenu?.addEventListener('click', () => {
            ellipsisModal.classList.add('hidden');
            selectedPostId = null;
            confirmDeleteBtn.disabled = false;
            confirmDeleteBtn.textContent = 'Delete permanently';
        });
    }

    /* ------------------------------------------------------
        VIDEO PLAY / PAUSE
    ------------------------------------------------------ */
    function initVideoPlayback() {
        window.userInteracted = false;

        function unlockVideos() {
            if (window.userInteracted) return;
            window.userInteracted = true;
            playVisibleVideo();
            document.removeEventListener('click', unlockVideos);
            document.removeEventListener('touchstart', unlockVideos);
        }

        document.addEventListener('click', unlockVideos);
        document.addEventListener('touchstart', unlockVideos);

        document.addEventListener('click', e => {
            if (e.target.closest('.likeBtn, .openEllipsisMenuBtn, .followBtn, button, .action-icon')) return;

            const videoItem = e.target.closest('.video-barkadahub-item');
            if (!videoItem) return;

            const video = videoItem.querySelector('video');
            video.paused ? video.play() : video.pause();
        });

        // AUTOPLAY ON SCROLL
        function initAutoPlayOnSnap() {
            const observer = new IntersectionObserver(entries => {
                entries.forEach(entry => {
                    const video = entry.target.querySelector('video');
                    if (!video) return;
                    entry.isIntersecting && window.userInteracted
                        ? video.play().catch(() => { })
                        : video.pause();
                });
            }, { threshold: 0.8 });

            document.querySelectorAll('.video-barkadahub-item')
                .forEach(item => observer.observe(item));
        }

        function playVisibleVideo() {
            document.querySelectorAll('.video-barkadahub-item').forEach(item => {
                const rect = item.getBoundingClientRect();
                const video = item.querySelector('video');
                if (!video) return;
                rect.top >= 0 && rect.top < window.innerHeight / 2
                    ? video.play().catch(() => { })
                    : video.pause();
            });
        }

        return { initAutoPlayOnSnap, playVisibleVideo };
    }

    /* ------------------------------------------------------
        LIKE VIDEO
    ------------------------------------------------------ */
    async function likeVideo(videoId, userId) {
        const { error } = await supabaseClient
            .from('video_likes')
            .insert({ video_id: videoId, user_id: userId });
        if (error) throw error;
    }

    async function unlikeVideo(videoId, userId) {
        const { error } = await supabaseClient
            .from('video_likes')
            .delete()
            .eq('video_id', videoId)
            .eq('user_id', userId);
        if (error) throw error;
    }

    async function checkUserLiked(videoId, userId) {
        if (!userId) return false;

        const { data, error } = await supabaseClient
            .from('video_likes')
            .select('id')
            .eq('video_id', videoId)
            .eq('user_id', userId)
            .maybeSingle();

        if (error) {
            console.error('Error checking like status:', error);
            return false;
        }

        return !!data;
    }

    function initLikeButtons() {
        document.addEventListener('click', async (e) => {
            const btn = e.target.closest('.likeBtn');
            if (!btn) return;

            const videoId = btn.dataset.videoId;
            const isLiked = btn.dataset.liked === 'true';
            const { data: userData } = await supabaseClient.auth.getUser();
            const userId = userData?.user?.id;

            if (!userId) {
                alertSystem.show('Please log in to like videos', 'error');
                return;
            }

            try {
                const likeIcon = btn.querySelector('i.fa-heart');
                const likeCountSpan = btn.querySelector('.likeCount');
                let currentLikes = Number(likeCountSpan.textContent) || 0;

                if (isLiked) {
                    await unlikeVideo(videoId, userId);
                    btn.dataset.liked = 'false';
                    btn.classList.remove('liked');
                    likeIcon.classList.remove('fas', 'text-red-500');
                    likeIcon.classList.add('far');
                    currentLikes = Math.max(0, currentLikes - 1);
                    likeCountSpan.textContent = currentLikes;
                } else {
                    await likeVideo(videoId, userId);
                    btn.dataset.liked = 'true';
                    btn.classList.add('liked');
                    likeIcon.classList.remove('far');
                    likeIcon.classList.add('fas', 'text-red-500');
                    currentLikes += 1;
                    likeCountSpan.textContent = currentLikes;
                }
                await videoLike(videoId, userId);
            } catch (err) {
                console.error('Error toggling like:', err);
                alertSystem.show('Failed to update like', 'error');
            }
        });
    }

    /* ------------------------------------------------------
        RENDER VIDEOS (INITIAL LOAD)
    ------------------------------------------------------ */
    async function render() {
        const { data: videos, error } = await supabaseClient
            .from('videos')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error(error);
            return;
        }

        const { data: authData } = await supabaseClient.auth.getUser();
        const userId = authData?.user?.id;

        if (!videos?.length) {
            videoContainer.innerHTML = createEmptyVideoState();
            return;
        }

        const videosWithData = await Promise.all(
            videos.map(async video => {
                const friendStatus = await getFriendStatus(userId, video.user_id);
                const { count: likeCount } = await supabaseClient
                    .from('video_likes')
                    .select('id', { count: 'exact' })
                    .eq('video_id', video.id);
                const userLiked = await checkUserLiked(video.id, userId);

                return {
                    ...video,
                    friendStatus,
                    likeCount: Number(likeCount) || 0,
                    userLiked
                };
            })
        );

        videoContainer.innerHTML = videosWithData.map(video => {
            const postOwner = userId === video.user_id;
            return createVideoItem(
                video.video_url,
                video.avatar_url || '../images/image.png',
                video.auth_name,
                video.user_id,
                video.caption,
                video.id,
                video.likeCount,
                postOwner,
                video.friendStatus,
                video.userLiked
            );
        }).join('');

        const videoPlayback = initVideoPlayback();
        videoPlayback.initAutoPlayOnSnap();

        const urlParams = new URLSearchParams(window.location.search);
        const videoId = urlParams.get('id');
        if (videoId) {
            setTimeout(() => {
                const videoElement = document.querySelector(`[data-video-id="${videoId}"]`);
                if (videoElement) {
                    videoElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 300);

            if (userId) {
                supabaseClient
                    .from('notifications')
                    .update({ is_read: true })
                    .eq('entity_type', 'video')
                    .eq('entity_id', videoId)
                    .eq('user_id', userId);
            }
        }
    }

    /* ------------------------------------------------------
        INITIALIZE EVERYTHING
    ------------------------------------------------------ */
    if (userId) {
        initFriendRealtime(userId);
    }

    openEllipsisMenuBtn();
    initFollowButtons();
    initLikeButtons();
    await render();

    // Realtime for new videos - UPDATED VERSION
    supabaseClient
        .channel('videos-realtime')
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'videos' },
            async (payload) => {
                await addNewVideo(payload.new.id);
            }
        )
        .on(
            'postgres_changes',
            { event: 'DELETE', schema: 'public', table: 'videos' },
            (payload) => {
                render();
            }
        )
        .subscribe();
});