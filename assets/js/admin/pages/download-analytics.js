// --- Download Gate Analytics (With Persistent Safe Clear & Advanced UI) ---
let dlAnalyticsSetupDone = false;
let dlLineChart = null;
let dlFunnelChart = null;
let dlEventsCache = []; 
let currentChartDays = '7'; 
let currentFunnelDays = '7';

// NEW: Load cleared time from LocalStorage to survive page refreshes
let uiClearedTime = parseInt(localStorage.getItem('dlFeedClearedTime')) || 0; 

function safeNum(v){ return Number.isFinite(v) ? v : 0; }

function setupDownloadGateAnalytics() {
    if (dlAnalyticsSetupDone) return;
    dlAnalyticsSetupDone = true;

    const attemptsEl = document.getElementById('dl-attempts');
    const completesEl = document.getElementById('dl-completes');
    const failsEl = document.getElementById('dl-fails');
    const unlocksEl = document.getElementById('dl-unlocks');
    const convEl = document.getElementById('dl-conversion');
    const listEl = document.getElementById('dl-events-list');
    const emptyEl = document.getElementById('dl-events-empty');

    const lineCtx = document.getElementById('dl-line-chart')?.getContext('2d');
    const funnelCtx = document.getElementById('dl-funnel-chart')?.getContext('2d');

    // PERSISTENT SAFE CLEAR LOGIC
    const clearBtn = document.getElementById('dl-clear-events');
    if(clearBtn){
        clearBtn.addEventListener('click', () => {
            uiClearedTime = Date.now(); 
            localStorage.setItem('dlFeedClearedTime', uiClearedTime); // Save permanently in browser

            if(listEl) listEl.innerHTML = '';
            if(emptyEl) emptyEl.classList.remove('hidden');
        });
    }

    const makeDayKey = (d) => {
        const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,'0'); const da=String(d.getDate()).padStart(2,'0');
        return `${y}-${m}-${da}`;
    };

    const initCharts = () => {
        if(lineCtx && !dlLineChart){
            dlLineChart = new Chart(lineCtx, {
                type: 'line',
                data: { labels: [], datasets: [{ label: 'Unlocks', data: [], tension: 0.35, borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.2)', fill: true }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { color: '#9ca3af' }, grid: { color: '#374151' } }, x: { ticks: { color: '#9ca3af', maxTicksLimit: 10 }, grid: { display: false } } } }
            });
        }
        if(funnelCtx && !dlFunnelChart){
            dlFunnelChart = new Chart(funnelCtx, {
                type: 'doughnut',
                data: { labels: ['Attempts','Unlocks'], datasets: [{ data: [0,0], backgroundColor: ['#4b5563', '#a855f7'], borderWidth: 0, hoverOffset: 4 }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#9ca3af', font: { size: 11, family: 'Poppins' } } } } }
            });
        }
    };
    initCharts();

    // Line Chart Filter
    const filterDropdown = document.getElementById('dl-chart-filter');
    if (filterDropdown) {
        filterDropdown.addEventListener('change', (e) => {
            currentChartDays = e.target.value;
            renderDlLineChart(); 
        });
    }

    // Funnel Chart Filter
    const funnelFilterDropdown = document.getElementById('dl-funnel-filter');
    if (funnelFilterDropdown) {
        funnelFilterDropdown.addEventListener('change', (e) => {
            currentFunnelDays = e.target.value;
            renderDlFunnelChart(); 
        });
    }

    const renderDlLineChart = () => {
        if (!dlLineChart) return;
        const days = [];
        const labels = [];

        let numDays = currentChartDays === 'all' ? 'all' : parseInt(currentChartDays);

        if (numDays === 'all') {
            let oldest = Date.now();
            dlEventsCache.forEach(e => {
                if (e.ts && e.ts < oldest) oldest = e.ts;
            });
            numDays = Math.ceil((Date.now() - oldest) / (1000 * 60 * 60 * 24)) + 1;
            if (numDays < 7) numDays = 7;
        }

        for(let i = numDays - 1; i >= 0; i--){
            const d = new Date(); 
            d.setHours(0,0,0,0); 
            d.setDate(d.getDate() - i);
            days.push(makeDayKey(d));

            if (numDays > 365) labels.push(d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }));
            else if (numDays > 30) labels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
            else labels.push(d.toLocaleDateString());
        }

        const unlocksByDay = Object.fromEntries(days.map(k => [k, 0]));

        dlEventsCache.forEach(e => {
            if(e.type === 'unlocked') {
                const d = new Date(e.ts);
                d.setHours(0,0,0,0);
                const key = makeDayKey(d);
                if(key in unlocksByDay) unlocksByDay[key] += 1;
            }
        });

        dlLineChart.data.labels = labels;
        dlLineChart.data.datasets[0].data = days.map(k => unlocksByDay[k] || 0);
        dlLineChart.update();
    };

    const renderDlFunnelChart = () => {
        if (!dlFunnelChart) return;
        const now = Date.now();
        const cutoffTime = currentFunnelDays === 'all' ? 0 : now - (parseInt(currentFunnelDays) * 24 * 60 * 60 * 1000);
        let funnelAttempts = 0, funnelUnlocks = 0;

        dlEventsCache.forEach(e => {
            if (e.ts && e.ts >= cutoffTime) {
                if (e.type === 'attempt_start') funnelAttempts++;
                if (e.type === 'unlocked') funnelUnlocks++;
            }
        });
        dlFunnelChart.data.datasets[0].data = [funnelAttempts, funnelUnlocks];
        dlFunnelChart.update();
    };

    const eventsRef = db.ref('analytics/downloadGate/events').limitToLast(10000);

    eventsRef.on('value', (snap) => {
        const data = snap.val() || {};
        const events = Object.entries(data).map(([id, e]) => ({ id, ...(e||{}) }))
            .filter(e => e && e.type && e.ts)
            .sort((a,b) => (b.ts||0) - (a.ts||0));

        dlEventsCache = events; 

        let totalAttempts=0, totalCompletes=0, totalFails=0, totalUnlocks=0;

        events.forEach(e => {
            if(e.type === 'attempt_start') totalAttempts++;
            if(e.type === 'ad_complete') totalCompletes++;
            if(e.type === 'attempt_fail') totalFails++;
            if(e.type === 'unlocked') totalUnlocks++;
        });

        if(attemptsEl) attemptsEl.textContent = totalAttempts;
        if(completesEl) completesEl.textContent = totalCompletes;
        if(failsEl) failsEl.textContent = totalFails;
        if(unlocksEl) unlocksEl.textContent = totalUnlocks;

        const conv = totalAttempts > 0 ? ((totalUnlocks / totalAttempts) * 100).toFixed(1) : '0.0';
        if(convEl) convEl.textContent = `${conv}%`;

        renderDlLineChart();
        renderDlFunnelChart();

        // UPDATE UI LIST WITH PERSISTENT FILTER
        if(listEl){
            listEl.innerHTML = '';

            // Filter out events that happened before clicking "Clear Feed"
            const visibleEvents = events.filter(e => e.ts >= uiClearedTime);

            if(visibleEvents.length === 0){
                emptyEl?.classList.remove('hidden');
            } else {
                emptyEl?.classList.add('hidden');

                visibleEvents.slice(0, 25).forEach((e, idx) => {
                    const d = new Date(e.ts);
                    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const dateStr = d.toLocaleDateString([], { month: 'short', day: 'numeric' });

                    const meta = [
                        e.uid ? `<span class="font-mono text-gray-300">UID: ${String(e.uid).slice(0,6)}</span>` : null, 
                        e.movieId ? `<span class="text-blue-300"><i class="fas fa-film text-[9px] mr-1"></i>${String(e.movieId).slice(0,8)}</span>` : null
                    ].filter(Boolean).join('<span class="mx-2 text-gray-600">•</span>');

                    let icon = 'fa-bolt text-gray-400';
                    let bgColor = 'bg-gray-800/80 border-gray-700';
                    let iconBg = 'bg-gray-700';
                    let titleText = e.type || 'System Event';
                    let titleColor = 'text-gray-300';

                    if (e.type === 'attempt_start') {
                        icon = 'fa-mouse-pointer text-cyan-400';
                        bgColor = 'bg-cyan-900/10 border-cyan-500/30';
                        iconBg = 'bg-cyan-900/50 shadow-inner';
                        titleText = 'Download Attempted';
                        titleColor = 'text-cyan-300 font-semibold';
                    } else if (e.type === 'ad_complete') {
                        icon = 'fa-check text-green-400';
                        bgColor = 'bg-green-900/10 border-green-500/30';
                        iconBg = 'bg-green-900/50 shadow-inner';
                        titleText = 'Ad Task Completed';
                        titleColor = 'text-green-300 font-semibold';
                    } else if (e.type === 'attempt_fail') {
                        icon = 'fa-times text-red-400';
                        bgColor = 'bg-red-900/10 border-red-500/30';
                        iconBg = 'bg-red-900/50 shadow-inner';
                        titleText = 'Unlock Failed';
                        titleColor = 'text-red-300 font-semibold';
                    } else if (e.type === 'unlocked') {
                        icon = 'fa-unlock-alt text-amber-400';
                        bgColor = 'bg-amber-900/10 border-amber-500/40';
                        iconBg = 'bg-amber-900/60 shadow-[0_0_10px_rgba(251,191,36,0.3)]';
                        titleText = 'Download Unlocked 🎉';
                        titleColor = 'text-amber-300 font-bold';
                    }

                    const div = document.createElement('div');
                    div.className = `flex items-start gap-3 p-3 rounded-xl border ${bgColor} hover:bg-gray-700/60 transition-colors animate-fade-in`;
                    div.style.animation = `fadeIn 0.4s ease-out forwards`;
                    div.style.animationDelay = `${idx * 0.05}s`;
                    div.style.opacity = '0';

                    div.innerHTML = `
                        <div class="w-9 h-9 rounded-full ${iconBg} border border-gray-600/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <i class="fas ${icon} text-sm"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="flex justify-between items-center mb-1">
                                <p class="text-sm ${titleColor} truncate pr-2">${titleText}</p>
                                <div class="text-right flex-shrink-0 leading-tight">
                                    <p class="text-[11px] text-gray-300 font-medium">${timeStr}</p>
                                    <p class="text-[9px] text-gray-500">${dateStr}</p>
                                </div>
                            </div>
                            <div class="text-[10px] mt-1.5 bg-gray-900/60 inline-flex px-2.5 py-1 rounded-md border border-gray-700/50 shadow-inner">
                                ${meta || '<span class="text-gray-500 italic">No additional details</span>'}
                            </div>
                        </div>
                    `;
                    listEl.appendChild(div);
                });
            }
        }
    });
}

// Upcoming checkbox toggle
