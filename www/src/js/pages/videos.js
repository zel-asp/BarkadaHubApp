document.addEventListener('DOMContentLoaded', () => {
    // --- MODAL ELEMENTS ---
    const openCreateBtn = document.getElementById('openCreateVideoBtn');
    const createModal = document.getElementById('createVideoModal');
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

    // --- OPEN / CLOSE MODAL ---
    function openModal() {
        createModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; // prevent background scroll
    }

    function closeModal() {
        createModal.classList.add('hidden');
        document.body.style.overflow = ''; // restore scroll
        resetModal();
    }

    function resetModal() {
        videoFileInput.value = '';
        videoPreviewPlayer.src = '';
        videoPreview.classList.add('hidden');
        videoCaption.value = '';
        charCount.textContent = '0/150';
        postVideoBtn.disabled = true;
    }

    openCreateBtn.addEventListener('click', openModal);
    closeModalBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    createModal.addEventListener('click', e => {
        if (e.target === createModal) closeModal();
    });

    // --- VIDEO UPLOAD & PREVIEW ---
    selectVideoBtn.addEventListener('click', () => videoFileInput.click());

    videoFileInput.addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = e => {
            videoPreviewPlayer.src = e.target.result;
            videoPreview.classList.remove('hidden');
            postVideoBtn.disabled = false;
        };
        reader.readAsDataURL(file);
    });

    removeVideoBtn.addEventListener('click', () => {
        resetModal();
    });

    // --- CHARACTER COUNTER ---
    videoCaption.addEventListener('input', () => {
        const len = videoCaption.value.length;
        charCount.textContent = `${len}/150`;
        postVideoBtn.disabled = !(len > 0 || videoFileInput.files.length > 0);
    });

    // --- FORM SUBMIT (MOCK) ---
    createVideoForm.addEventListener('submit', e => {
        e.preventDefault();
        const caption = videoCaption.value.trim();
        const file = videoFileInput.files[0];

        if (!file && !caption) return;

        console.log('Video ready to post:', { file, caption });
        alert('Video posted successfully (mock)!');

        closeModal();
    });

    // --- PLAY / PAUSE VIDEO ON CLICK ---
    document.addEventListener('click', function (e) {
        const videoItem = e.target.closest('.video-barkadahub-item');
        if (videoItem) {
            const video = videoItem.querySelector('video');
            if (video.paused) {
                video.play();
            } else {
                video.pause();
            }
        }
    });
});


// Auto-play videos when they come into view
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        const video = entry.target.querySelector('video');
        if (entry.isIntersecting) {
            video.play();
        } else {
            video.pause();
        }
    });
}, { threshold: 0.8 });

document.querySelectorAll('.video-item').forEach(item => {
    observer.observe(item);
});


