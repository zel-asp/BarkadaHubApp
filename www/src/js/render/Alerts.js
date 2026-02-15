// alertsystem: shows notifications/alerts on the page
export default class AlertSystem {
    constructor(containerId = 'alertContainer') {
        // get the container element where alerts will appear
        this.container = document.getElementById(containerId);
        // keep track of the number of alerts created
        this.alertCount = 0;
    }

    // change the container dynamically if needed
    setContainer(containerId) {
        this.container = document.getElementById(containerId);
    }

    // create and show a new alert
    show(message, type = 'info', duration = 5000) {
        this.alertCount++;
        const alertId = `alert-${this.alertCount}`;

        // define styles and icons for each alert type
        const types = {
            success: { bg: 'bg-green-50', border: 'border-green-500', icon: '<i class="fas fa-check-circle text-green-500"></i>' },
            error: { bg: 'bg-red-50', border: 'border-red-500', icon: '<i class="fas fa-exclamation-circle text-red-500"></i>' },
            loading: { bg: 'bg-blue-50', border: 'border-blue-500', icon: '<div class="loading-spinner"></div>' },
            info: { bg: 'bg-blue-50', border: 'border-blue-500', icon: '<i class="fas fa-info-circle text-blue-500"></i>' },
        };

        const { bg, border, icon } = types[type] || types.info;

        // create the alert element
        const alertEl = document.createElement('div');
        alertEl.id = alertId;
        alertEl.className = `alert ${bg} ${border} rounded-lg p-4 mb-3 flex items-start justify-between`;
        alertEl.innerHTML = `
            <div class="flex items-center">
                <div class="flex-0 pt-0.5 mr-3">${icon}</div>
                <div class="flex-1"><p class="text-sm font-medium text-gray-800">${message}</p></div>
            </div>
            <button class="close-alert flex-0 ml-3 text-gray-400 hover:text-gray-500 transition" data-alert-id="${alertId}">
                <i class="fas fa-times"></i>
            </button>
        `;

        // add the alert to the container
        this.container.appendChild(alertEl);

        // automatically remove the alert after duration unless it's a loading alert
        if (type !== 'loading' && duration > 0) {
            setTimeout(() => this.hide(alertId), duration);
        }

        // close alert when user clicks the close button
        alertEl.querySelector('.close-alert').addEventListener('click', () => this.hide(alertId));

        return alertId;
    }

    // remove the alert from the page
    hide(alertId) {
        const alertEl = document.getElementById(alertId);
        if (alertEl) {
            alertEl.classList.add('hiding');
            setTimeout(() => alertEl.remove(), 300);
        }
    }

    // update the alert message or type dynamically
    update(alertId, message, type = null) {
        const alertEl = document.getElementById(alertId);
        if (!alertEl) return;

        // update the text message
        if (message) alertEl.querySelector('p').textContent = message;

        // update the type styling and icon if type is provided
        if (type) {
            const types = {
                success: { bg: 'bg-green-50', border: 'border-green-500', icon: '<i class="fas fa-check-circle text-green-500"></i>' },
                error: { bg: 'bg-red-50', border: 'border-red-500', icon: '<i class="fas fa-exclamation-circle text-red-500"></i>' },
                loading: { bg: 'bg-blue-50', border: 'border-blue-500', icon: '<div class="loading-spinner"></div>' },
                info: { bg: 'bg-blue-50', border: 'border-blue-500', icon: '<i class="fas fa-info-circle text-blue-500"></i>' },
            };
            const { bg, border, icon } = types[type] || types.info;

            // update alert styling
            alertEl.className = `alert ${bg} ${border} rounded-lg p-4 mb-3 flex items-start justify-between`;
            // update the icon
            alertEl.querySelector('.flex-0').innerHTML = icon;
        }
    }
}