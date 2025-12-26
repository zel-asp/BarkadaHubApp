export function createVideoItem(video, avatar, username, userId, caption, postId, likes = 0, comments = 0) {
    return `
        <div class="video-barkadahub-container h-auto w-full snap-start">
            <div class="video-barkadahub-item">
                <div class="w-screen h-screen bg-black flex items-center justify-center">
                    <video class="w-full h-full object-contain" loop playsinline>
                        <source src="${video}" type="video/mp4">
                    </video>
                </div>

                <!-- Video Overlay -->
                <div class="absolute inset-0 video-barkadahub-overlay"></div>

                <!-- Video Info -->
                <div class="absolute bottom-10 left-0 right-0 p-6 z-30">
                    <div class="flex items-center gap-3 mb-4">
                        <div class="w-12 h-12 rounded-full overflow-hidden border-2 border-white">
                            <img src="${avatar}" alt="${username}" class="w-full h-full object-cover">
                        </div>
                        <div class="text-white">
                            <h3 class="font-bold text-lg">${username}</h3>
                            <p class="text-sm opacity-90">@${username.toLowerCase().replace(/\s+/g, '')}</p>
                        </div>
                        <button
                            class="ml-4 bg-none text-white border border-white px-4 py-1 rounded-full text-sm font-semibold hover:bg-white hover:text-black transition-all duration-200" data-id='${userId}'>
                            Follow
                        </button>
                    </div>
                    <p class="text-white text-sm mb-2 text-justify break-all">${caption}</p>
                </div>

                <!-- Sidebar Actions -->
                <div class="absolute right-4 bottom-32 z-30 flex flex-col items-center gap-6">
                    <div class="action-button likeBtn" data-id='${postId}'>
                        <div class="action-icon">
                            <i class="fas fa-heart text-xl"></i>
                        </div>
                        <span class="action-count">${likes}</span>
                    </div>

                    <div class="action-button openCommentBtn" data-id='${postId}'>
                        <div class="action-icon">
                            <i class="fas fa-comment text-xl"></i>
                        </div>
                        <span class="action-count">${comments}</span>
                    </div>

                    <div class="action-button openEllipsisMenuBtn" data-id='${postId}'>
                        <div class="action-icon">
                            <i class="fas fa-ellipsis-h text-xl"></i>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Empty state
export function createEmptyVideoState() {
    return `
        <div class="flex flex-col items-center justify-center h-screen text-white">
            <i class="fas fa-video-slash text-6xl mb-4 opacity-50"></i>
            <h3 class="text-xl font-bold mb-2">No Videos Yet</h3>
            <p class="text-gray-400 mb-6">Be the first to share a video!</p>
            <button id="emptyStateCreateBtn" 
                class="px-6 py-3 bg-primary hover:bg-secondary text-white rounded-xl font-medium transition-colors duration-200">
                <i class="fas fa-plus mr-2"></i>Upload First Video
            </button>
        </div>
    `;
}
