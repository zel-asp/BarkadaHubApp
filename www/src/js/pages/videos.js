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

        // Handle null avatar URL - use default image
        const avatarUrl = video.avatar_url || '../images/image.png';

        // Create the HTML for the new video
        const postOwner = userId === video.user_id;
        const newVideoHTML = createVideoItem(
            videoWithData.video_url,
            avatarUrl,
            videoWithData.auth_name,
            videoWithData.user_id,
            videoWithData.caption,
            videoWithData.id,
            videoWithData.likeCount,
            postOwner,
            videoWithData.friendStatus,
            videoWithData.userLiked
        );

        // Insert new video at the top
        videoContainer.insertAdjacentHTML('afterbegin', newVideoHTML);

        // Initialize controls for the new video
        setTimeout(() => {
            const newVideoElement = document.querySelector(`.video-barkadahub-item[data-id="${videoId}"]`);
            if (newVideoElement) {
                // Get the videoPlayback instance from the render function
                if (window.videoPlayback && window.videoPlayback.initializeVideoControlsForElement) {
                    window.videoPlayback.initializeVideoControlsForElement(newVideoElement);
                }

                // Auto-play if near top and user has interacted
                if (window.userInteracted && window.scrollY < 100) {
                    const video = newVideoElement.querySelector('video');
                    if (video) {
                        video.play().catch(() => { });
                    }
                }
            }
        }, 100);
    }

    function removeVideoFromDOM(videoId) {
        const videoElement = document.querySelector(`.video-barkadahub-item[data-id="${videoId}"]`);
        if (videoElement) {
            videoElement.remove();
        }
    }

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
    });

    /* ------------------------------------------------------
        UPLOAD VIDEO
    ------------------------------------------------------ */
    createVideoForm?.addEventListener('submit', async e => {
        e.preventDefault();

        const file = videoFileInput.files[0];
        const caption = videoCaption.value.trim();

        if (!file || !caption) {
            return alertSystem.show('Please choose a video or enter a caption', 'error');
        }

        const { data: userData } = await supabaseClient.auth.getUser();
        if (!userData?.user) {
            return alertSystem.show('User not authenticated', 'error');
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
        VIDEO PLAY / PAUSE - TikTok Style with Smart Mute
    ------------------------------------------------------ */
    function initVideoPlayback() {
        window.userInteracted = false;

        // Store video state
        const videoStates = new Map();

        function unlockVideos() {
            if (window.userInteracted) return;
            window.userInteracted = true;
            playVisibleVideo();
            document.removeEventListener('click', unlockVideos);
            document.removeEventListener('touchstart', unlockVideos);
        }

        document.addEventListener('click', unlockVideos);
        document.addEventListener('touchstart', unlockVideos);

        // Initialize controls for a single video element
        function initializeVideoControlsForElement(item) {
            const video = item.querySelector('video');
            if (!video) return;

            const videoId = item.dataset.id;

            // Store initial state
            videoStates.set(videoId, {
                muted: true,
                playing: false,
                volume: 0,
                currentTime: 0
            });

            // Set initial muted state
            video.muted = true;
            video.volume = 0;

            // Get control elements
            const playPauseBtn = item.querySelector('.play-pause-btn');
            const volumeBtn = item.querySelector('.volume-btn');
            const progressContainer = item.querySelector('.progress-container');
            const progressBar = item.querySelector('.progress-bar');
            const currentTimeSpan = item.querySelector('.current-time');
            const durationSpan = item.querySelector('.duration');
            const playOverlay = item.querySelector('.play-overlay');
            const playOverlayBtn = item.querySelector('.play-pause-overlay-btn');

            // Format time function
            const formatTime = (seconds) => {
                const mins = Math.floor(seconds / 60);
                const secs = Math.floor(seconds % 60);
                return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
            };

            // Update duration on load
            video.addEventListener('loadedmetadata', () => {
                if (durationSpan) {
                    durationSpan.textContent = formatTime(video.duration);
                }
            });

            // Update time and progress
            video.addEventListener('timeupdate', () => {
                if (currentTimeSpan) {
                    currentTimeSpan.textContent = formatTime(video.currentTime);
                }
                if (durationSpan && video.duration && (!durationSpan.textContent || durationSpan.textContent === '0:00')) {
                    durationSpan.textContent = formatTime(video.duration);
                }
                if (progressBar && video.duration) {
                    const percent = (video.currentTime / video.duration) * 100;
                    progressBar.style.width = `${percent}%`;
                }

                // Update stored state
                const state = videoStates.get(videoId);
                if (state) {
                    state.currentTime = video.currentTime;
                    videoStates.set(videoId, state);
                }
            });

            // Play/Pause button
            if (playPauseBtn) {
                const icon = playPauseBtn.querySelector('i');
                playPauseBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    togglePlayPause(video, icon, playOverlay, videoId);
                });
            }

            // Play overlay button (large center button)
            if (playOverlayBtn) {
                const overlayIcon = playOverlayBtn.querySelector('i');
                playOverlayBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    togglePlayPause(video, playPauseBtn?.querySelector('i'), playOverlay, videoId);
                    if (overlayIcon) {
                        overlayIcon.classList.remove('fa-play', 'fa-pause');
                        overlayIcon.classList.add(video.paused ? 'fa-play' : 'fa-pause');
                    }
                });
            }

            // Volume button
            if (volumeBtn) {
                const icon = volumeBtn.querySelector('i');
                volumeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    toggleVolume(video, icon, videoId);
                });
            }

            // Progress bar
            if (progressContainer) {
                progressContainer.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (video.duration) {
                        const rect = progressContainer.getBoundingClientRect();
                        const percent = (e.clientX - rect.left) / rect.width;
                        video.currentTime = percent * video.duration;
                    }
                });
            }

            // Show/hide play overlay on video click
            video.addEventListener('click', (e) => {
                e.stopPropagation();
                togglePlayOverlay(playOverlay, video);
            });

            // Update play/pause icon
            video.addEventListener('play', () => {
                const icon = playPauseBtn?.querySelector('i');
                const overlayIcon = playOverlayBtn?.querySelector('i');
                if (icon) {
                    icon.classList.remove('fa-play');
                    icon.classList.add('fa-pause');
                }
                if (overlayIcon) {
                    overlayIcon.classList.remove('fa-play');
                    overlayIcon.classList.add('fa-pause');
                }
                if (playOverlay) {
                    playOverlay.classList.add('opacity-0');
                }

                // Update stored state
                const state = videoStates.get(videoId);
                if (state) {
                    state.playing = true;
                    videoStates.set(videoId, state);
                }
            });

            video.addEventListener('pause', () => {
                const icon = playPauseBtn?.querySelector('i');
                const overlayIcon = playOverlayBtn?.querySelector('i');
                if (icon) {
                    icon.classList.remove('fa-pause');
                    icon.classList.add('fa-play');
                }
                if (overlayIcon) {
                    overlayIcon.classList.remove('fa-pause');
                    overlayIcon.classList.add('fa-play');
                }

                // Update stored state
                const state = videoStates.get(videoId);
                if (state) {
                    state.playing = false;
                    videoStates.set(videoId, state);
                }
            });

            // Update volume icon
            video.addEventListener('volumechange', () => {
                const icon = volumeBtn?.querySelector('i');
                if (icon) {
                    if (video.muted || video.volume === 0) {
                        icon.classList.remove('fa-volume-up');
                        icon.classList.add('fa-volume-mute');
                    } else {
                        icon.classList.remove('fa-volume-mute');
                        icon.classList.add('fa-volume-up');
                    }
                }

                // Update stored state
                const state = videoStates.get(videoId);
                if (state) {
                    state.muted = video.muted;
                    state.volume = video.volume;
                    videoStates.set(videoId, state);
                }
            });

            // Handle video end
            video.addEventListener('ended', () => {
                const icon = playPauseBtn?.querySelector('i');
                const overlayIcon = playOverlayBtn?.querySelector('i');
                if (icon) {
                    icon.classList.remove('fa-pause');
                    icon.classList.add('fa-play');
                }
                if (overlayIcon) {
                    overlayIcon.classList.remove('fa-pause');
                    overlayIcon.classList.add('fa-play');
                }
                if (playOverlay) {
                    playOverlay.classList.remove('opacity-0');
                }

                // Update stored state
                const state = videoStates.get(videoId);
                if (state) {
                    state.playing = false;
                    videoStates.set(videoId, state);
                }
            });

            // Initial icon setup
            const volumeIcon = volumeBtn?.querySelector('i');
            if (volumeIcon && video.muted) {
                volumeIcon.classList.add('fa-volume-mute');
                volumeIcon.classList.remove('fa-volume-up');
            }

            const playIcon = playPauseBtn?.querySelector('i');
            if (playIcon && video.paused) {
                playIcon.classList.add('fa-play');
                playIcon.classList.remove('fa-pause');
            } else if (playIcon && !video.paused) {
                playIcon.classList.add('fa-pause');
                playIcon.classList.remove('fa-play');
            }

            const overlayIcon = playOverlayBtn?.querySelector('i');
            if (overlayIcon && video.paused) {
                overlayIcon.classList.add('fa-play');
                overlayIcon.classList.remove('fa-pause');
            } else if (overlayIcon && !video.paused) {
                overlayIcon.classList.add('fa-pause');
                overlayIcon.classList.remove('fa-play');
            }
        }

        // Initialize controls for all videos
        function initializeVideoControls() {
            document.querySelectorAll('.video-barkadahub-item').forEach(item => {
                initializeVideoControlsForElement(item);
            });
        }

        // Helper functions
        function togglePlayPause(video, icon, playOverlay, videoId) {
            if (video.paused) {
                video.play().catch(err => console.log('Play failed:', err));
                if (icon) {
                    icon.classList.remove('fa-play');
                    icon.classList.add('fa-pause');
                }
                if (playOverlay) {
                    playOverlay.classList.add('opacity-0');
                }

                // Update stored state
                const state = videoStates.get(videoId);
                if (state) {
                    state.playing = true;
                    videoStates.set(videoId, state);
                }
            } else {
                video.pause();
                if (icon) {
                    icon.classList.remove('fa-pause');
                    icon.classList.add('fa-play');
                }
                if (playOverlay) {
                    playOverlay.classList.remove('opacity-0');
                }

                // Update stored state
                const state = videoStates.get(videoId);
                if (state) {
                    state.playing = false;
                    videoStates.set(videoId, state);
                }
            }
        }

        function toggleVolume(video, icon, videoId) {
            if (video.muted || video.volume === 0) {
                video.muted = false;
                video.volume = 0.5;
                if (icon) {
                    icon.classList.remove('fa-volume-mute');
                    icon.classList.add('fa-volume-up');
                }
            } else {
                video.muted = true;
                video.volume = 0;
                if (icon) {
                    icon.classList.remove('fa-volume-up');
                    icon.classList.add('fa-volume-mute');
                }
            }

            // Update stored state
            const state = videoStates.get(videoId);
            if (state) {
                state.muted = video.muted;
                state.volume = video.volume;
                videoStates.set(videoId, state);
            }
        }

        function togglePlayOverlay(playOverlay, video) {
            if (!playOverlay) return;

            if (video.paused) {
                playOverlay.classList.remove('opacity-0');
            } else {
                playOverlay.classList.add('opacity-0');
                // Show briefly then hide
                setTimeout(() => {
                    if (!video.paused) {
                        playOverlay.classList.add('opacity-0');
                    }
                }, 1000);
            }
        }

        // Click anywhere on video to play/pause (excluding controls)
        document.addEventListener('click', (e) => {
            // Don't trigger if clicking controls
            if (e.target.closest('.play-pause-btn, .volume-btn, .progress-container, ' +
                '.play-pause-overlay-btn, .likeBtn, .openEllipsisMenuBtn, .followBtn, button, .action-icon')) {
                return;
            }

            const videoItem = e.target.closest('.video-barkadahub-item');
            if (!videoItem) return;

            const video = videoItem.querySelector('video');
            const playPauseIcon = videoItem.querySelector('.play-pause-btn i');
            const playOverlay = videoItem.querySelector('.play-overlay');
            const playOverlayIcon = videoItem.querySelector('.play-pause-overlay-btn i');
            const videoId = videoItem.dataset.id;

            if (video) {
                if (video.paused) {
                    video.play().catch(err => console.log('Play failed:', err));
                    if (playPauseIcon) {
                        playPauseIcon.classList.remove('fa-play');
                        playPauseIcon.classList.add('fa-pause');
                    }
                    if (playOverlayIcon) {
                        playOverlayIcon.classList.remove('fa-play');
                        playOverlayIcon.classList.add('fa-pause');
                    }
                    if (playOverlay) {
                        playOverlay.classList.add('opacity-0');
                    }

                    // Update stored state
                    const state = videoStates.get(videoId);
                    if (state) {
                        state.playing = true;
                        videoStates.set(videoId, state);
                    }
                } else {
                    video.pause();
                    if (playPauseIcon) {
                        playPauseIcon.classList.remove('fa-pause');
                        playPauseIcon.classList.add('fa-play');
                    }
                    if (playOverlayIcon) {
                        playOverlayIcon.classList.remove('fa-pause');
                        playOverlayIcon.classList.add('fa-play');
                    }
                    if (playOverlay) {
                        playOverlay.classList.remove('opacity-0');
                    }

                    // Update stored state
                    const state = videoStates.get(videoId);
                    if (state) {
                        state.playing = false;
                        videoStates.set(videoId, state);
                    }
                }
            }
        });

        // AUTOPLAY ON SCROLL with mute management
        function initAutoPlayOnSnap() {
            const observer = new IntersectionObserver(entries => {
                entries.forEach(entry => {
                    const videoItem = entry.target;
                    const video = videoItem.querySelector('video');
                    if (!video) return;

                    const videoId = videoItem.dataset.id;
                    const state = videoStates.get(videoId);

                    if (entry.isIntersecting && window.userInteracted) {
                        // Play video and restore previous volume state
                        if (state && !state.muted) {
                            video.muted = false;
                            video.volume = state.volume || 0.5;
                        } else {
                            video.muted = true;
                            video.volume = 0;
                        }

                        video.play().catch(err => console.log('Autoplay failed:', err));
                    } else {
                        // Pause and mute when not visible
                        video.pause();
                        video.muted = true;
                        video.volume = 0;

                        // Save current state before muting
                        const currentState = videoStates.get(videoId);
                        if (currentState) {
                            currentState.playing = false;
                            videoStates.set(videoId, currentState);
                        }
                    }
                });
            }, {
                threshold: 0.8,
                rootMargin: '0px 0px -10% 0px' // Adjust this to control when videos become "visible"
            });

            document.querySelectorAll('.video-barkadahub-item')
                .forEach(item => observer.observe(item));
        }

        function playVisibleVideo() {
            document.querySelectorAll('.video-barkadahub-item').forEach(item => {
                const rect = item.getBoundingClientRect();
                const video = item.querySelector('video');
                if (!video) return;

                const videoId = item.dataset.id;
                const state = videoStates.get(videoId);

                // Check if video is mostly in viewport
                const isVisible = (
                    rect.top >= -rect.height * 0.3 &&
                    rect.top <= window.innerHeight * 0.7
                );

                if (isVisible && window.userInteracted) {
                    if (state && !state.muted) {
                        video.muted = false;
                        video.volume = state.volume || 0.5;
                    } else {
                        video.muted = true;
                        video.volume = 0;
                    }

                    video.play().catch(err => console.log('Play visible failed:', err));
                } else {
                    video.pause();
                    video.muted = true;
                    video.volume = 0;

                    // Save state
                    const currentState = videoStates.get(videoId);
                    if (currentState) {
                        currentState.playing = false;
                        videoStates.set(videoId, currentState);
                    }
                }
            });
        }

        // Initialize controls after videos are loaded
        setTimeout(initializeVideoControls, 100);

        return { initAutoPlayOnSnap, playVisibleVideo, videoStates, initializeVideoControlsForElement };
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
            // Handle null avatar URL
            const avatarUrl = video.avatar_url || '../images/image.png';
            return createVideoItem(
                video.video_url,
                avatarUrl,
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
        // Store globally so addNewVideo can access it
        window.videoPlayback = videoPlayback;
        videoPlayback.initAutoPlayOnSnap();

        // Add CSS for the controls
        const style = document.createElement('style');
        style.textContent = `
        /* Make sure control buttons are clickable */
        .play-pause-btn,
        .volume-btn {
            background: transparent !important;
            border: none !important;
            cursor: pointer !important;
            z-index: 100 !important;
            position: relative !important;
        }
        
        .play-overlay {
            transition: opacity 0.2s ease;
            pointer-events: none;
        }
        
        .play-overlay:not(.opacity-0) {
            pointer-events: auto;
        }
        
        .play-pause-overlay-btn {
            transition: transform 0.2s ease, background-color 0.2s ease;
        }
        
        .play-pause-overlay-btn:hover {
            transform: scale(1.1);
            background-color: rgba(0, 0, 0, 0.7);
        }
        
        .progress-container:hover .progress-bar {
            background-color: #3b82f6;
        }
        
        /* Ensure video controls don't interfere with other elements */
        video {
            pointer-events: none;
        }
        
        /* Make the video container clickable for play/pause */
        .video-barkadahub-item > div:first-child {
            cursor: pointer;
        }
        
        /* Controls container styling */
        .video-barkadahub-item > div:first-child > div:last-child {
            opacity: 1 !important;
            pointer-events: auto !important;
        }
    `;
        document.head.appendChild(style);

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

    // Realtime for new videos
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