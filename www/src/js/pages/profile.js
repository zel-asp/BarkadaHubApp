import supabaseClient from '../supabase.js';
import { alertSystem, formatRelativeTime, initLikeButtons, renderPost } from '../utils/postUtils.js';
import { initCommentsModal, loadComments, initDeleteComment, initCommentRealtime } from '../utils/commentUtils.js';
import { initEllipsisButtons, showDeleteConfirmation, hideDeleteConfirmation, initDeletePermanently } from '../utils/postDeleteUtils.js';
import { displayBio, displayInformation } from '../render/profile.js';
import { likePost, commentPost } from './notification.js';
import { initReactions } from '../utils/reactionUtils.js';


document.addEventListener('DOMContentLoaded', async () => {
    const { data, error } = await supabaseClient.auth.getUser();
    const userId = data?.user?.id;
    const userName = data?.user.user_metadata.display_name || "User";
    const userEmail = data?.user.user_metadata.email || "User";

    if (error) {
        console.log(error);
    }

    // DOM Elements
    const app = document.getElementById('app');
    const logoutBtn = document.getElementById('logoutBtn');
    const logoutModal = document.getElementById('logoutModal');
    const cancelLogout = document.getElementById('cancelLogout');
    const confirmLogout = document.getElementById('confirmLogout');

    const recentPostContainer = document.querySelector('.recentPost');
    const displayedPostIds = new Set();

    const deleteConfirmationModal = document.getElementById('deleteConfirmationModal');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');

    const commentModal = document.getElementById('commentModal');
    const commentsContainer = document.getElementById('comments');
    const commentForm = document.getElementById('commentForm');
    const commentInput = document.getElementById('commentInput');
    const charCounter = document.getElementById('charCounter');
    const sendBtn = document.getElementById('sendBtn');
    const commentBackBtn = document.getElementById('commentBackBtn');

    let currentUserId = null;
    let deleteTargetPostId = null;
    let activeCommentPostId = null;

    /* -----------------------------
    LOGOUT HANDLERS
    ----------------------------- */
    const openModal = () => {
        logoutModal.classList.remove('hidden');
        app.classList.add('opacity-50');
    };

    const closeModal = () => {
        logoutModal.classList.add('hidden');
        app.classList.remove('opacity-50');
    };

    logoutBtn.addEventListener('click', openModal);
    cancelLogout.addEventListener('click', closeModal);
    logoutModal.addEventListener('click', e => { if (e.target === logoutModal) closeModal(); });

    if (confirmLogout) {
        confirmLogout.addEventListener('click', async () => {
            confirmLogout.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i> Logging out...`;
            confirmLogout.disabled = true;

            try {
                const { data: currentUserData, error: userError } = await supabaseClient.auth.getUser();
                if (userError) throw userError;
                if (!currentUserData?.user) throw new Error("No user logged in");

                const currentUserId = currentUserData.user.id;
                const currentUserName = currentUserData.user.user_metadata.display_name || "User";
                const currentUserEmail = currentUserData.user.user_metadata.email || "User";

                const { error: insertError } = await supabaseClient
                    .from('user_activity')
                    .insert({
                        user_id: currentUserId,
                        action: 'logout',
                        description: 'User Logout',
                        ip_address: window.location.hostname,
                        user_agent: navigator.userAgent,
                        user_name: currentUserName,
                        user_email: currentUserEmail
                    });
                if (insertError) throw insertError;

                const { error: signOutError } = await supabaseClient.auth.signOut();
                if (signOutError) throw signOutError;

                setTimeout(() => window.location.replace('../../index.html'), 1000);
            } catch (err) {
                console.error(err);
                alertSystem.show('Logout failed. Please try again.', 'error');
                confirmLogout.innerHTML = 'Yes, Logout';
                confirmLogout.disabled = false;
            }
        });
    }

    /* -----------------------------
    LOAD USER INFO
    ----------------------------- */
    async function loadUserName() {
        const { data, error } = await supabaseClient.auth.getUser();
        if (error || !data?.user) return console.log("User not logged in");

        currentUserId = data.user.id;
        const name = data.user.user_metadata?.display_name || "User";

        const elements = {
            username: document.getElementById("username"),
            name: document.getElementById("name"),
            namepost: document.getElementById("Name_post")
        };

        if (elements.username) elements.username.textContent = name;
        if (elements.name) elements.name.textContent = name;
        if (elements.namepost) elements.namepost.textContent = `${name}'s Posts`;
    }

    async function renderBio() {
        if (!currentUserId) return;

        const { data: profile, error } = await supabaseClient
            .from('profile')
            .select('*')
            .eq('id', currentUserId)
            .maybeSingle();

        if (error) {
            console.error('Profile fetch error:', error);
            return;
        }

        const nullData = "No information available";

        const bioText = profile?.about_me || nullData;
        const name = profile?.name || nullData;
        const email = profile?.email || nullData;
        const major = profile?.major || nullData;
        const year_level = profile?.year_level || nullData;
        const studentId = profile?.student_id || nullData;
        const studentName = profile?.student_name_official || nullData;
        const studentVerified = profile?.student_verified || false;
        const avatarUrl = profile?.avatar_url || '../images/defaultAvatar.jpg';

        const userAvatar = document.getElementById('userAvatar');
        const fullImageModal = document.getElementById('fullImageModal');
        const viewAvatar = document.getElementById('fullImageContent');
        const closeFullImage = document.getElementById('closeFullImage');

        userAvatar.src = avatarUrl;
        viewAvatar.src = avatarUrl;

        window.viewFullImage = (url) => {
            if (!url) return;
            fullImageContent.src = url;
            fullImageModal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        };

        closeFullImage.addEventListener('click', () => {
            fullImageModal.classList.add('hidden');
            fullImageContent.src = '';
            document.body.style.overflow = '';
        });

        document.getElementById('displayBio').innerHTML = displayBio(bioText);
        document.getElementById('location').textContent = profile?.location || '';
        document.getElementById('PersonalInfo').innerHTML =
            displayInformation(name, email, major, year_level, true, studentId, studentVerified, studentName);

        userAvatar.onclick = () => {
            viewAvatar.src = avatarUrl;
            fullImageModal.classList.remove('hidden');
            document.body.classList.add('overflow-hidden');
        };

        closeFullImage.onclick = () => {
            fullImageModal.classList.add('hidden');
            fullImageContent.src = '';
            document.body.classList.remove('overflow-hidden');
        };

        fullImageModal.onclick = (e) => {
            if (e.target === fullImageModal) {
                fullImageModal.classList.add('hidden');
                document.body.classList.remove('overflow-hidden');
            }
        };
    }

    /* -----------------------------
    FETCH POSTS
    ----------------------------- */
    async function getUserPosts() {
        if (!currentUserId) return;

        try {
            const { data: posts, error } = await supabaseClient
                .from('posts')
                .select('*')
                .eq('user_id', currentUserId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            if (!posts || posts.length === 0) {
                recentPostContainer.innerHTML = `<p class="text-gray-400 text-center mt-6">No posts yet.</p>`;
                return;
            }

            for (const post of posts) {
                await renderPost(post, displayedPostIds, recentPostContainer);
            }

            setTimeout(() => {
                initEllipsisButtons(
                    () => showDeleteConfirmation(alertSystem),
                    () => hideDeleteConfirmation()
                );
                initLikeButtons(alertSystem);
            }, 500);

        } catch (err) {
            console.error("Error fetching posts:", err);
            recentPostContainer.innerHTML = `<p class="text-red-500 text-center mt-6">Failed to load posts.</p>`;
        }
    }

    /* -----------------------------
    COMMENTS HANDLING
    ----------------------------- */

    // Comment input handling for contenteditable div
    if (commentInput) {
        commentInput.addEventListener('input', () => {
            const commentText = commentInput.innerText || '';
            const commentLength = commentText.length;

            // Enforce max length
            if (commentLength > 250) {
                commentInput.innerText = commentText.substring(0, 250);
                placeCursorAtEnd(commentInput);
            }

            charCounter.textContent = `${Math.min(commentLength, 250)}/250`;
            if (sendBtn) {
                sendBtn.disabled = commentLength === 0;
            }
        });

        // Prevent Enter from submitting (optional)
        commentInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (sendBtn && !sendBtn.disabled) {
                    commentForm.dispatchEvent(new Event('submit'));
                }
            }
        });
    }

    // Helper function to place cursor at end
    function placeCursorAtEnd(el) {
        el.focus();
        const range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    }

    commentForm.addEventListener('submit', async e => {
        e.preventDefault();

        // Get comment text from contenteditable div
        const comment = commentInput.innerText?.trim() || '';

        if (!comment || !activeCommentPostId) {
            alertSystem.show('Please enter a comment', 'info');
            return;
        }

        if (sendBtn) sendBtn.disabled = true;

        try {
            // Get user name
            const userName = document.getElementById('username')?.textContent || 'User';

            // Get user avatar
            let avatar = '../images/defaultAvatar.jpg';
            const { data: profile } = await supabaseClient
                .from('profile')
                .select('avatar_url')
                .eq('id', currentUserId)
                .maybeSingle();
            if (profile?.avatar_url) avatar = profile.avatar_url;

            const { error } = await supabaseClient
                .from('post_comments')
                .insert([{
                    post_id: activeCommentPostId,
                    user_id: currentUserId,
                    user_name: userName,
                    comment: comment,
                    avatar: avatar,
                    created_at: new Date().toISOString()
                }]);
            if (error) throw error;

            // Create notification for post owner
            await commentPost(activeCommentPostId, currentUserId);

            // Clear input
            commentInput.innerHTML = '';
            charCounter.textContent = '0/250';

            // Reload comments with currentUserId to determine ownership
            await loadComments(activeCommentPostId, currentUserId);

        } catch (err) {
            console.error('Error posting comment:', err);
            alertSystem.show('Failed to post comment', 'error');
        } finally {
            if (sendBtn) sendBtn.disabled = false;
        }
    });

    // Open comments modal
    document.addEventListener('click', async (e) => {
        const button = e.target.closest('.commentBtn');
        if (!button) return;

        const postId = button.dataset.postId?.trim();
        if (!postId) return alertSystem.show('No postId found!', 'error');

        activeCommentPostId = postId;
        // Pass currentUserId to loadComments
        await loadComments(postId, currentUserId);

        commentModal.classList.remove('hidden');
        app.classList.add('hidden');

        // Focus on comment input
        setTimeout(() => {
            if (commentInput) {
                commentInput.focus();
            }
        }, 300);
    });

    commentBackBtn.addEventListener('click', () => {
        commentModal.classList.add('hidden');
        activeCommentPostId = null;
        commentsContainer.innerHTML = '';
        app.classList.remove('hidden');
    });

    /* -----------------------------
    DELETE POST
    ----------------------------- */
    confirmDeleteBtn.addEventListener('click', async () => {
        if (!deleteTargetPostId) return;
        const postEl = recentPostContainer.querySelector(`.post[data-post-id="${deleteTargetPostId}"]`);
        try {
            const { data: postData } = await supabaseClient.from('posts').select('file_path').eq('id', deleteTargetPostId).maybeSingle();
            if (postData?.file_path) await supabaseClient.storage.from('post-media').remove([postData.file_path]);

            const { error } = await supabaseClient.from('posts').delete().eq('id', deleteTargetPostId);
            if (error) throw error;

            postEl?.remove();
            deleteTargetPostId = null;
            deleteConfirmationModal.classList.add('hidden');
            app.classList.remove('opacity-50');
        } catch (err) {
            console.error(err);
            alertSystem.show('Failed to delete post', 'error');
        }
    });

    cancelDeleteBtn.addEventListener('click', () => {
        deleteTargetPostId = null;
        deleteConfirmationModal.classList.add('hidden');
        app.classList.remove('opacity-50');
    });

    /* -----------------------------
    INIT
    ----------------------------- */
    (async function init() {
        await loadUserName();
        await renderBio();
        await getUserPosts();
        initDeleteComment(alertSystem);
        initCommentRealtime();
        initReactions(alertSystem);
        initDeletePermanently(userId, alertSystem);
    })();
});