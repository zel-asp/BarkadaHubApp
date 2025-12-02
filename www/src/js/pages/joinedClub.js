document.addEventListener('DOMContentLoaded', () => {
    const clubModal = document.getElementById('clubModal');
    const postContent = document.getElementById('postContent');
    const charCount = document.getElementById('charCount');

    // Open modal
    window.openClubModal = function () {
        clubModal.classList.remove('hidden');
        clubModal.classList.add('flex');
        document.body.style.overflow = 'hidden';
    }

    // Close modal
    window.closeClubModal = function () {
        clubModal.classList.remove('flex');
        clubModal.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }

    // Switch modal tabs
    window.switchModalTab = function (tabName) {
        document.querySelectorAll('.modal-tab-content').forEach(tab => tab.classList.add('hidden'));
        document.querySelectorAll('.modal-tab').forEach(tab => {
            tab.classList.remove('tab-active', 'border-white', 'text-white');
            tab.classList.add('border-transparent', 'text-blue-100');
        });

        document.getElementById(tabName + 'Tab').classList.remove('hidden');
        const activeTab = document.querySelector(`[onclick="switchModalTab('${tabName}')"]`);
        activeTab.classList.add('tab-active', 'border-white', 'text-white');
        activeTab.classList.remove('border-transparent', 'text-blue-100');
    }

    // Close modal when clicking outside
    clubModal.addEventListener('click', e => { if (e.target === clubModal) closeClubModal(); });

    // Close modal on Escape key
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeClubModal(); });

    // Character counter for post textarea
    if (postContent && charCount) {
        postContent.addEventListener('input', () => {
            charCount.textContent = postContent.value.length;
            charCount.classList.toggle('text-red-500', postContent.value.length >= 450);
        });
    }
});