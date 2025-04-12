// Mobile Menu Toggle
gsap.to("#header", {
    backgroundColor: '#fff',
    duration: 4
})

gsap.from('#headd', {
    // x: -15,
    opacity: 0,
    duration: 3
})

document.getElementById('redirectBtn').addEventListener('click', function () {
    // Animate the whole body or a specific wrapper
    gsap.to('body', {
        opacity: 0,
        duration: 0.5,
        onComplete: function () {
            // Redirect after fade-out
            window.location.href = './index.html';
        }
    });
});

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
