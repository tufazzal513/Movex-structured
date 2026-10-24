// --- RENDER HOME PAGE ---
const renderHomePage = () => {
    const container = document.getElementById('movie-carousels-container');
    if(!container) return;
    container.innerHTML = '';

    const now = new Date();
    const getReleaseMs = (m) => {
        if(!m) return 0;
        if(typeof m.releaseTs === 'number') return m.releaseTs;
        if(m.releaseDate){
            const t = Date.parse(m.releaseDate);
            return isNaN(t) ? 0 : t;
        }
        return 0;
    };
    const allMoviesArr = Object.entries(allMovies);

    const upcomingMovies = allMoviesArr.filter(([_, m]) => {
        const releaseMs = getReleaseMs(m);
        return !!m.isUpcoming && releaseMs > now.getTime();
    });

    // Premium Movie Card Logic
    const movieCard = (id, m, isUp = false) => {
        const typeLabel = (m.contentType === 'series') ? '<span class="absolute top-2 right-2 bg-purple-600/90 backdrop-blur-md text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-lg border border-white/20 z-10 tracking-wider">SERIES</span>' : '';
        const upLabel = isUp ? `<div class="absolute bottom-0 left-0 w-full bg-gradient-to-t from-slate-900 via-slate-900/90 to-transparent text-white text-[10px] text-center py-2 pt-8 font-bold tracking-widest uppercase z-10 border-t border-white/5"><i class="fas fa-clock text-blue-400 mr-1"></i> Soon</div>` : '';

        return `
        <div class="flex-shrink-0 w-[120px] sm:w-[140px] md:w-[160px] lg:w-[180px] mr-3 sm:mr-4 cursor-pointer group relative snap-start" onclick="showMovieDetails('${id}')">
            <div class="relative overflow-hidden rounded-xl shadow-[0_8px_20px_rgba(0,0,0,0.5)] border border-slate-700/50 bg-slate-800 aspect-[2/3] transform transition-all duration-300 group-hover:-translate-y-1.5 group-hover:shadow-[0_15px_30px_rgba(79,70,229,0.35)] group-hover:border-indigo-500/50">
                <img src="${m.posterUrl}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 ${isUp ? 'opacity-70 group-hover:opacity-100' : ''}" loading="lazy">
                <div class="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-80 group-hover:opacity-40 transition-opacity duration-300 z-0"></div>

                <!-- Premium Play Overlay -->
                ${!isUp ? `
                <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                    <div class="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-600/90 backdrop-blur-md rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(79,70,229,0.6)] transform scale-75 group-hover:scale-100 transition-transform duration-300 border border-indigo-400/30">
                        <i class="fas fa-play text-white ml-1 text-sm sm:text-base"></i>
                    </div>
                </div>` : ''}

                ${typeLabel}
                ${upLabel}
            </div>
            <div class="mt-3 px-1">
                <p class="text-[13px] sm:text-sm text-gray-200 font-bold truncate group-hover:text-indigo-400 transition-colors drop-shadow-sm">${m.title}</p>
                ${!isUp ? `
                <div class="flex items-center justify-between mt-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <p class="text-[10px] sm:text-[11px] text-gray-400 truncate mr-2 font-medium">${m.year || 'N/A'}</p>
                    <p class="text-[10px] sm:text-[11px] text-gray-200 font-bold flex items-center flex-shrink-0 bg-black/40 px-1.5 py-0.5 rounded backdrop-blur-sm"><i class="fas fa-star text-yellow-500 text-[9px] mr-1"></i> ${m.rating || 'N/A'}</p>
                </div>` : ''}
            </div>
        </div>`;
    };

    // 1. Upcoming Section Render
    if (upcomingMovies.length > 0) {
        const html = upcomingMovies.map(([id, m]) => movieCard(id, m, true)).join('');
        container.innerHTML += `
        <div class="mb-8 relative z-10 animate-slide-up">
            <div class="flex items-center justify-between mb-4 pr-2 pl-1">
                <h2 class="text-lg sm:text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 tracking-wide flex items-center gap-2">
                    <i class="fas fa-calendar-alt text-blue-500"></i> Coming Soon
                </h2>
                <span class="text-[9px] font-bold text-gray-400 uppercase tracking-widest bg-slate-800/80 px-2.5 py-1 rounded border border-slate-700">Preview</span>
            </div>
            <!-- Edge-to-edge scrolling on mobile -->
            <div class="flex overflow-x-auto pb-6 pt-2 no-scrollbar snap-x snap-mandatory scroll-smooth -mx-4 px-4 sm:mx-0 sm:px-0">
                ${html}
            </div>
        </div>`;
    }

    // 2. Categories Render (With Delays for Smooth Animation)
    let delayCounter = 1;
    const existingCatNames = Object.values(allCategories).map(c => c.name);
    const orphanedMovies = allMoviesArr.filter(([_, m]) => {
        const releaseMs = getReleaseMs(m);
        const isReleased = !m.isUpcoming || (releaseMs && releaseMs <= now.getTime());
        return isReleased && (!m.category || !existingCatNames.includes(m.category));
    });

    const catsToRender = [...Object.values(allCategories)];
    if (orphanedMovies.length > 0) {
        catsToRender.push({ name: 'Uncategorized' });
    }

    catsToRender.forEach(cat => {
        const movies = allMoviesArr.filter(([_, m]) => {
            const releaseMs = getReleaseMs(m);
            const isReleased = !m.isUpcoming || (releaseMs && releaseMs <= now.getTime());
            if (cat.name === 'Uncategorized') {
                return (!m.category || !existingCatNames.includes(m.category)) && isReleased;
            }
            return m.category === cat.name && isReleased;
        });

        if (movies.length > 0) {
            const html = movies.map(([id, m]) => movieCard(id, m)).join('');
            container.innerHTML += `
            <div class="mb-8 relative z-10 animate-slide-up" style="animation-delay: ${delayCounter * 0.1}s;">
                <!-- Category Header with Click to 'View All' -->
                <div class="flex items-center justify-between mb-4 pr-2 pl-1 group cursor-pointer" onclick="openCategoryMovies('${cat.name.replace(/'/g, "\\'")}')">
                    <h2 class="text-lg sm:text-xl font-bold text-gray-100 tracking-wide flex items-center gap-2.5 transition-colors group-hover:text-indigo-400">
                        <div class="w-1.5 h-5 bg-gradient-to-b from-indigo-500 to-blue-600 rounded-full shadow-[0_0_8px_rgba(79,70,229,0.5)]"></div>
                        ${cat.name}
                    </h2>
                    <div class="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 group-hover:border-indigo-500 group-hover:bg-indigo-500/20 transition-all shadow-sm">
                        <i class="fas fa-chevron-right text-[10px] text-gray-400 group-hover:text-indigo-400"></i>
                    </div>
                </div>
                <!-- Edge-to-edge scrolling on mobile -->
                <div class="flex overflow-x-auto pb-6 pt-2 no-scrollbar snap-x snap-mandatory scroll-smooth -mx-4 px-4 sm:mx-0 sm:px-0">
                    ${html}
                </div>
            </div>`;
            delayCounter++;
        }
    });
};
