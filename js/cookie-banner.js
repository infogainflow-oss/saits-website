// Cookie Consent Banner
(function () {
    'use strict';

    const COOKIE_NAME = 'saits_cookie_consent';
    const COOKIE_DURATION = 365; // days

    // Check if user has already responded
    function getCookieConsent() {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${COOKIE_NAME}=`);
        if (parts.length === 2) {
            return parts.pop().split(';').shift();
        }
        return null;
    }

    // Set cookie consent
    function setCookieConsent(value) {
        const date = new Date();
        date.setTime(date.getTime() + (COOKIE_DURATION * 24 * 60 * 60 * 1000));
        const expires = `expires=${date.toUTCString()}`;
        document.cookie = `${COOKIE_NAME}=${value};${expires};path=/;SameSite=Strict;Secure`;
    }

    // Show banner
    function showBanner() {
        const banner = document.getElementById('cookie-banner');
        if (banner) {
            setTimeout(() => banner.classList.add('show'), 300);
        }
    }

    // Hide banner
    function hideBanner() {
        const banner = document.getElementById('cookie-banner');
        if (banner) {
            banner.classList.remove('show');
            setTimeout(() => banner.remove(), 300);
        }
    }

    // Handle accept
    function acceptCookies() {
        setCookieConsent('accepted');
        hideBanner();
    }

    // Handle decline
    function declineCookies() {
        setCookieConsent('declined');
        hideBanner();
    }

    // Initialize
    function init() {
        const consent = getCookieConsent();

        if (consent === null) {
            // No previous consent, show banner
            showBanner();

            // Attach event listeners
            const acceptBtn = document.getElementById('cookie-accept');
            const declineBtn = document.getElementById('cookie-decline');

            if (acceptBtn) {
                acceptBtn.addEventListener('click', acceptCookies);
            }

            if (declineBtn) {
                declineBtn.addEventListener('click', declineCookies);
            }
        }
    }

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
