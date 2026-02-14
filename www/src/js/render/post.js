// render/post.js
import { REACTION_IMAGES, REACTION_BG_COLORS, REACTION_LABELS } from '../utils/reactionImages.js';
import supabaseClient from '../supabase.js';


export default function uploadedPost(
    avatar = 'hi',
    postOwner = false,
    name,
    date,
    content,
    file,
    media_type,
    postId = 1,
    likes = 0,
    comments = 0,
    userReaction = null,
    filePath = null,
    userId,
    friendStatus = null,
    isReported = false,
    recentReactions = []
) {
    // In reactionPreviewHtml function
    const reactionPreviewHtml = () => {
        if (!recentReactions || recentReactions.length === 0) {
            return `<div class="flex items-center gap-1">
            <i class="fas fa-heart text-red-400"></i>
            <span class="likes-count">${likes}</span>
        </div>`;
        }

        // Count reactions to get most used
        const reactionCounts = {};
        recentReactions.forEach(r => {
            reactionCounts[r.reaction] = (reactionCounts[r.reaction] || 0) + 1;
        });

        // Get top 3 most used reactions
        const topReactions = Object.entries(reactionCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([reaction]) => reaction);

        // Create icons for top reactions
        const iconsHtml = topReactions.map(reaction => {
            const bgColor = REACTION_BG_COLORS[reaction];
            const imageUrl = REACTION_IMAGES[reaction];
            const reactionName = REACTION_LABELS[reaction];
            return `
            <div class="relative group/reaction-preview">
                <div class="w-5 h-5 rounded-full ${bgColor} flex items-center justify-center border-2 border-white -ml-1 first:ml-0 hover:scale-110 transition-transform duration-200 cursor-help overflow-hidden" 
                     title="${reactionName}">
                    <img src="${imageUrl}" alt="${reaction}" class="w-full h-full object-cover">
                </div>
            </div>
        `;
        }).join('');

        // Show +X if more reactions exist
        const remainingCount = Object.keys(reactionCounts).length - 3;
        const remainingHtml = remainingCount > 0
            ? `<div class="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center border-2 border-white -ml-1 text-xs font-medium text-gray-600 hover:scale-110 transition-transform duration-200 cursor-help"
             title="${remainingCount} more reactions">
            +${remainingCount}
          </div>`
            : '';

        return `
        <div class="flex items-center gap-1 group relative">
            <div class="flex -space-x-2 mr-1">
                ${iconsHtml}
                ${remainingHtml}
            </div>
            <span class="likes-count font-medium">${likes}</span>
            
            <!-- Tooltip shows summary -->
            <div class="absolute bottom-full left-0 mb-2 bg-gray-900 text-white text-sm rounded-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 min-w-[250px] max-h-[300px] overflow-y-auto">
                <div class="font-semibold mb-2 text-center border-b border-gray-700 pb-1">Reactions Summary</div>
                ${generateReactionSummary(recentReactions)}
                <div class="absolute -bottom-1 left-4 w-2 h-2 bg-gray-900 rotate-45"></div>
            </div>
        </div>
    `;
    };

    let followButtonHTML = '';

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

    // Report button HTML
    const reportButtonHTML = !postOwner ? (
        isReported ?
            `<div class="relative group" title="Post reported">
                <button class="report-btn w-full h-9 px-3 text-sm rounded-full bg-linear-to-br from-gray-400 to-gray-500 text-white shadow-sm cursor-default flex items-center justify-center"
                        data-post-id="${postId}" 
                        data-user-id="${userId}" 
                        disabled>
                    <i class="fas fa-flag text-sm mr-1"></i> Reported
                </button>
                <div class="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs py-1.5 px-3 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 shadow-lg">
                    <span>Reported</span>
                    <div class="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900"></div>
                </div>
            </div>`
            :
            `<div class="relative group" title="Report post">
                <button class="report-btn w-full h-9 px-3 text-sm rounded-full bg-linear-to-br from-red-400 to-red-500 text-white shadow-sm hover:shadow-md hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center"
                        data-post-id="${postId}" 
                        data-user-id="${userId}">
                    <i class="fas fa-flag text-sm mr-1"></i> Report
                </button>
                <div class="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs py-1.5 px-3 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 shadow-lg">
                    <span>Report</span>
                    <div class="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900"></div>
                </div>
            </div>`
    ) : '';

    return `
        <div class="bg-white rounded-lg shadow-sm p-5 mb-6 post" data-post-id="${postId}" data-file-path="${filePath}"
            id='${postId}' data-user-id="${userId}">
            <!-- Header -->
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
                    ${reportButtonHTML}
                    ${postOwner ?
            `<button class="ellipsis-btn group" data-post-id="${postId}">
                        <div class="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 group-hover:bg-gray-100">
                            <i class="fas fa-ellipsis-h text-gray-500 group-hover:text-gray-700"></i>
                        </div>
                    </button>`
            : ''}
                </div>
            </div>

            <!-- Content -->
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

            <!-- Stats -->
<div class="flex justify-between text-xs text-gray-500 mb-2 sm:mb-3 pb-2 sm:pb-3 border-b border-gray-100">
    <div class="flex items-center gap-1 reaction-stats cursor-pointer hover:text-primary transition-colors" 
         onclick="window.showAllReactionsModal && window.showAllReactionsModal('${postId}')">
        ${reactionPreviewHtml()}
    </div>
    <button type="button" class="commentBtn flex items-center gap-1" data-post-id="${postId}">
        <i class="fas fa-comment text-blue-400"></i>
        <span class="total-comments">${comments}</span>
    </button>
</div>

            <!-- Action Buttons -->
            <div class="flex justify-around border-t border-gray-100 pt-2">
               <!-- Reaction Button with Picker -->
<div class="relative reaction-picker-container flex-1">
    <button
        class="reaction-btn flex-1 flex items-center justify-center gap-2 text-gray-600 hover:text-blue-600 hover:bg-gray-50 py-2 sm:py-2.5 rounded-lg transition-all duration-200 w-full"
        data-post-id="${postId}">
        <span class="current-reaction-icon">
            ${userReaction
            ? `<img src="${REACTION_IMAGES[userReaction]}" alt="${userReaction}" class="w-5 h-5 object-contain rounded-full">`
            : `<i class="far fa-thumbs-up text-gray-400"></i>`
        }
        </span>
        <span class="current-reaction-text text-xs font-bold">
            ${userReaction ? REACTION_LABELS[userReaction] : 'Like'}
        </span>
    </button>

    <!-- Reaction Picker Popup -->
    <div class="reaction-picker absolute bottom-full left-0 mb-2 bg-white rounded-full shadow-2xl p-2 hidden z-50 border border-gray-100 animate-scaleIn">
        <div class="flex gap-1">
            ${Object.keys(REACTION_IMAGES).map(key => `
                <div class="relative group/reaction-option">
                    <button class="reaction-option w-10 h-10 rounded-full hover:bg-gray-50 flex items-center justify-center transform hover:scale-125 transition-all duration-200"
                            data-reaction="${key}"
                            data-post-id="${postId}"
                            title="${REACTION_LABELS[key]}">
                        <img src="${REACTION_IMAGES[key]}" alt="${key}" class="w-6 h-6 object-contain rounded-full">
                    </button>
                    <!-- Reaction name tooltip -->
                    <div class="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover/reaction-option:opacity-100 transition-opacity duration-200 pointer-events-none z-50 whitespace-nowrap">
                        ${REACTION_LABELS[key]}
                        <div class="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900"></div>
                    </div>
                </div>
            `).join('')}
        </div>
    </div>
</div>
                <!-- Comment Button -->
                <button type="button"
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
        : name[0];

    return `
    <div class="px-4 py-3 hover:bg-gray-50/80 transition-colors cursor-pointer active:bg-gray-100" data-user-id="${userId}">
        <div class="flex items-center gap-3">
            <div class="relative shrink-0 flex items-center justify-center w-10 h-10 bg-blue-100 text-blue-600 font-medium rounded-full">
                ${avatarContent}
            </div>
            <div class="flex-1 min-w-0">
                <div class="flex items-center gap-1.5 mb-0.5">
                    <h3 class="font-medium text-gray-900 truncate text-sm">
                        ${name}
                    </h3>
                </div>
                <p class="text-xs text-gray-500 truncate">@${name.toLowerCase().replace(/\s+/g, '')}</p>
            </div>
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
        <span
            class="item-status status-lost inline-block ${type === 'lost' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'} text-xs px-3 py-1.5 rounded-full font-semibold mb-3 shadow-sm">
            ${type === 'lost' ? 'LOST' : 'FOUND'}
        </span>

        <h3 class="font-bold text-md mb-3 text-gray-800">Item: ${item}</h3>
        <p class="text-gray-600 mb-4 text-sm leading-relaxed">Description: ${description}</p>

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
// Function to show all reactions modal
export function showAllReactionsModal(postId) {
    // Check if modal exists, if not create it
    let modal = document.getElementById('allReactionsModal');

    if (!modal) {
        modal = createReactionsModal();
        document.body.appendChild(modal);
    }

    const container = document.getElementById('reactionsList');
    const loadingEl = document.getElementById('reactionsLoading');

    // Clear previous content and show loading
    container.innerHTML = '<div class="flex justify-center p-4"><i class="fas fa-spinner fa-spin text-primary"></i></div>';

    // Reset loading indicator
    if (loadingEl) {
        loadingEl.classList.remove('hidden');
        loadingEl.style.display = 'block';

        // Disconnect any existing observer
        if (window.reactionObserver) {
            window.reactionObserver.disconnect();
        }
    }

    modal.classList.remove('hidden');
    modal.dataset.postId = postId;
    document.body.style.overflow = 'hidden';

    // Load first batch of reactions
    loadReactionBatch(postId, 0, 50);
}

// Function to create the modal HTML
function createReactionsModal() {
    const modal = document.createElement('div');
    modal.id = 'allReactionsModal';
    modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 hidden';
    modal.innerHTML = `
        <div class="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] mx-4 flex flex-col">
            <!-- Header -->
            <div class="flex items-center justify-between p-4 border-b border-gray-200">
                <h3 class="text-lg font-bold text-gray-900">All Reactions</h3>
                <button class="close-modal text-gray-400 hover:text-gray-600 transition-colors">
                    <i class="fas fa-times text-xl"></i>
                </button>
            </div>
            
            <!-- Reactions List (scrollable) -->
            <div id="reactionsList" class="flex-1 overflow-y-auto p-4 space-y-3 min-h-[400px]">
                <!-- Reactions will be loaded here -->
            </div>
            
            <div id="reactionsLoading" class="hidden p-2 text-center border-t border-gray-100">
                <i class="fas fa-spinner fa-spin text-primary"></i>
            </div>
        </div>
    `;

    // Add close functionality
    modal.addEventListener('click', (e) => {
        if (e.target === modal || e.target.closest('.close-modal')) {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
        }
    });

    return modal;
}
// Function to load reaction batch
async function loadReactionBatch(postId, offset, limit) {
    try {
        // First, get the reactions
        const { data: reactions, error: reactionsError } = await supabaseClient
            .from('post_reactions')
            .select(`
                reaction,
                user_id,
                created_at
            `)
            .eq('post_id', postId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (reactionsError) throw reactionsError;

        // Remove the initial loading spinner
        const container = document.getElementById('reactionsList');
        if (offset === 0) {
            container.innerHTML = ''; // Clear the initial loading spinner
        }

        if (!reactions || reactions.length === 0) {
            // No reactions at all
            if (offset === 0) {
                container.innerHTML = '<div class="text-center text-gray-500 p-8">No reactions yet</div>';
            }

            // Hide loading permanently
            const loadingEl = document.getElementById('reactionsLoading');
            if (loadingEl) {
                loadingEl.classList.add('hidden');
                loadingEl.style.display = 'none';
            }
            return;
        }

        // Then get all the user profiles separately
        const userIds = [...new Set(reactions.map(r => r.user_id))];

        const { data: profiles, error: profilesError } = await supabaseClient
            .from('profile')
            .select('id, name, avatar_url')
            .in('id', userIds);

        if (profilesError) throw profilesError;

        // Create a map of profiles
        const profileMap = {};
        profiles?.forEach(p => {
            profileMap[p.id] = p;
        });

        // Combine reactions with profiles
        const reactionsWithProfiles = reactions.map(reaction => ({
            ...reaction,
            profiles: profileMap[reaction.user_id] || {
                name: 'Someone',
                avatar_url: '../images/defaultAvatar.jpg'
            }
        }));

        renderReactionBatch(reactionsWithProfiles);

        // Check if this was the last batch
        if (reactions.length < limit) {
            const loadingEl = document.getElementById('reactionsLoading');
            if (loadingEl) {
                loadingEl.classList.add('hidden');
                loadingEl.style.display = 'none';
            }
        } else {
            // Setup infinite scroll for next batches
            setupReactionInfiniteScroll(postId, offset + limit);
        }

    } catch (error) {
        console.error('Error loading reactions:', error);
        const container = document.getElementById('reactionsList');

        if (offset === 0) {
            container.innerHTML = '<div class="text-center text-red-500 p-4">Failed to load reactions</div>';
        } else {
            container.innerHTML += '<div class="text-center text-red-500 p-4">Failed to load more reactions</div>';
        }

        // Hide loading on error
        const loadingEl = document.getElementById('reactionsLoading');
        if (loadingEl) {
            loadingEl.classList.add('hidden');
        }
    }
}

// Function to render reaction batch
function renderReactionBatch(reactions) {
    const container = document.getElementById('reactionsList');

    if (!reactions || reactions.length === 0) {
        if (container.children.length === 0) {
            container.innerHTML = '<div class="text-center text-gray-500 p-8">No reactions yet</div>';
        }
        return;
    }

    reactions.forEach(reaction => {
        const reactionDate = new Date(reaction.created_at).toLocaleDateString();
        const userName = reaction.profiles?.name || 'Someone';
        const userAvatar = reaction.profiles?.avatar_url || '../images/defaultAvatar.jpg';
        const reactionName = REACTION_LABELS[reaction.reaction];
        const reactionImage = REACTION_IMAGES[reaction.reaction];

        const html = `
            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div class="flex items-center gap-3">
                    <img src="${userAvatar}" alt="${userName}" class="w-10 h-10 rounded-full object-cover" 
                         onerror="this.src='../images/defaultAvatar.jpg'">
                    <div>
                        <p class="font-medium text-gray-900">${userName}</p>
                        <p class="text-xs text-gray-500">${reactionDate}</p>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <img src="${reactionImage}" alt="${reaction.reaction}" class="w-6 h-6 object-contain rounded-full"  title="${reactionName}">
                    <span class="text-sm text-gray-600">${reactionName}</span>
                </div>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', html);
    });
}

// Setup infinite scroll
function setupReactionInfiniteScroll(postId, nextOffset) {
    const loadingEl = document.getElementById('reactionsLoading');
    const container = document.getElementById('reactionsList');

    if (!loadingEl) return;

    // Remove any existing observer
    if (window.reactionObserver) {
        window.reactionObserver.disconnect();
    }

    // Create new observer
    window.reactionObserver = new IntersectionObserver(async (entries) => {
        if (entries[0].isIntersecting) {
            // Disconnect to prevent multiple triggers
            window.reactionObserver.disconnect();

            // Show loading
            loadingEl.classList.remove('hidden');

            try {
                // Load next batch
                await loadReactionBatch(postId, nextOffset, 50);

                // Check if there are more reactions to load
                const { count } = await supabaseClient
                    .from('post_reactions')
                    .select('*', { count: 'exact', head: true })
                    .eq('post_id', postId);

                // If we've loaded all reactions, hide loading permanently
                if (nextOffset + 50 >= count) {
                    loadingEl.classList.add('hidden');
                    loadingEl.style.display = 'none';
                } else {
                    // Otherwise, hide loading and re-observe
                    loadingEl.classList.add('hidden');
                    if (container.children.length > 0) {
                        // Re-observe for next batch
                        setTimeout(() => {
                            window.reactionObserver.observe(loadingEl);
                        }, 100);
                    }
                }
            } catch (error) {
                console.error('Error loading more reactions:', error);
                loadingEl.classList.add('hidden');
            }
        }
    }, {
        threshold: 0.1,
        rootMargin: '20px'
    });

    // Start observing
    if (loadingEl) {
        loadingEl.style.display = 'block';
        window.reactionObserver.observe(loadingEl);
    }
}

function generateReactionSummary(reactions) {
    const summary = {};
    reactions.forEach(r => {
        if (!summary[r.reaction]) {
            summary[r.reaction] = {
                count: 0,
                names: []
            };
        }
        summary[r.reaction].count++;
        if (summary[r.reaction].names.length < 5) {
            summary[r.reaction].names.push(r.user_name || 'Someone');
        }
    });

    return Object.entries(summary)
        .sort((a, b) => b[1].count - a[1].count)
        .map(([reaction, data]) => {
            const imageUrl = REACTION_IMAGES[reaction];
            const reactionName = REACTION_LABELS[reaction];
            const namesList = data.names.join(', ');
            const othersCount = data.count - data.names.length;
            const othersText = othersCount > 0 ? ` and ${othersCount} others` : '';

            return `
                <div class="flex items-center gap-2 py-1.5 border-b border-gray-800 last:border-0">
                    <img src="${imageUrl}" alt="${reaction}" class="w-5 h-5 object-cover rounded-full">
                    <div class="flex-1">
                        <span class="font-semibold">${reactionName}</span>
                        <span class="text-gray-300 ml-1">(${data.count})</span>
                        <div class="text-xs text-gray-400 truncate max-w-[200px]">
                            ${data.names[0]}${othersText}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
}
// Make functions available globally for onclick events
if (typeof window !== 'undefined') {
    window.showAllReactionsModal = showAllReactionsModal;
}