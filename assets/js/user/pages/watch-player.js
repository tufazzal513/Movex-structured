// --- PLAYER LOGIC ---
function getYouTubeID(url) {
    let regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    let match = url.match(regExp);
    return (match && match[2].length == 11) ? match[2] : url;
}

const setBuffering = (state) => {
    const loader = document.getElementById('videoLoader');
    if(loader) loader.style.display = state ? 'block' : 'none';
}

window.loadServer = function(btn, type, url) {
    if(!url) return showCustomModal('alert', "Server link not available");
    document.querySelectorAll('.sv-btn').forEach(b => b.classList.remove('active'));
    if(btn) btn.classList.add('active');
    clearInterval(updateInterval);

    // Auto Detect URL Type for both servers
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('videasy.net') || lowerUrl.includes('/embed') || lowerUrl.includes('drive.google.com')) type = 'iframe';
    else if (lowerUrl.includes('vimeo.com')) type = 'vimeo';
    else if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) type = 'youtube';
    else type = 'direct';

    playerMode = type;
    isPlaying = false;
    updateUI();
    setBuffering(true);
    const directVid = document.getElementById('directVideo');
    const embedDiv = document.getElementById('embedContainer');
    const slider = document.getElementById('seekSlider');
    const securityMask = document.querySelector('.security-mask');
    const controlsDiv = document.querySelector('.controls');

    if (securityMask) securityMask.style.display = (type === 'iframe') ? 'none' : 'block';
    if (controlsDiv) controlsDiv.style.display = (type === 'iframe') ? 'none' : 'flex';

    // এরর লিসেনারটি আগে রিমুভ করছি, যাতে ভিডিও রিসেট করার সময় ফলস-এরর না দেয়
    directVid.onerror = null;

    directVid.style.display = 'none';
    directVid.pause();
    directVid.removeAttribute('src'); 
    directVid.load(); // মেমোরি থেকে সোর্স পুরোপুরি ক্লিয়ার করার জন্য

    // পূর্বের YouTube বা Vimeo প্লেয়ার ডেস্ট্রয় করা হচ্ছে
    if(ytPlayer && typeof ytPlayer.destroy === 'function') { ytPlayer.destroy(); ytPlayer = null; }
    if(vimeoPlayer && typeof vimeoPlayer.destroy === 'function') { vimeoPlayer.destroy(); vimeoPlayer = null; }

    embedDiv.innerHTML = '';
    slider.value = 0;
    document.getElementById('currTime').innerText = "00:00";
    document.getElementById('totalTime').innerText = "00:00";

    if (type === 'direct') {
        if(url.includes('dropbox.com')) url = url.replace('dl=0', 'raw=1');
        directVid.src = url;
        directVid.style.display = 'block';
        directVid.onloadstart = () => setBuffering(true);
        directVid.onwaiting = () => setBuffering(true);
        directVid.onplaying = () => { setBuffering(false); isPlaying = true; updateUI(); };
        directVid.oncanplay = () => setBuffering(false);

        // নতুন লিংক দেওয়ার পর আবার এরর লিসেনারটি চালু করছি
        directVid.onerror = () => { 
            setBuffering(false); 

            // ব্রাউজারের কোনো ইন্টারনাল কারণে বা ইউজার প্লেয়ার ক্লোজ করলে (Error Code 1) রিপোর্ট স্কিপ করবে
            if (!directVid.error || directVid.error.code === 1) return;

            const currentSrc = directVid.getAttribute('src');
            if (currentSrc && currentSrc.trim() !== '' && currentSrc !== window.location.href) {
                reportBrokenLink('direct', url); 
                alert('Video failed to load. Admin has been notified.'); 
            }
        };

        directVid.onended = () => { isPlaying = false; updateUI(); };
        directVid.onpause = () => { isPlaying = false; updateUI(); };
        directVid.ontimeupdate = () => { if(!directVid.seeking) updateProgress(directVid.currentTime, directVid.duration); };
        directVid.load();

        // Autoplay blocked এরর কন্সোল থেকে সরাতে সাইলেন্ট ক্যাচ করা হলো
        let playPromise = directVid.play();
        if (playPromise !== undefined) {
            playPromise.catch(e => {
                isPlaying = false;
                updateUI();
            });
        }
    }
    else if (type === 'vimeo') {
        if(url.includes('vimeo.com/')) url = url.split('/').pop();
        embedDiv.innerHTML = `<iframe src="https://player.vimeo.com/video/${url}?badge=0&autopause=0&player_id=0" width="100%" height="100%" frameborder="0" allow="autoplay; fullscreen" title="Vimeo"></iframe>`;
        let iframe = embedDiv.querySelector('iframe');
        vimeoPlayer = new Vimeo.Player(iframe);
        vimeoPlayer.on('timeupdate', (data) => {
            setBuffering(false); 
            updateProgress(data.seconds, data.duration);
        });
        vimeoPlayer.on('play', () => { isPlaying = true; updateUI(); setBuffering(false); });
        vimeoPlayer.on('pause', () => { isPlaying = false; updateUI(); });
        vimeoPlayer.on('error', () => { setBuffering(false); reportBrokenLink('vimeo', url); alert('Video failed to load. Admin has been notified.'); });
        vimeoPlayer.on('bufferstart', () => setBuffering(true));
        vimeoPlayer.on('bufferend', () => setBuffering(false));
    }
    else if (type === 'youtube') {
        embedDiv.innerHTML = '<div id="yt-player"></div>';
        let cleanID = getYouTubeID(url);
        ytPlayer = new YT.Player('yt-player', {
            height: '100%', width: '100%', videoId: cleanID,
            playerVars: { 'controls': 0, 'rel': 0, 'modestbranding': 1, 'disablekb': 1, 'origin': window.location.origin },
            events: {
                'onReady': (e) => {
                    setBuffering(false);
                    updateInterval = setInterval(() => {
                        if(ytPlayer && ytPlayer.getCurrentTime) updateProgress(ytPlayer.getCurrentTime(), ytPlayer.getDuration());
                    }, 500);
                },
                'onStateChange': (e) => {
                    if(e.data === 3) setBuffering(true);
                    else setBuffering(false);
                    isPlaying = (e.data == YT.PlayerState.PLAYING);
                    updateUI();
                },
                'onError': (e) => {
                    setBuffering(false);
                    reportBrokenLink('youtube', url);
                    alert('Video failed to load. Admin has been notified.');
                }
            }
        });
    }
    else if (type === 'iframe') {
        embedDiv.innerHTML = `<iframe src="${url}" width="100%" height="100%" frameborder="0" allow="autoplay; fullscreen" allowfullscreen></iframe>`;
        setBuffering(false);
    }
};

window.togglePlay = function() {
    const directVid = document.getElementById('directVideo');
    if (playerMode === 'direct') {
        if (directVid.error) {
            showCustomModal('alert', 'This video is broken or unavailable. Admin has been notified.');
            return;
        }
        if (directVid.paused) {
            let playPromise = directVid.play();
            if (playPromise !== undefined) {
                playPromise.catch(e => {
                    console.warn("Playback error handled:", e);
                    isPlaying = false;
                    updateUI();
                });
            }
        } else {
            directVid.pause();
        }
    } else if (playerMode === 'vimeo' && vimeoPlayer) {
        vimeoPlayer.getPaused().then(p => p ? vimeoPlayer.play() : vimeoPlayer.pause());
    } else if (playerMode === 'youtube' && ytPlayer && ytPlayer.getPlayerState) {
        ytPlayer.getPlayerState() === 1 ? ytPlayer.pauseVideo() : ytPlayer.playVideo();
    }
};

window.skip = function(amount) {
    const directVid = document.getElementById('directVideo');
    if (playerMode === 'direct') directVid.currentTime += amount;
    else if (playerMode === 'vimeo' && vimeoPlayer) vimeoPlayer.setCurrentTime(t => t + amount);
    else if (playerMode === 'youtube' && ytPlayer) ytPlayer.seekTo(ytPlayer.getCurrentTime() + amount, true);
};

let isSeeking = false;
let currentSeasonKey = null;
let currentEpIndex = -1;

// Smooth Hover & Drag for Seekbar
window.handleSeekInput = function() {
    isSeeking = true;
    const slider = document.getElementById('seekSlider');
    const tooltip = document.getElementById('seekTooltip');
    const progressFill = document.getElementById('progressFill');

    let val = parseFloat(slider.value);
    let max = parseFloat(slider.max) || 100;
    let percent = (val / max) * 100;

    if(progressFill) progressFill.style.width = percent + '%';
    document.getElementById('currTime').innerText = formatTime(val);

    if(tooltip) {
        tooltip.innerText = formatTime(val);
        // Center tooltip logic over the thumb
        tooltip.style.left = `calc(${percent}% + (${8 - percent * 0.15}px))`; 
    }
};

window.seekVideo = function() {
    isSeeking = false;
    const slider = document.getElementById('seekSlider');
    let val = parseFloat(slider.value);
    if (playerMode === 'direct') document.getElementById('directVideo').currentTime = val;
    else if (playerMode === 'vimeo' && vimeoPlayer) vimeoPlayer.setCurrentTime(val);
    else if (playerMode === 'youtube' && ytPlayer) ytPlayer.seekTo(val, true);
};

window.toggleMute = function() {
    const directVid = document.getElementById('directVideo');
    const icon = document.getElementById('volIcon');
    if(playerMode === 'direct') {
        directVid.muted = !directVid.muted;
        icon.className = directVid.muted ? 'fas fa-volume-mute' : 'fas fa-volume-up';
    }
};

function updateProgress(curr, total) {
    if(isNaN(total) || total === 0) return;
    if(isSeeking) return; // Prevent overwriting while user is dragging

    const slider = document.getElementById('seekSlider');
    if(slider) {
        slider.max = total;
        slider.value = curr;
        let percent = (curr / total) * 100;

        const progressFill = document.getElementById('progressFill');
        if(progressFill) progressFill.style.width = percent + '%';

        document.getElementById('currTime').innerText = formatTime(curr);
        document.getElementById('totalTime').innerText = formatTime(total);
    }
}

function updateUI() {
    const icon = document.querySelector('#playBtn i');
    if(icon) icon.className = isPlaying ? 'fas fa-pause' : 'fas fa-play';
}

// Fixed Time Format Function (Handles 1+ Hours)
function formatTime(s) {
    let h = Math.floor(s / 3600);
    let m = Math.floor((s % 3600) / 60);
    let sec = Math.floor(s % 60);
    let mStr = (m < 10 && h > 0) ? '0' + m : m;
    let sStr = sec < 10 ? '0' + sec : sec;
    return h > 0 ? `${h}:${mStr}:${sStr}` : `${m}:${sStr}`;
}

// Series Episode Navigation Logic
window.playNextEp = function() {
    if(currentEpIndex === -1 || !currentSeasonKey) return;
    const movie = allMovies[currentMovieId];
    const eps = movie.seasons[currentSeasonKey];
    if(currentEpIndex + 1 < eps.length) {
        const ep = eps[currentEpIndex + 1];
        openPlayer(currentMovieId, ep.name, ep.server1, ep.server2);
    }
};

window.playPrevEp = function() {
    if(currentEpIndex === -1 || !currentSeasonKey) return;
    const movie = allMovies[currentMovieId];
    const eps = movie.seasons[currentSeasonKey];
    if(currentEpIndex > 0) {
        const ep = eps[currentEpIndex - 1];
        openPlayer(currentMovieId, ep.name, ep.server1, ep.server2);
    }
};

// Premium OpenPlayer
window.openPlayer = function(movieId, epTitle=null, epS1=null, epS2=null) {
    const movie = allMovies[movieId];
    if (!movie) return;

    toggleGlobalHeader(false);

    // Set Titles
    document.getElementById('player-movie-title').textContent = epTitle ? `${movie.title} - ${epTitle}` : movie.title;

    // Season & Episode Mapping for Next/Prev Buttons
    currentSeasonKey = null;
    currentEpIndex = -1;
    const prevBtn = document.getElementById('prevEpBtn');
    const nextBtn = document.getElementById('nextEpBtn');

    if (movie.contentType === 'series' && epTitle && movie.seasons) {
        for (const [sKey, eps] of Object.entries(movie.seasons)) {
            const idx = eps.findIndex(e => e.name === epTitle);
            if (idx !== -1) {
                currentSeasonKey = sKey;
                currentEpIndex = idx;
                break;
            }
        }
    }

    if(currentSeasonKey !== null && currentEpIndex !== -1) {
        prevBtn.style.display = 'flex';
        nextBtn.style.display = 'flex';
        const eps = movie.seasons[currentSeasonKey];
        prevBtn.disabled = (currentEpIndex === 0);
        nextBtn.disabled = (currentEpIndex === eps.length - 1);
    } else {
        prevBtn.style.display = 'none';
        nextBtn.style.display = 'none';
    }

    const btnContainer = document.getElementById('server-buttons-container');
    btnContainer.innerHTML = '';

    const s1 = epS1 || movie.server1;
    const s2 = epS2 || movie.server2;

    if(s1) btnContainer.innerHTML += `<button class="sv-btn" id="btn-sv1" onclick="loadServer(this, 'auto', '${s1}')"><i class="fas fa-bolt text-yellow-400"></i> Free server</button>`;
    if(s2) btnContainer.innerHTML += `<button class="sv-btn" id="btn-sv2" onclick="loadServer(this, 'auto', '${s2}')"><i class="fas fa-crown text-amber-400"></i> ViP server</button>`;
    if(!s1 && !s2) btnContainer.innerHTML = '<p class="text-gray-500 font-medium">Servers not available right now.</p>';

    pages.forEach(page => page.classList.remove('active'));
    document.getElementById('watch-page').style.display = 'block';
    localStorage.setItem('last_page_id', 'watch-page');
    localStorage.setItem('last_movie_id', movieId);

    // Fix: Add Watch Page to history so phone back button knows where to go
    history.pushState({ page: 'watch-page', movieId: movieId }, null, "");

    // Auto click first available server
    setTimeout(() => {
        if(document.getElementById('btn-sv1')) document.getElementById('btn-sv1').click();
        else if(document.getElementById('btn-sv2')) document.getElementById('btn-sv2').click();
    }, 300);
};

window.closePlayer = function() {
    const directVid = document.getElementById('directVideo');
    directVid.onerror = null; // ফেক ব্রোকেন লিংক রিপোর্ট বন্ধ করতে লিসেনার অফ করা হলো
    directVid.pause(); 
    directVid.removeAttribute('src');
    directVid.load(); // ভিডিও ট্যাগ সম্পূর্ণ রিসেট করে, যাতে NotSupportedError না আসে

    // YouTube/Vimeo প্লেয়ার সঠিকভাবে ডেস্ট্রয় করা হচ্ছে যাতে ব্যাকগ্রাউন্ডে অডিও না বাজে
    if(ytPlayer && typeof ytPlayer.destroy === 'function') { ytPlayer.destroy(); ytPlayer = null; }
    if(vimeoPlayer && typeof vimeoPlayer.destroy === 'function') { vimeoPlayer.destroy(); vimeoPlayer = null; }

    document.getElementById('embedContainer').innerHTML = '';

    const securityMask = document.querySelector('.security-mask');
    const controlsDiv = document.querySelector('.controls');
    if (securityMask) securityMask.style.display = 'block';
    if (controlsDiv) controlsDiv.style.display = 'flex';

    document.getElementById('watch-page').style.display = 'none';
    const movieId = localStorage.getItem('last_movie_id');
    if(movieId && allMovies[movieId]) {
        showMovieDetails(movieId); 
    } else {
        showPage('home-page');
    }
}

// Modified Show Details for Series & Movies (Premium UI)
window.showMovieDetails = (movieId, push = true) => {
    if (!movieId || !allMovies[movieId]) return;
    const movie = allMovies[movieId];
    currentMovieId = movieId;

    toggleGlobalHeader(false);

    const now = new Date();
    let isUpcoming = false;
    let releaseString = '';

    if(movie.isUpcoming && movie.releaseDate) {
        const releaseDate = new Date(movie.releaseDate);
        if(releaseDate > now) {
            isUpcoming = true;
            releaseString = releaseDate.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute:'2-digit' });
        }
    }

    // AD LOCATION 2: Preserved Exactly
    const adHtml = `
        <div class="ad-container my-4 relative z-10 animate-slide-up" style="animation-delay: 0.1s;">
             <iframe srcdoc="<script>
                  atOptions = {
                    'key' : 'aa465b71c480195a3ddce17207d3b9d7',
                    'format' : 'iframe',
                    'height' : 50,
                    'width' : 320,
                    'params' : {}
                  };
                <\/script>
                <script src='https://www.highperformanceformat.com/aa465b71c480195a3ddce17207d3b9d7/invoke.js'><\/script>"
                width="320" height="50" scrolling="no" frameborder="0" style="border:none; overflow:hidden;"></iframe>
        </div>
    `;

    let actionHtml = '';

    if (isUpcoming) {
        actionHtml = `
        <div class="animate-slide-up" style="animation-delay: 0.2s;">
            <button disabled class="w-full bg-slate-800/80 backdrop-blur-md text-gray-300 border border-slate-700/50 rounded-2xl p-4 font-bold shadow-lg flex justify-center items-center gap-3 tracking-wide cursor-not-allowed">
                <i class="fas fa-clock text-indigo-400 text-lg"></i> Drops: ${releaseString}
            </button>
        </div>`;
    } else if (movie.contentType === 'series' && movie.seasons) {
        const seasons = Object.keys(movie.seasons);
        const seasonOptions = seasons.map(s => `<option value="${s}">${s}</option>`).join('');

        actionHtml = `
            <div class="mt-6 mb-4 bg-slate-800/40 p-1.5 rounded-2xl border border-slate-700/50 backdrop-blur-sm animate-slide-up" style="animation-delay: 0.2s;">
                <div class="flex items-center px-4 py-3 border-b border-slate-700/50">
                    <i class="fas fa-layer-group text-indigo-400 mr-3 text-lg"></i>
                    <span class="text-base font-bold text-gray-200 tracking-wide">Episodes</span>
                    <select id="season-selector" class="ml-auto bg-slate-900/80 text-indigo-300 text-sm font-bold py-2 px-4 rounded-xl border border-slate-600 outline-none focus:border-indigo-500 transition-colors shadow-inner" onchange="renderEpisodes('${movieId}', this.value)">
                        ${seasonOptions}
                    </select>
                </div>
                <div id="episodes-list-container" class="space-y-2 max-h-[350px] overflow-y-auto p-3 custom-scrollbar">
                    <!-- Episodes Rendered Here -->
                </div>
            </div>
        `;
    } else {
        actionHtml = `
         <div class="flex items-center gap-4 mt-6 animate-slide-up" style="animation-delay: 0.2s;">
            <button onclick="openPlayer('${movieId}')" class="flex-1 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white py-3.5 px-4 rounded-full font-bold shadow-[0_10px_20px_rgba(79,70,229,0.3)] hover:shadow-[0_15px_30px_rgba(79,70,229,0.5)] transition-all transform hover:-translate-y-1 flex justify-center items-center gap-3 text-lg group border border-white/10">
                <i class="fas fa-play group-hover:scale-125 transition-transform duration-300"></i> Watch Now
            </button>
            ${(movie.server1 && !movie.server1.includes('videasy.net') && movie.allowDownload !== false) ? `<button onclick="requestDownload('${movieId}')" class="download-btn triggered !w-14 !h-14 !text-xl shadow-[0_10px_20px_rgba(5,150,105,0.3)] border border-white/10"><i class="fas fa-download"></i></button>` : ''}
         </div>`;
    }

    const contentEl = document.getElementById('movie-details-content');
    contentEl.innerHTML = `
        <!-- Cinematic Header (Parallax & Pan) -->
        <div class="relative w-full h-[55vh] min-h-[400px] max-h-[600px] overflow-hidden">
            <img src="${movie.posterUrl}" class="absolute inset-0 w-full h-full object-cover object-top filter brightness-[0.65] origin-center" style="animation: slowPan 25s infinite alternate ease-in-out;">
            <div class="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent"></div>
            <div class="absolute inset-0 bg-gradient-to-r from-slate-900/50 via-transparent to-transparent"></div>

            <button onclick="goBack()" class="absolute top-6 left-5 w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 text-white hover:bg-white/20 hover:scale-110 transition-all z-20 shadow-lg">
                <i class="fas fa-arrow-left"></i>
            </button>
        </div>

        <!-- Content Details -->
        <div class="relative z-10 px-5 sm:px-8 -mt-36 pb-12 max-w-4xl mx-auto">
            <h2 class="text-3xl md:text-5xl font-extrabold text-white drop-shadow-xl leading-tight animate-slide-up">${movie.title}</h2>

            <!-- Meta Row -->
            <div class="flex flex-wrap items-center gap-3 mt-4 animate-slide-up" style="animation-delay: 0.1s;">
                <span class="text-[11px] font-bold text-green-400 bg-green-400/10 px-2.5 py-1 rounded-md border border-green-400/20">${movie.year || 'N/A'}</span>
                <span class="text-[11px] font-bold text-indigo-300 bg-indigo-500/10 px-2.5 py-1 rounded-md border border-indigo-500/20 tracking-wider uppercase">${movie.category || 'Movie'}</span>
                <div class="flex items-center text-[11px] font-bold text-yellow-500 bg-yellow-500/10 px-2.5 py-1 rounded-md border border-yellow-500/20">
                    <i class="fas fa-star mr-1.5"></i> <span>${movie.rating || 'N/A'}</span>
                </div>

                <!-- Premium Comments Button -->
                <button onclick="openComments()" class="ml-auto flex items-center text-xs font-bold text-gray-200 bg-slate-800/80 backdrop-blur-md px-4 py-2 rounded-full border border-slate-600 hover:bg-slate-700 hover:border-indigo-500 transition-all shadow-lg group">
                    <i class="fas fa-comment-dots text-indigo-400 mr-2 text-sm group-hover:scale-110 transition-transform"></i> 
                    ${Object.keys(movie.comments || {}).length || 'Discuss'}
                </button>
            </div>

            ${adHtml}
            ${actionHtml}

            <!-- Storyline Section -->
            <div class="mt-8 animate-slide-up" style="animation-delay: 0.3s;">
                <h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <i class="fas fa-book-open text-blue-500 transition-colors"></i> Storyline
                </h3>
                <div class="bg-slate-800/40 p-5 md:p-6 rounded-2xl border border-slate-700/50 hover:border-blue-500 backdrop-blur-md shadow-lg relative overflow-hidden group transition-all duration-300">
                    <div class="absolute top-0 left-0 w-1.5 h-full bg-blue-600 opacity-80 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <p class="text-gray-300 text-sm md:text-[15px] leading-relaxed whitespace-pre-line break-words">${movie.description || 'No description available for this title.'}</p>
                </div>
            </div>

            <!-- Cast Section -->
            <div class="mt-6 animate-slide-up" style="animation-delay: 0.4s;">
                <h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <i class="fas fa-users text-blue-500 transition-colors"></i> Top Cast
                </h3>
                <div class="bg-slate-800/40 p-5 md:p-6 rounded-2xl border border-slate-700/50 hover:border-blue-500 backdrop-blur-md shadow-lg relative overflow-hidden group transition-all duration-300">
                    <div class="absolute top-0 left-0 w-1.5 h-full bg-blue-600 opacity-80 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <p class="text-gray-300 text-sm md:text-[15px] leading-relaxed whitespace-pre-line break-words">${movie.cast || 'Cast information not available.'}</p>
                </div>
            </div>
        </div>
    `;

    pages.forEach(page => page.classList.toggle('active', page.id === 'movie-details-page'));
    window.scrollTo(0, 0);
    localStorage.setItem('last_page_id', 'movie-details-page');
    localStorage.setItem('last_movie_id', movieId);
    if(push) history.pushState({ page: 'movie-details-page', movieId: movieId }, null, "");

    if (!isUpcoming && movie.contentType === 'series' && movie.seasons) {
        const firstSeason = Object.keys(movie.seasons)[0];
        renderEpisodes(movieId, firstSeason);
    }
};

window.renderEpisodes = (movieId, seasonKey) => {
    const container = document.getElementById('episodes-list-container');
    if(!container) return;
    const movie = allMovies[movieId];
    const episodes = movie.seasons[seasonKey];

    if(!episodes || episodes.length === 0) {
        container.innerHTML = '<div class="flex flex-col items-center justify-center py-10 opacity-60"><i class="fas fa-video-slash text-4xl mb-3 text-gray-600"></i><p class="text-sm text-gray-400 font-medium">No episodes released yet.</p></div>';
        return;
    }

    container.innerHTML = episodes.map((ep, index) => {
        const safeName = ep.name.replace(/'/g, "\\'");
        const s1 = ep.server1 || '';
        const s2 = ep.server2 || '';

        return `
        <div class="group bg-slate-800/60 hover:bg-slate-700/80 backdrop-blur-md border border-slate-700/50 hover:border-indigo-500/60 rounded-xl p-3 flex items-center justify-between transition-all duration-300 shadow-sm hover:shadow-[0_4px_15px_rgba(79,70,229,0.2)]" style="animation: slideUpFade 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; animation-delay: ${index * 0.05}s; opacity: 0;">

            <div class="flex-1 flex items-center gap-4 overflow-hidden cursor-pointer" onclick="openPlayer('${movieId}', '${safeName}', '${s1}', '${s2}')">
                <div class="w-10 h-10 rounded-full bg-slate-900 border border-slate-600 flex items-center justify-center text-sm font-bold text-gray-400 group-hover:text-indigo-400 group-hover:border-indigo-500 transition-colors flex-shrink-0 shadow-inner">
                    ${index+1}
                </div>
                <span class="text-sm md:text-base font-bold text-gray-200 group-hover:text-white truncate transition-colors">${ep.name}</span>
            </div>

            <div class="flex items-center gap-2 sm:gap-3 ml-2 flex-shrink-0">
                ${(ep.server1 && !ep.server1.includes('videasy.net') && ep.allowDownload !== false) ? `<button onclick="requestDownload('${movieId}', '${seasonKey}', ${index})" class="download-btn triggered !w-9 !h-9 !text-sm !shadow-none border border-white/10"><i class="fas fa-download"></i></button>` : ''}

                <button onclick="openPlayer('${movieId}', '${safeName}', '${s1}', '${s2}')" class="w-10 h-10 rounded-full bg-indigo-600/20 text-indigo-400 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all border border-indigo-500/30 hover:shadow-[0_0_15px_rgba(79,70,229,0.5)]">
                    <i class="fas fa-play text-sm ml-0.5"></i>
                </button>
            </div>
        </div>
        `;
    }).join('');
};
