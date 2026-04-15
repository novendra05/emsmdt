// EMS MDT Core Controller
const API_NAME = 'ems-mdt';
const appContainer = document.getElementById('app');
const closeBtn = document.getElementById('close-mdt');

// Global Controllers Repository
window.PageControllers = window.PageControllers || {};

// Utility to send messages to Lua
window.postForm = async function(endpoint, data) {
    try {
        const resp = await fetch(`https://${API_NAME}/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=UTF-8' },
            body: JSON.stringify(data)
        });
        return await resp.json();
    } catch (e) {
        console.error(`Error posting to ${endpoint}:`, e);
        return null;
    }
}

// Page Loading Logic
window.loadPage = function(page) {
    console.log(`[MDT] Loading page: ${page}`);
    $.get(`pages/${page}.html`, function(html) {
        document.getElementById('content-container').innerHTML = html;
        window.CurrentPage = page;
        
        // Initialize page controller if exists
        if (window.PageControllers[page] && typeof window.PageControllers[page].init === 'function') {
            window.PageControllers[page].init();
        }
    }).fail(function() {
        document.getElementById('content-container').innerHTML = `
            <div class="h-full flex flex-col items-center justify-center text-red-500 opacity-50">
                <i class="fas fa-exclamation-triangle text-6xl mb-4"></i>
                <p class="font-bold uppercase tracking-widest">Error Loading ${page}.html</p>
            </div>`;
    });
}

// NUI Message Listener
window.addEventListener('message', (event) => {
    let e = event.data;
    if (e.type === "open_mdt") {
        document.getElementById('medic-name').textContent = e.medicName || "Unknown Medic";
        document.getElementById('medic-rank').textContent = e.medicRank || "EMS Staff";
        
        // Store session data globally for controllers
        window.MDTData = {
            medicName: e.medicName,
            medicRank: e.medicRank,
            medicGrade: e.medicGrade || 0,
            citizenid: e.citizenid,
            manageGrade: e.manageGrade || 4
        };

        // Show App with Animation
        appContainer.classList.remove('hidden');
        setTimeout(() => {
            const inner = appContainer.querySelector('.active-mdt');
            if (inner) { inner.classList.remove('scale-95', 'opacity-0'); }
        }, 50);
        
        loadPage('home');
    }
});

// Navigation Handling
$(document).on('click', '.nav-btn', function() {
    $('.nav-btn').removeClass('active');
    $(this).addClass('active');
    loadPage($(this).data('page'));
});

// Close UI Logic
window.closeUI = function() {
    const inner = appContainer.querySelector('.active-mdt');
    if (inner) { inner.classList.add('scale-95', 'opacity-0'); }
    setTimeout(() => {
        appContainer.classList.add('hidden');
        postForm('closeUI', {});
    }, 400);
}

closeBtn.addEventListener('click', window.closeUI);
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !appContainer.classList.contains('hidden')) {
        // If modal is open, close modal first
        const modal = document.getElementById('custom-modal');
        if (!modal.classList.contains('hidden')) {
            window.closeModal();
            return;
        }
        window.closeUI();
    }
});

// Modal Logic
window.closeModal = function() {
    const modal = document.getElementById('custom-modal');
    const modalBox = document.getElementById('custom-modal-box');
    modalBox.classList.remove('scale-100', 'opacity-100');
    modalBox.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 200);
}

document.getElementById('modal-cancel-btn').addEventListener('click', window.closeModal);
document.getElementById('modal-confirm-btn').addEventListener('click', window.closeModal);

// Enhanced Confirm & Image Modals
window.showConfirmModal = function(title, desc, onConfirm) {
    const modal = document.getElementById('confirm-modal');
    const box = document.getElementById('confirm-modal-box');
    const bg = document.getElementById('confirm-modal-bg');
    
    document.getElementById('confirm-modal-title').innerText = title;
    document.getElementById('confirm-modal-desc').innerText = desc;
    
    const btn = document.getElementById('confirm-modal-btn');
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    newBtn.addEventListener('click', () => {
        onConfirm();
        window.closeConfirmModal();
    });
    
    modal.classList.remove('hidden');
    setTimeout(() => {
        bg.classList.remove('opacity-0');
        box.classList.remove('scale-95', 'opacity-0');
    }, 10);
};

window.closeConfirmModal = function() {
    const modal = document.getElementById('confirm-modal');
    const box = document.getElementById('confirm-modal-box');
    const bg = document.getElementById('confirm-modal-bg');
    
    bg.classList.add('opacity-0');
    box.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 200);
};

window.previewImage = function(url, caption = "Evidence Preview") {
    const modal = document.getElementById('image-modal');
    const box = document.getElementById('image-modal-box');
    const bg = document.getElementById('image-modal-bg');
    const img = document.getElementById('image-modal-img');
    
    img.src = url;
    document.getElementById('image-modal-caption').innerText = caption;
    
    modal.classList.remove('hidden');
    setTimeout(() => {
        bg.classList.remove('opacity-0');
        box.classList.remove('scale-95', 'opacity-0');
    }, 10);
};

window.closeImageModal = function() {
    const modal = document.getElementById('image-modal');
    const box = document.getElementById('image-modal-box');
    const bg = document.getElementById('image-modal-bg');
    
    bg.classList.add('opacity-0');
    box.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
        document.getElementById('image-modal-img').src = '';
    }, 200);
};
