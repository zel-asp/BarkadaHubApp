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
            : 'hover:bg-linear-to-r hover:from-white hover:to-blue-100 hover:border-purple-200'
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
                                    class="px-2.5 py-0.5 text-white text-xs font-semibold rounded-full shadow-sm
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
        <div class="relative w-14 h-14 rounded-xl overflow-hidden border-2 border-white shadow-md">
            <div class="absolute inset-0 grid grid-cols-2 gap-0.5 p-0.5">
                <div class="bg-linear-to-br from-emerald-400 to-green-500"></div>
                <div class="bg-linear-to-br from-emerald-300 to-green-400"></div>
                <div class="bg-linear-to-br from-emerald-200 to-green-300"></div>
                <div class="bg-linear-to-br from-emerald-100 to-green-200"></div>
            </div>

            <div class="absolute inset-0 bg-black/10 flex items-center justify-center">
                <svg class="w-6 h-6 text-white/90" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd"
                        d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656z"
                        clip-rule="evenodd" />
                </svg>
            </div>

            ${onlineCount ? `
                <div class="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                    <span class="text-[9px] font-bold text-white">${onlineCount}</span>
                </div>
            ` : ''}
        </div>
    `;
}

function friendAvatar(src) {
    return `
        <div class="relative">
            <img src="${src}"
                class="w-14 h-14 rounded object-cover border-2 border-white shadow-md">
            <div class="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
        </div>
    `;
}
