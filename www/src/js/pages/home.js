import supabaseClient from '../supabase.js';
import { alertSystem, formatRelativeTime, initLikeButtons, updateLikeButtonStates, renderPost } from '../utils/postUtils.js';
import { initCommentsModal, loadComments, initDeleteComment, initCommentRealtime, initMentionUser } from '../utils/commentUtils.js';
import { initEllipsisButtons, showDeleteConfirmation, hideDeleteConfirmation, initDeletePermanently } from '../utils/postDeleteUtils.js';
import { initFollowButtons, initFriendRealtime } from '../utils/friendUtils.js';
import { initReportModal, checkIfUserReported } from '../utils/reportUtils.js';
import uploadedPost from '../render/post.js';

document.addEventListener('DOMContentLoaded', async () => {

    // =======================
    // PAGE ELEMENTS
    // =======================
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

    // =======================
    // APP STATE
    // =======================
    let selectedMedia = null;
    const displayedPostIds = new Set();

    const { data, error } = await supabaseClient.auth.getUser();
    const userId = data?.user?.id;

    const bannedWords = [
        "tanga", "bobo", "ulol", "gago", "putangina", "pakshet", "tangina", "tarantado", "peste", "hayop",
        "sex", "kantot", "ligawan", "hubad", "malandi", "puki", "titi", "pepe", "kantutan", "libog", "nigga",
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
        "sinungaling", "magnanakaw", "sinungaling", "dayo",
        "ulikba", "ungol", "ungas", "unggoy", "tamod", "tamuran",
        "kadiri", "kadiri", "kasuklam-suklam", "nakakadiri", "nakakasuka",
        "pakshet", "pakyu", "pakyu", "pakyo", "pakyaw", "pakyawan",
        "sinturon", "sinulid", "sinungaling", "sinungaling", "amputa",
        "tarantadu", "tampal", "tampalasan", "tampalasan", "bembang", "bembangan",
        "yawa", "yagit", "iyot", "nipple", "panget", "pangit", "panot", "hairline", "sipunin", "tuwad", "dogstyle", "kadyot"
    ];

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

    // =======================
    // LOAD CURRENT USER
    // =======================
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

    // =======================
    // CHARACTER COUNT
    // =======================
    postContent.addEventListener('input', () => {
        charCount.textContent = postContent.value.length;
        postButton.disabled = (postContent.value.length === 0 && !selectedMedia);
    });

    // =======================
    // MEDIA UPLOAD
    // =======================
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

    // =======================
    // CREATE POST
    // =======================
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

    // =======================
    // FETCH POSTS
    // =======================
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

        const urlParams = new URLSearchParams(window.location.search);
        const postId = urlParams.get('id');

        let postsToRender = data;
        if (postId) {
            postsToRender = data.filter(p => p.id == postId);
        }

        for (const post of postsToRender) {
            await renderPost(post, displayedPostIds, postsContainer, "beforeend", true);
        }

        if (postId) {
            setTimeout(() => {
                const postElement = document.querySelector(`[data-post-id="${postId}"]`);
                if (postElement) {
                    postElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 300);
        }
    }

    // =======================
    // FULL IMAGE MODAL
    // =======================
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

    // =======================
    // REALTIME POSTS UPDATES
    // =======================
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
                console.log('New post detected:', payload.new);
                if (!displayedPostIds.has(payload.new.id)) {
                    // Fetch the complete post data with comments count
                    const { data: newPost, error } = await supabaseClient
                        .from('posts')
                        .select('*, post_comments(count)')
                        .eq('id', payload.new.id)
                        .single();

                    if (!error && newPost) {
                        await renderPost(newPost, displayedPostIds, postsContainer, 'afterbegin', true);
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
            (payload) => {
                console.log('Post deleted:', payload.old);
                const postEl = document.querySelector(`.post[data-post-id="${payload.old.id}"]`);
                if (postEl) {
                    postEl.remove();
                    displayedPostIds.delete(payload.old.id);
                }
            }
        )
        .subscribe((status) => {
            console.log('Realtime subscription status:', status);
        });

    // =======================
    // INITIALIZE
    // =======================
    await loadUser();
    await getPosts();

    initEllipsisButtons(
        () => showDeleteConfirmation(alertSystem),
        () => hideDeleteConfirmation()
    );
    initDeletePermanently(userId, alertSystem);
    initMentionUser(alertSystem);
    // Pass userId to comments modal
    initCommentsModal(alertSystem, bannedWords, userId);
    initFollowButtons(alertSystem);
    initDeleteComment(alertSystem);
    initCommentRealtime();
    initReportModal(alertSystem, checkIfUserReported);

    if (userId) {
        initFriendRealtime(userId);
    }

    setTimeout(updateLikeButtonStates, 500);
    setTimeout(() => initLikeButtons(alertSystem), 1000);
});