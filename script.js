// Mobile Menu Toggle
document.querySelector(".menu-toggle").addEventListener("click", function () {
    document.querySelector(".nav-links").classList.toggle("active");
});

// Slider Functionality
let slideIndex = 0;
const slides = document.querySelectorAll(".slide");

function moveSlide(step) {
    slideIndex += step;
    if (slideIndex >= slides.length) slideIndex = 0;
    if (slideIndex < 0) slideIndex = slides.length - 1;
    document.querySelector(".slider-container").style.transform = `translateX(${-slideIndex * 100}%)`;
}

// Auto Slide
setInterval(() => moveSlide(1), 6000);
