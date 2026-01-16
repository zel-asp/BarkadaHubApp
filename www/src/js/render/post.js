export default function uploadedPost(avatar = hi, postOwner = false, name, date, content, file, media_type, postId = 1, likes = 0, comments = 0, isLiked = false, filePath = null, userId, friendStatus = null) {
    const likeIconClass = isLiked ? 'fas fa-heart text-red-600' : 'fas fa-heart text-gray-400';
    const likeBtnClass = isLiked ? 'text-red-600' : '';
    const likeText = isLiked ? 'Liked' : 'Like';

    let followButtonHTML = '';

    if (!postOwner) {
        switch (friendStatus) {
            case null:
            case undefined:
                followButtonHTML = `
            <button class="follow-btn group px-3 py-1.5 text-xs font-medium rounded-full border transition-all duration-200 bg-primary text-white hover:bg-blue-500 hover:text-white"
                data-user="${name}" data-user-post-id="${userId}" data-status="null">
                <i class="fas fa-user-plus mr-1"></i>
                <span>Follow</span>
            </button>`;
                break;

            case 'pending':
                followButtonHTML = `
            <button class="follow-btn group px-3 py-1.5 text-xs font-medium rounded-full border transition-all duration-200 bg-yellow-500 text-white hover:bg-yellow-600"
                data-user="${name}" data-user-post-id="${userId}" data-status="pending" disabled>
                <i class="fas fa-hourglass-half mr-1"></i>
                <span>Requested</span>
            </button>`;
                break;

            case 'accept':
                followButtonHTML = `
            <button class="follow-btn group px-3 py-1.5 text-xs font-medium rounded-full border transition-all duration-200 bg-green-500 text-white hover:bg-green-600"
                data-user="${name}" data-user-post-id="${userId}" data-status="accept">
                <i class="fas fa-user-check mr-1"></i>
                <span>Accept</span>
            </button>`;
                break;

            case 'friends':
                followButtonHTML = `
            <button class="follow-btn group px-3 py-1.5 text-xs font-medium rounded-full border transition-all duration-200 bg-gray-400 text-white"
                data-user="${name}" data-user-post-id="${userId}" data-status="friends" disabled>
                <i class="fas fa-user-friends mr-1"></i>
                <span>Friends</span>
            </button>`;
                break;

            default:
                followButtonHTML = '';
        }
    }

    return `
    <div class="bg-white rounded-lg shadow-sm p-5 mb-6 post" data-post-id="${postId}" data-file-path="${filePath}" id='${postId}'>
        <div class="flex justify-between items-center mb-4">
                <div class="flex items-center gap-3">
                    <div class="avatar w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
                        <img src="${avatar}" alt="${name} Avatar" class="w-full h-full object-cover" loading="eager">
                    </div>
                    <div>
                        <h4 class="font-bold">${name}</h4>
                        <span class="text-xs text-gray-500">${date} · <i class="fa fa-user"></i></span>
                    </div>
                </div>
            <div class="flex items-center gap-2">
                ${followButtonHTML}
                ${postOwner ?
            `<button class="ellipsis-btn group" data-post-id="${postId}">
                    <div
                        class="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 group-hover:bg-gray-100">
                        <i class="fas fa-ellipsis-h text-gray-500 group-hover:text-gray-700"></i>
                    </div>
                </button>`
            : ''
        }
            </div>
        </div>

        <div class="mb-4">
            <p class="whitespace-pre-line mb-3">${content}</p>
            ${file ? `
            <div class="media-container mt-3 rounded-lg overflow-hidden bg-gray-50">
                <div class="media-wrapper flex items-center justify-center max-h-96">
                    ${media_type === "video"
                ? `<video src="${file}" controls class="w-auto max-w-full h-auto max-h-96 object-contain"></video>`
                : `<img src="${file}" alt="Post Image" class="w-auto max-w-full h-auto max-h-96 object-contain"
                        onload="this.style.opacity='1'" style="opacity: 0; transition: opacity 0.3s;" loading="lazy">`
            }
                </div>
                ${media_type === "image" ? `
                <div class="media-footer px-3 py-2 border-t border-gray-100 flex justify-end">
                    <button class="text-xs text-gray-500 hover:text-primary transition-colors flex items-center gap-1"
                        onclick="viewFullImage('${file}')">
                        <i class="fas fa-expand-alt text-xs"></i>
                        <span>View full</span>
                    </button>
                </div>` : ''}
            </div>
            ` : ''}
        </div>


        <div class="flex justify-between text-xs text-gray-500 mb-2 sm:mb-3 pb-2 sm:pb-3 border-b border-gray-100">
            <div class="flex items-center gap-1">
                <i class="fas fa-heart text-red-400"></i>
                <span class="likes-count">${likes}</span>
            </div>
            <button type="submit" class="commentBtn flex items-center gap-1" data-post-id="${postId}">
                <i class="fas fa-comment text-blue-400"></i>
                <span>${comments}</span>
            </button>
        </div>

        <div class="flex justify-around border-t border-gray-100 pt-2">
            <button
                class="like-btn flex-1 flex items-center justify-center gap-2 ${likeBtnClass} hover:text-primary hover:bg-gray-50 py-2 sm:py-2.5 rounded-lg transition-all duration-200"
                data-post-id="${postId}">
                <i class="${likeIconClass}"></i>
                <span class="text-xs font-bold">${likeText}</span>
            </button>
            <button type="submit"
                class="post-action commentBtn flex-1 flex items-center justify-center gap-2 text-gray-600 hover:text-blue-600 hover:bg-gray-50 py-2 sm:py-2.5 rounded-lg transition-all duration-200"
                data-post-id="${postId}">
                <i class="fas fa-comment text-gray-400"></i>
                <span class="text-xs font-bold">Comment</span>
            </button>
        </div>
    </div>
`;
}


export function lost_found(img, type, item, description, location, datePosted, postOwner = false, userId = 1, filePath = null, postId = 1, messageAdded = false) {
    return `
<div class="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300" >
    <div class="h-56 overflow-hidden bg-linear-to-br from-gray-50 to-blue-50 p-2 relative group">
        <div class="w-full h-full rounded-lg overflow-hidden border-2 border-blue-100/50">
            <img src="${img}" alt="${item}"
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
                <i class="fas fa-calendar mr-2 text-gray-500"></i>
                <span class="text-gray-700">${datePosted}</span>
            </span>
        </div>

        ${postOwner
            ? `
            <!-- Owner buttons -->
            <div class="flex gap-3">
                <button
                    class="delete-btn flex-1 bg-red-500 text-white py-3 rounded-xl font-semibold hover:bg-red-600 transition-all duration-300 shadow-md hover:shadow-lg active:scale-[0.98]"
                    data-post-id="${postId}"
                    data-file-path="${filePath}">
                    Delete
                </button>
            </div>
            `
            : `
            <!-- Regular user button -->
            <a href="messages.html">
                <button
                    class="message-btn w-full ${messageAdded ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'} 
                    text-white py-3 rounded-xl font-semibold transition-all duration-300 shadow-md hover:shadow-lg active:scale-[0.98] 
                    flex items-center justify-center gap-2"
                    data-user-id="${userId}"
                    data-message-added="${messageAdded}"
                    data-post-id="${postId}">
                    <i class="fas ${messageAdded ? 'fa-comments' : 'fa-comment'}"></i>
                    ${messageAdded ? 'Go to Message' : 'Message'}
                </button>
            </a>
        `
        }

    </div>
</div>
`
}