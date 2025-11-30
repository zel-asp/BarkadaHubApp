import supabaseClient from '../supabase.js';
import uploadedPost from '../render/post.js'

document.addEventListener('DOMContentLoaded', function () {
    const postForm = document.getElementById('postForm');
    const postContent = document.getElementById('postContent');
    const charCount = document.getElementById('charCount');
    const photoUpload = document.getElementById('photoUpload');
    const videoUpload = document.getElementById('videoUpload');
    const mediaPreview = document.getElementById('mediaPreview');
    const previewContainer = document.getElementById('previewContainer');
    const removeMedia = document.getElementById('removeMedia');
    const locationBtn = document.getElementById('locationBtn');
    const locationSelector = document.getElementById('locationSelector');
    const closeLocation = document.getElementById('closeLocation');
    const locationInput = document.getElementById('locationInput');
    const postButton = document.getElementById('postButton');


    let selectedMedia = null;
    let selectedLocation = null;


    async function LoadHome() {
        const { data, error } = await supabaseClient.auth.getUser();

        if (!error && data?.user) {
            const name = data.user.user_metadata?.display_name || "User";

            const postContent = document.getElementById("postContent");

            if (postContent) {
                postContent.placeholder = `What's on your mind, ${name}?`;
            }
        } else {
            console.log("User not logged in");
        }
    }

    // Character counter
    postContent.addEventListener('input', function () {
        const count = this.value.length;
        charCount.textContent = count;

        // Disable post button if content is empty
        if (count === 0 && !selectedMedia) {
            postButton.disabled = true;
        } else {
            postButton.disabled = false;
        }
    });

    // Photo upload
    photoUpload.addEventListener('change', function (e) {
        if (this.files && this.files[0]) {
            handleMediaUpload(this.files[0], 'image');
        }
    });

    // Video upload
    videoUpload.addEventListener('change', function (e) {
        if (this.files && this.files[0]) {
            handleMediaUpload(this.files[0], 'video');
        }
    });

    // Handle media upload and preview
    function handleMediaUpload(file, type) {
        selectedMedia = {
            file: file,
            type: type
        };

        const reader = new FileReader();

        reader.onload = function (e) {
            previewContainer.innerHTML = '';

            if (type === 'image') {
                const img = document.createElement('img');
                img.src = e.target.result;
                img.className = 'max-h-64 rounded-lg';
                previewContainer.appendChild(img);
            } else if (type === 'video') {
                const video = document.createElement('video');
                video.src = e.target.result;
                video.controls = true;
                video.className = 'max-h-64 rounded-lg';
                previewContainer.appendChild(video);
            }

            mediaPreview.classList.remove('hidden');

            // Enable post button if content is empty but media is selected
            if (postContent.value.length === 0) {
                postButton.disabled = false;
            }
        };

        reader.readAsDataURL(file);
    }

    // Remove media
    removeMedia.addEventListener('click', function () {
        selectedMedia = null;
        mediaPreview.classList.add('hidden');
        photoUpload.value = '';
        videoUpload.value = '';

        // Disable post button if content is also empty
        if (postContent.value.length === 0) {
            postButton.disabled = true;
        }
    });


    closeLocation.addEventListener('click', function () {
        locationSelector.classList.add('hidden');
    });

    locationInput.addEventListener('input', function () {
        selectedLocation = this.value;
    });


    // Form submission
    postForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const { data: userData } = await supabaseClient.auth.getUser();
        const userId = userData?.user?.id;
        const userName = userData?.user.user_metadata.display_name;

        if (!userId) {
            alert("You must be logged in.");
            return;
        }

        let uploadedMediaUrl = null;
        let mediaType = null;

        // 1. Upload media if any
        if (selectedMedia) {
            const file = selectedMedia.file;
            const fileExt = file.name.split('.').pop();
            const fileName = `${userId}-${Date.now()}.${fileExt}`;

            const { data: uploadData, error: uploadError } = await supabaseClient
                .storage
                .from("post-media")
                .upload(fileName, file, {
                    cacheControl: "3600",
                    upsert: false
                });

            if (uploadError) {
                console.error(uploadError);
                alert("Media upload failed!");
                return;
            }

            const { data: publicUrl } = supabaseClient
                .storage
                .from("post-media")
                .getPublicUrl(fileName);

            uploadedMediaUrl = publicUrl.publicUrl;
            mediaType = selectedMedia.type;
        }

        // 2. Insert post into table
        const { error: insertError } = await supabaseClient
            .from("posts")
            .insert({
                user_id: userId,
                user_name: userName,
                content: postContent.value,
                media_url: uploadedMediaUrl,
                media_type: mediaType,
                location: selectedLocation
            });

        if (insertError) {
            console.error(insertError);
            alert("Failed to publish post!");
            return;
        }

        alert("Post created successfully!");

        // Reset form UI
        postForm.reset();
        postContent.value = '';
        charCount.textContent = '0';
        mediaPreview.classList.add('hidden');
        selectedMedia = null;
        selectedLocation = null;
        postButton.disabled = true;
    });

    postButton.disabled = true;

    async function getPost() {
        //1. query post
        const { data, error } = await supabaseClient
            .from('posts')
            .select('*')
            .order("created_at", {
                ascending: false
            });



        const postsContainer = document.getElementById('all-posts');

        if (!data && data.length > 0) {
            alert('No data');
        }

        data.forEach(post => {
            const postHtml = uploadedPost(post.user_name, post.content, post.media_url);
            postsContainer.innerHTML += postHtml;
        });
    }

    LoadHome();
    getPost();
});
