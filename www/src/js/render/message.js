export default function messageItem({
    relation = 'friend',
    name = '',
    avatar = '',
    members = 0,
    badgeText = '',
    timestamp = '',
    subtitle = '',
    onlineCount = 0,
    conversationId,
    firendId,
}) {

    const isClub = relation === 'club';
    return `
        <div class='selectedMessage' data-conversation-id='${conversationId}' data-reference-id='${firendId}'
            data-name='${name}' data-avatar='${avatar}' data-relation='${relation}'>
            <div class="chat-list-item group relative p-4 cursor-pointer transition-all duration-200 rounded-xl mb-2 border border-gray-100 hover:shadow-md
                        ${isClub
            ? 'hover:bg-linear-to-r hover:from-emerald-50 hover:to-green-50 hover:border-green-200'
            : 'hover:bg-linear-to-r hover:from-primary hover:to-blue-100 hover:border-purple-200'
        } ">

                <!--Active indicator-->
                <div class="absolute -left-2 top-1/2 -translate-y-1/2 w-1
                            ${isClub ? 'h-12 bg-green-500' : 'h-10 bg-primary'}
                            rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                </div>

                <div class="flex items-start gap-3">

                    <!-- AVATAR -->
                    <div class="relative shrink-0">
                        ${isClub ? clubAvatar(onlineCount) : friendAvatar(avatar)}
                    </div>

                    <!-- CONTENT -->
                    <div class="flex-1 min-w-0">
                        <div class="flex justify-between items-start mb-1">
                            <div class="flex items-center gap-2">
                                <span class="font-bold text-gray-900
                                            ${isClub
            ? 'group-hover:text-green-700'
            : 'group-hover:text-blue-500'
        } transition-colors">
                                    ${name}
                                </span>

                                <span class="px-2.5 py-0.5 text-white text-xs font-semibold rounded-full
                                            ${isClub
            ? ''
            : 'bg-linear-to-r from-purple-500 to-blue-500'
        }">
                                    ${badgeText}
                                </span>
                            </div>

                            <span class="text-xs text-gray-500 font-medium">
                                ${timestamp}
                            </span>
                        </div>

                        <div class="text-sm text-gray-600 font-medium">
                            ${isClub ? `${members} members` : subtitle}
                        </div>
                    </div>
                </div>

                <!--Hover overlay-->
                <div class="absolute inset-0 rounded-xl transition-all duration-300
                            ${isClub
            ? 'group-hover:bg-linear-to-r group-hover:from-emerald-500/5 group-hover:to-green-500/5'
            : 'group-hover:bg-linear-to-r group-hover:from-purple-500/5 group-hover:to-pink-500/5'
        }">
                </div>
            </div>
        </div>
`;
}
function clubAvatar(onlineCount) {
    return `
        <div class="relative w-14 h-14 rounded-xl overflow-hidden border-2 border-primary shadow-md" >
            <div class="absolute inset-0 grid grid-cols-2 gap-0.5 p-0.5">
                <div class="bg-linear-to-br from-emerald-400 to-green-500"></div>
                <div class="bg-linear-to-br from-emerald-300 to-green-400"></div>
                <div class="bg-linear-to-br from-emerald-200 to-green-300"></div>
                <div class="bg-linear-to-br from-emerald-100 to-green-200"></div>
            </div>

            <div class="absolute inset-0 bg-black/10 flex items-center justify-center">
                <svg class="w-6 h-6 text-primary/90" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd"
                        d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656z"
                        clip-rule="evenodd" />
                </svg>
            </div>

            ${onlineCount ? `
                <div class="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-primary flex items-center justify-center">
                    <span class="text-[9px] font-bold text-primary">${onlineCount}</span>
                </div>
            ` : ''
        }
        </div >
        `;
}

function friendAvatar(src) {
    return `
        <div class="relative">
            <img src="${src}"
                class="w-14 h-14 rounded object-cover border-2 border-primary shadow-md">
                <div class="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-primary"></div>
            </div>
    `;
}

export function directMessage(name, avatar, type = 'friend', content = []) {
    return `
        <!-- Chat Header -->
        <div class="bg-white border-b border-gray-200 px-4 py-5 flex items-center gap-3 shadow-sm">
            <a href='./messages.html' id="backToMessages"
                class="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100">
                <i class="fas fa-arrow-left text-gray-600"></i>
            </a>

            <div class="flex items-center gap-3">
                <div class="relative">
                    <img src="${avatar}"
                        class="w-10 h-10 rounded-full object-cover border border-gray-300">
                    <span
                        class="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white"></span>
                </div>

                <div>
                    <div class="flex items-center gap-2">
                        <h2 class="font-semibold text-gray-900">${name}</h2>
                        <span
                            class="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold capitalize">
                            ${type}
                        </span>
                    </div>
                    <p class="text-xs text-gray-500">Active now</p>
                </div>
            </div>
        </div>

        ${content.length === 0
            ? `
        <!-- Empty State -->
        <div class = 'h-10'></div>
        <div class="flex-1 flex flex-col justify-center items-center text-center px-6 bg-gray-50 min-h-[calc(100vh-64px)]">
            <div class="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center mb-4">
                <i class="fas fa-comments text-3xl text-gray-500"></i>
            </div>

            <h3 class="text-lg font-semibold text-gray-800 mb-1">
                No messages yet
            </h3>

            <p class="text-gray-600 text-sm max-w-xs">
                Start the conversation by sending your first message.
            </p>
        </div>
        `
            : `
        <!-- Chat Body -->
        <div class="flex-1 p-4 overflow-y-auto bg-linear-to-b from-white to-blue-50">
            <div class="space-y-4" id="messagesContainer">
                ${content.join('')}
            </div>
        </div>
        `
        }
    `;
}


export function createEmptyMessageState() {
    return `
        <div class="flex flex-col items-center justify-start py-10 px-4 text-center" >
            <div class="mb-2 p-6 rounded-full bg-gray-100">
                <i class="fas fa-comment-alt text-5xl text-primary"></i>
            </div>
            
            <h3 class="text-2xl font-bold mb-3 text-primary">No Messages Yet</h3>
            
            <p class="text-gray-600 mb-8 max-w-md">
                Start a conversation! To message someone, you need to:
            </p>
            
            <div class="space-y-4 mb-8 max-w-md w-full">
                <div class="flex items-start p-4 rounded-lg bg-gray-50 border border-gray-200">
                    <i class="fas fa-user-plus mt-1 mr-3 text-primary"></i>
                    <div class="text-left">
                        <h4 class="font-semibold text-gray-800">Add a Friend</h4>
                        <p class="text-gray-600 text-sm">Connect with friends to start chatting</p>
                    </div>
                </div>
                
                <div class="flex items-start p-4 rounded-lg bg-gray-50 border border-gray-200">
                    <i class="fas fa-users mt-1 mr-3 text-primary"></i>
                    <div class="text-left">
                        <h4 class="font-semibold text-gray-800">Join a Club</h4>
                        <p class="text-gray-600 text-sm">Participate in group conversations</p>
                    </div>
                </div>
                
                <div class="flex items-start p-4 rounded-lg bg-gray-50 border border-gray-200">
                    <i class="fas fa-search mt-1 mr-3 text-primary"></i>
                    <div class="text-left">
                        <h4 class="font-semibold text-gray-800">Message from Lost & Found</h4>
                        <p class="text-gray-600 text-sm">Connect with users through lost items</p>
                    </div>
                </div>
            </div>
            
            <p class="text-gray-500 text-sm italic">
                Your conversations will appear here once you connect with someone
            </p>
        </div >
        `;
}

