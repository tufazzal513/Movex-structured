db.ref('settings/appName').on('value', s => { const n = s.val()||"MoveX"; document.getElementById('app-name-input').value = n; document.querySelectorAll('.admin-app-name').forEach(el => el.innerHTML = n.replace(/^(.*?)(X)$/i, '$1<span class="text-blue-500">$2</span>') || n); });
db.ref('settings/appLogo').on('value', s => { document.getElementById('app-logo-input').value = s.val() || ""; });
document.getElementById('app-details-form').addEventListener('submit', e => { 
    e.preventDefault(); 
    db.ref('settings/appName').set(document.getElementById('app-name-input').value);
    db.ref('settings/appLogo').set(document.getElementById('app-logo-input').value);
    alert('App Details Updated!'); 
});

// Handle Theme Form Toggles
const themeRadios = document.querySelectorAll('input[name="theme-mode"]');
const staticBox = document.getElementById('theme-static-box');
const autoBox = document.getElementById('theme-auto-box');

themeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
        if(e.target.value === 'static') {
            staticBox.classList.remove('hidden');
            autoBox.classList.add('hidden');
        } else {
            staticBox.classList.add('hidden');
            autoBox.classList.remove('hidden');
        }
    });
});

// Load Settings Data
db.ref('settings').on('value', s => {
    const data = s.val() || {};

    // Ads & Others
    document.getElementById('pwd-limit-input').value = data.pwdResetLimit || '3';
    document.getElementById('smart-ad-toggle').checked = !!data.smartAdEnabled;
    document.getElementById('ad-timer-input').value = data.adTimer !== undefined ? data.adTimer : '0';
    document.getElementById('ad-watch-sec-input').value = data.smartAdWatchSeconds !== undefined ? data.smartAdWatchSeconds : '0';
    document.getElementById('ad-url-input').value = data.adUrl || '';
    document.getElementById('dl-gate-toggle').checked = !!data.dlGateEnabled;
    document.getElementById('dl-limit-input').value = data.dlAdLimit !== undefined ? data.dlAdLimit : '0';
    document.getElementById('dl-seconds-input').value = data.dlAdSeconds !== undefined ? data.dlAdSeconds : '0';
    document.getElementById('dl-url-input').value = data.dlAdUrl || '';
    document.getElementById('comment-mod-toggle').checked = !!data.commentModEnabled;
    document.getElementById('comment-dislike-threshold').value = data.commentDislikeThreshold !== undefined ? data.commentDislikeThreshold : '0';

    // Theme Data
    const mode = data.themeMode || 'static';
    document.querySelector(`input[name="theme-mode"][value="${mode}"]`).checked = true;
    if(mode === 'auto') {
        staticBox.classList.add('hidden');
        autoBox.classList.remove('hidden');
    } else {
        staticBox.classList.remove('hidden');
        autoBox.classList.add('hidden');
    }
    document.getElementById('theme-color-picker').value = data.themeColor || '#2563eb';
    document.getElementById('theme-interval-input').value = data.themeInterval || '60';
});

// Save Theme Data
document.getElementById('theme-settings-form').addEventListener('submit', e => {
    e.preventDefault();
    const mode = document.querySelector('input[name="theme-mode"]:checked').value;
    const color = document.getElementById('theme-color-picker').value;
    const interval = parseInt(document.getElementById('theme-interval-input').value) || 60;

    db.ref('settings').update({
        themeMode: mode,
        themeColor: color,
        themeInterval: interval
    }).then(() => alert('Theme settings updated successfully! Users will see changes instantly.'));
});

document.getElementById('pwd-reset-form').addEventListener('submit', e => {
    e.preventDefault();
    const limitVal = document.getElementById('pwd-limit-input').value;
    const parsed = parseInt(limitVal);
    if (!isNaN(parsed) && parsed > 0) {
        db.ref('settings').update({ pwdResetLimit: parsed }).then(() => {
            alert('Password Reset Limit updated successfully!');
        });
    } else {
        alert('Please enter a valid number greater than 0.');
    }
});

document.getElementById('ad-settings-form').addEventListener('submit', e => {
    e.preventDefault();
    const enabled = document.getElementById('smart-ad-toggle').checked;
    const timerVal = document.getElementById('ad-timer-input').value;
    const watchVal = document.getElementById('ad-watch-sec-input').value;
    const urlVal = document.getElementById('ad-url-input').value;

    const updateData = {
        smartAdEnabled: enabled,
        adTimer: timerVal !== '' ? parseInt(timerVal) : 0,
        smartAdWatchSeconds: watchVal !== '' ? parseInt(watchVal) : 0,
        adUrl: urlVal.trim() || null
    };

    db.ref('settings').update(updateData).then(() => {
        alert('Smart Ad settings updated successfully!');
    });
});

document.getElementById('dl-gate-form').addEventListener('submit', e => {
    e.preventDefault();
    const enabled = document.getElementById('dl-gate-toggle').checked;
    const limitVal = document.getElementById('dl-limit-input').value;
    const secVal = document.getElementById('dl-seconds-input').value;
    const urlVal = document.getElementById('dl-url-input').value;

    const updateData = {
        dlGateEnabled: enabled,
        dlAdLimit: limitVal !== '' ? parseInt(limitVal) : 0,
        dlAdSeconds: secVal !== '' ? parseInt(secVal) : 0,
        dlAdUrl: urlVal.trim() || null
    };

    db.ref('settings').update(updateData).then(() => {
        alert('Download Gate settings updated successfully!');
    });
});

document.getElementById('comment-mod-form').addEventListener('submit', e => {
    e.preventDefault();
    const enabled = document.getElementById('comment-mod-toggle').checked;
    const threshold = document.getElementById('comment-dislike-threshold').value;

    const updateData = {
        commentModEnabled: enabled,
        commentDislikeThreshold: threshold !== '' ? parseInt(threshold) : 0
    };

    db.ref('settings').update(updateData).then(() => {
        alert('Comment moderation settings updated successfully!');
    });
});

initEditableSocials();
initEditableNotifications();
