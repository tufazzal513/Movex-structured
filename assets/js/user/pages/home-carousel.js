// --- 3D CAROUSEL LOGIC ---
const renderBanners = (banners) => {
    carouselEl = document.getElementById('carousel');
    if (!banners || !carouselEl) return;
    carouselEl.innerHTML = ''; 

    const bannerList = Object.values(banners);
    const count = bannerList.length;
    if(count === 0) return;

    const isMobile = window.innerWidth < 768;
    const radius = isMobile ? 240 : 380;
    const theta = 360 / count;

    bannerList.forEach((b, index) => {
        const angle = theta * index;
        const item = document.createElement('div');
        item.className = 'carousel__item';

        let imgSrc = b.imageUrl;
        if(b.movieId && allMovies[b.movieId] && allMovies[b.movieId].posterUrl) {
            imgSrc = allMovies[b.movieId].posterUrl;
        }

        item.innerHTML = `<img src="${imgSrc}" alt="Banner">`;
        item.style.transform = `rotateY(${angle}deg) translateZ(${radius}px)`;

        item.addEventListener('click', (e) => {
            if(!isDragging && b.movieId) {
                showMovieDetails(b.movieId);
            }
        });

        carouselEl.appendChild(item);
    });

    rotationY = 0;
    rotateCarousel(radius);
    setupCarouselEvents();
};

function rotateCarousel(radiusOverride) {
    if(!carouselEl) return;
    const isMobile = window.innerWidth < 768;
    const r = radiusOverride || (isMobile ? 240 : 380);
    carouselEl.style.transform = `translateZ(-${r}px) rotateY(${rotationY}deg)`;
}

function animateCarousel() {
    if(autoRotate && !isDragging && carouselEl){
        rotationY -= 0.2;
        rotateCarousel();
    }
    requestAnimationFrame(animateCarousel);
}

requestAnimationFrame(animateCarousel);

function setupCarouselEvents() {
    const container = document.querySelector('.carousel-container');
    if(!container) return;

    container.addEventListener('mousedown', e => {
        isDragging = true;
        startX = e.clientX;
        autoRotate = false;
        carouselEl.style.transition = 'none';
    });

    window.addEventListener('mouseup', e => {
        if(isDragging) {
            isDragging = false;
            autoRotate = true;
            carouselEl.style.transition = 'transform 0.5s ease-out';
        }
    });

    window.addEventListener('mousemove', e => {
        if(isDragging){
            const deltaX = e.clientX - startX;
            startX = e.clientX;
            rotationY += deltaX * 0.5;
            rotateCarousel();
        }
    });

    container.addEventListener('touchstart', e => {
        isDragging = true;
        startX = e.touches[0].clientX;
        autoRotate = false;
        carouselEl.style.transition = 'none';
    });

    window.addEventListener('touchend', e => {
        if(isDragging) {
            isDragging = false;
            autoRotate = true;
            carouselEl.style.transition = 'transform 0.5s ease-out';
        }
    });

    window.addEventListener('touchmove', e => {
        if(isDragging){
            const deltaX = e.touches[0].clientX - startX;
            startX = e.touches[0].clientX;
            rotationY += deltaX * 0.5;
            rotateCarousel();
        }
    });
}
