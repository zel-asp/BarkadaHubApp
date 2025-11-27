export default function HeaderComponent() {
    return `
    <header class="bg-white shadow-sm sticky top-0 z-40">
        <div class="container mx-auto px-4">
            <div class="flex justify-between items-center py-4">
                <div class="logo flex items-center gap-2 text-black  font-extrabold text-xl cursor-pointer"
                    data-page="home">
                    <img src="../images/image.png" alt="App Logo" class="w-10">
                    <span>BarkadaHub</span>
                </div>
                <div class="user-actions flex items-center gap-4">
                    <div class="notification-icon relative cursor-pointer">
                        <i class="fas fa-bell text-primary
                        text-md"></i>
                        <span
                            class="notification-badge absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">3</span>
                    </div>
                    <div class="notification-icon relative cursor-pointer">
                        <i class="fas fa-envelope text-primary
                        text-md"></i>

                    </div>
                </div>
            </div>
        </div>
    </header>
    `;
}