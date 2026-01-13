export default function messageItem({
    relation = 'friend',
    name = '',
    avatar = '',
    members = 0,
    badgeText = '',
    timestamp = '',
    subtitle = '',
    onlineCount = 0
}) {

    const isClub = relation === 'club';
    return `
        <a href="" data-id="">
            <div
                class="chat-list-item group relative p-4 cursor-pointer transition-all duration-200 rounded-xl mb-2 border border-gray-100 hover:shadow-md
                ${isClub
            ? 'hover:bg-linear-to-r hover:from-emerald-50 hover:to-green-50 hover:border-green-200'
            : 'hover:bg-linear-to-r hover:from-primary hover:to-blue-100 hover:border-purple-200'
        }">

                <!-- Active indicator -->
                <div
                    class="absolute -left-2 top-1/2 -translate-y-1/2 w-1
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

                                <span
                                    class="px-2.5 py-0.5 text-primary text-xs font-semibold rounded-full shadow-sm
                                    ${isClub
            ? 'bg-linear-to-r from-emerald-500 to-green-600'
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

                <!-- Hover overlay -->
                <div
                    class="absolute inset-0 rounded-xl transition-all duration-300
                    ${isClub
            ? 'group-hover:bg-linear-to-r group-hover:from-emerald-500/5 group-hover:to-green-500/5'
            : 'group-hover:bg-linear-to-r group-hover:from-purple-500/5 group-hover:to-pink-500/5'
        }">
                </div>
            </div>
        </a>
    `;
}


function clubAvatar(onlineCount) {
    return `
        <div class="relative w-14 h-14 rounded-xl overflow-hidden border-2 border-primary shadow-md">
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
            ` : ''}
        </div>
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

export function directMessage() {
    return `
                <div class="flex w-full h-screen overflow-hidden scrollbar-hide hidden" id="directMessage">
            <!-- Chat Section -->
            <div class="flex-1 flex flex-col overflow-hidden">
                <!-- Chat Header -->
                <div class="bg-white border-b border-gray-200 p-4 flex items-center justify-between shadow-sm">
                    <div class="flex items-center space-x-3">
                        <a href="./messages.html"
                            class="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors">
                            <i class="fas fa-arrow-left text-gray-600"></i>
                        </a>

                        <div class="flex items-center space-x-3 cursor-pointer group">
                            <div class="relative">
                                <div class="w-12 h-12 rounded-full overflow-hidden border-2 border-blue-500 shadow-md">
                                    <img src="../images/image.png" alt="JaseI Guadis"
                                        class="w-full h-full object-cover">
                                </div>
                                <div
                                    class="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white">
                                </div>
                            </div>

                            <div>
                                <div class="flex items-center gap-2">
                                    <h2 class="text-gray-900 font-bold text-lg">JaseI Guadis</h2>
                                    <span
                                        class="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Friend</span>
                                </div>
                                <div class="flex items-center">
                                    <div class="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                                    <span class="text-gray-600 text-sm">Active now</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Chat Body -->
                <div class="flex-1 p-4 overflow-y-auto bg-linear-to-b from-white to-blue-50">
                    <!-- Date Separator -->
                    <div class="flex items-center justify-center my-6">
                        <div class="bg-gray-200 text-gray-700 text-xs px-4 py-1 rounded-full font-medium">
                            Today, November 15
                        </div>
                    </div>

                    <!-- Profile Preview -->
                    <div class="text-center mb-8">
                        <div class="inline-flex flex-col items-center gap-3 p-6">
                            <div class="w-20 h-20 rounded-full overflow-hidden border-4 border-blue-100 shadow-lg">
                                <img src="../images/image.png" alt="JaseI Guadis" class="w-full h-full object-cover">
                            </div>
                            <div>
                                <h3 class="font-bold text-gray-900 text-lg">JaseI Guadis</h3>
                                <p class="text-gray-600 text-sm">Last seen: Active now</p>
                            </div>
                            <div class="flex items-center gap-2 mt-2">
                                <button
                                    class="text-xs bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                                    View Profile
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Messages Container -->
                    <div class="space-y-4" id="messagesContainer">
                        <!-- Incoming Message 1 -->
                        <div class="flex items-start gap-3 message-in">
                            <div class="shrink-0">
                                <div class="w-8 h-8 rounded-full overflow-hidden">
                                    <img src="../images/image.png" alt="JaseI" class="w-full h-full object-cover">
                                </div>
                            </div>
                            <div class="max-w-[75%]">
                                <div class="bg-white rounded-2xl rounded-tl-none p-4 shadow-sm border border-gray-100">
                                    <p class="text-gray-800 text-sm leading-relaxed">best friend ito part ko</p>
                                    <p class="text-gray-800 text-sm mt-1 leading-relaxed">beneficence 😊 🌟 :</p>
                                    <div class="flex items-center justify-between mt-2">
                                        <span class="text-xs text-gray-500">10:24 AM</span>
                                        <i class="fas fa-check-double text-blue-500 text-xs"></i>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Outgoing Message 1 -->
                        <div class="flex justify-end message-out">
                            <div class="max-w-[75%]">
                                <div
                                    class="bg-linear-to-r from-blue-500 to-blue-600 rounded-2xl rounded-tr-none p-4 shadow-sm">
                                    <p class="text-white text-sm leading-relaxed">Cgeh lang welcome</p>
                                    <div class="flex items-center justify-between mt-2">
                                        <span class="text-xs text-blue-100">10:25 AM</span>
                                        <i class="fas fa-check-double text-white text-xs"></i>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Incoming Message 2 -->
                        <div class="flex items-start gap-3 message-in">
                            <div class="shrink-0">
                                <div class="w-8 h-8 rounded-full overflow-hidden">
                                    <img src="../images/image.png" alt="JaseI" class="w-full h-full object-cover">
                                </div>
                            </div>
                            <div class="max-w-[75%]">
                                <div class="bg-white rounded-2xl rounded-tl-none p-4 shadow-sm border border-gray-100">
                                    <p class="text-gray-800 text-sm leading-relaxed">sasusunod ulit HAHAHA</p>
                                    <div class="flex items-center justify-between mt-2">
                                        <span class="text-xs text-gray-500">10:26 AM</span>
                                        <i class="fas fa-check text-gray-400 text-xs"></i>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Incoming Message with Image -->
                        <div class="flex items-start gap-3 message-in">
                            <div class="shrink-0">
                                <div class="w-8 h-8 rounded-full overflow-hidden">
                                    <img src="../images/image.png" alt="JaseI" class="w-full h-full object-cover">
                                </div>
                            </div>
                            <div class="max-w-[75%]">
                                <div class="bg-white rounded-2xl rounded-tl-none p-2 shadow-sm border border-gray-100">
                                    <div class="rounded-xl overflow-hidden mb-2">
                                        <img src="../images/ccs.png" alt="Shared photo"
                                            class="w-full h-48 object-cover">
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Media Preview Container -->
                <div id="mediaPreview" class="hidden"></div>

                <!-- Message Input -->
                <div class="border-t border-gray-200 p-4 bg-white shadow-lg">
                    <!-- Media Preview Section -->
                    <div id="mediaPreviewArea" class="mb-3 hidden">
                        <div class="relative inline-block max-w-xs">
                            <div id="previewContainer" class="relative"></div>
                        </div>
                    </div>

                    <div class="flex items-center gap-3">
                        <!-- Video Button -->
                        <button id="videoBtn"
                            class="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
                            title="Video">
                            <i class="fas fa-video text-gray-600"></i>
                        </button>

                        <!-- Camera Button -->
                        <button id="cameraBtn"
                            class="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
                            title="Camera">
                            <i class="fas fa-camera text-gray-600"></i>
                        </button>

                        <!-- Message Input -->
                        <div class="flex-1 relative">
                            <input type="text" id="messageInput" placeholder=" Type a message..."
                                class="w-full bg-gray-100 rounded-full py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all">
                        </div>

                        <!-- Send Button -->
                        <button id="sendBtn"
                            class="w-12 h-12 rounded-full bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 flex items-center justify-center shadow-lg hover:shadow-xl transition-all"
                            title="Send message">
                            <i class="fas fa-paper-plane text-white"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `
}

export function createEmptyMessageState() {
    return `
        <div class="flex flex-col items-center justify-start py-10 px-4 text-center">
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
        </div>
    `;
}