export default function HeaderComponent() {
    return `
    <header class="bg-white shadow-sm sticky top-0 z-40">
        <div class="container mx-auto px-4">
            <div class="flex justify-between items-center py-4">
                <div class="logo flex items-center gap-2 text-primary font-bold text-xl cursor-pointer"
                    data-page="home">
                    <i class="fas fa-users text-2xl"></i>
                    <span>BarkadaHub</span>
                </div>
                <div class="user-actions flex items-center gap-4">
                    <div class="notification-icon relative cursor-pointer">
                        <i class="fas fa-bell text-gray-600 text-xl"></i>
                        <span
                            class="notification-badge absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">3</span>
                    </div>
                    <div class="user-profile flex items-center gap-2 cursor-pointer" data-page="profile">
                        <div class="avatar w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
                            <img src="https://i.pravatar.cc/150?img=12" alt="User Avatar"
                                class="w-full h-full object-cover">
                        </div>
                        <span class="font-medium">Alex</span>
                    </div>
                </div>
            </div>
        </div>
    </header>
    `;
}

export function timeout(modal, brand, slogan) {
    modal.classList.remove('active');
    setTimeout(() => {
        modal.classList.add('hidden');
        brand.classList.remove('-translate-y-50', 'transition-transform', 'duration-900');
        brand.classList.add('translate-y-0', 'transition-transform', 'duration-900');
        slogan.classList.remove('hidden');
    }, 300);
}