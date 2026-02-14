import supabaseClient from '../supabase.js';
import uploadedPost from '../render/post.js';
import AlertSystem from '../render/Alerts.js';


document.addEventListener('DOMContentLoaded', async () => {
    // =======================
    // PAGE ELEMENTS
    // =======================
    const reportsContainer = document.getElementById('reportsContainer');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const noReports = document.getElementById('noReports');
    const totalReportsEl = document.getElementById('totalReports');
    const pendingReportsEl = document.getElementById('pendingReports');
    const resolvedReportsEl = document.getElementById('resolvedReports');

    // Modals
    const reportDetailsModal = document.getElementById('reportDetailsModal');
    const deleteConfirmationModal = document.getElementById('deleteConfirmationModal');

    // Filters
    const statusFilter = document.getElementById('statusFilter');
    const reasonFilter = document.getElementById('reasonFilter');
    const clearFilters = document.getElementById('clearFilters');

    // =======================
    // APP STATE
    // =======================
    let currentReportId = null;
    let currentPostId = null;
    let currentFilePath = null;
    let currentUserId = null;
    let currentUserName = null;
    let currentReporterId = null;
    let allReports = [];

    // Get current admin user
    const { data: adminData } = await supabaseClient.auth.getUser();
    const adminUserId = adminData?.user?.id;
    const adminUserName = adminData?.user?.user_metadata?.display_name || 'Admin';

    const alertSystem = new AlertSystem();

    // =======================
    // SEND NOTIFICATION FUNCTION
    // =======================
    async function sendNotification(userId, type, message, entityId = null, senderId = null) {
        try {
            const notificationData = {
                user_id: userId,
                sender_id: senderId || adminUserId,
                type: type,
                message: message,
                username: adminUserName,
                avatar_url: '../images/defaultAvatar.jpg',
                created_at: new Date().toISOString(),
                is_read: false
            };

            // For banning actions, don't include entity_id since post was deleted
            if (entityId && !type.includes('user_banned') && !type.includes('post_deleted')) {
                notificationData.entity_id = entityId;
                notificationData.entity_type = 'post';
            }

            const { error } = await supabaseClient
                .from('notifications')
                .insert(notificationData);

            if (error) {
                // If it's a foreign key violation, try without entity_id
                if (error.code === '23503') {
                    delete notificationData.entity_id;
                    delete notificationData.entity_type;

                    const { error: retryError } = await supabaseClient
                        .from('notifications')
                        .insert(notificationData);

                    if (retryError) {
                        console.error('Failed to send notification even without entity_id:', retryError);
                        return false;
                    }
                    return true;
                }
                console.error('Failed to send notification:', error);
                return false;
            }

            return true;
        } catch (error) {
            console.error('Error sending notification:', error);
            return false;
        }
    }

    // =======================
    // SEND REPORT NOTIFICATIONS (FINAL VERSION)
    // =======================
    async function sendReportNotifications(action) {
        try {

            const reportReason = document.getElementById('reportReason')?.textContent || 'Unknown reason';
            const isSelfReport = currentReporterId === currentUserId;

            if (isSelfReport) {
                // For self-reports, only send one notification
                const selfReportMessages = {
                    'reviewed': `Your self-report has been reviewed: ${reportReason}`,
                    'dismissed': `Your self-report was dismissed.`,
                    'post_deleted': `Your post was removed based on your report.`,
                    'user_banned': `Your account was banned based on violations.`
                };

                if (selfReportMessages[action]) {
                    const success = await sendNotification(
                        currentUserId, // Send to the same user
                        `self_report_${action}`,
                        selfReportMessages[action],
                        currentPostId,
                        adminUserId
                    );
                }
            } else {
                // Regular report with different users
                const reporterMessages = {
                    'reviewed': `Your report has been reviewed. Reason: ${reportReason}`,
                    'dismissed': `Your report was dismissed by admin.`,
                    'post_deleted': `The post you reported has been removed.`,
                    'user_banned': `The user you reported has been banned.`
                };

                const postOwnerMessages = {
                    'reviewed': `Your post was reported: ${reportReason}. Reviewed by admin.`,
                    'post_deleted': `Your post was removed for: ${reportReason}`,
                    'user_banned': `Your account was banned for violations.`
                };

                // Send to REPORTER
                if (currentReporterId && reporterMessages[action]) {
                    const reporterSuccess = await sendNotification(
                        currentReporterId,
                        `report_${action}`,
                        reporterMessages[action],
                        currentPostId,
                        adminUserId
                    );
                }

                // Send to POST OWNER (skip for dismissed reports)
                if (currentUserId && action !== 'dismissed' && postOwnerMessages[action]) {
                    const postOwnerSuccess = await sendNotification(
                        currentUserId,
                        `content_${action}`,
                        postOwnerMessages[action],
                        currentPostId,
                        adminUserId
                    );
                }
            }

            return true;
        } catch (error) {
            console.error('Error sending report notifications:', error);
            return false;
        }
    }

    // =======================
    // LOAD REPORTS
    // =======================
    async function loadReports() {
        try {
            loadingIndicator.classList.remove('hidden');
            reportsContainer.innerHTML = '';
            reportsContainer.appendChild(loadingIndicator);

            // Get reports with posts
            const { data: reports, error } = await supabaseClient
                .from('reports')
                .select(`
                    *,
                    posts (*)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            allReports = reports || [];
            updateStats();
            applyFilters();

        } catch (error) {
            console.error('Error loading reports:', error);
            alertSystem.show('Failed to load reports', 'error');
        } finally {
            loadingIndicator.classList.add('hidden');
        }
    }

    // =======================
    // UPDATE STATS
    // =======================
    function updateStats() {
        const total = allReports.length;
        const pending = allReports.filter(r => !r.reviewed_at && !r.resolved_at).length;
        const reviewed = allReports.filter(r => r.reviewed_at && !r.resolved_at).length;
        const resolved = allReports.filter(r => r.resolved_at).length;

        totalReportsEl.textContent = total;
        pendingReportsEl.textContent = pending;
        resolvedReportsEl.textContent = resolved + reviewed; // Show reviewed as part of resolved
    }

    // =======================
    // RENDER REPORT CARD
    // =======================
    function renderReportCard(report, post) {
        if (!post) return '';

        const reportDate = new Date(report.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        // Determine status
        let status = 'pending';
        let statusText = 'Pending';
        if (report.resolved_at) {
            status = 'resolved';
            statusText = 'Resolved';
        } else if (report.reviewed_at) {
            status = 'reviewed';
            statusText = 'Reviewed';
        }

        const statusColors = {
            pending: 'bg-yellow-100 text-yellow-800',
            reviewed: 'bg-blue-100 text-blue-800',
            resolved: 'bg-green-100 text-green-800'
        };

        const reporterName = 'Anonymous';

        return `
            <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden report-card" data-report-id="${report.id}" data-post-id="${post.id}">
                <!-- Report Header -->
                <div class="border-b border-gray-100 p-4">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <div class="relative">
                                <div class="w-10 h-10 rounded-full overflow-hidden bg-gray-200">
                                    <img src="../images/defaultAvatar.jpg" alt="${reporterName}" class="w-full h-full object-cover" loading="lazy">
                                </div>
                                <div class="absolute -bottom-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-white flex items-center justify-center">
                                    <i class="fas fa-flag text-xs text-white"></i>
                                </div>
                            </div>
                            <div>
                                <h4 class="font-medium text-gray-800">${reporterName}</h4>
                                <p class="text-xs text-gray-500">Reported ${reportDate}</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[status]}">
                                ${statusText}
                            </span>
                            <button class="text-gray-400 hover:text-gray-600 view-report-btn" data-report-id="${report.id}">
                                <i class="fas fa-chevron-right"></i>
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- Report Reason -->
                <div class="p-4 border-b border-gray-100">
                    <div class="flex items-start gap-2">
                        <div class="w-6 h-6 rounded-full bg-red-50 flex items-center justify-center shrink-0 mt-0.5">
                            <i class="fas fa-exclamation-circle text-red-500 text-xs"></i>
                        </div>
                        <div class="flex-1">
                            <p class="text-sm font-medium text-gray-700 mb-1">Reason: ${formatReason(report.reason)}</p>
                            ${report.other_reason ? `<p class="text-sm text-gray-600">"${report.other_reason}"</p>` : ''}
                        </div>
                    </div>
                </div>
                
                <!-- Post Preview -->
                <div class="p-4">
                    <div class="flex items-center justify-between mb-2">
                        <h5 class="text-sm font-medium text-gray-700">Reported Post</h5>
                        <span class="text-xs text-gray-500">by ${post.user_name}</span>
                    </div>
                    
                    <!-- Post Content Preview -->
                    <div class="bg-gray-50 rounded-lg p-3 max-h-32 overflow-hidden relative">
                        ${post.content.length > 150
                ? `<p class="text-sm text-gray-600">${post.content.substring(0, 150)}...</p>`
                : `<p class="text-sm text-gray-600">${post.content}</p>`
            }
                        ${post.media_url ? `
                            <div class="flex items-center gap-1 mt-2 text-xs text-gray-500">
                                <i class="fas fa-paperclip"></i>
                                <span>Contains media</span>
                            </div>
                        ` : ''}
                        <div class="absolute bottom-0 left-0 right-0 h-8 bg-linear-to-t from-gray-50 to-transparent"></div>
                    </div>
                </div>
            </div>
        `;
    }

    // =======================
    // FORMAT REASON
    // =======================
    function formatReason(reason) {
        const reasonMap = {
            'spam': 'Spam',
            'inappropriate': 'Inappropriate Content',
            'harassment': 'Harassment',
            'hate_speech': 'Hate Speech',
            'other': 'Other'
        };
        return reasonMap[reason] || reason;
    }

    // =======================
    // APPLY FILTERS
    // =======================
    function applyFilters() {
        const statusFilterValue = statusFilter.value;
        const reasonFilterValue = reasonFilter.value;

        let filteredReports = [...allReports];

        // Apply status filter
        if (statusFilterValue !== 'all') {
            filteredReports = filteredReports.filter(report => {
                if (statusFilterValue === 'pending') return !report.reviewed_at && !report.resolved_at;
                if (statusFilterValue === 'reviewed') return report.reviewed_at && !report.resolved_at;
                if (statusFilterValue === 'resolved') return report.resolved_at;
                return true;
            });
        }

        // Apply reason filter
        if (reasonFilterValue !== 'all') {
            filteredReports = filteredReports.filter(report => report.reason === reasonFilterValue);
        }

        // Render filtered reports
        renderReportsList(filteredReports);
    }

    // =======================
    // RENDER REPORTS LIST
    // =======================
    function renderReportsList(reports) {
        reportsContainer.innerHTML = '';

        if (reports.length === 0) {
            noReports.classList.remove('hidden');
            reportsContainer.appendChild(noReports);
            return;
        }

        noReports.classList.add('hidden');

        reports.forEach(report => {
            if (report.posts) {
                reportsContainer.insertAdjacentHTML('beforeend', renderReportCard(report, report.posts));
            }
        });

        // Add click handlers
        document.querySelectorAll('.view-report-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const reportId = e.currentTarget.dataset.reportId;
                openReportDetails(reportId);
            });
        });
    }
    // =======================
    // OPEN REPORT DETAILS
    // =======================
    async function openReportDetails(reportId) {
        try {
            // Get report data
            const { data: report, error: reportError } = await supabaseClient
                .from('reports')
                .select('*')
                .eq('id', reportId)
                .single();

            if (reportError) throw reportError;
            if (!report) throw new Error('Report not found');

            // Get post data separately
            const { data: post, error: postError } = await supabaseClient
                .from('posts')
                .select('*')
                .eq('id', report.post_id)
                .single();

            if (postError) throw postError;
            if (!post) throw new Error('Post not found');

            currentReportId = reportId;
            currentPostId = post.id;
            currentFilePath = post.file_path;
            currentUserId = post.user_id; // POST OWNER
            currentUserName = post.user_name;
            currentReporterId = report.who_reported; // REPORTER

            // Populate modal content - CORRECTED IDs to match HTML
            const reportTimeEl = document.getElementById('reportTime');
            if (reportTimeEl) {
                reportTimeEl.textContent = new Date(report.created_at).toLocaleString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit'
                });
            }

            // Report reason
            const reportReasonEl = document.getElementById('reportReason');
            if (reportReasonEl) {
                reportReasonEl.textContent = formatReason(report.reason);
            }

            // Report status
            const reportStatusEl = document.getElementById('reportStatus');
            if (reportStatusEl) {
                if (report.resolved_at) {
                    reportStatusEl.textContent = 'Resolved';
                    reportStatusEl.className = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800';
                } else if (report.reviewed_at) {
                    reportStatusEl.textContent = 'Reviewed';
                    reportStatusEl.className = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800';
                } else {
                    reportStatusEl.textContent = 'Pending';
                    reportStatusEl.className = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800';
                }
            }

            // Additional details
            const reportDetailsTextEl = document.getElementById('reportDetailsText');
            if (reportDetailsTextEl) {
                if (report.other_reason) {
                    reportDetailsTextEl.textContent = report.other_reason;
                    reportDetailsTextEl.parentElement.classList.remove('hidden');
                } else {
                    reportDetailsTextEl.textContent = 'No additional details provided';
                    reportDetailsTextEl.parentElement.classList.remove('hidden');
                }
            }

            // Set reporter info - this section is in your HTML but needs to be populated
            const reporterProfile = await supabaseClient
                .from('profile')
                .select('name, avatar_url')
                .eq('id', report.who_reported)
                .maybeSingle();

            const reporterInfoEl = document.getElementById('reporterInfo');
            if (reporterInfoEl) {
                const avatarUrl = reporterProfile?.avatar_url || '../images/defaultAvatar.jpg';
                const reporterName = reporterProfile?.name || 'Anonymous';

                reporterInfoEl.innerHTML = `
                <div class="w-10 h-10 rounded-full overflow-hidden bg-gray-200">
                    <img src="${avatarUrl}" alt="${reporterName}" class="w-full h-full object-cover">
                </div>
                <div>
                    <p class="font-medium text-gray-800">${reporterName}</p>
                    <p class="text-xs text-gray-500">ID: ${report.who_reported.substring(0, 8)}...</p>
                </div>
            `;
            }

            // Render the post for review - using the correct container ID from your HTML
            const reportedPostContainer = document.getElementById('reportedPostContainer');
            if (reportedPostContainer) {
                reportedPostContainer.innerHTML = await renderPostForReview(post);
            }

            // Show/hide action buttons based on status
            const markReviewedBtn = document.getElementById('markReviewedBtn');
            const dismissReportBtn = document.getElementById('dismissReportBtn');

            if (markReviewedBtn && dismissReportBtn) {
                if (report.reviewed_at || report.resolved_at) {
                    markReviewedBtn.disabled = true;
                    markReviewedBtn.classList.add('opacity-50', 'cursor-not-allowed');
                    dismissReportBtn.disabled = true;
                    dismissReportBtn.classList.add('opacity-50', 'cursor-not-allowed');
                } else {
                    markReviewedBtn.disabled = false;
                    markReviewedBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                    dismissReportBtn.disabled = false;
                    dismissReportBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                }
            }

            // Show modal
            if (reportDetailsModal) {
                reportDetailsModal.classList.remove('hidden');
                document.body.style.overflow = 'hidden';
            }

        } catch (error) {
            console.error('Error opening report details:', error);
            alertSystem.show('Failed to load report details', 'error');
        }
    }
    // =======================
    // RENDER POST FOR REVIEW
    // =======================
    async function renderPostForReview(post) {
        // Get post author profile
        let avatar = '../images/defaultAvatar.jpg';
        try {
            const { data: profile } = await supabaseClient
                .from('profile')
                .select('avatar_url')
                .eq('id', post.user_id)
                .maybeSingle();

            if (profile?.avatar_url) avatar = profile.avatar_url;
        } catch (err) {
            console.warn('Failed to fetch profile avatar:', err);
        }

        // Format time
        const postDate = new Date(post.created_at).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });

        return `
            <div class="post-review bg-white rounded-lg border border-gray-200 p-4">
                <!-- Post Header -->
                <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full overflow-hidden bg-gray-200">
                            <img src="${avatar}" alt="${post.user_name}" class="w-full h-full object-cover">
                        </div>
                        <div>
                            <h4 class="font-bold text-gray-800">${post.user_name}</h4>
                            <span class="text-xs text-gray-500">Posted ${postDate}</span>
                        </div>
                    </div>
                    <div class="text-xs px-2 py-1 bg-gray-100 rounded">
                        Post ID: ${post.id.substring(0, 8)}...
                    </div>
                </div>
                
                <!-- Post Content -->
                <div class="mb-4">
                    <p class="whitespace-pre-line text-gray-700">${post.content}</p>
                    
                    <!-- Media -->
                    ${post.media_url ? `
                        <div class="mt-3 rounded-lg overflow-hidden bg-gray-50 border border-gray-200">
                            <div class="media-wrapper flex items-center justify-center max-h-64">
                                ${post.media_type === "video"
                    ? `<video src="${post.media_url}" controls class="w-auto max-w-full h-auto max-h-64 object-contain"></video>`
                    : `<img src="${post.media_url}" alt="Post Image" 
                                        class="w-auto max-w-full h-auto max-h-64 object-contain"
                                        loading="lazy">`
                }
                            </div>
                        </div>
                    ` : ''}
                </div>
                
                <!-- Post Stats -->
                <div class="flex items-center gap-4 text-xs text-gray-500 border-t border-gray-100 pt-3">
                    <div class="flex items-center gap-1">
                        <i class="fas fa-heart text-red-400"></i>
                        <span>Likes: ${post.likes_count || 0}</span>
                    </div>
                    <div class="flex items-center gap-1">
                        <i class="fas fa-comment text-blue-400"></i>
                        <span>Comments: ${post.comments_count || 0}</span>
                    </div>
                    <div class="flex items-center gap-1">
                        <i class="fas fa-flag text-red-500"></i>
                        <span>Reports: ${post.reports_count || 1}</span>
                    </div>
                </div>
            </div>
        `;
    }

    // =======================
    // MARK AS REVIEWED
    // =======================
    async function markAsReviewed() {
        if (!currentReportId || !currentPostId || !currentReporterId) {
            alertSystem.show('Missing data for review', 'error');
            return;
        }

        try {
            const alertId = alertSystem.show('Marking as reviewed...', 'loading');

            // Update report status
            const { error: updateError } = await supabaseClient
                .from('reports')
                .update({
                    reviewed_at: new Date().toISOString()
                })
                .eq('id', currentReportId);

            if (updateError) throw updateError;

            // Send different notifications to reporter and post owner
            await sendReportNotifications('reviewed');

            alertSystem.hide(alertId);
            alertSystem.show('Report marked as reviewed. Notifications sent.', 'success');

            // Close modal and refresh
            closeReportDetails();
            loadReports();

        } catch (error) {
            console.error('Error marking as reviewed:', error);
            alertSystem.show('Failed to mark as reviewed: ' + error.message, 'error');
        }
    }

    // =======================
    // DISMISS REPORT
    // =======================
    async function dismissReport() {
        if (!currentReportId || !currentReporterId) {
            alertSystem.show('No report selected', 'error');
            return;
        }

        try {
            const alertId = alertSystem.show('Dismissing report...', 'loading');

            // DELETE the report from the reports table
            const { error } = await supabaseClient
                .from('reports')
                .delete()
                .eq('id', currentReportId);

            if (error) throw error;

            // Send notification only to reporter (post owner doesn't need to know)
            await sendReportNotifications('dismissed');

            alertSystem.hide(alertId);
            alertSystem.show('Report dismissed. Notification sent to reporter.', 'success');

            // Close modal and refresh
            closeReportDetails();
            loadReports();

        } catch (error) {
            console.error('Error dismissing report:', error);
            alertSystem.show('Failed to dismiss report: ' + error.message, 'error');
        }
    }

    // =======================
    // DELETE POST
    // =======================
    async function deletePost() {
        if (!currentPostId || !currentUserId || !currentReporterId) {
            alertSystem.show('Missing data for deletion', 'error');
            return;
        }

        try {
            const alertId = alertSystem.show('Deleting post...', 'loading');

            // 1. Delete media from storage
            if (currentFilePath) {
                const { error: storageError } = await supabaseClient
                    .storage
                    .from('post-media')
                    .remove([currentFilePath]);

                if (storageError) {
                    console.warn('Storage delete failed:', storageError);
                }
            }

            // 2. Delete post
            const { error: postDeleteError } = await supabaseClient
                .from('posts')
                .delete()
                .eq('id', currentPostId);

            if (postDeleteError) throw postDeleteError;

            // 3. Delete all reports for this post
            const { error: reportsDeleteError } = await supabaseClient
                .from('reports')
                .delete()
                .eq('post_id', currentPostId);

            if (reportsDeleteError) console.warn('Failed to delete reports:', reportsDeleteError);

            // 4. Send different notifications to reporter and post owner
            await sendReportNotifications('post_deleted');

            alertSystem.hide(alertId);
            alertSystem.show('Post deleted. Notifications sent to both users.', 'success');

            // Close modal and refresh
            hideDeleteConfirmation();
            closeReportDetails();
            await loadReports();

        } catch (err) {
            console.error('Delete post error:', err);
            alertSystem.show('Failed to delete post: ' + err.message, 'error');
        }
    }

    // =======================
    // CLOSE REPORT DETAILS
    // =======================
    function closeReportDetails() {
        reportDetailsModal.classList.add('hidden');
        document.body.style.overflow = '';
        currentReportId = null;
        currentPostId = null;
        currentFilePath = null;
        currentUserId = null;
        currentUserName = null;
        currentReporterId = null;
    }

    // =======================
    // DELETE CONFIRMATION
    // =======================
    function showDeleteConfirmation() {
        const card = deleteConfirmationModal.querySelector('.delete-card');
        deleteConfirmationModal.dataset.postId = currentPostId;
        deleteConfirmationModal.classList.remove('hidden');
        setTimeout(() => card.classList.add('scale-100'));
    }

    function hideDeleteConfirmation() {
        const card = deleteConfirmationModal.querySelector('.delete-card');
        card.classList.remove('scale-100');
        setTimeout(() => deleteConfirmationModal.classList.add('hidden'), 150);
    }

    // =======================
    // EVENT LISTENERS
    // =======================
    // Close report details
    document.getElementById('closeReportDetails').addEventListener('click', closeReportDetails);

    // Mark as reviewed
    document.getElementById('markReviewedBtn').addEventListener('click', markAsReviewed);

    // Dismiss report
    document.getElementById('dismissReportBtn').addEventListener('click', dismissReport);

    // Delete post
    document.getElementById('deletePostBtn').addEventListener('click', showDeleteConfirmation);

    // Delete confirmation
    document.getElementById('cancelDeleteBtn').addEventListener('click', hideDeleteConfirmation);
    document.getElementById('confirmDeleteBtn').addEventListener('click', deletePost);

    // Filters
    statusFilter.addEventListener('change', applyFilters);
    reasonFilter.addEventListener('change', applyFilters);
    clearFilters.addEventListener('click', () => {
        statusFilter.value = 'all';
        reasonFilter.value = 'all';
        applyFilters();
    });

    // Close modals on background click
    reportDetailsModal.addEventListener('click', (e) => {
        if (e.target === reportDetailsModal) closeReportDetails();
    });

    deleteConfirmationModal.addEventListener('click', (e) => {
        if (e.target === deleteConfirmationModal) hideDeleteConfirmation();
    });
    // =======================
    // INITIALIZE
    // =======================
    await loadReports();

    // Set up real-time updates
    supabaseClient
        .channel('reports-realtime')
        .on('postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'reports'
            },
            () => {
                loadReports();
            })
        .on('postgres_changes',
            {
                event: 'DELETE',
                schema: 'public',
                table: 'posts'
            },
            () => {
                loadReports();
            })
        .subscribe();
});