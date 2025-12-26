import supabaseClient from '../supabase.js';
import AlertSystem from '../render/Alerts.js';
import { createVideoItem, createEmptyVideoState } from '../render/videos.js';

/* ------------------------------------------------------
    UTILITY: START POST LOADING
------------------------------------------------------ */
/**
 * Temporarily disables the post button and shows a loading spinner.
 * Returns a restore function to reset the button state.
 */
function startPostLoading() {
    const postBtn = document.getElementById('postVideoBtn');
    if (!postBtn) return () => { };

    const originalHTML = postBtn.innerHTML;

    postBtn.innerHTML = `
        <div class="flex items-center justify-center">
            <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
            Uploading...
        </div>
    `;
    postBtn.disabled = true;

    return () => {
        postBtn.innerHTML = originalHTML || '<i class="fas fa-paper-plane"></i> Post Video';
        postBtn.disabled = false;
    };
}

document.addEventListener('DOMContentLoaded', () => {
    const alertSystem = new AlertSystem();

    /* ------------------------------------------------------
        COMMENT MODAL LOGIC
    ------------------------------------------------------ */
    const commentModal = document.getElementById('commentModal');
    const commentSection = document.getElementById('commentSection');
    const commentInput = document.getElementById('commentInput');
    const sendCommentBtn = document.getElementById('sendCommentBtn');

    const openCommentModal = () => {
        commentModal.classList.remove('hidden');
        commentSection.classList.add('comment-section-enter');
    };

    const closeCommentModal = () => {
        commentSection.classList.replace('comment-section-enter', 'comment-section-exit');
        setTimeout(() => {
            commentModal.classList.add('hidden');
            commentSection.classList.remove('comment-section-exit');
        }, 300);
    };

    // Delegate comment modal open on video container click
    document.getElementById('videoContainer').addEventListener('click', e => {
        if (e.target.closest('.openCommentBtn')) openCommentModal();
    });

    document.querySelectorAll('.closeCommentBtn').forEach(btn => btn.addEventListener('click', closeCommentModal));

    // Send comment
    const sendComment = () => {
        if (!commentInput.value.trim()) return;
        alert('In a real app, this would post your comment.');
        commentInput.value = '';
    };

    sendCommentBtn?.addEventListener('click', sendComment);
    commentInput?.addEventListener('keypress', e => e.key === 'Enter' && sendComment());

    // Comment like and reply handling (delegated)
    commentSection?.addEventListener('click', e => {
        const likeBtn = e.target.closest('.comment-like-btn');
        if (likeBtn) {
            const icon = likeBtn.querySelector('i');
            const countSpan = likeBtn.querySelector('span');
            let count = parseInt(countSpan.textContent);

            if (icon.classList.contains('fas')) {
                icon.classList.replace('fas', 'far');
                icon.classList.replace('text-red-400', 'text-gray-400');
                countSpan.textContent = Math.max(0, count - 1);
            } else {
                icon.classList.replace('far', 'fas');
                icon.classList.replace('text-gray-400', 'text-red-400');
                likeBtn.classList.add('like-comment-animation');
                setTimeout(() => likeBtn.classList.remove('like-comment-animation'), 400);
                countSpan.textContent = count + 1;
            }
        }

        if (e.target.closest('.reply-btn')) {
            alert('In a real app, this would allow replying.');
        }
    });

    /* ------------------------------------------------------
        VIDEO MODAL LOGIC
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

    // Reset video modal to initial state
    const resetVideoModal = () => {
        videoFileInput.value = '';
        videoPreviewPlayer.src = '';
        videoPreview.classList.add('hidden');
        videoCaption.value = '';
        charCount.textContent = '0/150';
        postVideoBtn.disabled = true;
        selectVideoBtn.disabled = false;
        selectVideoBtn.classList.remove('cursor-not-allowed', 'bg-gray-400');
    };

    const openVideoModal = () => {
        createModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    };

    const closeVideoModal = () => {
        createModal.classList.add('hidden');
        document.body.style.overflow = '';
        resetVideoModal();
    };

    // Event listeners for modal open/close
    openCreateBtn?.addEventListener('click', openVideoModal);
    closeModalBtn?.addEventListener('click', closeVideoModal);
    cancelBtn?.addEventListener('click', closeVideoModal);
    createModal?.addEventListener('click', e => e.target === createModal && closeVideoModal());

    // Video file selection
    selectVideoBtn?.addEventListener('click', () => videoFileInput.click());
    videoFileInput?.addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;

        // Disable select button while previewing
        selectVideoBtn.disabled = true;
        selectVideoBtn.classList.add('cursor-not-allowed', 'bg-gray-400');

        videoPreviewPlayer.src = URL.createObjectURL(file);
        videoPreview.classList.remove('hidden');
        postVideoBtn.disabled = false;
    });

    removeVideoBtn?.addEventListener('click', resetVideoModal);

    // Enable post button only if file or caption exists
    videoCaption?.addEventListener('input', () => {
        const len = videoCaption.value.length;
        charCount.textContent = `${len}/150`;
        postVideoBtn.disabled = !(len > 0 || videoFileInput.files.length > 0);
    });

    /* ------------------------------------------------------
        UPLOAD VIDEO FORM LOGIC
    ------------------------------------------------------ */
    /* ------------------------------------------------------
        UPLOAD VIDEO FORM LOGIC (FIXED)
    ------------------------------------------------------ */
    createVideoForm?.addEventListener('submit', async e => {
        e.preventDefault();

        const file = videoFileInput.files[0];
        const caption = videoCaption.value.trim();

        if (!file && !caption) {
            alertSystem.show('Please choose a video or enter a caption', 'error');
            return;
        }

        const { data: userData, error: userError } = await supabaseClient.auth.getUser();
        if (userError || !userData?.user) {
            alertSystem.show('User not authenticated', 'error');
            return;
        }

        const userId = userData.user.id;
        const userName = userData.user.user_metadata?.display_name || 'Anonymous';

        const restoreBtn = startPostLoading();

        try {
            let videoUrl = null;
            let filePath = null;

            if (file) {
                const ext = file.name.split('.').pop();
                const fileName = `${crypto.randomUUID()}.${ext}`;
                filePath = `${userId}/${fileName}`;

                /* Upload video */
                const { error: uploadError } = await supabaseClient.storage
                    .from('videos')
                    .upload(filePath, file, {
                        cacheControl: '3600',
                        upsert: false
                    });

                if (uploadError) throw uploadError;

                /* Get PUBLIC URL (never expires) */
                const { data } = supabaseClient.storage
                    .from('videos')
                    .getPublicUrl(filePath);

                videoUrl = data.publicUrl;
            }

            /* Insert DB record */
            const { error: insertError } = await supabaseClient
                .from('videos')
                .insert([{
                    video_url: videoUrl,
                    file_path: filePath,
                    caption,
                    auth_name: userName,
                    auth_id: userId
                }]);

            if (insertError) throw insertError;

            alertSystem.show('Video uploaded successfully!', 'success');
            resetVideoModal();
            render();

        } catch (err) {
            console.error(err);
            alertSystem.show(`Error: ${err.message}`, 'error');
        } finally {
            restoreBtn();
        }
    });


    /* ------------------------------------------------------
        VIDEO RENDERING LOGIC
    ------------------------------------------------------ */
    async function render() {
        const videoContainer = document.getElementById('videoContainer');

        try {
            const { data, error } = await supabaseClient
                .from('videos')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(10);

            if (error) {
                alertSystem.show(`Error: ${error.message}`, 'error');
                return;
            }

            if (!data || data.length === 0) {
                videoContainer.innerHTML = createEmptyVideoState();

                // Attach click listener to dynamic empty state button
                const emptyStateCreateBtn = document.getElementById('emptyStateCreateBtn');
                emptyStateCreateBtn?.addEventListener('click', openVideoModal);
                return;
            }

            // Render videos
            videoContainer.innerHTML = data.map(video =>
                createVideoItem(
                    video.video_url,
                    video.avatar_url || '../images/image.png',
                    video.auth_name,
                    video.id,
                    video.caption,
                    video.id
                )
            ).join('');

            initAutoPlayOnSnap();
        } catch (err) {
            console.error(err);
            alertSystem.show(`Error: ${err.message}`, 'error');
        }
    }
    render();

    /* ------------------------------------------------------
        VIDEO PLAY/PAUSE ON CLICK
    ------------------------------------------------------ */
    document.addEventListener('click', e => {
        if (e.target.closest('.action-icon') || e.target.closest('button')) return;

        const videoItem = e.target.closest('.video-barkadahub-item');
        if (!videoItem) return;

        const video = videoItem.querySelector('video');
        video.paused ? video.play() : video.pause();
    });

    let userInteracted = false;

    const unlockVideos = () => {
        if (userInteracted) return;
        userInteracted = true;
        playVisibleVideo();
        document.removeEventListener('click', unlockVideos);
        document.removeEventListener('touchstart', unlockVideos);
    };

    document.addEventListener('click', unlockVideos);
    document.addEventListener('touchstart', unlockVideos);

    /* ------------------------------------------------------
        AUTOPLAY VISIBLE VIDEOS
    ------------------------------------------------------ */
    function initAutoPlayOnSnap() {
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                const video = entry.target.querySelector('video');
                if (!video) return;
                if (entry.isIntersecting && userInteracted) video.play().catch(() => console.log('Playback blocked'));
                else video.pause();
            });
        }, { threshold: 0.8 });

        document.querySelectorAll('.video-barkadahub-item').forEach(item => observer.observe(item));
    }

    function playVisibleVideo() {
        document.querySelectorAll('.video-barkadahub-item').forEach(item => {
            const rect = item.getBoundingClientRect();
            const video = item.querySelector('video');
            if (!video) return;
            if (rect.top >= 0 && rect.top < window.innerHeight / 2) video.play().catch(() => console.log('Playback blocked'));
            else video.pause();
        });
    }

    /* ------------------------------------------------------
        ELLIPSIS MENU LOGIC
    ------------------------------------------------------ */
    function initEllipsisButtons() {
        const ellipsisButtons = document.querySelectorAll('.ellipsis-btn');
        const ellipsisMenuModal = document.getElementById('ellipsisMenuModal');
        const app = document.getElementById('app');
        const closeBtn = document.getElementById('closeEllipsisMenu');
        const deletePostBtn = document.getElementById('deletePostBtn');
        const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');

        ellipsisButtons.forEach(btn => {
            if (!btn.dataset.bound) {
                btn.dataset.bound = "true";
                btn.addEventListener('click', () => {
                    ellipsisMenuModal.classList.remove('hidden');
                    app.classList.add('opacity-50');
                    document.body.classList.add('overflow-hidden');
                });
            }
        });

        closeBtn.onclick = hideEllipsisMenu;
        deletePostBtn.onclick = showDeleteConfirmation;
        cancelDeleteBtn.onclick = hideDeleteConfirmation;
    }

    function hideEllipsisMenu() {
        document.getElementById('ellipsisMenuModal').classList.add('hidden');
        document.getElementById('app').classList.remove('opacity-50');
        document.body.classList.remove('overflow-hidden');
    }

    function showDeleteConfirmation() {
        const modal = document.getElementById('deleteConfirmationModal');
        modal.classList.remove('hidden');
        setTimeout(() => modal.querySelector('.delete-card').classList.add('scale-100'));
    }

    function hideDeleteConfirmation() {
        const modal = document.getElementById('deleteConfirmationModal');
        modal.querySelector('.delete-card').classList.remove('scale-100');
        setTimeout(() => modal.classList.add('hidden'), 150);
    }
});
