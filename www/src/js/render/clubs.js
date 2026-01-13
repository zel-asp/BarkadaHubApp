export default function clubs(image, name, icon, location, description, id, category, members = 0, isJoined = false) {
    return `
        <div
            class="mb-5 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden
                hover:shadow-lg transition-all duration-300 hover:-translate-y-1">

            <div class="relative h-40 sm:h-44 bg-linear-to-r from-orange-500 to-red-600 overflow-hidden">
                <img src="${image}" alt="${name} image" class="w-full h-full object-cover opacity-90" />
                <div class="absolute top-3 right-3">
                    <span
                        class="bg-white/90 backdrop-blur-sm text-xs font-semibold
                            px-3 py-1 rounded-full text-gray-800">
                        <i class="fas fa-${icon} mr-1"></i>
                        ${category}
                    </span>
                </div>
            </div>

            <div class="p-4 sm:p-5">
                <div class="flex items-start justify-between mb-3">
                    <div>
                        <h3 class="font-bold text-lg text-gray-900 mb-1">${name}</h3>
                        <div class="flex items-center gap-2 text-sm text-gray-500">
                            <i class="fas fa-map-marker-alt text-xs"></i>
                            <span>${location}</span>
                        </div>
                    </div>

                    <div class="text-right">
                        <div class="text-lg font-bold text-primary">${members}</div>
                        <div class="text-xs text-gray-500">members</div>
                    </div>
                </div>

                <p class="text-gray-600 text-sm mb-4 line-clamp-2">${description}</p>

                <button
                    class="join-btn w-full ${isJoined ? 'bg-success' : 'bg-primary'} hover:bg-secondary text-white
                        py-3 rounded-xl font-medium transition-all duration-200
                        flex items-center justify-center gap-2 shadow-sm hover:shadow"
                    data-id="${id}">
                    <i class="fas ${isJoined ? 'fa-sign-in-alt' : 'fa-user-plus'}"></i>
                    <span>${isJoined ? 'Enter' : 'Join Club'}</span>
                </button>
            </div>
        </div>
    `;
}

export function joinedClubHeaderTemplate(imageUrl, name, description, members = 0, category) {
    return `
<div class="club-header text-white relative overflow-hidden min-h-svh">
    <!-- Parallax background effect -->
    <div class="absolute inset-0 overflow-hidden">
        <img src="${imageUrl}" alt="${name} background" 
            class="absolute inset-0 w-full h-full object-cover scale-105 group-hover:scale-100 transition-transform duration-700"
            loading="lazy" />
        <!-- Multi-layer gradient overlay -->
        <div class="absolute inset-0 bg-linear-to-br from-blue-900/70 via-purple-900/50 to-indigo-900/60"></div>
        <div class="absolute inset-0 bg-linear-to-t from-black/40 via-transparent to-transparent"></div>
        <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.5)_100%)]"></div>
    </div>

    <!-- Animated floating particles -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
        <div class="absolute top-1/4 left-1/4 w-2 h-2 bg-blue-400/20 rounded-full animate-pulse"></div>
        <div class="absolute top-1/3 right-1/4 w-3 h-3 bg-purple-400/15 rounded-full animate-pulse delay-300"></div>
        <div class="absolute bottom-1/4 left-1/3 w-1 h-1 bg-indigo-400/10 rounded-full animate-pulse delay-700"></div>
    </div>

    <div class="relative z-10 min-h-svh flex flex-col px-4 py-6 sm:px-8 lg:px-12">
        <!-- Header actions - Top bar with glass morphism -->
        <div class="flex items-center justify-between mb-6 sm:mb-8">
            <button onclick="window.location.href='./clubs.html'"
                class="flex items-center gap-2 px-4 py-2.5 sm:px-5 sm:py-3 text-white/95 hover:text-white rounded-xl backdrop-blur-md bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-300 active:scale-95 group shadow-lg hover:shadow-xl"
                aria-label="Go back">
                <i class="fas fa-arrow-left text-lg sm:text-xl group-hover:-translate-x-1.5 transition-transform duration-300"></i>
                <span class="text-sm sm:text-base font-semibold tracking-wide">Back</span>
            </button>

            <div class="flex items-center gap-3">

                <button id="leaveClubBtn"
                    class="flex items-center gap-2 px-4 py-2.5 sm:px-5 sm:py-3 bg-linear-to-r from-red-600/90 to-red-700/90 hover:from-red-700 hover:to-red-800 rounded-xl transition-all duration-300 active:scale-95 group shadow-lg hover:shadow-xl border border-red-500/30 backdrop-blur-sm"
                    aria-label="Leave club">
                    <i class="fas fa-sign-out-alt text-base sm:text-lg group-hover:rotate-90 transition-transform duration-300"></i>
                    <span class="text-sm sm:text-base font-semibold tracking-wide">Leave</span>
                </button>
            </div>
        </div>

        <!-- Main content - Enhanced with glass morphism -->
        <div class="flex-1 flex flex-col justify-center items-center text-center mb-12">
            <!-- Category badge - Enhanced -->
            <div
                class="inline-flex items-center gap-2.5 px-5 py-2.5 backdrop-blur-lg bg-linear-to-r from-white/15 to-white/5 rounded-full border border-white/20 mb-8 sm:mb-10 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer group">
                <i class="fas fa-hashtag text-blue-300 text-base sm:text-lg group-hover:rotate-12 transition-transform"></i>
                <span class="text-white/95 font-semibold text-sm sm:text-base tracking-wide">${category}</span>
                <i class="fas fa-chevron-right text-blue-300/50 text-xs ml-1 group-hover:translate-x-1 transition-transform"></i>
            </div>

            <!-- Club title - Enhanced with gradient border effect -->
            <div class="relative mb-6 sm:mb-8">
                <div class="absolute -inset-3 bg-linear-to-r from-blue-500/20 via-transparent to-purple-500/20 blur-xl rounded-full opacity-50"></div>
                <h1
                    class="relative text-4xl xs:text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-none">
                    <span class="bg-clip-text text-transparent bg-linear-to-r from-white via-blue-100 to-purple-100 drop-shadow-2xl">
                        ${name.toUpperCase()}
                    </span>
                </h1>
                <div class="absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-24 h-1 bg-linear-to-r from-blue-400 to-purple-400 rounded-full"></div>
            </div>

            <!-- Club description - Enhanced glass panel -->
            <div class="max-w-3xl lg:max-w-5xl mx-auto px-4 sm:px-0 mb-10 sm:mb-12">
                <div class="backdrop-blur-xl bg-linear-to-b from-white/10 to-white/5 rounded-2xl border border-white/20 p-6 sm:p-8 shadow-2xl hover:shadow-3xl transition-shadow duration-300">
                    <p
                        class="text-lg xs:text-xl sm:text-2xl md:text-3xl lg:text-4xl text-white/95 leading-relaxed font-light italic">
                        "${description}"
                    </p>
                    <div class="flex justify-center mt-6">
                        <div class="w-16 h-0.5 bg-linear-to-r from-transparent via-blue-400 to-transparent"></div>
                    </div>
                </div>
            </div>

            <!-- Stats cards - Enhanced with glass morphism -->
            <div
                class="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 w-full max-w-md sm:max-w-xl lg:max-w-5xl mx-auto mb-10">
                <!-- Members card -->
                <div
                    class="relative backdrop-blur-xl bg-linear-to-br from-white/15 to-white/5 p-4 sm:p-6 rounded-2xl border border-white/20 hover:border-white/30 hover:scale-105 transition-all duration-300 active:scale-95 cursor-pointer group shadow-xl hover:shadow-2xl">
                    <div class="absolute -inset-1 bg-linear-to-r from-blue-500/10 to-purple-500/10 blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div class="relative flex items-center gap-4 sm:gap-5">
                        <div
                            class="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-linear-to-br from-blue-500/30 to-blue-600/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                            <i class="fas fa-users text-blue-300 text-xl sm:text-2xl"></i>
                        </div>
                        <div class="text-left">
                            <p class="text-2xl sm:text-3xl md:text-4xl font-bold bg-linear-to-r from-white to-blue-100 bg-clip-text text-transparent">${members.toLocaleString()}</p>
                            <p class="text-white/80 text-xs sm:text-sm uppercase tracking-widest font-medium mt-1">Active Members</p>
                        </div>
                    </div>
                </div>

                <!-- Category card -->
                <div
                    class="relative backdrop-blur-xl bg-linear-to-br from-white/15 to-white/5 p-4 sm:p-6 rounded-2xl border border-white/20 hover:border-white/30 hover:scale-105 transition-all duration-300 active:scale-95 cursor-pointer group shadow-xl hover:shadow-2xl">
                    <div class="absolute -inset-1 bg-linear-to-r from-purple-500/10 to-pink-500/10 blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div class="relative flex items-center gap-4 sm:gap-5">
                        <div
                            class="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-linear-to-br from-purple-500/30 to-pink-500/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                            <i class="fas fa-tag text-purple-300 text-xl sm:text-2xl"></i>
                        </div>
                        <div class="text-left">
                            <p class="text-2xl sm:text-3xl md:text-4xl font-bold bg-linear-to-r from-white to-purple-100 bg-clip-text text-transparent">${category}</p>
                            <p class="text-white/80 text-xs sm:text-sm uppercase tracking-widest font-medium mt-1">Club Category</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Main CTA Button - Enhanced with glow effect -->
            <div class="relative">
                <div class="absolute -inset-4 bg-linear-to-r from-blue-500/30 via-indigo-500/30 to-blue-500/30 blur-2xl opacity-60 animate-pulse"></div>
                <a href="./messages.html" id="goToMessagesBtnAlt"
                    class="relative inline-flex items-center justify-center gap-3 px-10 py-5 rounded-2xl bg-linear-to-r from-blue-600 via-indigo-500 to-blue-600 hover:from-blue-700 hover:via-indigo-600 hover:to-blue-700 text-white font-semibold tracking-wide transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-2xl hover:shadow-3xl hover:shadow-blue-500/40 border border-white/30 group animate-linear-x bg-size[200%_auto] backdrop-blur-sm"
                    style="background-size: 200% auto;">
                    <div class="relative">
                        <i class="fas fa-comments text-xl group-hover:scale-110 transition-transform duration-300"></i>
                    </div>
                    <span class="text-lg sm:text-xl font-bold tracking-wide">Join Club Conversation</span>
                    <i class="fas fa-arrow-right group-hover:translate-x-2 transition-transform duration-300"></i>
                </a>
                <p class="text-white/60 text-sm sm:text-base mt-4 font-medium tracking-wide">
                    Connect with ${members.toLocaleString()} members
                </p>
            </div>
        </div>
    </div>
</div>
`;
}