// Alert System
export default class AlertSystem {
    constructor() {
        this.container = document.getElementById('alertContainer');
        this.alertCount = 0;
    }

    show(message, type = 'info', duration = 5000) {
        this.alertCount++;
        const alertId = `alert-${this.alertCount}`;

        // Determine styling based on type
        let bgColor, borderColor, icon;

        switch (type) {
            case 'success':
                bgColor = 'bg-green-50';
                borderColor = 'border-green-500';
                icon = '<i class="fas fa-check-circle text-green-500"></i>';
                break;
            case 'error':
                bgColor = 'bg-red-50';
                borderColor = 'border-red-500';
                icon = '<i class="fas fa-exclamation-circle text-red-500"></i>';
                break;
            case 'loading':
                bgColor = 'bg-blue-50';
                borderColor = 'border-blue-500';
                icon = '<div class="loading-spinner"></div>';
                break;
            default:
                bgColor = 'bg-blue-50';
                borderColor = 'border-blue-500';
                icon = '<i class="fas fa-info-circle text-blue-500"></i>';
        }

        // Create alert element
        const alertEl = document.createElement('div');
        alertEl.id = alertId;
        alertEl.className = `alert ${bgColor} ${borderColor} rounded-lg p-4 mb-3 flex items-start justify-between`;
        alertEl.innerHTML = `
                    <div class="flex items-start">
                        <div class="flex-0 pt-0.5 mr-3">
                            ${icon}
                        </div>
                        <div class="flex-1">
                            <p class="text-sm font-medium text-gray-800">${message}</p>
                        </div>
                    </div>
                    <button class="close-alert flex-0 ml-3 text-gray-400 hover:text-gray-500 transition" data-alert-id="${alertId}">
                        <i class="fas fa-times"></i>
                    </button>
                `;

        // Add to container
        this.container.appendChild(alertEl);

        // Auto-remove after duration (unless it's a loading alert)
        if (type !== 'loading' && duration > 0) {
            setTimeout(() => {
                this.hide(alertId);
            }, duration);
        }

        // Add event listener to close button
        alertEl.querySelector('.close-alert').addEventListener('click', () => {
            this.hide(alertId);
        });

        return alertId;
    }

    hide(alertId) {
        const alertEl = document.getElementById(alertId);
        if (alertEl) {
            alertEl.classList.add('hiding');
            setTimeout(() => {
                if (alertEl.parentNode) {
                    alertEl.parentNode.removeChild(alertEl);
                }
            }, 300);
        }
    }

    update(alertId, message, type = null) {
        const alertEl = document.getElementById(alertId);
        if (alertEl) {
            if (message) {
                alertEl.querySelector('p').textContent = message;
            }

            if (type) {
                // Update styling based on new type
                let bgColor, borderColor, icon;

                switch (type) {
                    case 'success':
                        bgColor = 'bg-green-50';
                        borderColor = 'border-green-500';
                        icon = '<i class="fas fa-check-circle text-green-500"></i>';
                        break;
                    case 'error':
                        bgColor = 'bg-red-50';
                        borderColor = 'border-red-500';
                        icon = '<i class="fas fa-exclamation-circle text-red-500"></i>';
                        break;
                    case 'loading':
                        bgColor = 'bg-blue-50';
                        borderColor = 'border-blue-500';
                        icon = '<div class="loading-spinner"></div>';
                        break;
                    default:
                        bgColor = 'bg-blue-50';
                        borderColor = 'border-blue-500';
                        icon = '<i class="fas fa-info-circle text-blue-500"></i>';
                }

                // Update classes
                alertEl.className = `alert ${bgColor} ${borderColor} rounded-lg p-4 mb-3 flex items-start justify-between`;

                // Update icon
                alertEl.querySelector('.flex-0').innerHTML = icon;
            }
        }
    }
}