export function displayBio(bio) {
    return `
                <div class="mt-8 pt-8 border-t border-gray-200">
                    <h3 class="text-xl font-bold text-gray-800 mb-6 flex items-center">
                        <i class="fas fa-quote-left mr-2" style="color: var(--color-primary);"></i>
                        About Me
                    </h3>
                    
                    <div class="bg-gray-50 p-6 rounded-xl border border-gray-200">
                        <div class="flex items-start">
                            <i class="fas fa-quote-right text-[#71C9CE] text-2xl mr-4 mt-1 opacity-50"></i>
                            <div>
                                <p class="text-gray-700 leading-relaxed text-lg">
                                    "${bio}."
                                </p>
                                <div class="mt-4 flex items-center text-sm text-gray-500">
                                    <i class="fas fa-user-edit mr-2" style="color: var(--color-primary);"></i>
                                    Personal introduction
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
}


// Enhanced displayInformation function matching Supabase design
export function displayInformation(name, email, major, year_level, owner = false, studentNumber = 123) {
    return `
                <div class="mt-6">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-lg font-semibold text-gray-800">Student Details</h3>
                        ${!owner ? `
                            <button type="button" 
                                class="follow-btn flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium hover:shadow transition-all duration-200"
                                style="background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 100%); color: white;">
                                <i class="fas fa-user-plus"></i>
                                <span>Follow</span>
                            </button>
                        ` : ''}
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <!-- Name Field -->
                        <div class="bg-gray-50 p-4 rounded-xl border border-gray-200">
                            <div class="flex items-center mb-2">
                                <i class="fas fa-user-tag mr-2 text-gray-500 text-sm"></i>
                                <span class="text-sm font-medium text-gray-500">Full Name</span>
                            </div>
                            <p class="text-gray-800 font-medium">${name}</p>
                        </div>

                        <div class="bg-gray-50 p-4 rounded-xl border border-gray-200">
                            <div class="flex items-center mb-2">
                                <i class="fas fa-id-card mr-2 text-gray-500 text-sm"></i>
                                <span class="text-sm font-medium text-gray-500">Student Number</span>
                            </div>
                            <p class="text-gray-800 font-medium">${studentNumber}</p>
                        </div>
                        
                        <!-- Email Field -->
                        <div class="bg-gray-50 p-4 rounded-xl border border-gray-200">
                            <div class="flex items-center mb-2">
                                <i class="fas fa-envelope mr-2 text-gray-500 text-sm"></i>
                                <span class="text-sm font-medium text-gray-500">Email Address</span>
                            </div>
                            <p class="text-gray-800 font-medium text-sm">${email}</p>
                        </div>
                        
                        <!-- Major Field -->
                        <div class="bg-gray-50 p-4 rounded-xl border border-gray-200">
                            <div class="flex items-center mb-2">
                                <i class="fas fa-book mr-2 text-gray-500 text-sm"></i>
                                <span class="text-sm font-medium text-gray-500">Academic Major</span>
                            </div>
                            <p class="text-gray-800 font-medium">${major}</p>
                        </div>
                        
                        <!-- Year Level Field -->
                        <div class="bg-gray-50 p-4 rounded-xl border border-gray-200">
                            <div class="flex items-center mb-2">
                                <i class="fas fa-calendar-alt mr-2 text-gray-500 text-sm"></i>
                                <span class="text-sm font-medium text-gray-500">Year Level</span>
                            </div>
                            <p class="text-gray-800 font-medium">${year_level}</p>
                        </div>
                    </div>
                </div>
            `;
}