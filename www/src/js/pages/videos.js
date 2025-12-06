// videos-page.js (optimized)
// Keep original imports
import supabaseClient from '../supabase.js';
import { lost_found } from '../render/post.js';
import AlertSystem from '../render/Alerts.js';
import { createVideoItem, createEmptyVideoState } from '../render/videos.js';

const alertSystem = new AlertSystem();

/**
 * GLOBALS / CACHED STATE
 * - caches DOM nodes & frequently used values to reduce repeated queries
 * - caches current user once retrieved
 */
const state = {
    currentUser: null,            // cached Supabase user object
    videoObserver: null,          // IntersectionObserver for autoplay
    container: null,              // video list container node
    ellipsisBound: false          // avoid rebinding ellipsis handlers repeatedly
};

/* -------------------------------
   DOM ELEMENTS (cached once)
   ------------------------------- */
const DOM = {
    // Comment modal
    commentModal: () => document.getElementById('commentModal'),
    commentSection: () => document.getElementById('commentSection'),
    openCommentBtns: () => document.querySelectorAll('[id^="openCommentBtn"]'),
    closeCommentBtn: () => document.getElementById('closeCommentBtn'),
    commentInput: () => document.getElementById('commentInput'),
    sendCommentBtn: () => document.getElementById('sendCommentBtn'),

    // Create video modal
    createModal: () => document.getElementById('createVideoModal'),
    openCreateBtn: () => document.getElementById('openCreateVideoBtn'),
    closeModalBtn: () => document.getElementById('closeCreateModalBtn'),
    cancelBtn: () => document.getElementById('cancelCreateBtn'),
    videoFileInput: () => document.getElementById('videoFile'),
    selectVideoBtn: () => document.getElementById('selectVideoBtn'),
    videoPreview: () => document.getElementById('videoPreview'),
    videoPreviewPlayer: () => document.getElementById('videoPreviewPlayer'),
    removeVideoBtn: () => document.getElementById('removeVideoBtn'),
    videoCaption: () => document.getElementById('videoCaption'),
    charCount: () => document.getElementById('charCount'),
    postVideoBtn: () => document.getElementById('postVideoBtn'),
    createVideoForm: () => document.getElementById('createVideoForm'),

    // Ellipsis menu & delete modals
    ellipsisMenuModal: () => document.getElementById('ellipsisMenuModal'),
    appRoot: () => document.getElementById('app'),
    closeEllipsisMenu: () => document.getElementById('closeEllipsisMenu'),
    deletePostBtn: () => document.getElementById('deletePostBtn'),
    cancelDeleteBtn: () => document.getElementById('cancelDeleteBtn'),

    // Video container
    videoContainer: () => document.querySelector('.video-barkadahub-container')
};

/* -------------------------------
   HELPERS
   ------------------------------- */

/**
 * getCurrentUser
 * - caches user so repeated calls don't hit Supabase every time
 * - returns null when not logged in
 */
async function getCurrentUser(forceRefresh = false) {
    if (state.currentUser && !forceRefresh) return state.currentUser;
    try {
        const { data, error } = await supabaseClient.auth.getUser();
        if (error || !data?.user) {
            state.currentUser = null;
            return null;
        }
        state.currentUser = data.user;
        return state.currentUser;
    } catch (err) {
        console.error('getCurrentUser error:', err);
        state.currentUser = null;
        return null;
    }
}

/**
 * safeQueryUserProfile
 * Attempts multiple strategies to get a display name & username for a given userId:
 *  1) Query a 'profile' table (common pattern) for metadata
 *  2) Use admin auth lookup (may require privileges)
 *  3) Fallback to anonymized id-based display name
 */
async function safeQueryUserProfile(userId) {
    if (!userId) return { displayName: 'User', username: 'user' };

    // 1) Try profile table
    try {
        const { data: profile, error: profileError } = await supabaseClient
            .from('profile')
            .select('display_name, username')
            .eq('user_id', userId)
            .single();

        if (!profileError && profile) {
            return {
                displayName: profile.display_name || `User ${userId.substring(0, 8)}`,
                username: profile.username || `user_${userId.substring(0, 8)}`
            };
        }
    } catch (err) {
        // swallow and continue to next strategy
        console.warn('Profile lookup failed:', err);
    }

    // 2) Try auth admin lookup (may fail if not allowed)
    try {
        if (supabaseClient.auth?.admin?.getUserById) {
            const { data: { user }, error: adminErr } = await supabaseClient.auth.admin.getUserById(userId);
            if (!adminErr && user) {
                return {
                    displayName: user.user_metadata?.display_name || `User ${userId.substring(0, 8)}`,
                    username: user.user_metadata?.username || user.email?.split('@')[0] || `user_${userId.substring(0, 8)}`
                };
            }
        }
    } catch (err) {
        console.warn('Auth admin lookup failed:', err);
    }

    // 3) Fallback
    const short = userId.substring(0, 8);
    return {
        displayName: `User ${short}`,
        username: `user_${short}`
    };
}

/**
 * createObserver
 * - creates a single IntersectionObserver configured for autoplay
 * - stored in state.videoObserver so it can be reused
 */
function createObserver() {
    if (state.videoObserver) return state.videoObserver;

    state.videoObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            const video = entry.target.querySelector('video');
            if (!video) return;
            if (entry.isIntersecting) {
                video.play().catch(e => {
                    // common: autoplay prevented by browser; ignore
                    console.debug('Autoplay prevented', e);
                });
            } else {
                video.pause();
            }
        });
    }, { threshold: 0.8 });

    return state.videoObserver;
}

/* -------------------------------
   UI: Comment modal & interactions
   ------------------------------- */

/** Open comment modal with animation classes */
function openCommentModal() {
    const modal = DOM.commentModal();
    const section = DOM.commentSection();
    if (!modal || !section) return;
    modal.classList.remove('hidden');
    section.classList.add('comment-section-enter');
}

/** Close comment modal with exit animation */
function closeCommentModal() {
    const modal = DOM.commentModal();
    const section = DOM.commentSection();
    if (!modal || !section) return;
    section.classList.remove('comment-section-enter');
    section.classList.add('comment-section-exit');
    setTimeout(() => {
        modal.classList.add('hidden');
        section.classList.remove('comment-section-exit');
    }, 300);
}

/** Handle comment send (mock in this app) */
function handleSendComment() {
    const input = DOM.commentInput();
    if (!input) return;
    if (!input.value.trim()) return;
    alert('In a real app, this would post your comment.');
    input.value = '';
}

/* -------------------------------
   UI: Create Video Modal & Upload Flow
   ------------------------------- */

/** Reset the create video modal inputs & buttons */
function resetVideoModal() {
    const videoFileInput = DOM.videoFileInput();
    const previewPlayer = DOM.videoPreviewPlayer();
    const preview = DOM.videoPreview();
    const caption = DOM.videoCaption();
    const charCount = DOM.charCount();
    const postBtn = DOM.postVideoBtn();

    if (videoFileInput) videoFileInput.value = '';
    if (previewPlayer) previewPlayer.src = '';
    if (preview) preview.classList.add('hidden');
    if (caption) caption.value = '';
    if (charCount) charCount.textContent = '0/150';
    if (postBtn) {
        postBtn.disabled = true;
        postBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Post Video';
    }
}

/** Open the video modal only if user is logged in (redirects to login if not) */
async function openVideoModal() {
    const user = await getCurrentUser();
    if (!user) {
        alertSystem.show('Please login to upload videos', 'error');
        setTimeout(() => (window.location.href = '../../index.html'), 1500);
        return;
    }
    const modal = DOM.createModal();
    if (!modal) return;
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

/** Close the video modal and reset fields */
function closeVideoModal() {
    const modal = DOM.createModal();
    if (!modal) return;
    modal.classList.add('hidden');
    document.body.style.overflow = '';
    resetVideoModal();
}

/** Utility to set post button into "loading" state and return a restore function */
function startPostLoading() {
    const postBtn = DOM.postVideoBtn();
    if (!postBtn) return () => { };
    const originalHTML = postBtn.innerHTML;
    postBtn.innerHTML = `
    <div class="flex items-center justify-center">
      <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
      Uploading...
    </div>
  `;
    postBtn.disabled = true;

    // return restore function
    return () => {
        postBtn.innerHTML = originalHTML || '<i class="fas fa-paper-plane"></i> Post Video';
        postBtn.disabled = false;
    };
}

/**
 * uploadFileToStorage
 * - uploads a File to Supabase storage under 'videos' bucket
 * - returns the publicUrl on success
 */
async function uploadFileToStorage(userId, file) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    // upload
    const { error: uploadError } = await supabaseClient.storage
        .from('videos')
        .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type
        });

    if (uploadError) throw uploadError;

    // get public url
    // supabase v2 returns { data: { publicUrl } }
    const { data } = supabaseClient.storage.from('videos').getPublicUrl(filePath);
    const publicUrl = data?.publicUrl;
    if (!publicUrl) throw new Error('Could not get public URL for uploaded video.');
    return publicUrl;
}

/** Submit handler for video upload form */
async function handleCreateVideoSubmit(e) {
    e.preventDefault();

    const captionEl = DOM.videoCaption();
    const fileInput = DOM.videoFileInput();

    const caption = captionEl?.value?.trim() || '';
    const file = fileInput?.files?.[0];

    if (!caption) {
        alertSystem.show('Please add a caption', 'error');
        return;
    }
    if (!file) {
        alertSystem.show('Please select a video', 'error');
        return;
    }

    const restoreButton = startPostLoading();

    try {
        // 1. ensure user
        const user = await getCurrentUser(true);
        if (!user) throw new Error('Please login to upload videos');

        // 2. upload to storage
        const publicUrl = await uploadFileToStorage(user.id, file);

        // 3. insert into DB
        const { error: dbError } = await supabaseClient
            .from('videos')
            .insert([{
                user_id: user.id,
                video_url: publicUrl,
                caption: caption
            }]);

        if (dbError) throw dbError;

        alertSystem.show('Video uploaded successfully!', 'success');

        // refresh UI: quick and safe approach is to reload the list of videos
        // rather than a full window.reload (keeps user on same page)
        await loadVideosFromDatabase();

        // close modal & reset
        closeVideoModal();
    } catch (err) {
        console.error('Upload failed:', err);
        alertSystem.show(err.message || 'Failed to upload video. Please try again.', 'error');
    } finally {
        restoreButton();
    }
}

/* -------------------------------
   VIDEO LIST: Loading & Rendering
   ------------------------------- */

/**
 * renderVideos
 * - clears container and appends each video element using createVideoItem()
 * - tries to fetch displayName/username for each video's owner
 */
async function renderVideos(videos) {
    const container = DOM.videoContainer();
    if (!container) return;

    container.innerHTML = ''; // clear

    const currentUser = await getCurrentUser().catch(() => null);
    const currentUserId = currentUser?.id;

    const observer = createObserver();

    for (const video of videos) {
        const item = document.createElement('div');
        item.className = 'video-barkadahub-item';
        item.dataset.videoId = video.id;

        // determine display name & username
        let displayName = 'User';
        let username = 'user';

        try {
            if (currentUserId && video.user_id === currentUserId) {
                // use cached user metadata for current user
                displayName = currentUser.user_metadata?.display_name || 'User';
                username = currentUser.user_metadata?.username || currentUser.email?.split('@')[0] || 'user';
            } else {
                const profile = await safeQueryUserProfile(video.user_id);
                displayName = profile.displayName;
                username = profile.username;
            }
        } catch (err) {
            console.warn('Profile fallback used for video', video.id, err);
            const short = (video.user_id || 'anonymous').substring(0, 8);
            displayName = `User ${short}`;
            username = `user_${short}`;
        }

        // generate HTML for the video item using your provided helper
        item.innerHTML = createVideoItem(video, displayName, username);
        container.appendChild(item);

        // observe the item for autoplay
        observer.observe(item);
    }

    // after render: re-bind ellipsis buttons
    initEllipsisButtons();
}

/**
 * loadVideosFromDatabase
 * - fetch videos and render them
 * - shows empty state if none
 */
async function loadVideosFromDatabase() {
    try {
        const { data: videos, error } = await supabaseClient
            .from('videos')
            .select('id, user_id, video_url, caption, created_at')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching videos:', error);
            alertSystem.show('Error loading videos. Please try again.', 'error');
            return;
        }

        const container = DOM.videoContainer();
        if (!videos || videos.length === 0) {
            if (container) {
                container.innerHTML = createEmptyVideoState();
                // wire the create button inside empty state (if present)
                document.getElementById('emptyStateCreateBtn')?.addEventListener('click', openVideoModal);
            }
            return;
        }

        await renderVideos(videos);
    } catch (err) {
        console.error('Error loading videos:', err);
        alertSystem.show('Failed to load videos', 'error');
    }
}

/* -------------------------------
   ELLIPSIS MENU (delete / more)
   ------------------------------- */

/** Bind ellipsis buttons once for dynamically added videos */
function initEllipsisButtons() {
    // avoid rebinding for existing handlers unless necessary
    if (state.ellipsisBound) return;

    const ellipsisButtons = document.querySelectorAll('.ellipsis-btn');
    const app = DOM.appRoot();
    const ellipsisMenuModal = DOM.ellipsisMenuModal();
    const closeBtn = DOM.closeEllipsisMenu();
    const deleteBtn = DOM.deletePostBtn();
    const cancelDelete = DOM.cancelDeleteBtn();

    ellipsisButtons.forEach(btn => {
        if (btn.dataset.bound) return;
        btn.dataset.bound = 'true';
        btn.addEventListener('click', () => {
            if (ellipsisMenuModal) ellipsisMenuModal.classList.remove('hidden');
            if (app) app.classList.add('opacity-50');
            document.body.classList.add('overflow-hidden');
        });
    });

    if (closeBtn) closeBtn.onclick = hideEllipsisMenu;
    if (deleteBtn) deleteBtn.onclick = showDeleteConfirmation;
    if (cancelDelete) cancelDelete.onclick = hideDeleteConfirmation;

    state.ellipsisBound = true;
}

function hideEllipsisMenu() {
    const ellipsisMenuModal = DOM.ellipsisMenuModal();
    const app = DOM.appRoot();
    if (ellipsisMenuModal) ellipsisMenuModal.classList.add('hidden');
    if (app) app.classList.remove('opacity-50');
    document.body.classList.remove('overflow-hidden');
}

function showDeleteConfirmation() {
    const modal = document.getElementById('deleteConfirmationModal');
    if (!modal) return;
    const card = modal.querySelector('.delete-card');
    modal.classList.remove('hidden');
    setTimeout(() => card?.classList.add('scale-100'), 10);
}

function hideDeleteConfirmation() {
    const modal = document.getElementById('deleteConfirmationModal');
    if (!modal) return;
    const card = modal.querySelector('.delete-card');
    card?.classList.remove('scale-100');
    setTimeout(() => modal.classList.add('hidden'), 150);
}

/* -------------------------------
   Generic Event Delegation (play/pause, comment like/reply)
   ------------------------------- */

/** Global click handler for play/pause and action icons */
function handleGlobalClick(e) {
    // avoid toggling play/pause when clicking action icons or buttons
    if (e.target.closest('.action-icon') || e.target.closest('button')) return;

    const videoItem = e.target.closest('.video-barkadahub-item');
    if (!videoItem) return;

    const video = videoItem.querySelector('video');
    if (!video) return;
    video.paused ? video.play() : video.pause();
}

/** Comment section click handler: likes/reply (delegated) */
function handleCommentSectionClick(e) {
    // Like button logic
    const likeBtn = e.target.closest('.comment-like-btn');
    if (likeBtn) {
        const icon = likeBtn.querySelector('i');
        const countSpan = likeBtn.querySelector('span');
        const count = parseInt(countSpan?.textContent || '0', 10);

        if (icon?.classList.contains('fas')) {
            icon.classList.replace('fas', 'far');
            icon.classList.replace('text-red-400', 'text-gray-400');
            if (countSpan) countSpan.textContent = Math.max(0, count - 1);
        } else {
            icon.classList.replace('far', 'fas');
            icon.classList.replace('text-gray-400', 'text-red-400');
            likeBtn.classList.add('like-comment-animation');
            setTimeout(() => likeBtn.classList.remove('like-comment-animation'), 400);
            if (countSpan) countSpan.textContent = count + 1;
        }
        return;
    }

    // Reply button (mock)
    if (e.target.closest('.reply-btn')) {
        alert('In a real app, this would allow replying.');
    }
}

/* -------------------------------
   UTILITY: check upload button access (non-blocking)
   ------------------------------- */
async function checkUploadPermission() {
    try {
        const user = await getCurrentUser();
        if (!user) {
            console.log('User not logged in - upload button will redirect to login');
            // keep button visible; handled on click
        } else {
            console.log('User logged in:', user.email);
        }
    } catch (err) {
        console.error('Error checking user:', err);
    }
}

/* -------------------------------
   BOOTSTRAP: wire up event listeners on DOMContentLoaded
   ------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
    // Cache container reference
    state.container = DOM.videoContainer();

    // Comment modal listeners
    DOM.openCommentBtns()?.forEach(btn => btn.addEventListener('click', openCommentModal));
    DOM.closeCommentBtn()?.addEventListener('click', closeCommentModal);
    DOM.commentModal()?.addEventListener('click', e => e.target === DOM.commentModal() && closeCommentModal());
    DOM.sendCommentBtn()?.addEventListener('click', handleSendComment);
    DOM.commentSection()?.addEventListener('click', handleCommentSectionClick);
    DOM.commentInput()?.addEventListener('keypress', e => e.key === 'Enter' && handleSendComment());

    // Video modal listeners
    DOM.openCreateBtn()?.addEventListener('click', openVideoModal);
    DOM.closeModalBtn()?.addEventListener('click', closeVideoModal);
    DOM.cancelBtn()?.addEventListener('click', closeVideoModal);
    DOM.createModal()?.addEventListener('click', e => e.target === DOM.createModal() && closeVideoModal());

    // File selection & preview
    DOM.selectVideoBtn()?.addEventListener('click', () => DOM.videoFileInput()?.click());
    DOM.videoFileInput()?.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const previewPlayer = DOM.videoPreviewPlayer();
        const preview = DOM.videoPreview();
        if (previewPlayer) previewPlayer.src = URL.createObjectURL(file);
        if (preview) preview.classList.remove('hidden');
        const postBtn = DOM.postVideoBtn();
        if (postBtn) postBtn.disabled = false;
    });
    DOM.removeVideoBtn()?.addEventListener('click', resetVideoModal);

    // Caption char count
    DOM.videoCaption()?.addEventListener('input', () => {
        const caption = DOM.videoCaption();
        const len = caption?.value?.length || 0;
        DOM.charCount().textContent = `${len}/150`;
        const postBtn = DOM.postVideoBtn();
        const fileSelected = DOM.videoFileInput()?.files?.length > 0;
        if (postBtn) postBtn.disabled = !(len > 0 || fileSelected);
    });

    // Form submit
    DOM.createVideoForm()?.addEventListener('submit', handleCreateVideoSubmit);

    // Global click handlers
    document.addEventListener('click', handleGlobalClick);

    // Initialize a single observer instance
    createObserver();

    // Initialize ellipsis buttons (for placeholder items)
    initEllipsisButtons();

    // Load videos & check upload permission
    loadVideosFromDatabase();
    checkUploadPermission();
});
