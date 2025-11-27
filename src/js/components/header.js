import HeaderComponent from "./components/header.js";

document.addEventListener('DOMContentLoaded', function () {
    const headerElement = document.getElementById('header');
    if (headerElement) {
        headerElement.innerHTML = HeaderComponent();
    }
});