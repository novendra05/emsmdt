window.PageControllers.home = {
    init: function() {
        console.log("[MDT] Home Controller: Information Hub Active");
        
        // 1. Set Welcome Name from global session data
        const welcomeName = document.getElementById('welcome-name');
        if (welcomeName && window.MDTData) {
            welcomeName.innerText = window.MDTData.medicName || "Officer";
        }

        // 2. Initialize Scratchpad
        this.initScratchpad();

        // 3. Fetch Bulletins (Reliable list)
        this.fetchBulletins();
        
        // 4. Start live clock
        this.startClock();
    },

    startClock: function() {
        const updateClock = () => {
            const now = new Date();
            const clockEl = document.getElementById('network-clock');
            if (clockEl) {
                clockEl.innerText = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            }
        };
        updateClock();
        setInterval(updateClock, 1000);
    },

    initScratchpad: function() {
        const scratchpad = document.getElementById('clinical-scratchpad');
        const statusEl = document.getElementById('scratchpad-status');
        if (!scratchpad) return;

        // Load existing notes
        const savedNotes = localStorage.getItem('ems_mdt_scratchpad');
        if (savedNotes) {
            scratchpad.value = savedNotes;
        }

        // Auto-save logic
        let saveTimeout;
        scratchpad.addEventListener('input', () => {
            clearTimeout(saveTimeout);
            statusEl.innerText = "Typing...";
            statusEl.classList.remove('opacity-0');
            
            saveTimeout = setTimeout(() => {
                localStorage.setItem('ems_mdt_scratchpad', scratchpad.value);
                statusEl.innerText = "Saved Locally";
                setTimeout(() => {
                    statusEl.classList.add('opacity-0');
                }, 1000);
            }, 1000);
        });
    },

    fetchBulletins: async function() {
        try {
            const data = await postForm('getAllBulletins', {});
            this.renderBulletins(data || []);
        } catch (e) {
            console.error("[MDT] Error fetching bulletins", e);
        }
    },

    renderBulletins: function(bulletins) {
        const list = document.getElementById('bulletins-list');
        if (!list) return;

        if (bulletins.length === 0) {
            list.innerHTML = `
            <div class="py-20 flex flex-col items-center text-slate-300 opacity-60 space-y-4">
                <i class="fas fa-envelope-open-text text-5xl opacity-20"></i>
                <p class="font-black tracking-[0.2em] text-[10px] uppercase italic">No Active Bulletins</p>
            </div>`;
            return;
        }

        let html = '';
        bulletins.forEach(b => {
            const dateStr = new Date(b.date).toLocaleDateString();
            html += `
            <div class="bg-blue-50/40 border-l-4 border-blue-500 p-6 rounded-r-[1.5rem] relative group">
                <button class="absolute top-4 right-4 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all text-xs" onclick="window.PageControllers.home.deleteBulletin(${b.id})"><i class="fas fa-trash"></i></button>
                <h4 class="text-blue-900 font-extrabold text-lg pr-6 underline decoration-blue-200 decoration-4 underline-offset-4">${b.title}</h4>
                <p class="text-sm text-slate-500 font-medium mt-3 leading-relaxed whitespace-pre-wrap">${b.content}</p>
                <div class="mt-4 flex items-center gap-2 text-[10px] text-blue-600 font-black uppercase tracking-widest bg-blue-100/50 w-fit px-3 py-1 rounded-lg">
                    <i class="fas fa-user-shield"></i> Authorized Post &bull; ${b.author} &bull; ${dateStr}
                </div>
            </div>`;
        });
        list.innerHTML = html;
    },

    deleteBulletin: function(id) {
        window.showConfirmModal(
            "Remove Bulletin", 
            "Are you sure you want to erase this hospital bulletin? It will disappear from everyone's dashboard.", 
            async () => {
                const res = await postForm('deleteBulletin', { id });
                if (res && res.success) {
                    window.PageControllers.home.fetchBulletins();
                } else {
                    alert(res.msg || "Failed to delete: Unauthorized or error.");
                }
            }
        );
    },

    openBulletinModal: function() {
        const modal = document.getElementById('custom-modal');
        const modalBox = document.getElementById('custom-modal-box');
        
        modal.classList.remove('hidden');
        setTimeout(() => {
            modalBox.classList.remove('scale-95', 'opacity-0');
            modalBox.classList.add('scale-100', 'opacity-100');
        }, 10);
        
        document.getElementById('modal-title').innerHTML = `<i class="fas fa-bullhorn mr-2 text-blue-500"></i> New Bulletin`;
        document.getElementById('modal-desc').innerHTML = 'Broadcast a message to all Hospital Staff on the dashboard.';
        
        document.getElementById('modal-inputs').innerHTML = `
            <div class="space-y-4 relative z-50 mt-4">
                <div>
                    <label class="text-[10px] font-black uppercase text-blue-500 tracking-[0.1em] ml-2 mb-1 block">Announcement Title</label>
                    <input type="text" id="new-bulletin-title" class="w-full bg-slate-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-950 font-bold focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all placeholder:text-slate-300" placeholder="e.g. Mandatory Staff Meeting">
                </div>
                <div>
                    <label class="text-[10px] font-black uppercase text-blue-500 tracking-[0.1em] ml-2 mb-1 block">Message Content</label>
                    <textarea id="new-bulletin-content" class="w-full bg-slate-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-950 font-medium focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all placeholder:text-slate-300 resize-none h-32" placeholder="Details..."></textarea>
                </div>
            </div>
        `;

        const confirmBtn = document.getElementById('modal-confirm-btn');
        confirmBtn.classList.remove('hidden');
        const newBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);
        newBtn.innerHTML = "Post Broadcast";

        newBtn.addEventListener('click', async () => {
            const title = document.getElementById('new-bulletin-title').value.trim();
            const content = document.getElementById('new-bulletin-content').value.trim();

            if (!title || !content) return;
            
            newBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Posting`;
            newBtn.disabled = true;

            await postForm('saveBulletin', { title, content });
            
            window.closeModal();
            
            const freshBtn = newBtn.cloneNode(true);
            freshBtn.innerHTML = "Proceed";
            freshBtn.disabled = false;
            newBtn.parentNode.replaceChild(freshBtn, newBtn);
            freshBtn.addEventListener('click', window.closeModal);
            
            this.fetchBulletins();
        });
        
        const oldCancel = document.getElementById('modal-cancel-btn');
        const newCancel = oldCancel.cloneNode(true);
        oldCancel.parentNode.replaceChild(newCancel, oldCancel);
        newCancel.addEventListener('click', window.closeModal);
    }
};
