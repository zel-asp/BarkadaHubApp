export default function comments(name, comment, avatar, timeAgo = "2 minutes ago", likes = 3, isFollowing = false) {
    return `
        <div class="comment-container bg-white rounded-xl p-5 mb-4 hover:bg-gray-50 transition-all duration-200 border border-gray-100 shadow-sm">
            <div class="flex gap-4">
                <!-- Avatar -->
                <div class="flex-0">
                    <div class="w-12 h-12 rounded-full bg-linear-to-r from-green-400 to-teal-500 overflow-hidden shadow-sm">
                        <img src="${avatar}" alt="${name}" 
                            class="w-full h-full object-cover">
                    </div>
                </div>
                
                <!-- Comment Content -->
                <div class="flex-1 min-w-0">
                    <!-- Header -->
                    <div class="flex items-start justify-between mb-2">
                        <div class="flex items-center gap-2">
                            <h4 class="font-bold text-gray-900 text-sm">${name}</h4>
                            ${isFollowing ? `
                                <span class="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">Following</span>
                            ` : `
                                <button class="text-xs bg-gray-100 text-gray-700 hover:bg-blue-50 hover:text-blue-700 px-2 py-0.5 rounded-full transition-colors duration-200 follow-btn">
                                    Follow
                                </button>
                            `}
                        </div>
                        <span class="text-xs text-gray-400">${timeAgo}</span>
                    </div>
                    
                    <!-- Comment Text -->
                    <div class="mb-3">
                        <p class="text-gray-800 text-sm leading-relaxed">
                            ${comment}
                        </p>
                    </div>
                    
                    <!-- Like Button -->
                    <div class="flex items-center">
                        <button class="like-btn flex items-center gap-2 text-gray-500 hover:text-red-500 transition-colors duration-200 group">
                            <div class="w-8 h-8 rounded-full flex items-center justify-center group-hover:bg-red-50 transition-colors">
                                <i class="fas fa-heart text-gray-400 group-hover:text-red-500 transition-colors"></i>
                            </div>
                            <span class="font-medium text-sm like-count">${likes}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
};

export function emptyComments() {
    return `
        <!-- Comments Section -->
        <div class="mb-20 md:mb-24" id="commentsContainer">
            <!-- Empty State -->
            <div id="emptyState" class="text-center py-12">
                <div class="inline-block p-6 rounded-full bg-gray-100 mb-4">
                    <i class="far fa-comments text-gray-400 text-4xl"></i>
                </div>
                <h3 class="text-xl font-medium text-gray-700 mb-2">No comments yet</h3>
                <p class="text-gray-500 max-w-md mx-auto">Be the first to share your thoughts on this post. Your
                    comment will appear here.</p>
            </div>
        </div>
    `
}