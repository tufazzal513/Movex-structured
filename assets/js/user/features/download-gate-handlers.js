// [hoisted] Bound by download-gate-modal.js at load time, so they must be defined before it runs.

function closeDlGateModal() {
    const m = document.getElementById('dl-gate-modal');
    if(m) m.style.display = 'none';
}

function startAdAttempt() {
    if(dlGateState.inAttempt) return;
    dlGateState.inAttempt = true;
    updateDlGateUI();

    document.getElementById('dl-gate-status').textContent = `Watching... stay ${dlGateCfg.watchSeconds}s`;
    document.getElementById('dl-gate-watch').style.display = 'none';
    document.getElementById('dl-gate-try').style.display = 'none';

    let attemptStartTime = Date.now();
    let hasLeftPage = false;

    const checkCompletion = () => {
        const elapsed = Date.now() - attemptStartTime;
        const needMs = dlGateCfg.watchSeconds * 1000;

        // ব্রাউজারের ট্যাব লোড হওয়ার ডিলে কভার করার জন্য 500ms বাফার রাখা হয়েছে
        if (elapsed >= (needMs - 500)) {
            cleanup();
            successAttempt();
        } else {
            cleanup();
            const left = Math.ceil((needMs - elapsed) / 1000);
            failAttempt(`Returned early! Watched ${Math.floor(elapsed/1000)}s / ${dlGateCfg.watchSeconds}s.`);
        }
    };

    const onVisChange = () => {
        if (document.hidden) {
            hasLeftPage = true;
        } else if (hasLeftPage) {
            checkCompletion();
        }
    };

    const onFocus = () => {
        if (hasLeftPage && !document.hidden) {
            checkCompletion();
        }
    };

    const onBlur = () => {
        hasLeftPage = true;
    };

    const cleanup = () => {
        document.removeEventListener('visibilitychange', onVisChange);
        window.removeEventListener('focus', onFocus);
        window.removeEventListener('blur', onBlur);
    };

    // ইভেন্ট লিসেনারগুলো উইন্ডো ওপেন করার আগেই অ্যাড করা হলো
    document.addEventListener('visibilitychange', onVisChange);
    window.addEventListener('focus', onFocus);
    window.addEventListener('blur', onBlur);

    const popup = window.open(dlGateCfg.adUrl, '_blank');

    if(!popup){
        cleanup();
        document.getElementById('dl-gate-popup').classList.remove('hidden');
        dlGateState.inAttempt = false;
        document.getElementById('dl-gate-watch').style.display = 'block';
        document.getElementById('dl-gate-status').textContent = 'Ready';
        return;
    }

    // ফলব্যাক: যদি ইভেন্ট ট্রিগার করার আগেই পেজ ব্যাকগ্রাউন্ডে চলে যায়
    if (document.hidden || !document.hasFocus()) {
        hasLeftPage = true;
    }

    // সেইফটি টাইমার: ইউজার যদি এড পেজে গিয়ে আর ফিরে না আসে
    setTimeout(() => {
        if(dlGateState.inAttempt){
            cleanup();
            failAttempt('Ad session timed out. Tap Try Again.');
        }
    }, Math.max(60000, dlGateCfg.watchSeconds * 5000));
}
