/**
 * SAITS Website - Main JavaScript
 */

(function() {
  'use strict';

  // Header scroll behavior
  const header = document.getElementById('header');
  
  function updateHeader() {
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  }

  window.addEventListener('scroll', updateHeader);
  updateHeader();

  // Mobile menu
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  let menuOpen = false;

  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', () => {
      menuOpen = !menuOpen;
      mobileMenuBtn.classList.toggle('active', menuOpen);
      if (mobileMenu) mobileMenu.classList.toggle('active', menuOpen);
      document.body.style.overflow = menuOpen ? 'hidden' : '';
    });
  }

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      if (href === '#') return;
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // Typewriter effect
  const typedTextEl = document.getElementById('typedText');
  
  if (typedTextEl) {
    const phrases = ['boring tasks', 'repetitive work', 'manual processes', 'time-consuming tasks'];
    let phraseIndex = 0, charIndex = 0, isDeleting = false, typeSpeed = 100;
    
    function type() {
      const currentPhrase = phrases[phraseIndex];
      
      if (isDeleting) {
        typedTextEl.textContent = currentPhrase.substring(0, charIndex - 1);
        charIndex--;
        typeSpeed = 50;
      } else {
        typedTextEl.textContent = currentPhrase.substring(0, charIndex + 1);
        charIndex++;
        typeSpeed = 100;
      }
      
      if (!isDeleting && charIndex === currentPhrase.length) {
        typeSpeed = 2500;
        isDeleting = true;
      }
      
      if (isDeleting && charIndex === 0) {
        isDeleting = false;
        phraseIndex = (phraseIndex + 1) % phrases.length;
        typeSpeed = 300;
      }
      
      setTimeout(type, typeSpeed);
    }
    
    setTimeout(type, 1000);
  }

  // Scroll animations
  const animatedElements = document.querySelectorAll('.fade-in');
  
  if (animatedElements.length > 0) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
    
    animatedElements.forEach(el => observer.observe(el));
  }

  // Contact form
  const contactForm = document.getElementById('contactForm');
  
  if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const name = document.getElementById('name').value.trim();
      const email = document.getElementById('email').value.trim();
      const company = document.getElementById('company').value.trim();
      const message = document.getElementById('message').value.trim();
      
      if (!name || !email || !message) {
        alert('Please fill in all required fields.');
        return;
      }
      
      const subject = encodeURIComponent(`Website Inquiry from ${name}`);
      const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\nCompany: ${company || 'N/A'}\n\nMessage:\n${message}`);
      
      window.location.href = `mailto:hello@saits.ai?subject=${subject}&body=${body}`;
    });
  }

})();
