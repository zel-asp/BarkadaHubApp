import supabaseClient from '../supabase.js';
import uploadedPost from '../render/post.js';
import AlertSystem from '../render/Alerts.js';

document.addEventListener('DOMContentLoaded', function () {

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
    const displayedPostIds = new Set();
    const alertSystem = new AlertSystem();


    async function LoadHome() {
        const { data, error } = await supabaseClient.auth.getUser();
        if (!error && data?.user) {
            const name = data.user.user_metadata?.display_name || "User";
            postContent.placeholder = `What's on your mind, ${name}?`;
        } else {
            alertSystem.show("You must be logged in.", 'error');
            setTimeout(() => {
                window.location.href = '../../index.html';
            }, 1500);
            return;
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
            newPost.media_type,
            newPost.id
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
                post.media_type,
                post.id
            );
            postsContainer.insertAdjacentHTML("beforeend", postHtml);
            displayedPostIds.add(post.id);

            showEllipsisModal();
        });
    }

    //show the confirmation modal then will cal each getpost
    function showEllipsisModal() {
        const ellipsisButtons = document.querySelectorAll('.ellipsis-btn');
        const ellipsisMenuModal = document.getElementById('ellipsisMenuModal');
        const app = document.getElementById('app');
        const closeEllipsisMenu = document.getElementById('closeEllipsisMenu');
        const deletePostBtn = document.getElementById('deletePostBtn');
        const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');

        ellipsisButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                ellipsisMenuModal.classList.remove('hidden');
                app.classList.add('opacity-50');
                document.body.classList.add('overflow-hidden');
            });
        });

        closeEllipsisMenu.addEventListener('click', () => {
            ellipsisMenuModal.classList.add('hidden');
            app.classList.remove('opacity-50');
            document.body.classList.remove('overflow-hidden');
        });

        deletePostBtn.addEventListener('click', showDeleteConfirmation);
        cancelDeleteBtn.addEventListener('click', hideDeleteConfirmation);
    }

    //show another modal for confirmation
    function showDeleteConfirmation() {
        const modal = document.getElementById('deleteConfirmationModal');
        const card = modal.querySelector('.delete-card');

        modal.classList.remove('hidden');

        // Start animation next frame
        setTimeout(() => {
            card.classList.remove('scale-95');
            card.classList.add('scale-100');
        }, 10);
    }

    //hide the confimation
    function hideDeleteConfirmation() {
        const modal = document.getElementById('deleteConfirmationModal');
        const card = modal.querySelector('.delete-card');

        card.classList.add('scale-95');
        card.classList.remove('scale-100');

        setTimeout(() => {
            modal.classList.add('hidden');
        }, 150);
    }

    // Function called by "View Full" button
    window.viewFullImage = function (imageUrl) {
        const modal = document.getElementById('fullImageModal');
        const img = document.getElementById('fullImageContent');

        img.src = imageUrl;        // Set the clicked image
        modal.classList.remove('hidden'); // Show modal
    };

    // Close modal when clicking "×"
    document.getElementById('closeFullImage').addEventListener('click', () => {
        const modal = document.getElementById('fullImageModal');
        modal.classList.add('hidden');
    });


    LoadHome();
    getPost();
});