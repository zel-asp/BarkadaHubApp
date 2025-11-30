import HeaderComponent from "./components/header.js";
import supabaseClient from './supabase.js';
import AlertSystem from './render/Alerts.js';
import { mobileNavigations, rightSideBar, leftSideBar } from "./components/navigations.js";

document.addEventListener('DOMContentLoaded', async function () {

    const alertSystem = new AlertSystem();

    const { data, error } = await supabaseClient.auth.getUser(); // await here

    if (error || !data?.user) {

        alertSystem.show("You must be logged in.", 'error');
        setTimeout(() => {
            window.location.href = '../../index.html';
        }, 1500);
        return;
    }


    // Load components
    const headerElement = document.getElementById('header');
    const mobileNav = document.getElementById('mobileNav');
    const rightSideNav = document.getElementById('rightSideBar');
    const leftSideNav = document.getElementById('leftSideBar');

    if (headerElement || mobileNav) {
        headerElement.innerHTML = HeaderComponent();
        mobileNav.innerHTML = mobileNavigations();
        rightSideNav.innerHTML = rightSideBar();
        leftSideNav.innerHTML = leftSideBar();
    }

    // Highlight current mobile navigation item
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
