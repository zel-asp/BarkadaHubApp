export default function clubs(image, name, icon, location, description, id, category, members = 0, isJoined = false) {
    return `
        <div
            class="mb-5 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden
                hover:shadow-lg transition-all duration-300 hover:-translate-y-1">

            <div class="relative h-40 sm:h-44 bg-linear-to-r from-orange-500 to-red-600 overflow-hidden">
                <img src="${image}" alt="${name}" class="w-full h-full object-cover opacity-90" />
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

// render/joinedClubHeader.js
export function joinedClubHeaderTemplate(name, description, members = 0, category) {
    return `
        <div class="club-header text-white relative overflow-hidden min-h-[100svh]">
            <!-- Background gradient overlay -->
            <div class="absolute inset-0 bg-linear-to-br from-blue-900/50 via-purple-900/40 to-indigo-900/40"></div>
            
            <div class="relative z-10 min-h-[100svh] flex flex-col px-4 py-6 sm:px-6 lg:px-8">
                <!-- Header actions - Top bar -->
                <div class="flex items-center justify-between mb-4 sm:mb-6">
                    <button onclick="history.back()" 
                            class="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 text-white/90 hover:text-white rounded-lg hover:bg-white/10 transition-all duration-200 active:scale-95 group"
                            aria-label="Go back">
                        <i class="fas fa-arrow-left text-base sm:text-lg group-hover:-translate-x-1 transition-transform"></i>
                        <span class="text-sm sm:text-base font-medium">Back</span>
                    </button>
                    
                    <div class="flex items-center gap-2">
                        <button id="leaveClubBtn" 
                                class="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 bg-red-600/90 hover:bg-red-700 rounded-lg transition-all duration-200 active:scale-95 group"
                                aria-label="Leave club">
                            <i class="fas fa-sign-out-alt text-sm sm:text-base group-hover:rotate-90 transition-transform duration-300"></i>
                            <span class="text-sm sm:text-base font-medium hidden xs:inline">Leave</span>
                        </button>
                    </div>
                </div>

                <!-- Main content - Centered and responsive -->
                <div class="flex-1 flex flex-col justify-center items-center text-center mb-8">
                    <!-- Category badge -->
                    <div class="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 mb-6 sm:mb-8">
                        <i class="fas fa-hashtag text-blue-300 text-sm sm:text-base"></i>
                        <span class="text-white/90 font-medium text-sm sm:text-base">${category}</span>
                    </div>

                    <!-- Club title -->
                    <h1 class="text-3xl xs:text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black mb-4 sm:mb-6 tracking-tight leading-tight">
                        <span class="bg-clip-text text-transparent bg-linear-to-r from-white via-blue-100 to-purple-100">
                            ${name.toUpperCase()}
                        </span>
                    </h1>

                    <!-- Club description -->
                    <div class="max-w-2xl lg:max-w-4xl mx-auto px-2 sm:px-0">
                        <p class="text-base xs:text-lg sm:text-xl md:text-2xl lg:text-3xl text-white/90 mb-6 sm:mb-8 leading-relaxed font-light">
                            ${description}
                        </p>
                    </div>

                    <!-- Stats cards - Responsive grid -->
                    <div class="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 w-full max-w-md sm:max-w-lg lg:max-w-4xl mx-auto">
                        <!-- Members card -->
                        <div class="bg-white/10 backdrop-blur-sm p-3 sm:p-4 rounded-xl border border-white/20 hover:bg-white/15 transition-all duration-300 active:scale-95 cursor-pointer group">
                            <div class="flex items-center gap-3 sm:gap-4">
                                <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                    <i class="fas fa-users text-blue-300 text-lg sm:text-xl"></i>
                                </div>
                                <div class="text-left">
                                    <p class="text-xl sm:text-2xl md:text-3xl font-bold">${members.toLocaleString()}</p>
                                    <p class="text-white/70 text-xs sm:text-sm uppercase tracking-wider font-medium">Members</p>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Category card -->
                        <div class="bg-white/10 backdrop-blur-sm p-3 sm:p-4 rounded-xl border border-white/20 hover:bg-white/15 transition-all duration-300 active:scale-95 cursor-pointer group">
                            <div class="flex items-center gap-3 sm:gap-4">
                                <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-purple-500/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                    <i class="fas fa-tag text-purple-300 text-lg sm:text-xl"></i>
                                </div>
                                <div class="text-left">
                                    <p class="text-xl sm:text-2xl md:text-3xl font-bold">${category}</p>
                                    <p class="text-white/70 text-xs sm:text-sm uppercase tracking-wider font-medium">Category</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Scroll indicator -->
                <div class="text-center pt-4 sm:pt-6">
                    <a href="#createPost" 
                    class="inline-flex flex-col items-center gap-2 text-white/60 hover:text-white/90 transition-colors duration-300 cursor-pointer group"
                    aria-label="Scroll to content">
                        <span class="text-xs sm:text-sm font-medium tracking-wider">EXPLORE CLUB</span>
                        <div class="relative w-6 h-10 sm:w-8 sm:h-12">
                            <div class="absolute inset-0 border-2 border-white/40 rounded-full group-hover:border-white/70 transition-colors"></div>
                            <div class="absolute top-2 left-1/2 transform -translate-x-1/2 w-1 h-3 bg-white/60 rounded-full group-hover:bg-white/90 animate-bounce transition-colors"></div>
                        </div>
                    </a>
                </div>
            </div>
        </div>
    `;
}