export function createVideoItem(video, avatar, username, userId, caption, postId, likes = 0, postOwner = true, friendStatus = null, userLiked = false) {

    let friendsIcon = '';
    let followButton = '';

    if (!postOwner) {
        switch (friendStatus) {
            case null:
            case undefined:
                friendsIcon = `<i class="fas fa-user-plus text-sm text-white drop-shadow-lg"></i>`;
                break;
            case 'pending':
                friendsIcon = `<i class="fas fa-user-minus text-sm text-white drop-shadow-lg"></i>`;
                break;
            case 'accept':
                friendsIcon = `<i class="fas fa-user-check text-sm text-white drop-shadow-lg"></i>`;
                break;
            case 'friends':
                friendsIcon = `<i class="fas fa-user-friends text-sm text-white drop-shadow-lg"></i>`;
                break;
            default:
                friendsIcon = '';
        }
    }

    return `
        <div class="video-barkadahub-container h-screen w-full snap-start">
            <div class="video-barkadahub-item relative" data-id="${postId}" >
                <!-- Video Container -->
                <div class="w-screen h-full bg-black flex items-center justify-center relative">
                    <video class="w-full h-full object-contain" loop playsinline>
                        <source src="${video}" type="video/mp4">
                    </video>
                    
                    <!-- Subtle linear overlay at bottom for better text readability -->
                    <div class="absolute bottom-0 left-0 right-0 h-40 bg-linear-to-t from-black/70 via-black/30 to-transparent pointer-events-none"></div>
                </div>

                <!-- Content Overlay - Positioned higher to avoid dynamic header -->
                <div class="absolute inset-0 z-20 flex flex-col justify-end pb-10">
                    <!-- User Profile & Caption -->
                    <div class="px-6 mb-8">
                        <a href="./otherProfile.html?user=${userId}">
                            <div class="flex items-center gap-3 mb-4">
                                <!-- Avatar with glass effect -->
                                    <div class="w-14 h-14 rounded-full overflow-hidden border-2 border-white/30 backdrop-blur-sm bg-white/10 shadow-lg">
                                        <img src="${avatar}" alt="${username}" class="w-full h-full object-cover" loading="lazy">
                                    </div> 
                                <!-- User Info -->
                                <div class="flex-1">
                                    <div class="flex items-center gap-2 mb-1">
                                        <h3 class="font-bold text-white text-xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">${username}</h3>
                                        <span class="text-white/80 text-xs px-2.5 py-1 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
                                            @${username.toLowerCase().replace(/\s+/g, '')}
                                        </span>
                                    </div>
                                    <p class="text-white/95 text-md leading-relaxed drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] text-justify break-all w-60 ">${caption}</p>
                                </div>
                            </div>
                        </a>
                    </div>
                </div>

                <!-- Action Buttons - Sidebar positioned higher -->
                <div class="absolute right-6 bottom-20 z-30 flex flex-col items-center gap-7">
                    <!-- Like button with circle badge -->
                    <div class="action-button likeBtn group ${userLiked ? 'liked' : ''}" 
                         data-video-id="${postId}" 
                         data-liked="${userLiked}">                        
                        <div class="relative">
                            <!-- Glass effect background -->
                            <div class="absolute inset-0 bg-black/30 backdrop-blur-md rounded-full transform scale-110"></div>
                            <!-- Outer glow -->
                            <div class="absolute -inset-1 bg-red-500/20 rounded-full blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <!-- Main button -->
                            <div class="relative w-12 h-12 rounded-full bg-linear-to-br from-white/20 to-white/5 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-xl group-hover:scale-105 transition-transform duration-300">
                                <i class="${userLiked ? 'fas text-red-500' : 'far'} fa-heart text-xl drop-shadow-lg"></i>
                                <!-- Count badge -->
                                <div class="absolute -top-1 -right-1 min-w-[22px] h-5 bg-red-500 rounded-full border-2 border-white flex items-center justify-center px-1 shadow-lg">
                                    <span class="likeCount text-white font-bold text-[10px]">${likes}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    ${postOwner ? `
                        <!-- Ellipsis menu for owner with glass effect -->
                        <div class="action-button openEllipsisMenuBtn group" data-id='${postId}'>
                            <div class="relative">
                                <!-- Glass effect background -->
                                <div class="absolute inset-0 bg-black/30 backdrop-blur-md rounded-full transform scale-110"></div>
                                <!-- Outer glow -->
                                <div class="absolute -inset-1 bg-gray-500/20 rounded-full blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                <!-- Icon container -->
                                <div class="relative w-12 h-12 rounded-full bg-linear-to-br from-white/20 to-white/5 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-xl group-hover:scale-105 transition-transform duration-300">
                                    <i class="fas fa-ellipsis-h text-lg text-white drop-shadow-lg"></i>
                                </div>
                            </div>
                        </div>` :
            `<div class="action-button followBtn group" data-user="${username}" data-user-post-id="${userId}" data-status="${friendStatus || 'null'}">
                <div class="relative">
                    <!-- Glass effect background -->
                    <div class="absolute inset-0 bg-black/30 backdrop-blur-md rounded-full transform scale-110"></div>
                    <!-- Outer glow -->
                    <div class="absolute -inset-1 bg-blue-500/20 rounded-full blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <!-- Container with centered icon -->
                    <div class="relative w-12 h-12 rounded-full 
                                bg-linear-to-br from-white/20 to-white/5 
                                backdrop-blur-sm border border-white/30 
                                flex items-center justify-center 
                                shadow-xl group-hover:scale-105 transition-transform duration-300">
                        ${friendsIcon}
                    </div>
                </div>
            </div>`}
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
            <p class="text-gray-500 mb-6 font-bold">Be the first to share a video!</p>
        </div>
    `;
}
