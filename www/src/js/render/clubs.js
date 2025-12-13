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
        <div class="club-header text-white">
            <div class="container mx-auto px-4 py-12">
                <div class="flex items-center justify-between mb-6">
                    <div class="flex space-x-4">
                        <button onclick="openClubModal()"
                            class="bg-white/20 hover:bg-white/30 backdrop-blur-sm px-4 py-2 rounded-lg transition">
                            <i class="fas fa-info-circle mr-2"></i>Club Info
                        </button>

                        <button id="leaveClubBtn" class="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition">
                            <i class="fas fa-sign-out-alt mr-2"></i>Leave Club
                        </button>
                    </div>
                </div>

                <h1 class="text-4xl font-bold mb-4">${name}</h1>
                <p class="text-xl text-white/90 mb-6 max-w-3xl">${description}</p>

                <div class="flex flex-wrap gap-4">
                    <span class="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg">
                        <i class="fas fa-users mr-2"></i>${members} Members
                    </span>
                    <span class="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg">
                        <i class="fas fa-tag mr-2"></i>${category}
                    </span>
                </div>
            </div>
        </div>
    `;
}

