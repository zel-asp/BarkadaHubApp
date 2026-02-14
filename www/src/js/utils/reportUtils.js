import supabaseClient from '../supabase.js';

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
// INIT REPORT MODAL
// =======================
export function initReportModal(alertSystem, checkIfUserReported) {
    // Open Report Modal
    document.addEventListener('click', async (e) => {
        const reportBtn = e.target.closest('.report-btn');
        if (!reportBtn) return;

        const postId = reportBtn.dataset.postId;

        const alreadyReported = await checkIfUserReported(postId);

        if (alreadyReported) {
            alertSystem.show('You have already reported this post', 'info');
            return;
        }

        const modal = document.getElementById('reportPostModal');
        modal.dataset.postId = postId;
        modal.classList.remove('hidden');
    });

    // Cancel button
    document.getElementById('cancelReportBtn').addEventListener('click', () => {
        const modal = document.getElementById('reportPostModal');
        modal.classList.add('hidden');
        document.getElementById('reportReason').value = '';
        document.getElementById('reportDetails').value = '';
    });

    // Submit report
    document.getElementById('confirmReportBtn').addEventListener('click', async () => {
        const modal = document.getElementById('reportPostModal');
        const postId = modal.dataset.postId;
        const reason = document.getElementById('reportReason').value;
        const otherReason = document.getElementById('reportDetails').value;

        if (!reason) {
            alert('Please select a reason for reporting.');
            return;
        }

        const { data: userData } = await supabaseClient.auth.getUser();
        const whoReported = userData?.user?.id;

        if (!whoReported) {
            alert('You must be logged in to report.');
            return;
        }

        try {
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

            const reportBtn = document.querySelector(`.report-btn[data-post-id="${postId}"]`);
            if (reportBtn) {
                reportBtn.innerHTML = `<i class="fas fa-flag-checkered mr-1"></i> Reported`;
                reportBtn.disabled = true;
                reportBtn.classList.remove('bg-red-500', 'hover:bg-red-600');
                reportBtn.classList.add('bg-gray-400', 'cursor-not-allowed');
            }

            modal.classList.add('hidden');
            document.getElementById('reportReason').value = '';
            document.getElementById('reportDetails').value = '';
        } catch (err) {
            console.error('Error submitting report:', err);
            alert('Failed to submit report.');
        }
    });
}