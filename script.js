// Mobile Menu Toggle

// moving grains effect
// window.addEventListener("load", () => {
//   const images = document.querySelectorAll(".random-img");

//   // Your fixed positions
//   const positions = [
//     { top: 200, left: 235 },
//     { top: 50, left: 30 },
//     { top: 70, left: 250 },
//     { top: 250, left: 50 },
//   ];

//   // Set initial positions
//   images.forEach((img, index) => {
//     gsap.set(img, {
//       top: `${positions[index].top}px`,
//       left: `${positions[index].left}px`,
//     });
//   });

//   // Subtle shift on mouse move
//   document.addEventListener("mousemove", (e) => {
//     const { clientX, clientY } = e;
//     const centerX = window.innerWidth / 2;
//     const centerY = window.innerHeight / 2;

//     // Adjust this multiplier for stronger/weaker effect
//     const moveX = (clientX - centerX) * 0.02;
//     const moveY = (clientY - centerY) * 0.02;

//     images.forEach((img, index) => {
//       const base = positions[index];
//       gsap.to(img, {
//         left: base.left + moveX,
//         top: base.top + moveY,
//         duration: 0.5,
//         ease: "power2.out",
//       });
//     });
//   });
// });

var main = document.querySelector("#main");
var cursor = document.querySelector("#cursor");

if (main && cursor) {
    main.addEventListener("mousemove", function (dets) {
        gsap.to(cursor, {
            x: dets.x,
            y: dets.y,
        })
    })
}

if (document.querySelector("#header")) {
    gsap.to("#header", {
        backgroundColor: '#fff',
        duration: 4
    })
}

if (document.querySelector("#headd")) {
    gsap.from('#headd', {
        opacity: 0,
        duration: 3
    })
}

var redirectBtn = document.getElementById('redirectBtn');
if (redirectBtn) {
    redirectBtn.addEventListener('click', function () {
        // Fade out, then redirect
        gsap.to('body', {
            opacity: 0,
            duration: 0.5,
            onComplete: function () {
                window.location.href = './index.html';
            }
        });
    });
}

var menuToggleBtn = document.querySelector(".menu-toggle");
if (menuToggleBtn) {
    menuToggleBtn.addEventListener("click", function () {
        document.querySelector(".nav-links").classList.toggle("active");
    });
}

// Slider Functionality
let slideIndex = 0;
const slides = document.querySelectorAll(".slide");
const sliderContainer = document.querySelector(".slider-container");

function moveSlide(step) {
    if (!sliderContainer || slides.length < 2) return;
    slideIndex += step;
    if (slideIndex >= slides.length) slideIndex = 0;
    if (slideIndex < 0) slideIndex = slides.length - 1;
    sliderContainer.style.transform = `translateX(${-slideIndex * 100}%)`;
}

// Auto Slide
setInterval(() => moveSlide(1), 6000);
