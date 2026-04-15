window.PageControllers.profiles = {
    init: function() {
        console.log("[MDT] Profiles Controller Initialized (Clinical Theme)");
        const searchBtn = document.getElementById('search-patient-btn');
        const searchInput = document.getElementById('search-patient-input');

        if (searchBtn && searchInput) {
            const newSearchBtn = searchBtn.cloneNode(true);
            searchBtn.parentNode.replaceChild(newSearchBtn, searchBtn);

            newSearchBtn.addEventListener('click', () => this.doSearch(searchInput.value.trim()));
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.doSearch(searchInput.value.trim());
            });
        }
    },

    doSearch: async function(query) {
        if (!query || query.length < 2) return;
        const resBox = document.getElementById('patient-results');

        resBox.innerHTML = `
            <div class="py-20 flex flex-col items-center text-blue-400">
                <i class="fas fa-circle-notch fa-spin text-5xl mb-6 opacity-30"></i>
                <p class="font-black tracking-[0.4em] text-[10px] uppercase animate-pulse italic">Scanning Biological Infrastructure...</p>
            </div>`;

        try {
            const res = await postForm('searchCitizen', { query });

            if (res && Array.isArray(res) && res.length > 0) {
                let rows = '';
                res.forEach(cit => {
                    rows += `
                    <div class="flex items-center bg-white hover:bg-blue-50/40 border border-blue-50/50 hover:border-blue-300 rounded-3xl px-6 py-5 transition-all group cursor-pointer mb-3 clinical-shadow shadow-blue-50/20"
                         onclick="window.PageControllers.profiles.viewFullDossier('${cit.citizenid}', '${cit.firstname} ${cit.lastname}')">
                        <div class="w-12 h-12 rounded-2xl bg-blue-600/10 border border-blue-100 flex items-center justify-center text-blue-600 font-extrabold text-lg mr-6 flex-shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                            ${cit.firstname.charAt(0)}${cit.lastname.charAt(0)}
                        </div>
                        <div class="flex-1 min-w-0 grid grid-cols-4 gap-4 items-center">
                            <div class="col-span-2">
                                <div class="text-blue-950 font-extrabold text-base tracking-tight truncate">${cit.firstname} ${cit.lastname}</div>
                                <div class="text-[10px] font-black font-mono text-blue-400 tracking-widest uppercase opacity-60">${cit.citizenid}</div>
                            </div>
                            <div class="text-[10px] text-slate-400 font-black uppercase tracking-tight"><i class="fas fa-briefcase mr-2 text-blue-200"></i>${cit.job || 'Unemployed'}</div>
                            <div class="text-xs text-slate-400 font-bold tracking-tight"><i class="fas fa-cake-candles mr-2 text-blue-200"></i>${cit.dob}</div>
                        </div>
                        <i class="fas fa-chevron-right ml-4 text-blue-100 group-hover:text-blue-500 group-hover:translate-x-1 transition-all"></i>
                    </div>`;
                });
                resBox.innerHTML = `<div class="overflow-y-auto max-h-[calc(100vh-380px)] pr-2 py-2">${rows}</div>`;
            } else {
                resBox.innerHTML = `
                    <div class="py-20 flex flex-col items-center text-slate-300 opacity-60 space-y-4">
                        <i class="fas fa-database text-7xl opacity-20"></i>
                        <p class="font-black tracking-[0.2em] text-[11px] uppercase italic">No Data Found</p>
                    </div>`;
            }
        } catch (err) {
            console.error("[MDT] Search Error:", err);
            resBox.innerHTML = `<div class="text-red-400 p-20 text-center font-black uppercase tracking-widest">Hardware Terminal Fault</div>`;
        }
    },

    viewFullDossier: async function(citizenid, name) {
        const modal = document.getElementById('custom-modal');
        const modalBox = document.getElementById('custom-modal-box');
        
        modal.classList.remove('hidden');
        setTimeout(() => {
            modalBox.classList.remove('scale-95', 'opacity-0');
            modalBox.classList.add('scale-100', 'opacity-100');
        }, 10);
        
        document.getElementById('modal-title').innerHTML = `<i class="fas fa-id-card-clip mr-2 text-blue-500"></i> Biological Dossier`;
        document.getElementById('modal-desc').innerHTML = `<div class="flex items-center text-blue-400 py-12 justify-center"><i class="fas fa-circle-notch fa-spin mr-3 text-2xl opacity-40"></i> Initializing scan for <span class="font-black ml-2">${name}</span>...</div>`;
        document.getElementById('modal-inputs').innerHTML = '';

        try {
            const data = await postForm('getPatientRecords', { citizenid });
            this.renderDossierContent(citizenid, name, data);
        } catch (e) {
            document.getElementById('modal-desc').innerHTML = `<div class="text-red-500 p-10 text-center uppercase font-black tracking-widest bg-red-50 rounded-2xl">Module Connection Timeout</div>`;
        }
    },

    renderDossierContent: function(citizenid, name, data) {
        const medicalHistory = data.records && data.records.length > 0 
            ? data.records.map(r => `
                <div class="bg-blue-50/30 border border-blue-100 rounded-2xl p-5 mb-4 group hover:bg-blue-50/50 transition-all">
                    <div class="flex justify-between items-start mb-3 text-[10px] text-blue-400 font-black uppercase tracking-widest">
                        <span class="bg-white px-2 py-0.5 rounded-lg border border-blue-50">Log #${r.id}</span>
                        <span class="opacity-60">${new Date(r.date).toLocaleDateString()}</span>
                    </div>
                    <div class="text-blue-900 font-black text-sm mb-2 uppercase tracking-wide flex items-center gap-2">
                        <i class="fas fa-stethoscope text-blue-400 text-xs"></i> ${r.diagnosis || 'General Observation'}
                    </div>
                    <div class="text-slate-500 text-xs font-medium leading-relaxed mb-4 bg-white/60 p-3 rounded-xl border border-blue-50 italic">
                        "${r.treatment || 'Treatment protocol not specified'}"
                    </div>
                    <div class="text-[9px] text-blue-600 font-black italic tracking-tight opacity-50 uppercase">Registered by: ${r.attending_medic}</div>
                </div>`).join('')
            : `<div class="text-slate-300 text-[10px] italic py-20 text-center uppercase font-black tracking-widest border-2 border-dashed border-blue-50 rounded-[2rem]">No Hospitalization History Found</div>`;

        const content = `
            <div class="grid grid-cols-3 gap-8" style="max-height: 70vh; overflow-y: auto; padding-right: 12px; margin-top: 10px;">
                <!-- Left: Biological Data -->
                <div class="col-span-1 space-y-6">
                    <div class="bg-blue-50/30 border border-blue-100 rounded-[2rem] p-8 flex flex-col items-center">
                        <div class="w-24 h-24 rounded-3xl bg-blue-600 shadow-xl shadow-blue-200 border-4 border-white flex items-center justify-center text-white font-black text-4xl mb-6 transform rotate-3">
                            ${name.split(' ').map(n=>n[0]).join('')}
                        </div>
                        <h3 class="text-blue-950 font-black text-2xl text-center leading-tight tracking-tight">${name}</h3>
                        <p class="text-blue-500 font-mono text-[10px] font-black tracking-[0.2em] uppercase mt-2 opacity-60 italic">${citizenid}</p>
                    </div>

                    <div class="bg-white border border-blue-100 rounded-[2rem] p-6 clinical-shadow space-y-4">
                        <div class="flex items-center gap-4 p-3 bg-blue-50/50 rounded-2xl border border-blue-50">
                            <div class="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-red-500 shadow-sm"><i class="fas fa-droplet px-1"></i></div>
                            <div>
                                <label class="text-[9px] text-blue-400 uppercase tracking-widest font-black block mb-0.5">Blood Group</label>
                                <span class="text-sm text-blue-950 font-black italic">${data.metadata?.blood_type || 'Scanning...'}</span>
                            </div>
                        </div>
                        <div class="flex items-center gap-4 p-3 bg-blue-50/50 rounded-2xl border border-blue-50">
                            <div class="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-orange-400 shadow-sm"><i class="fas fa-triangle-exclamation"></i></div>
                            <div>
                                <label class="text-[9px] text-blue-400 uppercase tracking-widest font-black block mb-0.5">Allergen Alert</label>
                                <span class="text-sm text-blue-950 font-black italic">${data.metadata?.allergies || 'Non-Toxic'}</span>
                            </div>
                        </div>
                    </div>

                    <div class="bg-white border border-blue-100 rounded-[2rem] p-6 clinical-shadow">
                        <div class="text-[10px] font-black uppercase text-blue-500 tracking-[0.2em] mb-4 flex items-center gap-2">
                            <i class="fas fa-signature text-blue-300"></i> Physician Remarks
                        </div>
                        <textarea id="patient-notes" class="w-full bg-slate-50 border border-blue-50 rounded-2xl px-4 py-3 text-xs text-slate-600 font-medium italic resize-none focus:outline-none focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all shadow-inner" rows="5" placeholder="Operational medical notes...">${data.notes || ''}</textarea>
                        <button onclick="window.PageControllers.profiles.saveNotes('${citizenid}')" class="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-black uppercase tracking-widest py-4 rounded-2xl transition-all shadow-lg shadow-blue-100">Update Remarks</button>
                    </div>
                </div>

                <!-- Right: Treatment Timeline -->
                <div class="col-span-2 space-y-6">
                    <div class="bg-white border border-blue-100 rounded-[2rem] p-8 clinical-shadow min-h-[500px]">
                        <div class="flex justify-between items-center mb-8 border-b border-blue-50 pb-6">
                            <div>
                                <div class="text-[11px] font-black uppercase text-blue-500 tracking-[0.2em] flex items-center gap-2">
                                    <i class="fas fa-timeline text-blue-300"></i> Medical History Timeline
                                </div>
                                <p class="text-[9px] text-slate-400 font-bold uppercase mt-1">Found ${data.records?.length || 0} Professional Engagements</p>
                            </div>
                        </div>
                        <div class="space-y-2">
                            ${medicalHistory}
                        </div>
                    </div>
                </div>
            </div>`;
        
        document.getElementById('modal-desc').innerHTML = content;
    },

    saveNotes: async function(citizenid) {
        const notes = document.getElementById('patient-notes').value;
        const res = await postForm('saveCitizenNote', { citizenid, notes });
        if (res && res.success) {
            console.log("[MDT] Notes synced with central biological server.");
        }
    },

    openNewRecordModal: async function(citizenid, name) {
        const diag = prompt("Clinical Diagnosis:");
        const treat = prompt("Protocol Administered:");
        if (diag && treat) {
            const res = await postForm('saveMedicalRecord', { citizenid, diagnosis: diag, treatment: treat });
            if (res && res.success) {
                this.viewFullDossier(citizenid, name);
            }
        }
    }
};
