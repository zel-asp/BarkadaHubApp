
document.addEventListener('DOMContentLoaded', function () {
    const markAllReadBtn = document.getElementById('markAllRead');
    const notificationItems = document.querySelectorAll('.notification-item');
    const unreadDots = document.querySelectorAll('.unread-dot');
    const filterButtons = document.querySelectorAll('.notification-filter');

    // Mark all as read functionality
    markAllReadBtn.addEventListener('click', function () {
        notificationItems.forEach(item => {
            item.classList.remove('unread');
            item.style.backgroundColor = '';
            item.style.borderLeft = '';
        });

        unreadDots.forEach(dot => {
            dot.remove();
        });

        // Show confirmation (optional)
        markAllReadBtn.innerHTML = '<i class="fas fa-check"></i> All marked as read';
        markAllReadBtn.disabled = true;
        markAllReadBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
        markAllReadBtn.classList.add('bg-gray-400');
    });

    // Filter functionality
    filterButtons.forEach(button => {
        button.addEventListener('click', function () {
            // Remove active class from all buttons
            filterButtons.forEach(btn => btn.classList.remove('active', 'border-blue-600', 'text-blue-600'));
            filterButtons.forEach(btn => btn.classList.add('text-gray-500'));

            // Add active class to clicked button
            this.classList.add('active', 'border-blue-600', 'text-blue-600');
            this.classList.remove('text-gray-500');

            // Here you would typically filter notifications based on the selected filter
            // For demo purposes, we'll just show all
            notificationItems.forEach(item => {
                item.style.display = 'block';
            });
        });
    });

    // Individual notification actions
    document.querySelectorAll('.confirm-friend').forEach(button => {
        button.addEventListener('click', function () {
            const notification = this.closest('.notification-item');
            notification.style.opacity = '0.6';
            this.textContent = 'Confirmed';
            this.disabled = true;
            this.classList.remove('bg-blue-600', 'hover:bg-blue-700');
            this.classList.add('bg-gray-400');
        });
    });

    document.querySelectorAll('.delete-friend').forEach(button => {
        button.addEventListener('click', function () {
            const notification = this.closest('.notification-item');
            notification.style.display = 'none';
        });
    });
});
