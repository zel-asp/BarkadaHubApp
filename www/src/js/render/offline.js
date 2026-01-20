export default function Offline() {
    return `
        <div class="h-screen bg-linear-to-b from-gray-50 to-white flex items-center justify-center p-4">
            <div class="max-w-md w-full text-center">
                <!-- Animated icon -->
                <div class="relative w-32 h-32 mx-auto mb-8">
                    <div class="absolute inset-0 bg-linear-to-r from-red-100 to-red-50 rounded-full animate-pulse"></div>
                    <div class="relative w-full h-full flex items-center justify-center">
                        <div class="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-lg">
                            <i class="fas fa-wifi-slash text-4xl text-red-500"></i>
                        </div>
                    </div>
                    <div class="absolute -inset-4">
                        <div class="absolute inset-0 border-2 border-red-200 rounded-full animate-ping"></div>
                        <div class="absolute inset-2 border-2 border-red-100 rounded-full animate-ping"
                            style="animation-delay: 0.5s"></div>
                    </div>
                </div>

                <h1 class="text-2xl font-bold text-gray-800 mb-3">No Internet Connection</h1>
                <p class="text-gray-600 mb-8 leading-relaxed">
                    You're currently offline. Please check your network connection and try again.
                </p>

                <button id="retryBtn"
                    class="retry-btn w-full max-w-xs mx-auto px-6 py-3.5 bg-primary text-white font-semibold rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-md hover:shadow-lg active:scale-95 flex items-center justify-center">
                    <i class="fas fa-sync-alt mr-3"></i>
                    <span class="btn-text">Retry Connection</span>
                </button>

                <div class="mt-10 p-5 bg-gray-50 rounded-xl border border-gray-200 text-left">
                    <h3 class="font-semibold text-gray-700 mb-3 flex items-center">
                        <i class="fas fa-lightbulb text-amber-500 mr-2"></i>
                        Try these steps:
                    </h3>
                    <ul class="space-y-2 text-sm text-gray-600">
                        <li class="flex items-start"><i class="fas fa-check-circle text-green-500 mt-0.5 mr-2"></i>Check your Wi-Fi or mobile data connection</li>
                        <li class="flex items-start"><i class="fas fa-check-circle text-green-500 mt-0.5 mr-2"></i>Turn airplane mode on and off</li>
                        <li class="flex items-start"><i class="fas fa-check-circle text-green-500 mt-0.5 mr-2"></i>Restart your router or modem</li>
                        <li class="flex items-start"><i class="fas fa-check-circle text-green-500 mt-0.5 mr-2"></i>Try accessing other websites to confirm</li>
                    </ul>
                </div>
            </div>
        </div>
    `
};

export function Loading() {
    return `
<div id="loadingOverlay" class="fixed inset-0 bg-linear-to-br from-white via-gray-50 to-blue-50/30 backdrop-blur-sm z-50 flex items-center justify-center">
    <div class="text-center space-y-6 animate-fadeIn">
        
        <!-- Loading text with animated linear -->
        <div class="space-y-2">
            <h2 class="text-2xl font-bold bg-primary bg-clip-text text-transparent animate-linear-x">
                Loading, Please wait
            </h2>
            <p class="text-gray-600 text-sm font-medium tracking-wide">Preparing content<span class="loading-dots">...</span></p>
        </div>
        
        <!-- Progress bar (optional) -->
        <div class="w-64 mx-auto">
            <div class="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div class="h-full bg-primary rounded-full animate-progress"></div>
            </div>
            <p class="text-xs text-gray-500 mt-2 font-medium"><span class="loading-dots">...</span></p>
        </div>
    </div>
</div>

<style>
/* Custom animations used in your HTML */
@keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
}

@keyframes gradient-x {
    0%, 100% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
}

@keyframes progress {
    0% { width: 0%; }
    50% { width: 70%; }
    100% { width: 100%; }
}

@keyframes dots {
    0%, 20% { content: '.'; }
    40% { content: '..'; }
    60%, 100% { content: '...'; }
}

/* Animation classes */
.animate-fadeIn {
    animation: fadeIn 0.5s ease-out;
}

.animate-linear-x {
    background-size: 200% 200%;
    animation: gradient-x 3s ease infinite;
}

.animate-progress {
    animation: progress 2s ease-in-out infinite;
}

.loading-dots::after {
    content: '';
    animation: dots 1.5s steps(4, end) infinite;
}

/* Smooth transitions */
#loadingOverlay {
    transition: opacity 0.3s ease-out;
}

/* Responsive adjustments */
@media (max-width: 640px) {
    .text-2xl {
        font-size: 1.25rem;
    }
}

</style>
    `;
}