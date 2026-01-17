import supabaseClient from '../supabase.js';
import AlertSystem from '../render/Alerts.js';
import { displayBio, displayInformation } from '../render/profile.js';
import uploadedPost from '../render/post.js';
import comments, { emptyComments } from '../render/comments.js';
import { likePost } from './notification.js';
import { commentPost } from './notification.js';

document.addEventListener('DOMContentLoaded', async () => {
    const alertSystem = new AlertSystem();
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
                // Get CURRENT user
                const { data: currentUserData, error: userError } = await supabaseClient.auth.getUser();
                if (userError) throw userError;
                if (!currentUserData?.user) throw new Error("No user logged in");

                const currentUserId = currentUserData.user.id;
                const currentUserName = currentUserData.user.user_metadata.display_name || "User";
                const currentUserEmail = currentUserData.user.user_metadata.email || "User";

                // Insert logout record
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

                // Sign out
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
        const avatarUrl = profile?.avatar_url || '../images/defaultAvatar.jpg';

        // Elements
        const userAvatar = document.getElementById('userAvatar');
        const fullImageModal = document.getElementById('fullImageModal');
        const viewAvatar = document.getElementById('viewAvatar');
        const closeFullImage = document.getElementById('closeFullImage');

        // Set data
        userAvatar.src = avatarUrl;
        viewAvatar.src = avatarUrl;

        document.getElementById('displayBio').innerHTML = displayBio(bioText);
        document.getElementById('location').textContent = profile?.location || '';
        document.getElementById('PersonalInfo').innerHTML =
            displayInformation(name, email, major, year_level, true);

        // =============================
        // OPEN FULL IMAGE MODAL
        // =============================
        userAvatar.onclick = () => {
            viewAvatar.src = avatarUrl;
            fullImageModal.classList.remove('hidden');
            document.body.classList.add('overflow-hidden');
        };

        // =============================
        // CLOSE MODAL (X BUTTON)
        // =============================
        closeFullImage.onclick = () => {
            fullImageModal.classList.add('hidden');
            document.body.classList.remove('overflow-hidden');
        };


        // =============================
        // CLOSE MODAL (BACKGROUND CLICK)
        // =============================
        fullImageModal.onclick = (e) => {
            if (e.target === fullImageModal) {
                fullImageModal.classList.add('hidden');
                document.body.classList.remove('overflow-hidden');
            }
        };
    }


    /* -----------------------------
    UTILS
    ----------------------------- */
    function formatRelativeTime(dateString) {
        const date = new Date(dateString);
        const diff = (new Date() - date) / 1000;

        if (diff < 5) return "Just now";
        if (diff < 60) return `${Math.floor(diff)} sec ago`;
        if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)} hour(s) ago`;
        if (diff < 172800) return "Yesterday";

        return date.toLocaleString('en-US', {
            month: "long",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
            hour12: true
        });
    }

    // =======================
    // LIKE BUTTONS HANDLER
    // =======================
    function initLikeButtons() {
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

                        // Create notification for the post owner
                        await likePost(postId, userId);
                        await commentPost(postId, userId);


                        // Update UI
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
    // ELLIPSIS MENU HANDLER
    // =======================
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
                    const postId = btn.closest('.post').dataset.postId;
                    ellipsisMenuModal.dataset.postId = postId; // store current post
                    ellipsisMenuModal.classList.remove('hidden');
                    app.classList.add('opacity-50');
                });
            }
        });

        closeBtn.onclick = () => {
            ellipsisMenuModal.classList.add('hidden');
            app.classList.remove('opacity-50');
        };

        deletePostBtn.onclick = showDeleteConfirmation;
        cancelDeleteBtn.onclick = hideDeleteConfirmation;
    }

    // =======================
    // SHOW DELETE CONFIRMATION
    // =======================
    function showDeleteConfirmation() {
        const ellipsisMenuModal = document.getElementById('ellipsisMenuModal');
        const postId = ellipsisMenuModal.dataset.postId;
        if (!postId) return alertSystem.show('Error: no post selected', 'error');

        const modal = document.getElementById('deleteConfirmationModal');
        const card = modal.querySelector('.delete-card');

        modal.dataset.postId = postId;
        modal.classList.remove('hidden');
        setTimeout(() => card.classList.add('scale-100'));

        ellipsisMenuModal.classList.add('hidden');
    }

    // =======================
    // HIDE DELETE CONFIRMATION
    // =======================
    function hideDeleteConfirmation() {
        const modal = document.getElementById('deleteConfirmationModal');
        const card = modal.querySelector('.delete-card');
        card.classList.remove('scale-100');
        setTimeout(() => {
            modal.classList.add('hidden');
            document.getElementById('app').classList.remove('opacity-50');
        }, 150);
    }


    // =======================
    // CONFIRM DELETE BUTTON
    // =======================
    function deletePermanently() {
        document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
            const modal = document.getElementById('deleteConfirmationModal');
            const postId = modal.dataset.postId;
            const postEl = document.querySelector(`.post[data-post-id="${postId}"]`);

            if (!postEl) return alertSystem.show("Post not found", "error");

            const filePathForStorage = postEl.dataset.filePath;
            const alertId = alertSystem.show('Deleting...', 'info');

            // 1. Fetch post to check ownership
            const { data: post, error: fetchError } = await supabaseClient
                .from('posts')
                .select('user_id')
                .eq('id', postId)
                .maybeSingle();

            if (fetchError) return alertSystem.show(`Error fetching post: ${fetchError.message}`, 'error');
            if (!post) return alertSystem.show("Post not found", 'error');
            if (post.user_id !== userId) return alertSystem.show("You can't delete this post", 'error');

            // 2. Delete file from storage
            const { data, error } = await supabaseClient
                .storage
                .from('post-media')
                .remove([filePathForStorage]);

            if (error) console.error('Delete failed:', error);
            else console.log('File deleted:', data);


            if (error) return alertSystem.show(`Failed to delete file: ${error.message}`, 'error');

            // 3. Delete post from DB
            const { data: deletedPost, error: deleteError } = await supabaseClient
                .from('posts')
                .delete()
                .eq('id', postId);

            if (deleteError) return alertSystem.show(`Failed to delete post: ${deleteError.message}`, 'error');

            // 4. Remove from UI
            postEl.remove();
            hideDeleteConfirmation();
            alertSystem.show('Post deleted successfully!', 'success');
            alertSystem.hide(alertId);
        });
    }

    // =======================
    // RENDER SINGLE POST
    // =======================
    async function renderPost(post, position = "beforeend") {
        if (!post.id || displayedPostIds.has(post.id)) return;

        // ------------------------------
        // Get current user
        // ------------------------------
        const { data: userData } = await supabaseClient.auth.getUser();
        const currentUserId = userData?.user?.id;
        const owner = currentUserId === post.user_id;

        // ------------------------------
        // Check if user liked this post
        // ------------------------------
        let isLikedByUser = false;
        if (currentUserId) {
            const { data: userLike } = await supabaseClient
                .from('post_likes')
                .select('id')
                .eq('post_id', post.id)
                .eq('user_id', currentUserId)
                .maybeSingle();
            isLikedByUser = !!userLike;
        }

        // ------------------------------
        // Fetch total likes
        // ------------------------------
        const { count: totalLikes } = await supabaseClient
            .from('post_likes')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id);

        // ------------------------------
        // Fetch total comments
        // ------------------------------
        const { count: commentCount } = await supabaseClient
            .from('post_comments')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id);

        // ------------------------------
        // Fetch latest profile avatar dynamically
        // ------------------------------
        let avatar = post.avatar_url || '../images/defaultAvatar.jpg'; // use saved post avatar first
        try {
            const { data: profile } = await supabaseClient
                .from('profile')
                .select('avatar_url')
                .eq('id', post.user_id)
                .maybeSingle();

            if (profile?.avatar_url) avatar = profile.avatar_url; // use latest profile avatar
        } catch (err) {
            console.warn('Failed to fetch profile avatar for user:', post.user_id, err);
        }

        // ------------------------------
        // Format relative time
        // ------------------------------
        const relativeTime = formatRelativeTime(post.created_at);

        // ------------------------------
        // Render HTML using uploadedPost
        // ------------------------------
        const html = uploadedPost(
            avatar,
            owner,
            post.user_name,
            relativeTime,
            post.content,
            post.media_url,
            post.media_type,
            post.id,
            totalLikes,
            commentCount,
            isLikedByUser,
            post.file_path
        );


        // Insert into posts container
        recentPostContainer.insertAdjacentHTML(position, html);
        displayedPostIds.add(post.id);

        // Initialize buttons after DOM update
        setTimeout(() => {
            initEllipsisButtons();
            initLikeButtons();
        }, 100);
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

            for (const post of posts) await renderPost(post);

        } catch (err) {
            console.error("Error fetching posts:", err);
            recentPostContainer.innerHTML = `<p class="text-red-500 text-center mt-6">Failed to load posts.</p>`;
        }
    }

    /* -----------------------------
    DELETE POST
    ----------------------------- */
    confirmDeleteBtn.addEventListener('click', async () => {
        if (!deleteTargetPostId) return;
        const postEl = recentPostContainer.querySelector(`.post[data-post-id="${deleteTargetPostId}"]`);
        try {
            // Remove media
            const { data: postData } = await supabaseClient.from('posts').select('file_path').eq('id', deleteTargetPostId).maybeSingle();
            if (postData?.file_path) await supabaseClient.storage.from('post-media').remove([postData.file_path]);

            // Delete post
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

    function openComments() {
        const commentModal = document.getElementById('commentModal');
        const commentBackBtn = document.getElementById('commentBackBtn');
        const app = document.getElementById('app');
        const commentForm = document.getElementById('commentForm');
        const commentInput = document.getElementById('commentInput');
        const charCounter = document.querySelector('#charCounter');
        const sendBtn = document.getElementById('sendBtn');
        let commentLength = 0;

        let savedScrollY = 0;
        let currentPostId = null;

        commentBackBtn.addEventListener('click', (e) => {
            e.preventDefault();
            commentModal.classList.add('hidden');
            app.classList.remove('hidden');
            window.scrollTo(0, savedScrollY);
        });

        document.addEventListener('click', async (e) => {
            const button = e.target.closest('.commentBtn');
            if (!button) return;

            currentPostId = button.dataset.postId?.trim();
            if (!currentPostId) return alertSystem.show('No postId found!', 'error');

            savedScrollY = window.scrollY;
            await loadComments(currentPostId);

            commentModal.classList.remove('hidden');
            app.classList.add('hidden');
        });

        commentInput.addEventListener('input', () => {
            commentLength = commentInput.value.length;

            charCounter.innerHTML = `${commentLength}/250`
            sendBtn.disabled = commentLength === 0;
        })


        commentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!currentPostId) return alertSystem.show("No post selected!", "error");

            const commentText = commentInput.value.trim();
            if (!commentText) return;

            const { data: userData } = await supabaseClient.auth.getUser();
            const userId = userData?.user?.id;
            const userName = userData?.user.user_metadata.display_name || "User";

            if (!userId) return alertSystem.show("You must be logged in to comment.", "error");

            let avatar = '../images/defaultAvatar.jpg';
            const { data: profile } = await supabaseClient
                .from('profile')
                .select('avatar_url')
                .eq('id', userId)
                .maybeSingle();

            if (profile?.avatar_url) avatar = profile.avatar_url;

            const { error: insertError } = await supabaseClient
                .from('post_comments')
                .insert({
                    post_id: currentPostId,
                    user_id: userId,
                    user_name: userName,
                    comment: commentText,
                    avatar: avatar
                });

            if (insertError) {
                console.error(insertError);
                return alertSystem.show('Failed to post comment.', 'error');
            }

            // Create notification for the post owner
            await commentPost(currentPostId, userId);

            commentInput.value = '';
            charCounter.innerHTML = '0/250';
            sendBtn.disabled = true;
            await loadComments(currentPostId);
        });
    }

    /* -----------------------------
    COMMENTS
    ----------------------------- */
    async function loadComments(postId) {
        const commentsContainer = document.getElementById('comments');

        const { data: commentsData, error } = await supabaseClient
            .from('post_comments')
            .select('*')
            .eq('post_id', postId)
            .order('created_at', { ascending: false });

        commentsContainer.innerHTML = '';

        if (error) {
            commentsContainer.innerHTML = `<p class="text-red-500">Error fetching comments.</p>`;
            console.error(error);
            return;
        }

        if (!commentsData || commentsData.length === 0) {
            commentsContainer.innerHTML = emptyComments();
        } else {
            commentsData.forEach(comment => {
                const commentDate = formatRelativeTime(comment.created_at);

                commentsContainer.insertAdjacentHTML(
                    'beforeend',
                    comments(comment.user_name, comment.comment, comment.avatar, commentDate)
                );
            });
        }

        commentsContainer.scrollTop = commentsContainer.scrollHeight;
    }


    commentForm.addEventListener('submit', async e => {
        e.preventDefault();
        const comment = commentInput.value.trim();
        if (!comment || !activeCommentPostId) return;

        try {
            const { error } = await supabaseClient
                .from('post_comments')
                .insert([{
                    post_id: activeCommentPostId,
                    user_id: currentUserId,
                    comment,
                    user_name: document.getElementById('username').textContent
                }]);
            if (error) throw error;

            // Create notification for the post owner
            await commentPost(activeCommentPostId, currentUserId);

            commentInput.value = '';
            charCounter.textContent = '0/250';
            await loadComments(activeCommentPostId);
        } catch (err) {
            console.error(err);
            alertSystem.show('Failed to post comment', 'error');
        }
    });

    commentInput.addEventListener('input', () => {
        charCounter.textContent = `${commentInput.value.length}/250`;
    });

    commentBackBtn.addEventListener('click', () => {
        commentModal.classList.add('hidden');
        activeCommentPostId = null;
        commentsContainer.innerHTML = '';
        app.classList.remove('hidden');
    });

    /* -----------------------------
    INIT
    ----------------------------- */
    (async function init() {
        await loadUserName();
        await renderBio();
        openComments();
        deletePermanently();
        await getUserPosts();
    })();
});
