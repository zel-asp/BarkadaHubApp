export default function uploadedPost(avatar = hi, postOwner = false, name, date, content, file, media_type, postId = 1, likes = 0, comments = 0, isLiked = false, filePath = null, userId, friendStatus = null, isReported = false) {
    const likeIconClass = isLiked ? 'fas fa-heart text-red-600' : 'fas fa-heart text-gray-400';
    const likeBtnClass = isLiked ? 'text-red-600' : '';
    const likeText = isLiked ? 'Liked' : 'Like';

    let followButtonHTML = '';
    let reportButtonHTML = '';

    if (!postOwner) {
        switch (friendStatus) {
            case null:
            case undefined:
                followButtonHTML = `
                <div class="relative group" title="Follow ${name}">
                    <button class="follow-btn w-9 h-9 rounded-full bg-primary text-white shadow-sm hover:shadow-md hover:scale-105 active:scale-95 transition-all duration-300"
                        data-user="${name}" data-user-post-id="${userId}" data-status="null">
                        <i class="fas fa-user-plus text-sm"></i>
                    </button>
                    <div class="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                        Follow
                        <div class="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-800"></div>
                    </div>
                </div>`;
                break;

            case 'pending':
                followButtonHTML = `
                <div class="relative group" title="Request pending">
                    <button class="follow-btn w-9 h-9 rounded-full bg-linear-to-br from-amber-400 to-amber-500 text-white shadow-sm cursor-wait"
                        data-user="${name}" data-user-post-id="${userId}" data-status="pending" disabled>
                        <i class="fas fa-hourglass-half text-sm "></i>
                    </button>
                    <div class="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                        Pending
                        <div class="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-800"></div>
                    </div>
                </div>`;
                break;

            case 'accept':
                followButtonHTML = `
                <div class="relative group" title="Accept friend request">
                    <button class="follow-btn w-9 h-9 rounded-full bg-linear-to-br from-emerald-400 to-green-500 text-white shadow-sm hover:shadow-md hover:scale-105 active:scale-95 transition-all duration-300"
                        data-user="${name}" data-user-post-id="${userId}" data-status="accept">
                        <i class="fas fa-user-check text-sm"></i>
                    </button>
                    <div class="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                        Accept
                        <div class="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-800"></div>
                    </div>
                </div>`;
                break;

            case 'friends':
                followButtonHTML = `
                <div class="relative group" title="Friends">
                    <button class="follow-btn w-9 h-9 rounded-full bg-linear-to-br from-gray-400 to-gray-500 text-white shadow-sm cursor-default"
                        data-user="${name}" data-user-post-id="${userId}" data-status="friends" disabled>
                        <i class="fas fa-user-friends text-sm"></i>
                    </button>
                    <div class="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                        Friends
                        <div class="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-800"></div>
                    </div>
                </div>`;
                break;

            default:
                followButtonHTML = '';
        }
    }

    return `
        <div class="bg-white rounded-lg shadow-sm p-5 mb-6 post" data-post-id="${postId}" data-file-path="${filePath}"
            id='${postId}' data-user-id="${userId}">
            <div class="flex justify-between items-center mb-4">
                <div class="flex items-center gap-3">
                    <a href="${postOwner ? './profile.html' : `./otherProfile.html?user=${userId}`}">
                        <div class="avatar w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
                            <img src="${avatar}" alt="${name} Avatar" class="w-full h-full object-cover" loading="eager">
                        </div>
                    </a>
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
            : ''}
                    ${!postOwner ?
            `
                    ${isReported ?
                // Confirmed report
                `<div class="relative group">
                        <button
                            class="report-btn flex items-center gap-2 px-3 py-2 text-sm rounded-xl bg-linear-to-r from-emerald-500/10 to-teal-500/10 text-emerald-700 border border-emerald-200/50 cursor-not-allowed"
                            data-post-id="${postId}" data-user-id="${userId}" disabled>
                            <div class="relative">
                                <i class="fas fa-check-circle text-emerald-500"></i>
                                <div class="absolute -inset-1 bg-emerald-400/20 blur-md rounded-full"></div>
                            </div>
                            <span class="font-medium">Reported</span>
                            <i class="fas fa-shield-alt text-emerald-400 ml-1 text-xs"></i>
                        </button>
                        <div
                            class="absolute -top-9 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs py-1.5 px-3 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                            Under review
                            <div
                                class="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900">
                            </div>
                        </div>
                    </div>`
                :
                // Active premium style
                `<div class="relative group">
                        <button
                            class="report-btn flex items-center gap-2 px-3 py-2 text-sm rounded-xl bg-linear-to-r from-white to-gray-50 text-gray-700 border border-gray-200 hover:from-red-50 hover:to-red-100 hover:text-red-700 hover:border-red-300 hover:shadow-md active:scale-[0.98] transition-all duration-300"
                            data-post-id="${postId}" data-user-id="${userId}">
                            <div class="relative">
                                <i class="fas fa-flag text-red-500 group-hover:animate-bounce"></i>
                                <div
                                    class="absolute -inset-1 bg-red-400/0 group-hover:bg-red-400/10 blur-md rounded-full transition-all duration-500">
                                </div>
                            </div>
                            <span class="font-medium">Report</span>
                            <i
                                class="fas fa-exclamation-triangle text-red-400 ml-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-300"></i>
                        </button>
                        <div
                            class="absolute -top-9 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs py-1.5 px-3 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                            Flag inappropriate content
                            <div
                                class="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900">
                            </div>
                        </div>
                    </div>`
            }
                    `
            : ''}
                </div>
            </div>

            <div class="mb-4">
                <p class="whitespace-pre-line mb-3 wrap-break-word">${content}</p>
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

export function searchUser(userId, avatarUrl, name) {
    const avatarContent = avatarUrl
        ? `<img src="${avatarUrl}" alt="${name}" class="w-10 h-10 rounded-full object-cover" />`
        : name[0]; // fallback to first letter if no avatar

    return `
    <div class="px-4 py-3 hover:bg-gray-50/80 transition-colors cursor-pointer active:bg-gray-100" data-user-id="${userId}">
        <div class="flex items-center gap-3">
            <!-- Avatar -->
            <div class="relative shrink-0 flex items-center justify-center w-10 h-10 bg-blue-100 text-blue-600 font-medium rounded-full">
                ${avatarContent}
            </div>

            <!-- User Info -->
            <div class="flex-1 min-w-0">
                <div class="flex items-center gap-1.5 mb-0.5">
                    <h3 class="font-medium text-gray-900 truncate text-sm">
                        ${name}
                    </h3>
                </div>
                <p class="text-xs text-gray-500 truncate">@${name.toLowerCase().replace(/\s+/g, '')}</p>
            </div>

            <!-- Action Button -->
            <div class="shrink-0">
                <a href="./otherProfile.html?user=${userId}" class="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-medium transition-colors border border-blue-100">
                    View profile
                </a>
            </div>
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