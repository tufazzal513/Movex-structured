// --- NEW DOWNLOAD BUTTON WITH ANIMATION ---
window.startDownload = (url) => {
    if(!url) return showCustomModal('alert', 'Download link is currently not available.');

    const downloadBtn = document.querySelector('.download-btn.triggered');
    if(downloadBtn) {
        downloadBtn.classList.add('downloading');
        downloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    }

    // Simulate preparation
    setTimeout(() => {
        const dlLink = url.includes('dropbox.com') ? url.replace('dl=0', 'dl=1') : url;
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = dlLink;
        document.body.appendChild(iframe);

        if(downloadBtn) {
            downloadBtn.classList.remove('downloading');
            downloadBtn.innerHTML = '<i class="fas fa-check"></i>';
            setTimeout(() => {
                downloadBtn.innerHTML = '<i class="fas fa-download"></i>';
            }, 2000);
        }

        setTimeout(() => {
            document.body.removeChild(iframe);
        }, 5000);
    }, 500);
};
