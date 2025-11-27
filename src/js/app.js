import HeaderComponent from "./components/header.js";
import mobileNavigations from "./components/mobileNav.js";

document.addEventListener('DOMContentLoaded', function () {

    const headerElement = document.getElementById('header');
    const mobileNav = document.getElementById('mobileNav');

    if (headerElement || mobileNav) {
        headerElement.innerHTML = HeaderComponent();
        mobileNav.innerHTML = mobileNavigations();
    }

    const file = window.location.pathname.split("/").pop();
    const currentPage = file.split(".")[0];

    document.querySelectorAll(".mobile-nav-item").forEach(item => {
        const page = item.getAttribute("data-page");

        if (page === currentPage) {
            item.classList.remove("text-gray-500");
            item.classList.add("text-primary");
        } else {
            item.classList.remove("text-primary");
            item.classList.add("text-gray-500");
        }
    });
});





