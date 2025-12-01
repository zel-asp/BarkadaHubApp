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
                                class="fa-regular fa-user"></i></span>
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

export function lost_found(img, type, item, description, location, datePosted) {
    return `
        <div class="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
            <div class="h-56 overflow-hidden bg-linear-to-br from-gray-50 to-blue-50 p-2 relative group">
                <div class="w-full h-full rounded-lg overflow-hidden border-2 border-blue-100/50">
                    <img src="${img}"
                        alt="${item}" 
                        class="w-full h-full object-fit transition-transform duration-500 group-hover:scale-110">
                </div>
            </div>
            
            <div class="p-6 bg-linear-to-b from-white to-gray-50/50">
                <!-- Enhanced status badge with better colors -->
                <span
                    class="item-status status-lost inline-block ${type === 'lost' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'} text-xs px-3 py-1.5 rounded-full font-semibold mb-3 shadow-sm">
                    ${type === 'lost' ? 'LOST' : 'FOUND'}
                </span>
                
                <h3 class="font-bold text-md mb-3 text-gray-800">Item: ${item}</h3>
                <p class="text-gray-600 mb-4 text-sm  leading-relaxed">Desciption: ${description}</p>
                
                <!-- Enhanced location/date with colored icons -->
                <div class="flex justify-between text-sm text-gray-600 mb-5 bg-gray-50/80 rounded-lg p-3">
                    <span class="flex items-center font-medium">
                        <i class="fas fa-map-marker-alt mr-2 text-gray-500"></i> 
                        <span class="text-gray-700">${location}</span>
                    </span>
                    <span class="flex items-center font-medium">
                        <i class="fas fa-clock mr-2 text-gray-500"></i> 
                        <span class="text-gray-700">${datePosted}</span>
                    </span>
                </div>
                
                <!-- Enhanced button with gradient -->
                <button
                    class="claim-btn w-full bg-primary text-white py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-md hover:shadow-lg active:scale-[0.98]">
                    ${type === 'lost' ? 'I Found This' : 'This is Mine'}
                </button>
            </div>
        </div>
    `
}