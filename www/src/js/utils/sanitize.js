// sanitize input to prevent xss
export default function sanitize(str) {
    return str.replace(/[&<>"'\/]/g, match => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
        '/': '&#x2F;'
    }[match]));
}