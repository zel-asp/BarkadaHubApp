export default function HeaderComponent() {
    return `
<header class="bg-white shadow-sm sticky top-0 z-30 md:mb-10">
    <div class="container mx-auto px-4">
        <div class="flex justify-between items-center py-4">
            <div class="logo flex items-center gap-2 text-black  font-extrabold text-xl cursor-pointer"
                data-page="home">
                <img src="../images/image.png" alt="App Logo" class="w-10">
                <span>BarkadaHub</span>
            </div>
            <div class="user-actions flex items-center gap-4">
                <div class="notification-icon relative cursor-pointer">
                <a href="./messages.html">
                    <i class="fas fa-bell text-primary text-lg"></i>
                    <span
                        class="notification-badge absolute -top-2 -right-1
                        text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-extrabold text-white bg-red-500">
                        3
                    </span>
                </a>
                </div>

                <div class="notification-icon relative cursor-pointer">
                    <a href="./messages.html">
                        <i class="fa-solid fa-message text-primary text-lg"></i>
                        <span
                            class="notification-badge absolute -top-2 -right-1
                            text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-extrabold text-white bg-red-500">
                            3
                        </span>
                    </a>
                    
                </div>
            </div>
        </div>
    </div>
</header>
`;
}