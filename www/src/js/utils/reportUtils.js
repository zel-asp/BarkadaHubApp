import supabaseClient from '../supabase.js';
import sanitize from '../utils/sanitize.js';

// =======================
// CHECK IF USER REPORTED POST
// =======================
export async function checkIfUserReported(postId) {
    const { data: userData } = await supabaseClient.auth.getUser();
    const currentUserId = userData?.user?.id;

    if (!currentUserId) return false;

    try {
        const { data: existingReport } = await supabaseClient
            .from('reports')
            .select('id')
            .eq('post_id', postId)
            .eq('who_reported', currentUserId)
            .maybeSingle();

        return !!existingReport;
    } catch (error) {
        console.error('Error checking report:', error);
        return false;
    }
}

// =======================
// UPDATE REPORT BUTTON UI
// =======================
function updateReportButtonUI(postId) {
    const reportBtn = document.querySelector(`.report-btn[data-post-id="${postId}"]`);
    if (!reportBtn) return;

    // Get the parent container with tooltip
    const container = reportBtn.closest('.relative.group');

    // Update button classes and attributes
    reportBtn.disabled = true;
    reportBtn.classList.remove('from-red-400', 'to-red-500', 'hover:shadow-md', 'hover:scale-105');
    reportBtn.classList.add('from-gray-400', 'to-gray-500', 'cursor-default');

    // Update tooltip text
    const tooltip = container.querySelector('div.absolute');
    if (tooltip) {
        const tooltipSpan = tooltip.querySelector('span');
        if (tooltipSpan) {
            tooltipSpan.textContent = 'Reported';
        }
    }

    // Update container title
    container.setAttribute('title', 'Post reported');
}

// =======================
// INIT REPORT MODAL
// =======================
export function initReportModal(alertSystem, checkIfUserReported) {
    // Open Report Modal
    document.addEventListener('click', async (e) => {
        const reportBtn = e.target.closest('.report-btn');
        if (!reportBtn) return;

        // Don't open modal if button is disabled
        if (reportBtn.disabled) return;

        const postId = reportBtn.dataset.postId;

        const alreadyReported = await checkIfUserReported(postId);

        if (alreadyReported) {
            alertSystem.show('You have already reported this post', 'info');
            return;
        }

        const modal = document.getElementById('reportPostModal');
        if (!modal) return;

        modal.dataset.postId = postId;
        modal.classList.remove('hidden');

        // Focus on reason select for better UX
        setTimeout(() => {
            const reasonSelect = document.getElementById('reportReason');
            if (reasonSelect) reasonSelect.focus();
        }, 100);
    });

    // Cancel button
    const cancelBtn = document.getElementById('cancelReportBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            const modal = document.getElementById('reportPostModal');
            modal.classList.add('hidden');
            document.getElementById('reportReason').value = '';
            document.getElementById('reportDetails').value = '';
        });
    }

    // Close modal when clicking outside
    const modal = document.getElementById('reportPostModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
                document.getElementById('reportReason').value = '';
                document.getElementById('reportDetails').value = '';
            }
        });
    }

    // Submit report
    const confirmBtn = document.getElementById('confirmReportBtn');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', async () => {
            const modal = document.getElementById('reportPostModal');
            const postId = modal.dataset.postId;
            const reason = document.getElementById('reportReason').value;
            let otherReason = document.getElementById('reportDetails').value;

            otherReason = sanitize(otherReason || '');
            if (!reason) {
                alertSystem.show('Please select a reason for reporting', 'warning');
                return;
            }

            // Disable submit button to prevent double submission
            confirmBtn.disabled = true;
            const originalText = confirmBtn.textContent;
            confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Submitting...';

            try {
                const { data: userData } = await supabaseClient.auth.getUser();
                const whoReported = userData?.user?.id;

                if (!whoReported) {
                    alertSystem.show('You must be logged in to report', 'error');
                    return;
                }

                const { error } = await supabaseClient
                    .from('reports')
                    .insert([
                        {
                            post_id: postId,
                            who_reported: whoReported,
                            reason,
                            other_reason: otherReason || null
                        }
                    ]);

                if (error) throw error;

                alertSystem.show('Report submitted successfully!', 'success');

                // Update button UI
                updateReportButtonUI(postId);

                // Close modal and reset form
                modal.classList.add('hidden');
                document.getElementById('reportReason').value = '';
                document.getElementById('reportDetails').value = '';

            } catch (err) {
                console.error('Error submitting report:', err);
                alertSystem.show('Failed to submit report. Please try again.', 'error');
            } finally {
                // Re-enable submit button
                confirmBtn.disabled = false;
                confirmBtn.innerHTML = originalText;
            }
        });
    }
}