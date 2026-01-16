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
        <div id="loadingOverlay" class="fixed inset-0 bg-white/10 z-50 flex items-center justify-center">
            <div class="text-center space-y-4">
                <!-- Animated dots -->
                <div class="flex justify-center items-center space-x-2">
                    <div class="w-4 h-4 bg-blue-500 rounded-full animate-pulse" style="animation-delay: 0s;"></div>
                    <div class="w-4 h-4 bg-pink-500 rounded-full animate-pulse" style="animation-delay: 0.2s;"></div>
                    <div class="w-4 h-4 bg-violet-500 rounded-full animate-pulse" style="animation-delay: 0.4s;"></div>
                </div>
                
                <p class="text-black font-bold">Loading<span class="loading-dots"></span></p>
                
                <style>
                    @keyframes dot-flash {
                        0%, 100% { opacity: 0.3; transform: scale(0.8); }
                        50% { opacity: 1; transform: scale(1); }
                    }
                    .animate-pulse {
                        animation: dot-flash 1.5s ease-in-out infinite;
                    }
                </style>
            </div>
        </div>
    `;
}