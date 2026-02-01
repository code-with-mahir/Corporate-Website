  // Form Submit Message
  const form = document.querySelector(".contact-form");
  const status = document.getElementById("form-status");

  form.addEventListener("submit", function (e) {
    e.preventDefault(); // page reload roke

    status.textContent = "✅ Message sent successfully!";
    status.style.color = "green";

    form.reset(); // form clear
  });


// Hamburger Menu for Mobile
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('nav-links');
hamburger.addEventListener('click', () => {
  const expanded = hamburger.getAttribute('aria-expanded') === 'true' || false;
  hamburger.setAttribute('aria-expanded', !expanded);
  navLinks.classList.toggle('open');
  hamburger.classList.toggle('is-active');
});


// Animation
const revealElements = document.querySelectorAll(
  '.highlight, .reveal, .reveal-left, .reveal-right'
);

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('show');
      } else {
        entry.target.classList.remove('show'); // repeat animation
      }
    });
  },
  {
    threshold: 0.1
  }
);

revealElements.forEach(el => observer.observe(el));
