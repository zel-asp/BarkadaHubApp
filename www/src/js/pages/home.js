import supabaseClient from '../supabase.js';
import { alertSystem, initLikeButtons, updateLikeButtonStates, renderPost } from '../utils/postUtils.js';
import { initCommentsModal, initDeleteComment, initCommentRealtime, initMentionUser } from '../utils/commentUtils.js';
import { showDeleteConfirmation, hideDeleteConfirmation, initDeletePermanently } from '../utils/postDeleteUtils.js';
import { initFollowButtons, initFriendRealtime } from '../utils/friendUtils.js';
import { initReportModal, checkIfUserReported } from '../utils/reportUtils.js';
import { initReactions } from '../utils/reactionUtils.js';
import { unsubscribeAllReactions } from '../utils/realtimeReactions.js';
import sanitize from '../utils/sanitize.js';

document.addEventListener('DOMContentLoaded', async () => {

    // page elements
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
    const userAvatar = document.getElementById('userAvatar');
    const developersPost = document.getElementById('developersPost');

    // app state
    let selectedMedia = null;
    const displayedPostIds = new Set();

    // Infinite scroll state
    let currentPage = 0;
    const POSTS_PER_PAGE = 3;
    let isLoading = false;
    let hasMorePosts = true;
    let loadingIndicator = null;

    const { data, error } = await supabaseClient.auth.getUser();
    const userId = data?.user?.id;

    const bannedWords = [
        "tanga", "bobo", "ulol", "gago", "putangina", "pakshet", "tangina", "tarantado", "peste", "hayop",
        "sex", "kantot", "ligawan", "hubad", "malandi", "puki", "titi", "pepe", "kantutan", "libog", "nigga", "puke",
        "puta", "pota", "potangina", "punyeta", "leche", "lintik", "buwisit", "siraulo", "hinayupak",
        "inutil", "bunganga", "kupal", "buang", "gagu", "linta", "saksakan", "gaga", "engot", "bangag",
        "lintik", "yawa", "bwisit", "shet", "animal", "bilat", "betlog", "etits", "tungaw", "tikol",
        "jakol", "tamod", "bulbol", "tite", "burat", "kiki", "puday", "bulin", "bakla", "tomboy",
        "binabae", "baklang", "salsal", "kantotero", "kantotera", "manyak", "bastos", "walanghiya",
        "salot", "sintu-sinto", "hinamak", "suklam", "supot", "ungas", "unggoy", "utong", "suso",
        "pekpek", "dede", "pwet", "puwet", "pimpoy", "kantotray", "kolokoy", "sinturon", "bulok",
        "hinubdan", "hinubdan", "pokpok", "kalapating", "mabaho", "maut", "utot", "tae", "ipis",
        "demonyo", "impakto", "aswang", "tikbalang", "duwende", "kapre", "tiyanak", "manananggal",
        "bampira", "multo", "pugot", "maligno", "satanas", "diyablo", "demonyo", "bwisit na",
        "napakabobo", "napakatanga", "napakagago", "napakasira", "napakabastos",
        "sinungaling", "magnanakaw", "sinungaling", "dayo", "fuck",
        "ulikba", "ungol", "ungas", "unggoy", "tamod", "tamuran", "burnek",
        "kadiri", "kadiri", "kasuklam-suklam", "nakakadiri", "nakakasuka",
        "pakshet", "pakyu", "pakyu", "pakyo", "pakyaw", "pakyawan", "pubic",
        "sinturon", "sinulid", "sinungaling", "sinungaling", "amputa",
        "tarantadu", "tampal", "tampalasan", "tampalasan", "bembang", "bembangan",
        "yawa", "yagit", "iyot", "nipple", "panget", "pangit", "panot", "hairline", "sipunin", "tuwad", "dogstyle", "kadyot", "noo"
    ];

    // Create loading indicator
    function createLoadingIndicator() {
        const loader = document.createElement('div');
        loader.id = 'loading-indicator';
        loader.className = 'text-center py-4 hidden';
        loader.innerHTML = `
            <div class="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full">
                <div class="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                <span class="text-sm text-gray-600">Loading more posts...</span>
            </div>
        `;
        postsContainer.parentNode.insertBefore(loader, postsContainer.nextSibling);
        return loader;
    }

    loadingIndicator = createLoadingIndicator();

    async function loadProfilePic(userId, userAvatarElement) {
        let avatar = '../images/defaultAvatar.jpg';

        try {
            const { data: profile, error } = await supabaseClient
                .from('profile')
                .select('avatar_url')
                .eq('id', userId)
                .maybeSingle();

            if (error) {
                console.warn("Failed to fetch profile:", error);
            }

            if (profile?.avatar_url) avatar = profile.avatar_url;
        } catch (err) {
            console.error("Error loading profile avatar:", err);
        }

        userAvatarElement.src = avatar;
    }

    loadProfilePic(userId, userAvatar);

    // load current user
    async function loadUser() {
        const { data, error } = await supabaseClient.auth.getUser();
        if (error) {
            alertSystem.show(`Error: ${error}`, 'error');
            setTimeout(() => window.location.replace = '../../index.html', 1500);
            return;
        }

        const name = data.user.user_metadata?.display_name || "User";
        postContent.placeholder = `What's on your mind, ${name}?`;
    }

    // character count
    postContent.addEventListener('input', () => {
        const text = postContent.value.trim();
        charCount.textContent = text.length;
        postButton.disabled = (text.length === 0 && !selectedMedia);
    });

    // media upload
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

    photoUpload.addEventListener('change', () => photoUpload.files[0] && handleMediaUpload(photoUpload.files[0], 'image'));
    videoUpload.addEventListener('change', () => videoUpload.files[0] && handleMediaUpload(videoUpload.files[0], 'video'));

    removeMedia.addEventListener('click', () => {
        selectedMedia = null;
        mediaPreview.classList.add('hidden');
        photoUpload.value = '';
        videoUpload.value = '';
        postButton.disabled = (postContent.value.length === 0);
    });

    // create post
    postForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const postButton = postForm.querySelector('button[type="submit"]');
        if (!postButton) return;

        const { data: userData } = await supabaseClient.auth.getUser();
        const userId = userData?.user?.id;
        const userName = userData?.user.user_metadata.display_name || "User";

        if (!userId) return alertSystem.show("You must be logged in.", 'error');

        try {
            postButton.disabled = true;
            const originalText = postButton.textContent;
            postButton.textContent = 'Posting...';
            postButton.classList.add('opacity-50', 'cursor-not-allowed');

            let content = postContent.value;
            let foundBanned = false;

            content = sanitize(content || '');

            bannedWords.forEach(word => {
                const pattern = new RegExp(`\\b${word}\\b[.,!?;:]*`, 'gi');
                if (pattern.test(content)) {
                    content = content.replace(pattern, match => '*'.repeat(match.length));
                    foundBanned = true;
                }
            });

            if (foundBanned) {
                alertSystem.show("Some inappropriate words were filtered.", 'info');
            }

            const loadingId = alertSystem.show("Posting...", 'loading');

            let mediaUrl = null;
            let mediaType = null;
            let filePath = null;

            if (selectedMedia) {
                const file = selectedMedia.file;
                const ext = file.name.split('.').pop();
                const fileName = `${Date.now()}.${ext}`;
                filePath = `${userId}/${fileName}`;
                const { error: uploadError } = await supabaseClient.storage
                    .from("post-media")
                    .upload(filePath, file);
                if (uploadError) throw new Error("Media upload failed!");

                const { data } = supabaseClient.storage.from("post-media").getPublicUrl(filePath);
                mediaUrl = data.publicUrl;
                mediaType = selectedMedia.type;
            }

            let avatar = '../images/defaultAvatar.jpg';
            const { data: profile } = await supabaseClient
                .from('profile')
                .select('avatar_url')
                .eq('id', userId)
                .maybeSingle();

            if (profile?.avatar_url) avatar = profile.avatar_url;

            const { data: newPost, error } = await supabaseClient
                .from("posts")
                .insert({
                    user_id: userId,
                    user_name: userName,
                    content: content,
                    media_url: mediaUrl,
                    media_type: mediaType,
                    avatar_url: avatar,
                    file_path: filePath
                })
                .select('*, post_comments(*)')
                .maybeSingle();

            alertSystem.hide(loadingId);
            if (error) throw new Error("Failed to publish post!");

            postForm.reset();
            selectedMedia = null;
            mediaPreview.classList.add('hidden');
            charCount.textContent = "0";

            alertSystem.show("Post created successfully!", 'success');

            postButton.textContent = 'Posted!';
            postButton.classList.remove('opacity-50', 'cursor-not-allowed');
            setTimeout(() => {
                postButton.textContent = originalText;
                postButton.disabled = true;
            }, 2000);

        } catch (err) {
            console.error(err);

            postButton.disabled = false;
            postButton.textContent = 'Post';
            postButton.classList.remove('opacity-50', 'cursor-not-allowed');

            alertSystem.show(err.message || "Failed to publish post!", 'error');
        }
    });

    // fetch posts with pagination
    async function getPosts(loadMore = false) {
        if (isLoading || !hasMorePosts) return;

        isLoading = true;

        if (loadMore) {
            loadingIndicator.classList.remove('hidden');
        }

        try {
            const from = currentPage * POSTS_PER_PAGE;
            const to = from + POSTS_PER_PAGE - 1;

            const { data, error, count } = await supabaseClient
                .from('posts')
                .select('*, post_comments(count)', { count: 'exact' })
                .order("created_at", { ascending: false })
                .range(from, to);

            if (error) {
                console.error("Error fetching posts:", error);
                return;
            }

            const developersPost = document.getElementById('developersPost');

            if (count === 0) {
                if (developersPost) {
                    developersPost.classList.remove('hidden');
                }
            } else {
                // There are posts, hide developers post
                if (developersPost) {
                    developersPost.classList.add('hidden');
                }
            }

            if (!data || data.length === 0) {
                hasMorePosts = false;
                return;
            }

            const urlParams = new URLSearchParams(window.location.search);
            const postId = urlParams.get('id');

            let postsToRender = data;
            if (postId && !loadMore) {
                postsToRender = data.filter(p => p.id == postId);
            }

            for (const post of postsToRender) {
                await renderPost(post, displayedPostIds, postsContainer, "beforeend", true);
            }
            initializePostInteractions();

            if (count && (currentPage + 1) * POSTS_PER_PAGE >= count) {
                hasMorePosts = false;
            }

            if (loadMore) {
                currentPage++;
            }

            if (postId && !loadMore) {
                setTimeout(() => {
                    const postElement = document.querySelector(`[data-post-id="${postId}"]`);
                    if (postElement) {
                        postElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }, 300);
            }

        } catch (err) {
            console.error("Error in getPosts:", err);
        } finally {
            isLoading = false;
            loadingIndicator.classList.add('hidden');
        }
    }
    function initializePostInteractions() {
        document.querySelectorAll('.ellipsis-btn').forEach(btn => {
            if (!btn.dataset.bound) {
                btn.dataset.bound = "true";
                btn.addEventListener('click', () => {
                    const ellipsisMenuModal = document.getElementById('ellipsisMenuModal');
                    const app = document.getElementById('app');
                    const postId = btn.closest('.post').dataset.postId;
                    ellipsisMenuModal.dataset.postId = postId;
                    ellipsisMenuModal.classList.remove('hidden');
                    app.classList.add('opacity-50');
                });
            }
        });
        initLikeButtons(alertSystem);
        initFollowButtons(alertSystem);
        initReportModal(alertSystem, checkIfUserReported);
        initReactions(alertSystem);
        initCommentsModal(alertSystem, bannedWords, userId);
        updateLikeButtonStates();
    }

    // Infinite scroll detection
    function handleScroll() {
        if (isLoading || !hasMorePosts) return;

        const scrollPosition = window.innerHeight + window.scrollY;
        const threshold = document.documentElement.scrollHeight - 1000;

        if (scrollPosition >= threshold) {
            getPosts(true);
        }
    }

    // Debounced scroll handler for better performance
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    const debouncedHandleScroll = debounce(handleScroll, 100);

    window.viewFullImage = (url) => {
        const modal = document.getElementById('fullImageModal');
        document.getElementById('fullImageContent').src = url;
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    };
    document.getElementById('closeFullImage').onclick = () => {
        document.getElementById('fullImageModal').classList.add('hidden');
        document.body.style.overflow = '';
    }

    const postsChannel = supabaseClient
        .channel('public:posts')
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'posts'
            },
            async (payload) => {
                if (!displayedPostIds.has(payload.new.id)) {

                    const developersPost = document.getElementById('developersPost');
                    if (developersPost && !developersPost.classList.contains('hidden')) {
                        developersPost.classList.add('hidden');
                    }

                    const { data: newPost, error } = await supabaseClient
                        .from('posts')
                        .select('*, post_comments(count)')
                        .eq('id', payload.new.id)
                        .single();

                    if (!error && newPost) {
                        await renderPost(newPost, displayedPostIds, postsContainer, 'afterbegin', true);
                        initializePostInteractions();
                    }
                }
            }
        )
        .on(
            'postgres_changes',
            {
                event: 'DELETE',
                schema: 'public',
                table: 'posts'
            },
            async (payload) => {
                const postEl = document.querySelector(`.post[data-post-id="${payload.old.id}"]`);
                if (postEl) {
                    postEl.remove();
                    displayedPostIds.delete(payload.old.id);

                    const { count, error } = await supabaseClient
                        .from('posts')
                        .select('*', { count: 'exact', head: true });

                    if (!error && count === 0) {
                        const developersPost = document.getElementById('developersPost');
                        if (developersPost) {
                            developersPost.classList.remove('hidden');
                        }
                    }
                }
            }
        )
        .subscribe((status) => {
            console.log('Realtime subscription status:', status);
        });

    window.addEventListener('beforeunload', () => {
        unsubscribeAllReactions();
    });


    await loadUser();
    if (developersPost) {
        developersPost.classList.add('hidden');
    }
    await getPosts(false);

    window.addEventListener('scroll', debouncedHandleScroll);

    initDeletePermanently(userId, alertSystem);
    initMentionUser(alertSystem);
    initDeleteComment(alertSystem);
    initCommentRealtime();

    if (userId) {
        initFriendRealtime(userId);
    }
    setupModalHandlers();

    setTimeout(updateLikeButtonStates, 500);
});
function setupModalHandlers() {
    const ellipsisMenuModal = document.getElementById('ellipsisMenuModal');
    const app = document.getElementById('app');
    const closeBtn = document.getElementById('closeEllipsisMenu');
    const deletePostBtn = document.getElementById('deletePostBtn');
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');

    if (closeBtn) {
        closeBtn.onclick = () => {
            ellipsisMenuModal.classList.add('hidden');
            app.classList.remove('opacity-50');
        };
    }

    if (deletePostBtn) {
        deletePostBtn.onclick = () => {
            showDeleteConfirmation(alertSystem);
        };
    }

    if (cancelDeleteBtn) {
        cancelDeleteBtn.onclick = () => {
            hideDeleteConfirmation();
        };
    }
}