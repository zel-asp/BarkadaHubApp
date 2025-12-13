import supabaseClient from '../supabase.js';
import uploadedPost from '../render/post.js';
import AlertSystem from '../render/Alerts.js';
import comments, { emptyComments } from '../render/comments.js';

document.addEventListener('DOMContentLoaded', async () => {

    // ELEMENTS
    const postForm = document.getElementById('postForm');
    const postContent = document.getElementById('postContent');
    const charCount = document.getElementById('charCount');
    const photoUpload = document.getElementById('photoUpload');
    const videoUpload = document.getElementById('videoUpload');
    const mediaPreview = document.getElementById('mediaPreview');
    const previewContainer = document.getElementById('previewContainer');
    const removeMedia = document.getElementById('removeMedia');
    const postButton = document.getElementById('postButton');
    const postsContainer = document.getElementById('dynamic-posts');

    // STATE
    let selectedMedia = null;
    const displayedPostIds = new Set();
    const alertSystem = new AlertSystem();

    /* -------------------------------------------
    LOAD USER
    ------------------------------------------- */
    async function loadUser() {
        const { data, error } = await supabaseClient.auth.getUser();
        if (error || !data?.user) {
            alertSystem.show("You must be logged in.", 'error');
            setTimeout(() => window.location.href = '../../index.html', 1500);
            return;
        }
        const name = data.user.user_metadata?.display_name || "User";
        postContent.placeholder = `What's on your mind, ${name}?`;
    }

    /* -------------------------------------------
    CHARACTER COUNT
    ------------------------------------------- */
    postContent.addEventListener('input', () => {
        charCount.textContent = postContent.value.length;
        postButton.disabled = (postContent.value.length === 0 && !selectedMedia);
    });

    /* -------------------------------------------
    MEDIA UPLOAD HANDLER
    ------------------------------------------- */
    function handleMediaUpload(file, type) {
        selectedMedia = { file, type };
        const reader = new FileReader();
        reader.onload = (e) => {
            previewContainer.innerHTML = '';
            const element = type === 'image'
                ? Object.assign(document.createElement('img'), { src: e.target.result, className: 'max-h-64 rounded-lg' })
                : Object.assign(document.createElement('video'), { src: e.target.result, controls: true, className: 'max-h-64 rounded-lg' });
            previewContainer.appendChild(element);
            mediaPreview.classList.remove('hidden');
            if (postContent.value.length === 0) postButton.disabled = false;
        };
        reader.readAsDataURL(file);
    }

    photoUpload.addEventListener('change', () => {
        if (photoUpload.files[0]) handleMediaUpload(photoUpload.files[0], 'image');
    });

    videoUpload.addEventListener('change', () => {
        if (videoUpload.files[0]) handleMediaUpload(videoUpload.files[0], 'video');
    });

    removeMedia.addEventListener('click', () => {
        selectedMedia = null;
        mediaPreview.classList.add('hidden');
        photoUpload.value = '';
        videoUpload.value = '';
        postButton.disabled = (postContent.value.length === 0);
    });

    /* -------------------------------------------
    ELLIPSIS MENU INIT
    ------------------------------------------- */
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

        closeBtn.onclick = () => {
            ellipsisMenuModal.classList.add('hidden');
            app.classList.remove('opacity-50');
            document.body.classList.remove('overflow-hidden');
        };

        deletePostBtn.onclick = showDeleteConfirmation;
        cancelDeleteBtn.onclick = hideDeleteConfirmation;
    }

    /* -------------------------------------------
    DELETE CONFIRMATION
    ------------------------------------------- */
    function showDeleteConfirmation() {
        const modal = document.getElementById('deleteConfirmationModal');
        const card = modal.querySelector('.delete-card');
        modal.classList.remove('hidden');
        setTimeout(() => card.classList.add('scale-100'));
    }

    function hideDeleteConfirmation() {
        const modal = document.getElementById('deleteConfirmationModal');
        const card = modal.querySelector('.delete-card');
        card.classList.remove('scale-100');
        setTimeout(() => modal.classList.add('hidden'), 150);
    }

    /* -------------------------------------------
    CALCULATE RELATIVE TIME
    ------------------------------------------- */
    function formatRelativeTime(dateString) {
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

    /* -------------------------------------------
    RENDER POST WITH LIKE STATUS
    ------------------------------------------- */
    async function renderPost(post, position = "beforeend") {
        if (!post.id || displayedPostIds.has(post.id)) return;

        // Check if current user liked this post
        let isLikedByUser = false;
        const { data: userData } = await supabaseClient.auth.getUser();
        if (userData?.user) {
            const { data: userLike } = await supabaseClient
                .from('post_likes')
                .select('id')
                .eq('post_id', post.id)
                .eq('user_id', userData.user.id)
                .maybeSingle();
            isLikedByUser = !!userLike;
        }

        const relativeTime = formatRelativeTime(post.created_at);
        const html = uploadedPost(
            post.user_name,
            relativeTime,
            post.content,
            post.media_url,
            post.media_type,
            post.id,
            post.likes || 0,
            post._count?.post_comments || 0,
            isLikedByUser
        );

        postsContainer.insertAdjacentHTML(position, html);
        displayedPostIds.add(post.id);

        // Initialize buttons after DOM is updated
        setTimeout(() => {
            initEllipsisButtons();
            initLikeButtons();
        }, 100);
    }

    /* -------------------------------------------
    SUBMIT / CREATE POST
    ------------------------------------------- */
    postForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const { data: userData } = await supabaseClient.auth.getUser();
        const userId = userData?.user?.id;
        const userName = userData?.user.user_metadata.display_name || "User";

        if (!userId) return alertSystem.show("You must be logged in.", 'error');

        const loadingId = alertSystem.show("Posting...", 'loading');

        let mediaUrl = null;
        let mediaType = null;

        if (selectedMedia) {
            const file = selectedMedia.file;
            const ext = file.name.split('.').pop();
            const fileName = `${Date.now()}.${ext}`;
            const filePath = `${userId}/${fileName}`;
            const { error: uploadError } = await supabaseClient.storage.from("post-media").upload(filePath, file);
            if (uploadError) {
                alertSystem.hide(loadingId);
                return alertSystem.show("Media upload failed!", 'error');
            }
            const { data } = supabaseClient.storage.from("post-media").getPublicUrl(filePath);
            mediaUrl = data.publicUrl;
            mediaType = selectedMedia.type;
        }

        const { data: newPost, error } = await supabaseClient
            .from("posts")
            .insert({
                user_id: userId,
                user_name: userName,
                content: postContent.value,
                media_url: mediaUrl,
                media_type: mediaType
            })
            .select('*, post_comments(*)')
            .single();

        alertSystem.hide(loadingId);
        if (error) return alertSystem.show("Failed to publish post!", 'error');

        renderPost(newPost, "afterbegin");

        postForm.reset();
        selectedMedia = null;
        mediaPreview.classList.add('hidden');
        charCount.textContent = "0";
        postButton.disabled = true;

        alertSystem.show("Post created successfully!", 'success');
    });

    /* -------------------------------------------
    GET POSTS WITH LIKE STATUS
    ------------------------------------------- */
    async function getPosts() {
        const { data, error } = await supabaseClient
            .from('posts')
            .select('*, post_comments(count)')
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error fetching posts:", error);
            return;
        }

        if (!data) return;

        // Render all posts
        for (const post of data) {
            await renderPost(post, "beforeend");
        }
    }

    /* -------------------------------------------
    FULL IMAGE VIEW
    ------------------------------------------- */
    window.viewFullImage = (url) => {
        const modal = document.getElementById('fullImageModal');
        document.getElementById('fullImageContent').src = url;
        modal.classList.remove('hidden');
    };

    /* -------------------------------------------
    LIKE BUTTONS - FIXED VERSION
    ------------------------------------------- */
    function initLikeButtons() {
        console.log('Initializing like buttons, found:', document.querySelectorAll('.like-btn').length, 'buttons');

        document.querySelectorAll('.like-btn').forEach(btn => {
            // Check if this button has already been initialized
            if (!btn.hasAttribute('data-bound-like')) {
                btn.setAttribute('data-bound-like', 'true');
                console.log('Binding like button for post:', btn.dataset.postId);

                btn.addEventListener('click', async (e) => {
                    // Prevent multiple clicks
                    if (btn.classList.contains('processing')) return;
                    btn.classList.add('processing');

                    const postId = btn.dataset.postId;
                    console.log('Like clicked for post:', postId);

                    if (!postId) {
                        console.error('No post ID found on like button');
                        btn.classList.remove('processing');
                        return;
                    }

                    const postEl = document.querySelector(`.post[data-post-id="${postId}"]`);
                    if (!postEl) {
                        console.error('Could not find post element with ID:', postId);
                        btn.classList.remove('processing');
                        return;
                    }

                    const likesEl = postEl.querySelector('.likes-count');
                    const heartIcon = btn.querySelector('i');
                    const likeTextSpan = btn.querySelector('span');
                    let currentLikes = parseInt(likesEl.textContent) || 0;

                    // Check if user is logged in
                    const { data: userData } = await supabaseClient.auth.getUser();
                    const userId = userData?.user?.id;

                    if (!userId) {
                        alertSystem.show("You must be logged in to like posts", "error");
                        btn.classList.remove('processing');
                        return;
                    }

                    try {
                        // Check if user already liked this post
                        const { data: existingLike, error: checkError } = await supabaseClient
                            .from('post_likes')
                            .select('id')
                            .eq('post_id', postId)
                            .eq('user_id', userId)
                            .maybeSingle();

                        if (checkError) {
                            console.error("Error checking like:", checkError);
                            btn.classList.remove('processing');
                            return;
                        }

                        if (existingLike) {
                            // User already liked - remove the like (undo)
                            const { error: deleteError } = await supabaseClient
                                .from('post_likes')
                                .delete()
                                .eq('id', existingLike.id);

                            if (deleteError) {
                                console.error("Error deleting like:", deleteError);
                                btn.classList.remove('processing');
                                return;
                            }

                            // Update posts table likes count
                            const { error: updateError } = await supabaseClient
                                .from('posts')
                                .update({ likes: currentLikes - 1 })
                                .eq('id', postId);

                            if (!updateError) {
                                // Update UI immediately
                                likesEl.textContent = currentLikes - 1;
                                heartIcon.className = 'fas fa-heart text-gray-400';
                                likeTextSpan.textContent = 'Like';
                                btn.classList.remove('text-red-600');
                                console.log('Like removed for post:', postId);
                            } else {
                                console.error("Error updating post likes:", updateError);
                            }
                        } else {
                            // User hasn't liked - add a like
                            const { error: insertError } = await supabaseClient
                                .from('post_likes')
                                .insert({
                                    post_id: postId,
                                    user_id: userId
                                });

                            if (insertError) {
                                console.error("Error inserting like:", insertError);
                                btn.classList.remove('processing');
                                return;
                            }

                            // Update posts table likes count
                            const { error: updateError } = await supabaseClient
                                .from('posts')
                                .update({ likes: currentLikes + 1 })
                                .eq('id', postId);

                            if (!updateError) {
                                // Update UI immediately
                                likesEl.textContent = currentLikes + 1;
                                heartIcon.className = 'fas fa-heart text-red-600';
                                likeTextSpan.textContent = 'Unlike';
                                btn.classList.add('text-red-600');
                                console.log('Like added for post:', postId);
                            } else {
                                console.error("Error updating post likes:", updateError);
                            }
                        }
                    } catch (error) {
                        console.error("Unexpected error:", error);
                    } finally {
                        btn.classList.remove('processing');
                    }
                });
            }
        });
    }

    /* -------------------------------------------
    CHECK AND UPDATE LIKE BUTTON STATES FOR ALL POSTS
    -------------------------------------------- */
    async function updateLikeButtonStates() {
        const { data: userData } = await supabaseClient.auth.getUser();
        const userId = userData?.user?.id;

        if (!userId) return;

        // Get all posts user has liked
        const { data: userLikes, error } = await supabaseClient
            .from('post_likes')
            .select('post_id')
            .eq('user_id', userId);

        if (error) {
            console.error("Error fetching user likes:", error);
            return;
        }

        const likedPostIds = new Set(userLikes.map(like => like.post_id));
        console.log('User has liked posts:', Array.from(likedPostIds));

        // Update UI for each post
        document.querySelectorAll('.post').forEach(postEl => {
            const postId = postEl.dataset.postId;
            const likeBtn = postEl.querySelector('.like-btn');
            if (!likeBtn) return;

            const heartIcon = likeBtn.querySelector('i');
            const likeText = likeBtn.querySelector('span');

            if (likedPostIds.has(postId)) {
                heartIcon.className = 'fas fa-heart text-red-600';
                likeText.textContent = 'Unlike';
                likeBtn.classList.add('text-red-600');
            } else {
                heartIcon.className = 'fas fa-heart text-gray-400';
                likeText.textContent = 'Like';
                likeBtn.classList.remove('text-red-600');
            }
        });
    }

    /* -------------------------------------------
    COMMENTS MODAL
    ------------------------------------------- */
    function openComments() {
        const commentModal = document.getElementById('commentModal');
        const commentBackBtn = document.getElementById('commentBackBtn');
        const app = document.getElementById('app');
        const commentForm = document.getElementById('commentForm');
        const commentInput = document.getElementById('commentInput');

        let savedScrollY = 0;
        let currentPostId = null;

        // Back button
        commentBackBtn.addEventListener('click', (e) => {
            e.preventDefault();
            commentModal.classList.add('hidden');
            app.classList.remove('hidden');
            window.scrollTo(0, savedScrollY);
        });

        // Open modal and load comments
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
                .single();

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

            commentInput.value = '';

            await loadComments(currentPostId);
        });
    }

    /* -------------------------------------------
    GET ALL COMMENTS IN SPECIFIC POST
    ------------------------------------------- */
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
                commentsContainer.insertAdjacentHTML(
                    'beforeend',
                    comments(comment.user_name, comment.comment, comment.avatar)
                );
            });
        }

        commentsContainer.scrollTop = commentsContainer.scrollHeight;
    }

    // Close full image modal
    document.getElementById('closeFullImage').onclick =
        () => document.getElementById('fullImageModal').classList.add('hidden');

    // INIT
    await loadUser();
    await getPosts();
    openComments();

    // Update like button states after a short delay to ensure DOM is ready
    setTimeout(updateLikeButtonStates, 500);
});