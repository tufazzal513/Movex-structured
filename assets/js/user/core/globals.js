// --- GLOBAL VARS ---
let playerMode = 'direct';
let isPlaying = false;
let vimeoPlayer, ytPlayer, updateInterval;
let searchHistory = JSON.parse(localStorage.getItem('movex_search_history')) || [];
