import supabaseClient from '../supabase.js';
import uploadedPost from '../render/post.js';
import AlertSystem from '../render/Alerts.js';

document.addEventListener('DOMContentLoaded', async function () {

    const alertSystem = new AlertSystem();

    const { data, error } = await supabaseClient.auth.getUser();
    if (error || !data?.user) {
        alertSystem.show("You must be logged in.", 'error');
        setTimeout(() => {
            window.location.href = '../../index.html';
        }, 1500);
        return;
    }

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

    let selectedMedia = null;
    const displayedPostIds = new Set(); // Track posts already shown

    async function LoadHome() {
        const { data, error } = await supabaseClient.auth.getUser();
        if (!error && data?.user) {
            const name = data.user.user_metadata?.display_name || "User";
            postContent.placeholder = `What's on your mind, ${name}?`;
        }
    }

    // Character counter
    postContent.addEventListener('input', function () {
        charCount.textContent = this.value.length;
        postButton.disabled = (this.value.length === 0 && !selectedMedia);
    });

    // Media upload handlers
    photoUpload.addEventListener('change', function () {
        if (this.files[0]) handleMediaUpload(this.files[0], 'image');
    });
    videoUpload.addEventListener('change', function () {
        if (this.files[0]) handleMediaUpload(this.files[0], 'video');
    });

    function handleMediaUpload(file, type) {
        selectedMedia = { file, type };
        const reader = new FileReader();
        reader.onload = function (e) {
            previewContainer.innerHTML = '';
            if (type === 'image') {
                const img = document.createElement('img');
                img.src = e.target.result;
                img.className = 'max-h-64 rounded-lg';
                previewContainer.appendChild(img);
            } else {
                const vid = document.createElement('video');
                vid.src = e.target.result;
                vid.controls = true;
                vid.className = 'max-h-64 rounded-lg';
                previewContainer.appendChild(vid);
            }
            mediaPreview.classList.remove('hidden');
            if (postContent.value.length === 0) postButton.disabled = false;
        };
        reader.readAsDataURL(file);
    }

    removeMedia.addEventListener('click', function () {
        selectedMedia = null;
        mediaPreview.classList.add('hidden');
        photoUpload.value = '';
        videoUpload.value = '';
        postButton.disabled = (postContent.value.length === 0);
    });

    // Submit post
    postForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const { data: userData } = await supabaseClient.auth.getUser();
        const userId = userData?.user?.id;
        const userName = userData?.user.user_metadata.display_name;

        if (!userId) return alertSystem.show("You must be logged in.", 'error');

        const loadingId = alertSystem.show("Posting...", 'loading');
        let uploadedMediaUrl = null;
        let mediaType = null;

        function delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }

        // Upload media if any
        if (selectedMedia) {
            const file = selectedMedia.file;
            const ext = file.name.split('.').pop();
            const fileName = `${userId}-${Date.now()}.${ext}`;

            const uploadPromise = supabaseClient
                .storage
                .from("post-media")
                .upload(fileName, file);
            const delayPromise = delay(1000);

            const [{ error: uploadError }] = await Promise.all([uploadPromise, delayPromise]);

            if (uploadError) {
                alertSystem.hide(loadingId);
                return alertSystem.show("Media upload failed!", 'error');
            }

            const { data } = supabaseClient
                .storage
                .from("post-media")
                .getPublicUrl(fileName);

            uploadedMediaUrl = data.publicUrl;
            mediaType = selectedMedia.type;
        } else {
            await delay(1000); // Show loading even if no media
        }

        // Insert post into DB
        const { data: insertedData, error: insertError } = await supabaseClient
            .from("posts")
            .insert({
                user_id: userId,
                user_name: userName,
                content: postContent.value,
                media_url: uploadedMediaUrl,
                media_type: mediaType,
            })
            .select(); // Return inserted row

        alertSystem.hide(loadingId);
        if (insertError) return alertSystem.show("Failed to publish post!", 'error');

        // Reset form
        postForm.reset();
        selectedMedia = null;
        mediaPreview.classList.add('hidden');
        charCount.textContent = "0";
        postButton.disabled = true;
        alertSystem.show("Post created successfully!", 'success');

        // Display new post immediately on top
        const newPost = insertedData[0];
        const newPostHtml = uploadedPost(
            newPost.user_name,
            newPost.content,
            newPost.media_url,
            newPost.media_type
        );
        postsContainer.insertAdjacentHTML("afterbegin", newPostHtml);
        displayedPostIds.add(newPost.id);
    });

    postButton.disabled = true;

    async function getPost() {
        const { data } = await supabaseClient
            .from('posts')
            .select('*')
            .order("created_at", { ascending: false });

        if (!data) return;

        data.forEach(post => {
            if (displayedPostIds.has(post.id)) return;

            const postHtml = uploadedPost(
                post.user_name,
                post.content,
                post.media_url,
                post.media_type
            );
            postsContainer.insertAdjacentHTML("beforeend", postHtml);
            displayedPostIds.add(post.id);
        });
    }

    LoadHome();
    getPost();
});
