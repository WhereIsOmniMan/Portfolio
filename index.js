// Mobile menu toggle
const navToggle = document.querySelector('.nav-toggle');
const navMenu = document.querySelector('.nav-menu');
const dropdowns = document.querySelectorAll('.dropdown');

// Theme toggle functionality
const themeToggle = document.getElementById('theme-toggle');
const body = document.body;

// Check for saved theme preference or default to dark theme
const currentTheme = localStorage.getItem('theme') || 'dark';
body.classList.toggle('light-theme', currentTheme === 'light');
updateThemeToggleText();

// Theme toggle event listener
if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        body.classList.toggle('light-theme');
        const newTheme = body.classList.contains('light-theme') ? 'light' : 'dark';
        localStorage.setItem('theme', newTheme);
        updateThemeToggleText();
    });
}

function updateThemeToggleText() {
    if (themeToggle) {
        const icon = body.classList.contains('light-theme') ? '☀️' : '🌙';
        const text = body.classList.contains('light-theme') ? 'Light' : 'Dark';
        themeToggle.innerHTML = `<span class="icon">${icon}</span> ${text}`;
    }
}

navToggle.addEventListener('click', () => {
    navToggle.classList.toggle('active');
    navMenu.classList.toggle('active');
});

// Handle dropdown clicks on mobile
dropdowns.forEach(dropdown => {
    const toggle = dropdown.querySelector('.dropdown-toggle');
    toggle.addEventListener('click', (e) => {
        if (window.innerWidth <= 768) {
            e.preventDefault();
            dropdown.classList.toggle('active');
        }
    });
});

// Close menu when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.navbar')) {
        navMenu.classList.remove('active');
        navToggle.classList.remove('active');
        dropdowns.forEach(dropdown => {
            dropdown.classList.remove('active');
        });
    }
});

// Close mobile menu when clicking a link (except dropdown toggle)
const navLinks = document.querySelectorAll('.nav-link:not(.dropdown-toggle), .dropdown-link');
navLinks.forEach(link => {
    link.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
            navMenu.classList.remove('active');
            navToggle.classList.remove('active');
        }
    });
});