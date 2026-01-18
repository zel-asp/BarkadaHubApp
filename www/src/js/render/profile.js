export function displayBio(bio) {
    return `
        <div
            class="bg-linear-to-br from-gray-50 to-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300 mb-8">
            <div class="flex items-center gap-3 mb-4">
                <div
                    class="w-10 h-10 bg-linear-to-br from-blue-100 to-indigo-100 rounded-lg flex items-center justify-center">
                    <i class="fas fa-quote-left text-primary"></i>
                </div>
                <h4 class="font-bold text-gray-800">About Me</h4>
            </div>
            <div class="p-4 bg-white rounded-lg border-l-4 border-primary">
                <p class="text-gray-700 leading-relaxed text-lg italic">
                    "${bio}."
                </p>
            </div>
        </div>
    `
}

export function displayInformation(name, email, major, year_level, owner = false) {
    return `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <!-- Personal Information -->
            <div class="space-y-6">
                <div
                    class="bg-linear-to-br from-gray-50 to-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300">
                    <div class="flex items-center gap-3 mb-4">
                        <div
                            class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <i class="fas fa-user text-primary"></i>
                        </div>
                        <div class="flex-1 flex items-center justify-between">
                            <h4 class="font-bold text-gray-800">Personal Information</h4>
                            ${!owner ? `
                                <button type="button" class="follow-btn flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-500 transition-all duration-200">
                                    <i class="fas fa-user-plus text-sm"></i>
                                    <span>Follow</span>
                                </button>
                            ` : ''}
                        </div>
                    </div>
                    <div class="space-y-4">
                        <div
                            class="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-white rounded-lg hover:bg-blue-50 transition-colors duration-200">
                            <div>
                                <p class="text-sm text-gray-500">Full Name</p>
                                <p class="font-semibold text-gray-900">${name}</p>
                            </div>
                            <i class="fas fa-id-card text-gray-400 mt-2 sm:mt-0"></i>
                        </div>
                        <div
                            class="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-white rounded-lg hover:bg-blue-50 transition-colors duration-200">
                            <div>
                                <p class="text-sm text-gray-500">Email Address</p>
                                <p class="font-semibold text-gray-900">${email}
                                </p>
                            </div>
                            <i class="fas fa-envelope text-gray-400 mt-2 sm:mt-0"></i>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Academic Information -->
            <div class="space-y-6">
                <div
                    class="bg-linear-to-br from-blue-50 to-white p-5 rounded-xl border border-blue-100 shadow-sm hover:shadow-md transition-shadow duration-300">
                    <div class="flex items-center gap-3 mb-4">
                        <div
                            class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <i class="fas fa-graduation-cap text-primary"></i>
                        </div>
                        <h4 class="font-bold text-gray-800">Academic Information</h4>
                    </div>
                    <div class="space-y-4">
                        <div
                            class="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-white rounded-lg hover:bg-blue-50 transition-colors duration-200">
                            <div>
                                <p class="text-sm text-gray-500">Major</p>
                                <p class="font-semibold text-gray-900">${major}</p>
                            </div>
                            <i class="fas fa-book text-gray-400 mt-2 sm:mt-0"></i>
                        </div>
                        <div
                            class="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-white rounded-lg hover:bg-blue-50 transition-colors duration-200">
                            <div>
                                <p class="text-sm text-gray-500">Year Level</p>
                                <p class="font-semibold text-gray-900">${year_level}</p>
                            </div>
                            <i class="fas fa-calendar-alt text-gray-400 mt-2 sm:mt-0"></i>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `
}