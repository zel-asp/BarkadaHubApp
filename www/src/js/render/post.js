export default function uploadedPost(name, content, file, media_type) {
    return `
       <div class="bg-white rounded-lg shadow-sm p-5 mb-6">
            <div class="flex justify-between items-center mb-4">
                <div class="flex items-center gap-3">
                    <div class="avatar w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
                        <img src="https://i.pravatar.cc/150?img=1" alt="${name} Avatar"
                            class="w-full h-full object-cover">
                    </div>
                    <div>
                        <h4 class="font-medium">${name}</h4>
                        <span class="text-xs text-gray-500">Just now · <i
                                class="fas fa-users"></i></span>
                    </div>
                </div>
                <div class="text-gray-500 cursor-pointer">
                    <i class="fas fa-ellipsis-h"></i>
                </div>
            </div>
            <div class="mb-4">
            <p>${content}</p>
            ${file ? `
                <div class="post-image mt-3 rounded-lg overflow-hidden h-50 w-full shadow-lg">
                    ${media_type === "video"
                ? `<video src="${file}" controls class="w-full h-full object-cover"></video>`
                : `<img src="${file}" alt="Post Image" class="w-full h-50 object-fit ">`
            }
                </div>
            ` : ''}


            </div>
            <div
                class="flex justify-between text-xs text-gray-500 mb-3 pb-3 border-b border-gray-200">
                <div class="likes">0 likes</div>
                <div class="comments">0 comments</div>
            </div>
            <div class="flex justify-around border-t border-gray-200 pt-2">
                <button
                    class="post-action flex-1 flex items-center justify-center gap-2 text-gray-600 hover:bg-gray-100 py-2 rounded-lg transition">
                    <i class="far fa-thumbs-up text-sm"></i>
                    <span class="text-xs">Like</span>
                </button>
                <button
                    class="post-action flex-1 flex items-center justify-center gap-2 text-gray-600 hover:bg-gray-100 py-2 rounded-lg transition">
                    <i class="far fa-comment text-sm"></i>
                    <span class="text-xs">Comment</span>
                </button>
                <button
                    class="post-action flex-1 flex items-center justify-center gap-2 text-gray-600 hover:bg-gray-100 py-2 rounded-lg transition">
                    <i class="far fa-share-square text-sm"></i>
                    <span class="text-xs">Share</span>
                </button>
            </div>
        </div>
    `
}