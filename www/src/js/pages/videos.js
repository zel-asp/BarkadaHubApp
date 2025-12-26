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

document.addEventListener('DOMContentLoaded', () => {
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

    /* ------------------------------------------------------
        MODAL LOGIC (UNCHANGED)
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
        VIDEO SELECTION (UNCHANGED)
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
        UPLOAD VIDEO (UNCHANGED)
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
        DELETE VIDEO (NEW, SAFE)
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
        ELLIPSIS MENU (PATCHED)
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
            ellipsisModal.classList.remove('hidden');
        });

        deletePostBtn?.addEventListener('click', () => {
            ellipsisModal.classList.add('hidden');
            deleteConfirmModal.classList.remove('hidden');
        });

        confirmDeleteBtn?.addEventListener('click', async () => {
            if (!selectedPostId) return;

            await deleteVideo(selectedPostId);
            alertSystem.show('Deleted', 'success');

            document
                .querySelector(`.video-barkadahub-item[data-id="${selectedPostId}"]`)
                ?.parentElement?.remove();

            deleteConfirmModal.classList.add('hidden');
            selectedPostId = null;
        });


        cancelDeleteBtn?.addEventListener('click', () => {
            deleteConfirmModal.classList.add('hidden');
            selectedPostId = null;
        });
        closeEllipsisMenu?.addEventListener('click', () => {
            ellipsisModal.classList.add('hidden');
            selectedPostId = null;
        });
    }

    /* ------------------------------------------------------
        VIDEO PLAY / PAUSE (FIXED, NOT REMOVED)
    ------------------------------------------------------ */
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
        if (e.target.closest('.likeBtn, .openEllipsisMenuBtn, button, .action-icon')) return;

        const videoItem = e.target.closest('.video-barkadahub-item');
        if (!videoItem) return;

        const video = videoItem.querySelector('video');
        video.paused ? video.play() : video.pause();
    });

    /* ------------------------------------------------------
        AUTOPLAY (UNCHANGED)
    ------------------------------------------------------ */
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

    /* ------------------------------------------------------
        RENDER (UNCHANGED)
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

        videoContainer.innerHTML = videos.map(video => {
            const postOwner = userId === video.auth_id;

            return createVideoItem(
                video.video_url,
                video.avatar_url || '../images/image.png',
                video.auth_name,
                video.caption,
                video.id,
                0,
                postOwner // ✅ correct per-video ownership
            );
        }).join('');

        initAutoPlayOnSnap();
    }


    openEllipsisMenuBtn();
    render();
});
