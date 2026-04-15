window.PageControllers.evidences = {
    allEvidences: [],

    init: function() {
        console.log("[MDT] Evidences Controller Initialized");
        this.fetchEvidences();

        const searchInput = document.getElementById('search-evidence-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.renderEvidences(e.target.value.trim().toLowerCase());
            });
        }
    },

    fetchEvidences: async function() {
        try {
            const data = await postForm('getAllEvidences', {});
            this.allEvidences = data || [];
            this.renderEvidences('');
        } catch (e) {
            console.error("[MDT] Error fetching evidences", e);
        }
    },

    renderEvidences: function(filterText) {
        const grid = document.getElementById('evidences-grid');
        if (!grid) return;

        const filtered = this.allEvidences.filter(e => {
            if (!filterText) return true;
            return ((e.title || "").toLowerCase().includes(filterText) ||
                    e.id.toString().includes(filterText));
        });

        if (filtered.length === 0) {
            grid.innerHTML = `
            <div class="col-span-4 py-20 flex flex-col items-center text-slate-300 opacity-60 space-y-4">
                <i class="fas fa-database text-7xl opacity-20"></i>
                <p class="font-black tracking-[0.2em] text-[11px] uppercase italic">No Data Found</p>
            </div>`;
            return;
        }

        let html = '';
        filtered.forEach(e => {
            const dateStr = new Date(e.date).toLocaleDateString();
            html += `
            <div class="bg-white rounded-[2rem] border border-blue-50 overflow-hidden shadow-sm hover:shadow-lg transition-all group flex flex-col h-64 clinical-shadow">
                <div class="h-40 bg-slate-100 flex-shrink-0 relative overflow-hidden flex items-center justify-center cursor-pointer" onclick="window.previewImage('${e.url}', '${e.title}')">
                    <img src="${e.url}" class="w-full h-full object-cover group-hover:scale-110 transition-all duration-500" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'flex flex-col items-center justify-center w-full h-full bg-slate-100\\'><i class=\\'fas fa-image-slash text-red-300 text-3xl mb-2\\'></i><span class=\\'text-[9px] text-red-400 font-bold uppercase tracking-widest\\'>Broken URL</span></div>';">
                    <div class="absolute inset-0 bg-blue-900/0 group-hover:bg-blue-900/40 transition-all flex items-center justify-center">
                        <i class="fas fa-search-plus text-white text-3xl opacity-0 group-hover:opacity-100 transition-all transform scale-50 group-hover:scale-100"></i>
                    </div>
                </div>
                <div class="p-5 flex-1 flex flex-col justify-between" style="min-height:0">
                    <div>
                        <div class="flex justify-between items-start mb-1">
                            <span class="bg-blue-50 text-blue-500 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border border-blue-100">#${e.id}</span>
                            <button class="text-slate-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100 z-10 relative" onclick="event.stopPropagation(); window.PageControllers.evidences.deleteEvidence(${e.id})"><i class="fas fa-trash-alt text-xs"></i></button>
                        </div>
                        <h4 class="font-extrabold text-blue-950 text-sm truncate uppercase tracking-tight" title="${e.title}">${e.title}</h4>
                    </div>
                    <div class="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between">
                        <span class="truncate pr-2"><i class="fas fa-user-md mr-1 text-blue-300"></i>${e.uploader}</span>
                        <span>${dateStr}</span>
                    </div>
                </div>
            </div>`;
        });
        grid.innerHTML = html;
    },

    deleteEvidence: function(id) {
        window.showConfirmModal(
            "Delete Evidence", 
            "Are you absolutely sure you want to permanently erase this evidence from the server?", 
            async () => {
                const res = await postForm('deleteEvidence', { id });
                if (res && res.success) {
                    window.PageControllers.evidences.fetchEvidences();
                } else {
                    alert("Failed to delete. Try again.");
                }
            }
        );
    },

    openUploader: function() {
        const modal = document.getElementById('custom-modal');
        const modalBox = document.getElementById('custom-modal-box');
        
        modal.classList.remove('hidden');
        setTimeout(() => {
            modalBox.classList.remove('scale-95', 'opacity-0');
            modalBox.classList.add('scale-100', 'opacity-100');
        }, 10);
        
        document.getElementById('modal-title').innerHTML = `<i class="fas fa-upload mr-2 text-blue-500"></i> Store Evidence`;
        document.getElementById('modal-desc').innerHTML = 'Archive clinical imagery or documentation to the secure server.';
        
        document.getElementById('modal-inputs').innerHTML = `
            <div class="space-y-4 relative z-50 mt-4">
                <div>
                    <label class="text-[10px] font-black uppercase text-blue-500 tracking-[0.1em] ml-2 mb-1 block">Evidence Title / Description</label>
                    <input type="text" id="new-evo-title" class="w-full bg-slate-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-950 font-bold focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all placeholder:text-slate-300" placeholder="e.g. X-Ray Scan CID 8829">
                </div>
                <div>
                    <label class="text-[10px] font-black uppercase text-blue-500 tracking-[0.1em] ml-2 mb-1 block">Image Link (URL)</label>
                    <input type="text" id="new-evo-url" class="w-full bg-slate-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-950 font-medium italic focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all placeholder:text-slate-300" placeholder="https://i.imgur.com/...">
                </div>
            </div>
        `;

        const confirmBtn = document.getElementById('modal-confirm-btn');
        confirmBtn.classList.remove('hidden');
        const newBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);
        newBtn.innerHTML = "Upload";

        newBtn.addEventListener('click', async () => {
            const title = document.getElementById('new-evo-title').value.trim();
            const url = document.getElementById('new-evo-url').value.trim();

            if (!title || !url) return;
            
            newBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Indexing`;
            newBtn.disabled = true;

            await postForm('saveEvidence', { title, url });
            
            window.closeModal();
            
            const freshBtn = newBtn.cloneNode(true);
            freshBtn.innerHTML = "Proceed";
            freshBtn.disabled = false;
            newBtn.parentNode.replaceChild(freshBtn, newBtn);
            freshBtn.addEventListener('click', window.closeModal);
            
            this.fetchEvidences();
        });
        
        const oldCancel = document.getElementById('modal-cancel-btn');
        const newCancel = oldCancel.cloneNode(true);
        oldCancel.parentNode.replaceChild(newCancel, oldCancel);
        newCancel.addEventListener('click', window.closeModal);
        
        const xBtn = document.querySelector('.close-modal-trigger');
        if (xBtn) {
            const newXBtn = xBtn.cloneNode(true);
            xBtn.parentNode.replaceChild(newXBtn, xBtn);
            newXBtn.addEventListener('click', window.closeModal);
        }
    }
};
