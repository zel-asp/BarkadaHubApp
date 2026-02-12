export default function comments(
    name,
    comment,
    avatar,
    timeAgo = "2 minutes ago",
    commentId = 0,
    userId = 0,
    isOwner = true,
    postId = 0
) {
    // Sanitize text to prevent XSS
    const sanitize = (str) =>
        String(str)
            .replace(/[&<>"'`]/g, (match) => ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;",
                "`": "&#96;",
            }[match]));

    const safeName = sanitize(name);
    const safeComment = sanitize(comment);

    // Dynamic action button
    const actionButton = !isOwner
        ? `<button class="mention-btn text-xs font-medium text-primary hover:text-blue-600 transition-colors duration-200 flex items-center gap-1" data-comment-id="${commentId}" data-user-id="${userId}" data-post-id="${postId}">
                <i class="far fa-at"></i>
                Mention
        </button>`
        : `<button class="delete-btn text-xs font-medium text-danger hover:text-blue-600 transition-colors duration-200 flex items-center gap-1" data-comment-id="${commentId}" data-post-id="${postId}">
                <i class="fa fa-trash"></i>
                Delete
        </button>`;

    return `
        <div class="comment-container bg-gray-50/80 backdrop-blur-sm rounded-xl p-2 mb-1 transition-all duration-200 border border-gray-100 hover:border-gray-200 hover:bg-gray-50 group" data-userId="${userId}" data-comment-id="${commentId}">
            <div class="flex gap-3">
                <!-- Avatar -->
                <div class="shrink-0">
                    <div class="w-8 h-8 rounded-full overflow-hidden ring-2 ring-white">
                        <img src="${avatar}" alt="${safeName}" title="${safeName}" 
                            class="w-full h-full object-cover"
                            loading="eager"
                            onerror="this.src='https://api.dicebear.com/7.x/avataaars/svg?seed=${safeName}'">
                    </div>
                </div>

                <!-- Main content -->
                <div class="flex-1 min-w-0">
                    <div class="bg-white rounded-lg p-3 border border-gray-100">
                        <h4 class="font-bold text-gray-900 text-sm mb-1.5">${safeName}</h4>
                        <p class="text-gray-700 text-sm leading-relaxed wrap-break-word">
                            ${safeComment}
                        </p>
                    </div>

                    <!-- Footer with timestamp and action button -->
                    <div class="flex items-center gap-3 mt-2 ml-1">
                        <span class="text-xs text-gray-500">${timeAgo}</span>
                        ${actionButton}
                    </div>
                </div>
            </div>
        </div>
        <div class="h-4"></div>
    `;
}

export function emptyComments() {
    return `
        <!-- Comments Section -->
        <div class="mb-20 md:mb-24" id="commentsContainer">
            <!-- Enhanced Empty State -->
            <div id="emptyState" class="text-center py-16 px-4">
                <!-- Animated icon container -->
                <div class="relative inline-block mb-6">
                    <div class="absolute inset-0 bg-linear-to-r from-blue-100/50 to-teal-100/50 rounded-full blur-xl animate-pulse"></div>
                    <div class="relative p-7 rounded-full bg-black/10">
                        <i class="far fa-comment-dots text-5xl text-linear bg-gray-400 bg-clip-text text-transparent"></i>
                    </div>
                    <!-- Floating dots -->
                    <div class="absolute -top-2 -left-2 w-4 h-4 bg-blue-400 rounded-full animate-bounce"></div>
                    <div class="absolute -bottom-2 -right-2 w-4 h-4 bg-teal-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
                </div>
                
                <!-- Text content -->
                <h3 class="text-2xl font-bold text-gray-800 mb-3 tracking-tight">
                    No comments yet
                </h3>
                <p class="text-gray-600 max-w-md mx-auto text-base leading-relaxed mb-8">
                    Be the first to start the conversation! Share your thoughts and spark meaningful discussions.
                </p>
            </div>
        </div>
    `;
};