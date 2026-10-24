// --- Global Variables ---
let allMovies = {};
let allCategories = {};
let currentMovieId = null;
let adTimer = 15;
let adUrl = "https://monetag.com"; 
let commentModEnabled = false;
let commentDislikeThreshold = 0; // default
let pwdResetLimit = 3; // default
let forgetCooldown = 0; // Cooldown timer for reset
