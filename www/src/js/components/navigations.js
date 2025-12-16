export function mobileNavigations() {
    return `
    <div class="lg:hidden fixed bottom-0 left-0 right-0 bg-white shadow-lg flex justify-around py-2 z-30 mt-5">
        <a href="./home.html" class="mobile-nav-item active flex flex-col items-center text-primary"
            data-page="home">
            <i class="fas fa-home text-xl mb-1"></i>
            <span class="text-xs">Home</span>
        </a>
        <a href="./clubs.html" class="mobile-nav-item flex flex-col items-center text-gray-500"
            data-page="clubs" id="clubLink">
            <i class="fas fa-users text-xl mb-1"></i>
            <span class="text-xs">Clubs</span>
        </a>
        <a href="./lost-found.html" class="mobile-nav-item flex flex-col items-center text-gray-500"
            data-page="lost-found">
            <i class="fas fa-search text-xl mb-1"></i>
            <span class="text-xs">Lost & Found</span>
        </a>
        <a href="./videos.html" class="mobile-nav-item flex flex-col items-center text-gray-500"
            data-page="videos">
            <i class="fab fa-youtube text-xl mb-1"></i>
            <span class="text-xs">Videos</span>
        </a>
        <a href="./profile.html" class="mobile-nav-item flex flex-col items-center text-gray-500"
            data-page="profile">
            <i class="fas fa-circle-user text-xl mb-1"></i>
            <span class="text-xs">Profile</span>
        </a>
    </div>
    `;
};


export function rightSideBar() {
    return `
    <div class="lg:col-span-1 hidden lg:block">
        <div class="bg-white rounded-lg shadow-sm p-5 mb-6">
            <h3 class="text-lg font-bold text-primary mb-4">My Clubs</h3>
            <div class="club-card flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition"
                data-page="clubs">
                <div
                    class="club-avatar w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                    <i class="fas fa-laptop-code text-primary"></i>
                </div>
                <div class="club-info">
                    <h4 class="font-medium text-sm">Computer Science Club</h4>
                    <span class="text-xs text-gray-500">245 members</span>
                </div>
            </div>
            <div class="club-card flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition"
                data-page="clubs">
                <div
                    class="club-avatar w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                    <i class="fas fa-basketball-ball text-primary"></i>
                </div>
                <div class="club-info">
                    <h4 class="font-medium text-sm">Basketball Team</h4>
                    <span class="text-xs text-gray-500">18 members</span>
                </div>
            </div>
            <a href="#" class="view-all block text-center text-primary font-medium mt-3"
                data-page="clubs">View All Clubs</a>
        </div>

        <div class="bg-white rounded-lg shadow-sm p-5">
            <h3 class="text-lg font-bold text-primary mb-4">Online Friends</h3>
            <div class="friend-card flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition"
                data-page="messages">
                <div class="friend-avatar w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
                    <img src="https://i.pravatar.cc/150?img=32" alt="Friend Avatar"
                        class="w-full h-full object-cover">
                </div>
                <div class="friend-info">
                    <h4 class="font-medium text-sm">Jamie Rivera</h4>
                    <span class="text-xs text-green-500">Online</span>
                </div>
            </div>
            <div class="friend-card flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition"
                data-page="messages">
                <div class="friend-avatar w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
                    <img src="https://i.pravatar.cc/150?img=45" alt="Friend Avatar"
                        class="w-full h-full object-cover">
                </div>
                <div class="friend-info">
                    <h4 class="font-medium text-sm">Miguel Torres</h4>
                    <span class="text-xs text-green-500">Online</span>
                </div>
            </div>
            <a href="#" class="view-all block text-center text-primary font-medium mt-3"
                data-page="friends">View All Friends</a>
        </div>
    </div>
    `;
};

export function leftSideBar() {
    return `
<div class="lg:col-span-1 hidden lg:block">
                        <div class="bg-white rounded-lg shadow-sm p-5">
                            <ul class="space-y-2">
                                <li><a href="./home.html"
                                        class="sidebar-link flex items-center gap-3 p-3 rounded-lg bg-gray-100 text-primary font-medium"
                                        data-page="home"><i class="fas fa-home w-5 text-center"></i>Home</a></li>
                                <li><a href="./videos.html"
                                        class="sidebar-link flex items-center gap-3 p-3 rounded-lg text-gray-700 hover:bg-gray-100 transition"
                                        data-page="videos"><i class="fab fa-youtube w-5 text-center"></i>
                                        Videos</a></li>
                                <li><a href="./clubs.html"
                                        class="sidebar-link flex items-center gap-3 p-3 rounded-lg text-gray-700 hover:bg-gray-100 transition"
                                        data-page="clubs"><i class="fas fa-users w-5 text-center"></i> Clubs</a></li>
                                <li><a href="./lost-found.html"
                                        class="sidebar-link flex items-center gap-3 p-3 rounded-lg text-gray-700 hover:bg-gray-100 transition"
                                        data-page="lost-found"><i class="fas fa-search w-5 text-center"></i> Lost &
                                        Found</a></li>
                                <li><a href="./messages.html"
                                        class="sidebar-link flex items-center gap-3 p-3 rounded-lg text-gray-700 hover:bg-gray-100 transition"
                                        data-page="messages"><i class="fas fa-comment-dots w-5 text-center"></i>
                                        Messages</a></li>
                                <li><a href="./profile.html"
                                        class="sidebar-link flex items-center gap-3 p-3 rounded-lg text-gray-700 hover:bg-gray-100 transition"
                                        data-page="profile"><i class="fas fa-circle-user w-5 text-center"></i> Profile</a>
                                </li>
                            </ul>
                        </div>
                    </div>
`
};