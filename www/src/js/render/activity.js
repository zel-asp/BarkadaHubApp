export default function summary(active, totalLogin, totalLogout) {
    return `
<div class="mb-8">
    <div class="flex items-center justify-between">
        <!-- Title with Icon -->
        <a href="./home.html">
            <div>
                <div class="flex items-center gap-3">
                    <div class="relative">
                        <div
                            class="w-10 h-10 bg-linear-to-br from-primary/10 to-blue-100 rounded-xl flex items-center justify-center">
                            <i class="fas fa-sign-in-alt text-primary"></i>
                        </div>
                    </div>
                    <div>
                        <h1 class="text-2xl font-bold text-gray-900">Activity Log</h1>
                        <p class="text-gray-500 text-sm">Monitoring system access and security</p>
                    </div>
                </div>
            </div>
        </a>
        
        <!-- Reports Quick Action -->
        <a href="./testUI.html" class="relative">
            <div class="flex items-center gap-2 px-4 py-2.5 bg-linear-to-r from-white to-gray-50 border border-gray-200 rounded-xl hover:border-primary/50 hover:shadow-md transition-all duration-200 group">
                <div class="relative">
                    <i class="fas fa-flag text-gray-500 group-hover:text-red-500"></i>
                    <span id="urgentBadge" class="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full hidden"></span>
                </div>
                <span class="font-medium text-gray-700 group-hover:text-gray-900">Reports</span>
            </div>
        </a>
    </div>
</div>

            <!-- Stats Cards -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                <div class="bg-white rounded-lg shadow p-4">
                    <div class="flex items-center">
                        <div class="rounded-full p-3 mr-3 bg-secondary">
                            <i class="fas fa-user-clock text-primary"></i>
                        </div>
                        <div>
                            <p class="text-sm text-gray-500">Active Sessions</p>
                            <p class="text-xl font-bold">${active}</p>
                        </div>
                    </div>
                </div>
                <div class="bg-white rounded-lg shadow p-4">
                    <div class="flex items-center">
                        <div class="rounded-full p-3 mr-3 bg-green-100">
                            <i class="fas fa-sign-in-alt text-green-600"></i>
                        </div>
                        <div>
                            <p class="text-sm text-gray-500">Logins Today</p>
                            <p class="text-xl font-bold">${totalLogin}</p>
                        </div>
                    </div>
                </div>

                <div class="bg-white rounded-lg shadow p-4">
                    <div class="flex items-center">
                        <div class="rounded-full p-3 mr-3 bg-blue-100">
                            <i class="fas fa-mobile-alt text-blue-600"></i>
                        </div>
                        <div>
                            <p class="text-sm text-gray-500">Total Logout</p>
                            <p class="text-xl font-bold">${totalLogout}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `
}

export function rows(name, email, action, mobile, time, ip) {
    const isLogin = action === 'login';

    return `
        <tr class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    <div class="shrink-0 h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
                        <i class="fas fa-user text-primary"></i>
                    </div>
                    <div class="ml-4">
                        <div class="text-sm font-medium text-gray-900">${name}</div>
                        <div class="text-sm text-gray-500">${email ?? ''}</div>
                    </div>
                </div>
            </td>

            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-3 py-1 inline-flex text-xs font-semibold rounded-full
                    ${isLogin ? 'login-badge' : 'logout-badge'}">
                    <i class="fas ${isLogin ? 'fa-sign-in-alt' : 'fa-sign-out-alt'} mr-1"></i>
                    ${action.toUpperCase()}
                </span>
            </td>

            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    <i class="fas fa-mobile-alt device-mobile text-lg mr-2"></i>
                    <div>
                        <div class="text-sm text-gray-900">Device</div>
                        <div class="text-xs text-gray-500">${mobile ?? 'Unknown'}</div>
                    </div>
                </div>
            </td>

            <td class="px-6 py-4 text-sm text-gray-900">${ip ?? '-'}</td>

            <td class="px-6 py-4 text-sm text-gray-500">
                <i class="far fa-clock text-primary mr-1"></i>
                ${time}
            </td>
        </tr>
    `;
}
