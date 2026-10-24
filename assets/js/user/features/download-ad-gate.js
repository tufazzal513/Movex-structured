// --- DOWNLOAD AD GATE ---
let dlGateCfg = { enabled: false, adLimit: 0, watchSeconds: 0, adUrl: "" };
let dlGateState = { watched: 0, inAttempt: false, hiddenStart: null, watchedMs: 0, pending: null, lastClick: 0 };

function dlGateKey() {
    const uid = auth.currentUser?.uid || "guest";
    return `movex_dl_gate_${uid}`;
}

function loadDlGateProgress() {
    try {
        const raw = sessionStorage.getItem(dlGateKey());
        if(raw){
            const obj = JSON.parse(raw);
            dlGateState.watched = Number(obj.watched || 0);
        }
    } catch(_) {}
}

function saveDlGateProgress() {
    try {
        sessionStorage.setItem(dlGateKey(), JSON.stringify({ watched: dlGateState.watched, t: Date.now() }));
    } catch(_) {}
}

function logDlEvent(type, meta = {}) {
    try {
        const uid = auth.currentUser?.uid || null;
        db.ref('analytics/downloadGate/events').push({
            type,
            uid,
            ts: firebase.database.ServerValue.TIMESTAMP,
            ...meta
        });
    } catch(_) {}
}

function openDlGateModal() {
    const m = document.getElementById('dl-gate-modal');
    if(!m) return;
    document.getElementById('dl-gate-limit').textContent = dlGateCfg.adLimit;
    document.getElementById('dl-gate-seconds').textContent = dlGateCfg.watchSeconds;
    document.getElementById('dl-gate-progress').textContent = dlGateState.watched;
    document.getElementById('dl-gate-status').textContent = 'Ready';
    document.getElementById('dl-gate-popup').classList.add('hidden');
    document.getElementById('dl-gate-try').style.display = 'none';
    document.getElementById('dl-gate-watch').style.display = 'block';
    m.style.display = 'flex';
}

async function resolveDownloadUrl(movieId, seasonKey=null, epIndex=null) {
    try {
        if(seasonKey !== null && epIndex !== null){
            const snap = await db.ref(`downloadLinks/${movieId}/seasons/${seasonKey}/${epIndex}`).once('value');
            const v = snap.val();
            if(v) return v;
        } else {
            const snap = await db.ref(`downloadLinks/${movieId}/movie`).once('value');
            const v = snap.val();
            if(v) return v;
        }
    } catch(_) {}

    const m = allMovies[movieId];
    if(!m) return null;
    if(seasonKey !== null && epIndex !== null){
        const eps = m.seasons?.[seasonKey];
        const ep = eps?.[epIndex];
        return ep?.server1 || null;
    }
    return m.server1 || null;
}

window.requestDownload = function(movieId, seasonKey=null, epIndex=null) {
    const now = Date.now();
    if(now - dlGateState.lastClick < 800) return;
    dlGateState.lastClick = now;

    // যদি অ্যাডমিন থেকে অফ করা থাকে বা লিমিট 0 থাকে বা URL না থাকে, সরাসরি ডাউনলোড শুরু হবে
    if(!dlGateCfg.enabled || !dlGateCfg.adLimit || dlGateCfg.adLimit <= 0 || !dlGateCfg.adUrl){
        resolveDownloadUrl(movieId, seasonKey, epIndex).then(url => startDownload(url));
        return;
    }

    loadDlGateProgress();
    dlGateState.pending = { movieId, seasonKey, epIndex };

    if(dlGateState.watched >= dlGateCfg.adLimit){
        unlockAndDownload();
        return;
    }

    logDlEvent('attempt_start', { movieId, seasonKey, epIndex });
    openDlGateModal();
}

function updateDlGateUI() {
    document.getElementById('dl-gate-progress').textContent = dlGateState.watched;
    document.getElementById('dl-gate-limit').textContent = dlGateCfg.adLimit;
    document.getElementById('dl-gate-seconds').textContent = dlGateCfg.watchSeconds;
}

function failAttempt(msg) {
    dlGateState.inAttempt = false;
    dlGateState.hiddenStart = null;
    dlGateState.watchedMs = 0;
    document.getElementById('dl-gate-status').textContent = msg || 'Try again';
    document.getElementById('dl-gate-watch').style.display = 'none';
    document.getElementById('dl-gate-try').style.display = 'block';
    logDlEvent('attempt_fail', dlGateState.pending ? { movieId: dlGateState.pending.movieId, seasonKey: dlGateState.pending.seasonKey, epIndex: dlGateState.pending.epIndex } : {});
}

function successAttempt() {
    dlGateState.inAttempt = false;
    dlGateState.hiddenStart = null;
    dlGateState.watchedMs = 0;
    dlGateState.watched += 1;
    saveDlGateProgress();
    updateDlGateUI();

    logDlEvent('ad_complete', dlGateState.pending ? { movieId: dlGateState.pending.movieId, seasonKey: dlGateState.pending.seasonKey, epIndex: dlGateState.pending.epIndex } : {});

    if(dlGateState.watched >= dlGateCfg.adLimit){
        unlockAndDownload();
    } else {
        document.getElementById('dl-gate-status').textContent = `Completed! Next: ${dlGateState.watched+1}/${dlGateCfg.adLimit}`;
        document.getElementById('dl-gate-watch').style.display = 'block';
        document.getElementById('dl-gate-try').style.display = 'none';
    }
}

function unlockAndDownload() {
    logDlEvent('unlocked', dlGateState.pending ? { movieId: dlGateState.pending.movieId, seasonKey: dlGateState.pending.seasonKey, epIndex: dlGateState.pending.epIndex } : {});
    closeDlGateModal();

    const pending = dlGateState.pending;
    dlGateState.pending = null;
    dlGateState.watched = 0;
    saveDlGateProgress();

    if(!pending) return;
    resolveDownloadUrl(pending.movieId, pending.seasonKey, pending.epIndex).then(url => {
        if(!url) return showCustomModal('alert', 'Download link is currently not available.');
        startDownload(url);
    });
}
