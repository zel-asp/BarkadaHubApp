document.addEventListener('click', function (e) {
    if (e.target.closest('.video-item')) {
        const video = e.target.closest('.video-item').querySelector('video');
        if (video.paused) {
            video.play();
        } else {
            video.pause();
        }
    }
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
