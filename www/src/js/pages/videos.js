import supabaseClient from '../supabase.js';
import AlertSystem from '../render/Alerts.js';
import { createVideoItem, createEmptyVideoState } from '../render/videos.js';

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

            await supabaseClient.from('videos').insert([{
                video_url: videoUrl,
                file_path: filePath,
                caption,
                auth_id: userData.user.id,
                auth_name: userData.user.user_metadata?.display_name || 'Anonymous'
            }]);

            alertSystem.show('Video uploaded successfully!', 'success');
            closeVideoModal();
            render();
        } catch (err) {
            console.error(err);
            alertSystem.show(err.message, 'error');
        } finally {
            restore();
        }
    });

    /* ------------------------------------------------------
        DELETE VIDEO
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
        FRIEND SYSTEM (SAME AS HOME.JS)
    ------------------------------------------------------ */
    async function getFriendStatus(currentUserId, videoUserId) {
        if (currentUserId === videoUserId) return null;

        const { data, error } = await supabaseClient
            .from('friends-request')
            .select('sender_id, receiver_id, status')
            .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${videoUserId}),and(sender_id.eq.${videoUserId},receiver_id.eq.${currentUserId})`);

        if (error) {
            console.error('Error fetching friend status:', error);
            return null;
        }

        if (!data || data.length === 0) return null;

        // Decide which row applies to current user
        // If current user sent the request
        const sentRequest = data.find(r => r.sender_id === currentUserId);
        if (sentRequest) return sentRequest.status;

        // If current user received the request
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
            const username = btn.dataset.user;

            try {
                const { data: userData } = await supabaseClient.auth.getUser();
                const senderId = userData?.user?.id;
                if (!senderId) throw new Error('User not logged in');

                // Fetch existing friend requests
                const { data: existingRequests, error: fetchError } = await supabaseClient
                    .from('friends-request')
                    .select('id, status, sender_id, receiver_id')
                    .or(
                        `and(sender_id.eq.${senderId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${senderId})`
                    );

                if (fetchError) throw fetchError;

                // If there are existing requests
                if (existingRequests && existingRequests.length > 0) {
                    const existingRequest = existingRequests[0];

                    // Check if user already sent a request (is sender)
                    if (existingRequest.sender_id === senderId) {
                        if (existingRequest.status === 'pending') {
                            alertSystem.show('You already sent a follow request to this user', 'info');
                            return;
                        }
                        if (existingRequest.status === 'friends') {
                            alertSystem.show('You are already friends with this user', 'info');
                            return;
                        }
                    }

                    // Check if user received a request (is receiver) and it's pending
                    if (existingRequest.receiver_id === senderId && existingRequest.status === 'pending') {
                        // ACCEPT THE REQUEST
                        const { error: updateError } = await supabaseClient
                            .from('friends-request')
                            .update({
                                status: 'friends',
                                responded_at: new Date().toISOString()
                            })
                            .eq('id', existingRequest.id);

                        if (updateError) throw updateError;

                        const { error: friendsError } = await supabaseClient
                            .from('friends')
                            .insert({
                                user_id: existingRequest.sender_id,
                                friends_id: existingRequest.receiver_id,
                                friendReq_id: existingRequest.id
                            });

                        if (friendsError) throw friendsError;

                        // Update UI immediately
                        updateFollowButtonUI(btn, 'friends');
                        alertSystem.show('Friend request accepted!', 'success');
                        return;
                    }

                    // If they're already friends
                    if (existingRequest.status === 'friends') {
                        alertSystem.show('You are already friends with this user', 'info');
                        return;
                    }
                }

                // No existing request or status is null/undefined - Send new request
                if ((!currentStatus || currentStatus === 'null' || currentStatus === 'undefined') &&
                    (!existingRequests || existingRequests.length === 0)) {

                    const { error: insertError } = await supabaseClient
                        .from('friends-request')
                        .insert({
                            sender_id: senderId,
                            receiver_id: receiverId,
                            status: 'pending'
                        });

                    if (insertError) throw insertError;

                    // Update UI immediately
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
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'friends-request'
                },
                (payload) => {
                    const row = payload.new || payload.old;
                    if (!row) return;

                    // Only react if current user is involved
                    if (row.sender_id !== currentUserId && row.receiver_id !== currentUserId) return;

                    updateFollowButtonsRealtime(row);
                }
            )
            .subscribe();
    }

    function updateFollowButtonsRealtime(row) {
        // UPDATE → both see FRIENDS
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

        // ==========================
        // OPEN ELLIPSIS MENU
        // ==========================
        document.addEventListener('click', e => {
            const btn = e.target.closest('.openEllipsisMenuBtn');
            if (!btn) return;

            e.stopPropagation();

            selectedPostId = btn.dataset.id;

            // ✅ reset button state every time
            confirmDeleteBtn.disabled = false;
            confirmDeleteBtn.textContent = 'Delete permanently';

            ellipsisModal.classList.remove('hidden');
        });

        // ==========================
        // OPEN DELETE CONFIRMATION
        // ==========================
        deletePostBtn?.addEventListener('click', () => {
            ellipsisModal.classList.add('hidden');
            deleteConfirmModal.classList.remove('hidden');
        });

        // ==========================
        // CONFIRM DELETE
        // ==========================
        confirmDeleteBtn?.addEventListener('click', async () => {
            if (!selectedPostId) return;

            confirmDeleteBtn.disabled = true;
            confirmDeleteBtn.textContent = 'Deleting...';

            try {
                await deleteVideo(selectedPostId);

                alertSystem.show('Deleted', 'success');

                document
                    .querySelector(`.video-barkadahub-item[data-id="${selectedPostId}"]`)
                    ?.parentElement?.remove();
            } catch (err) {
                console.error(err);
                alertSystem.show('Failed to delete', 'error');
            }

            deleteConfirmModal.classList.add('hidden');
            selectedPostId = null;

            confirmDeleteBtn.disabled = false;
            confirmDeleteBtn.textContent = 'Delete permanently';
        });

        // ==========================
        // CANCEL DELETE
        // ==========================
        cancelDeleteBtn?.addEventListener('click', () => {
            deleteConfirmModal.classList.add('hidden');
            selectedPostId = null;

            confirmDeleteBtn.disabled = false;
            confirmDeleteBtn.textContent = 'Delete permanently';
        });

        // ==========================
        // CLOSE ELLIPSIS MENU
        // ==========================
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
        let userInteracted = false;

        function unlockVideos() {
            if (userInteracted) return;
            userInteracted = true;
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
                    entry.isIntersecting && userInteracted
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
        RENDER VIDEOS
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

        // Get friend status for each video
        const videosWithFriendStatus = await Promise.all(
            videos.map(async video => {
                const friendStatus = await getFriendStatus(userId, video.auth_id);
                return { ...video, friendStatus };
            })
        );

        videoContainer.innerHTML = videosWithFriendStatus.map(video => {
            const postOwner = userId === video.auth_id;

            return createVideoItem(
                video.video_url,
                video.avatar_url || '../images/image.png',
                video.auth_name,
                video.auth_id,
                video.caption,
                video.id,
                video.post_likes?.[0]?.count || 0,
                postOwner,
                video.friendStatus
            );
        }).join('');

        const videoPlayback = initVideoPlayback();
        videoPlayback.initAutoPlayOnSnap();
    }

    /* ------------------------------------------------------
        INITIALIZE EVERYTHING
    ------------------------------------------------------ */
    if (userId) {
        initFriendRealtime(userId);
    }

    openEllipsisMenuBtn();
    initFollowButtons();
    await render();

    // Realtime for new videos
    supabaseClient
        .channel('videos-realtime')
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'videos' },
            (payload) => {
                render();
            }
        )
        .subscribe();
});