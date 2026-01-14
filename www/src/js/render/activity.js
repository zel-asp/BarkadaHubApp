export default function summary(active, totalLogin, totalLogout) {
    return `
        <div class="mb-6">
            <a href="./home.html">
                <h1 class="text-2xl font-bold text-gray-900">
                    <i class="fas fa-sign-in-alt text-primary mr-2"></i>User Activity Log
                </h1>
                <p class="text-gray-600 mt-1">Track login and logout activities across devices</p>
            </a>

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
