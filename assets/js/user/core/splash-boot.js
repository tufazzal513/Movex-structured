(function() {
    const appName = localStorage.getItem('movex_app_name') || 'MoveX';
    const appLogo = localStorage.getItem('movex_app_logo');

    document.getElementById('splash-title-text').innerText = appName;
    document.getElementById('splash-footer-text').innerText = appName;

    if (appLogo) {
        document.getElementById('splash-logo-img').src = appLogo;
        document.getElementById('splash-logo-img').style.display = 'block';
        document.getElementById('splash-logo-box').style.background = 'transparent';
        document.getElementById('splash-logo-box').style.boxShadow = 'none';
    } else {
        document.getElementById('splash-logo-text').innerText = appName.substring(0, 2).toUpperCase();
        document.getElementById('splash-logo-text').style.display = 'block';
    }
})();
