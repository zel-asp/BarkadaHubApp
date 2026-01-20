export default function comments(name, comment, avatar, timeAgo = "2 minutes ago") {
    return `
        <div class="comment-container bg-linear-to-br from-white to-gray-50/80 backdrop-blur-md rounded-2xl p-5 mb-4 transition-all duration-300 border border-white/50 shadow-sm hover:shadow-xl hover:border-blue-100 group hover:scale-[1.002]">
            <div class="flex gap-4">
                <!-- Avatar with subtle animation -->
                <div class="flex-0 relative">
                    <div class="w-14 h-14 rounded-full overflow-hidden shadow-lg ring-3 ring-white/90 group-hover:ring-blue-100 transition-all duration-500">
                        <div class="absolute inset-0 bg-linear-to-br from-blue-100 to-teal-100 opacity-0 group-hover:opacity-50 transition-opacity duration-500"></div>
                        <img src="${avatar}" alt="${name}" 
                            class="w-full h-full object-cover relative transform group-hover:scale-105 transition-transform duration-500 ease-out" 
                            loading="eager"
                            onerror="this.src='https://api.dicebear.com/7.x/avataaars/svg?seed=${name}'">
                    </div>
                    <!-- Online indicator dot -->
                    <div class="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-white shadow-sm group-hover:scale-125 transition-transform duration-300"></div>
                </div>
                
                <!-- Comment Content -->
                <div class="flex-1 min-w-0">
                    <!-- Header with enhanced typography -->
                    <div class="flex items-start justify-between mb-3">
                        <div class="flex items-center gap-3">
                            <div>
                                <h4 class="font-bold text-gray-900 text-base tracking-tight">${name}</h4>
                                <!-- Role badge (optional) -->
                            </div>
                        </div>
                        <div class="flex items-center gap-2">
                            <!-- Time with icon -->
                            <i class="far fa-clock text-xs text-gray-400"></i>
                            <span class="text-xs font-medium text-gray-500 bg-gray-50 px-2 py-1 rounded-full">${timeAgo}</span>
                        </div>
                    </div>
                    
                    <!-- Comment Text with improved readability -->
                    <div class="relative">
                        <div class="absolute -left-3 top-0 bottom-0 w-0.5 bg-linear-to-b from-blue-200 to-teal-200 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <p class="text-gray-800 text-sm leading-relaxed wrap-break-word pl-1">
                            ${comment}
                        </p>
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