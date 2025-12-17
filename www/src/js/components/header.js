export default function HeaderComponent() {
    return `
<header class="bg-white shadow-sm sticky top-0 z-30 md:mb-10">
    <div class="container mx-auto px-4">
        <div class="flex justify-between items-center py-4">

            <!-- LOGO -->
            <a href="javascript:void(0)" 
                class="logo flex items-center gap-2 font-extrabold text-xl cursor-pointer"
                onclick="history.back()"
                data-page="home">

                <img src="../images/image.png" alt="App Logo" class="w-10">

            <span class="bg-linear-to-r 
                        from-indigo-600
                        to-(--color-primary)
                        bg-clip-text text-transparent">
                BarkadaHub
            </span>

            </a>

            <!-- USER ACTIONS -->
            <div class="user-actions flex items-center gap-4">

                <!-- NOTIFICATIONS -->
                <div class="relative cursor-pointer">
                    <a href="./notification.html" class="block relative">
                        <i class="fas fa-bell text-primary text-xl"></i>
                        <span
                            class="absolute -top-2 -right-1
                                text-[10px] rounded-full w-4 h-4
                                flex items-center justify-center
                                font-extrabold text-white bg-red-500">
                            3
                        </span>
                    </a>
                </div>

                <!-- MESSAGES -->
                <div class="relative cursor-pointer">
                    <a href="./messages.html" class="block relative">
                        <i class="fa-solid fa-message text-primary text-xl"></i>
                        <span
                            class="absolute -top-2 -right-1
                            text-[10px] rounded-full w-4 h-4
                            flex items-center justify-center
                            font-extrabold text-white bg-red-500">
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
