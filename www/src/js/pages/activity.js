import summary, { rows } from '../render/activity.js';
import supabaseClient from '../supabase.js';
import AlertSystem from '../render/Alerts.js';

const alertSystem = new AlertSystem();

const ITEMS_PER_PAGE = 2;
let currentPage = 1;
let totalPages = 1;


document.addEventListener('DOMContentLoaded', async () => {
    const summaryContainer = document.getElementById('summary');
    const rowsContainer = document.getElementById('rows');
    const paginationContainer = document.querySelector('.flex.items-center.space-x-2');

    async function showSummary() {
        try {

            // 2. Active sessions (users whose last action is login)
            const { data: lastActions } = await supabaseClient
                .from('user_activity')
                .select('user_id, action, created_at');

            const lastActionPerUser = {};
            lastActions.forEach(row => {
                const uid = row.user_id;
                if (!lastActionPerUser[uid] || new Date(row.created_at) > new Date(lastActionPerUser[uid].created_at)) {
                    lastActionPerUser[uid] = row;
                }
            });

            const activeSessions = Object.values(lastActionPerUser).filter(row => row.action === 'login').length;

            // 3. Logins today
            const startOfToday = new Date();
            startOfToday.setHours(0, 0, 0, 0);

            const { count: loginsToday } = await supabaseClient
                .from('user_activity')
                .select('id', { count: 'exact', head: true })
                .eq('action', 'login')
                .gte('created_at', startOfToday.toISOString());

            const { count: logoutsToday } = await supabaseClient
                .from('user_activity')
                .select('id', { count: 'exact', head: true })
                .eq('action', 'logout')
                .gte('created_at', startOfToday.toISOString());

            summaryContainer.innerHTML = summary(activeSessions, loginsToday, logoutsToday)

        } catch (err) {
            console.error('Error fetching summary:', err);
            alertSystem.show('Failed to load activity summary.', 'error');
        }
    }

    function formatDateTime(dateString) {
        if (!dateString) return '—';

        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '—';

        return date.toLocaleString('en-US', {
            timeZone: 'Asia/Manila',
            month: 'long',
            day: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    }

    async function loadActivities(page = 1) {
        try {
            rowsContainer.innerHTML = `
            <tr><td colspan="5" class="text-center py-6 text-gray-400">
                Loading activities...
            </td></tr>
        `;

            const from = (page - 1) * ITEMS_PER_PAGE;
            const to = from + ITEMS_PER_PAGE - 1;

            const { data, error, count } = await supabaseClient
                .from('user_activity')
                .select('*', { count: 'exact' })
                .order('created_at', { ascending: false })
                .range(from, to);

            if (error) throw error;

            totalPages = Math.ceil(count / ITEMS_PER_PAGE);
            rowsContainer.innerHTML = '';

            if (!data.length) {
                rowsContainer.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center py-6 text-gray-400">
                        No activity found
                    </td>
                </tr>
            `;
                return;
            }

            data.forEach(row => {
                rowsContainer.insertAdjacentHTML(
                    'beforeend',
                    rows(
                        row.user_name ?? 'User',
                        row.user_email ?? '',
                        row.action,
                        row.user_agent ?? 'Unknown device',
                        formatDateTime(row.created_at),
                        row.ip_address ?? '-'
                    )
                );
            });

            renderPagination();
        } catch (err) {
            console.error(err);
            alertSystem.show('Failed to load activity logs', 'error');
        }
    }

    function renderPagination() {
        paginationContainer.innerHTML = '';

        // Previous
        const prevBtn = document.createElement('button');
        prevBtn.className = 'px-3 py-1 rounded text-lg';
        prevBtn.innerHTML = `<i class="fas fa-chevron-left"></i>`;
        prevBtn.disabled = currentPage === 1;
        prevBtn.onclick = () => {
            currentPage--;
            loadActivities(currentPage);
        };
        paginationContainer.appendChild(prevBtn);

        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            if (i > currentPage + 2 || i < currentPage - 2) continue;

            const btn = document.createElement('button');
            btn.textContent = i;
            btn.className = `px-3 py-1 rounded text-sm ${i === currentPage
                ? 'bg-primary text-white'
                : ' hover:bg-gray-50'
                }`;

            btn.onclick = () => {
                currentPage = i;
                loadActivities(currentPage);
            };

            paginationContainer.appendChild(btn);
        }

        // Next
        const nextBtn = document.createElement('button');
        nextBtn.className = 'px-3 py-1 rounded text-lg';
        nextBtn.innerHTML = `<i class="fas fa-chevron-right"></i>`;
        nextBtn.disabled = currentPage === totalPages;
        nextBtn.onclick = () => {
            currentPage++;
            loadActivities(currentPage);
        };
        paginationContainer.appendChild(nextBtn);
    }

    await loadActivities(currentPage);

    await showSummary();
});
