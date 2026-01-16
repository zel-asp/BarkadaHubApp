export default function comments(name, comment, avatar, timeAgo = "2 minutes ago") {
    return `
        <div class="comment-container bg-white/50 backdrop-blur-sm rounded-xl p-5 mb-3 transition-all duration-300 border border-gray-100 shadow-lg hover:shadow-2xl hover:border-gray-200 group">
            <div class="flex gap-4">
                <!-- Avatar -->
                <div class="flex-0">
                    <div class="w-12 h-12 rounded-full bg-linear-to-r from-green-400 to-teal-500 overflow-hidden shadow-lg ring-2 ring-white ring-offset-1 ring-offset-gray-50 group-hover:ring-teal-300 transition-all duration-300">
                        <img src="${avatar}" alt="${name}" 
                            class="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500" loading="eager">
                    </div>
                </div>
                
                <!-- Comment Content -->
                <div class="flex-1 min-w-0">
                    <!-- Header -->
                    <div class="flex items-start justify-between mb-2">
                        <div class="flex items-center gap-2">
                            <h4 class="font-semibold text-gray-900 text-base">${name}</h4>
                        </div>
                        <span class="text-xs text-gray-400 font-medium">${timeAgo}</span>
                    </div>
                    
                    <!-- Comment Text -->
                    <p class="text-gray-800 text-sm break-all text-justify">
                        ${comment}
                    </p>
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
                <div class="inline-block p-6 rounded-full bg-black/5 mb-4">
                    <i class="far fa-comments text-gray-500 text-4xl"></i>
                </div>
                <h3 class="text-xl font-semibold text-gray-700 mb-2 ">No comments yet</h3>
                <p class="text-gray-500 max-w-md mx-auto">Be the first to share your thoughts on this post. Your
                    comment will appear here.</p>
            </div>
        </div>
    `
}