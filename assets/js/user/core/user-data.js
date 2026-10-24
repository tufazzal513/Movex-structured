// --- USER SPECIFIC DATA (Runs only after successful login) ---
const loadInitialData = () => {
    db.ref('movies').on('value', s => { 
        const rawMovies = s.val() || {};
        // শুধুমাত্র সেগুলোই ফিল্টার করছি যা প্রাইভেট নয়
        allMovies = {};
        Object.keys(rawMovies).forEach(id => {
            if (!rawMovies[id].isPrivate) {
                allMovies[id] = rawMovies[id];
            }
        });

        if(Object.keys(allCategories).length) renderHomePage();

        db.ref('banners').once('value', s => renderBanners(s.val()));

        const lastPage = localStorage.getItem('last_page_id');
        const lastMovie = localStorage.getItem('last_movie_id');

        if(lastMovie && allMovies[lastMovie]) {
            if (lastPage === 'movie-details-page' || lastPage === 'watch-page' || lastPage === 'comments-page') {
                if(document.getElementById('movie-details-page').classList.contains('active')) {
                    showMovieDetails(lastMovie, false);
                }
            }
        }
    });

    db.ref('banners').on('value', s => renderBanners(s.val()));

    db.ref('categories').on('value', s => { 
        allCategories = s.val() || {}; 
        renderCategoriesPage(); 
        if(Object.keys(allMovies).length) renderHomePage(); 
    });

    db.ref('socialLinks').on('value', s => renderSocials(s.val()));
    db.ref('notifications').on('value', s => renderNotifications(s.val()));
};
