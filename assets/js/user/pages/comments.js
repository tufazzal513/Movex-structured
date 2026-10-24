// --- COMMENTS SYSTEM (এডিট/রিপ্লাই বাদ দেওয়া হয়েছে, শুধু লাইক/ডিসলাইক) ---
let currentCommentsRef = null; // গ্লোবাল ভেরিয়েবল যোগ করা হলো
window.openComments = () => {
    if(!currentMovieId) return;
    showPage('comments-page');

    // Set User Avatar in Input Box dynamically
    const userAvatarBox = document.getElementById('current-user-avatar');
    if(auth.currentUser && userAvatarBox) {
        userAvatarBox.textContent = auth.currentUser.displayName ? auth.currentUser.displayName.charAt(0).toUpperCase() : 'U';
    }

    document.getElementById('comments-list').innerHTML = `
        <div class="flex flex-col items-center justify-center py-10 opacity-70">
            <div class="spinner border-indigo-500 mx-auto mb-4"></div>
            <p class="text-xs text-gray-400 font-bold uppercase tracking-widest">Loading discussions...</p>
        </div>`;

    // আগের লিসেনার থাকলে রিমুভ করে মেমোরি ক্লিয়ার করা হচ্ছে
    if(currentCommentsRef) currentCommentsRef.off();
    currentCommentsRef = db.ref(`comments/${currentMovieId}`);

    currentCommentsRef.on('value', async (s) => {
        const list = document.getElementById('comments-list');
        const comments = s.val() || {};

        // Auto-delete check based on admin threshold
        if(commentModEnabled && commentDislikeThreshold > 0) {
            const toDelete = [];
            Object.entries(comments).forEach(([cid, c]) => {
                const dislikes = c.dislikes ? Object.keys(c.dislikes).length : 0;
                if(dislikes >= commentDislikeThreshold) {
                    toDelete.push(cid);
                }
            });
            if(toDelete.length > 0) {
                const updates = {};
                toDelete.forEach(cid => {
                    updates[`comments/${currentMovieId}/${cid}`] = null;
                });
                await db.ref().update(updates);
                return; // Will trigger this listener again
            }
        }

        // Build comment array and sort by likes
        const commentArray = Object.entries(comments).map(([id, c]) => ({ id, ...c }));
        commentArray.sort((a, b) => {
            const likesA = a.likes ? Object.keys(a.likes).length : 0;
            const likesB = b.likes ? Object.keys(b.likes).length : 0;
            return likesB - likesA;
        });

        list.innerHTML = '';

        if(commentArray.length === 0) { 
            list.innerHTML = `
                <div class="flex flex-col items-center justify-center py-12 opacity-60 bg-slate-800/20 rounded-2xl border border-slate-700/30">
                    <i class="fas fa-comment-slash text-4xl mb-4 text-gray-600"></i>
                    <p class="text-gray-300 font-bold text-base mb-1">No comments yet</p>
                    <p class="text-xs text-gray-500">Be the first to share your thoughts!</p>
                </div>`; 
            return; 
        }

        commentArray.forEach((c, index) => {
            list.appendChild(renderComment(c, index));
        });
    });
};

function renderComment(comment, index) {
    const div = document.createElement('div');
    const isOwner = auth.currentUser.uid === comment.userId;
    const likes = comment.likes ? Object.keys(comment.likes).length : 0;
    const dislikes = comment.dislikes ? Object.keys(comment.dislikes).length : 0;
    const initial = comment.userName ? comment.userName.charAt(0).toUpperCase() : 'A';

    // Format Date beautifully
    const dateObj = new Date(comment.timestamp);
    const dateStr = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

    div.className = `comment-item ${isOwner ? 'active-user' : ''}`;
    div.style.animationDelay = `${index * 0.08}s`; // Cascading effect

    let actionsHtml = '';
    if(isOwner) {
        actionsHtml = `
            <button onclick="deleteComment('${comment.id}')" class="text-gray-500 hover:text-red-400 ml-auto transition-colors p-1 flex items-center justify-center rounded-full hover:bg-red-500/10 w-8 h-8" title="Delete">
                <i class="fas fa-trash-alt"></i>
            </button>
        `;
    }

    // Pre-defined colorful gradients for avatars based on name length or random feeling
    const gradients = ['from-teal-400 to-emerald-500', 'from-purple-500 to-indigo-500', 'from-pink-500 to-rose-500', 'from-orange-400 to-red-500', 'from-blue-400 to-cyan-500'];
    const randomGradient = gradients[comment.userName.length % gradients.length];

    div.innerHTML = `
        <div class="flex gap-4">
            <div class="comment-avatar bg-gradient-to-br ${randomGradient}">${initial}</div>

            <div class="flex-1 min-w-0">
                <div class="flex justify-between items-center mb-1">
                    <span class="text-[13px] font-bold text-gray-100 truncate pr-2 ${isOwner ? 'text-indigo-300' : ''}">${comment.userName} ${isOwner ? '<span class="ml-1 text-[9px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/30">YOU</span>' : ''}</span>
                    <span class="text-[10px] text-gray-500 font-medium bg-slate-900/40 px-2 py-0.5 rounded-full flex-shrink-0">${dateStr}</span>
                </div>

                <p class="text-[14px] text-gray-300 leading-relaxed mb-3 break-words">${comment.text}</p>

                <div class="flex items-center gap-4 text-xs font-bold text-gray-400 pt-2 border-t border-white/5">
                    <button onclick="likeComment('${comment.id}')" class="flex items-center gap-1.5 transition-colors hover:text-emerald-400 ${comment.likes && comment.likes[auth.currentUser.uid] ? 'text-emerald-400' : ''}">
                        <div class="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center hover:bg-emerald-500/20 transition-colors"><i class="fas fa-thumbs-up text-[11px]"></i></div> ${likes}
                    </button>
                    <button onclick="dislikeComment('${comment.id}')" class="flex items-center gap-1.5 transition-colors hover:text-rose-400 ${comment.dislikes && comment.dislikes[auth.currentUser.uid] ? 'text-rose-400' : ''}">
                        <div class="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center hover:bg-rose-500/20 transition-colors"><i class="fas fa-thumbs-down text-[11px]"></i></div> ${dislikes}
                    </button>
                    ${actionsHtml}
                </div>
            </div>
        </div>
    `;

    return div;
}

window.submitComment = () => {
    const txt = document.getElementById('comment-input').value.trim();
    if(!txt || !currentMovieId) return;

    const commentData = {
        text: txt,
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName || 'Anonymous',
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };

    const ref = db.ref(`comments/${currentMovieId}`).push();
    ref.set(commentData).then(() => {
        document.getElementById('comment-input').value = '';
        document.getElementById('comment-char-count').innerText = '0';
    });
};

window.likeComment = (cid) => {
    const uid = auth.currentUser.uid;
    const ref = db.ref(`comments/${currentMovieId}/${cid}/likes/${uid}`);
    ref.once('value', s => { if(s.exists()) ref.remove(); else ref.set(true); });
};

window.dislikeComment = (cid) => {
    const uid = auth.currentUser.uid;
    const ref = db.ref(`comments/${currentMovieId}/${cid}/dislikes/${uid}`);
    ref.once('value', s => { if(s.exists()) ref.remove(); else ref.set(true); });
};
