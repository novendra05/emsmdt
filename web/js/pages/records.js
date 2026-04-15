window.PageControllers.records = {
    allRecords: [],
    
    // Editor State
    isEditing: false,
    currentMedics: [],
    currentPatients: [],
    currentAttachments: [],
    searchDebounce: null,

    init: function() {
        console.log("[MDT] Records Controller Initialized (V2)");
        this.fetchRecords();

        const searchInput = document.getElementById('search-record-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.renderRecordsList(e.target.value.trim().toLowerCase());
            });
        }
        
        this.setupAutocomplete('medic-v2-search-input', 'medic-v2-suggestions', 'medic');
        this.setupAutocomplete('patient-v2-search-input', 'patient-v2-suggestions', 'patient');
        this.setupEvidenceAutocomplete('attachment-v2-search-input', 'attachment-v2-suggestions');
    },

    setupEvidenceAutocomplete: function(inputId, suggestId) {
        const input = document.getElementById(inputId);
        const suggest = document.getElementById(suggestId);
        if (!input || !suggest) return;

        input.addEventListener('input', (e) => {
            clearTimeout(this.searchDebounce);
            const val = e.target.value.trim();
            if (val.length < 1) {
                suggest.classList.add('hidden');
                return;
            }
            this.searchDebounce = setTimeout(async () => {
                const res = await postForm('searchEvidence', { query: val });
                if (res && res.length > 0) {
                    let html = '';
                    res.forEach(c => {
                        html += `
                        <div class="px-4 py-3 hover:bg-purple-50 cursor-pointer border-b border-purple-50 last:border-0 transition"
                             onclick="window.PageControllers.records.addAttachment(${c.id}, '${c.title.replace(/'/g, "\\'")}', '${c.url.replace(/'/g, "\\'")}')">
                            <div class="text-xs font-bold text-purple-900">${c.title} <span class="text-[9px] text-purple-400 font-black uppercase tracking-widest ml-2">#${c.id}</span></div>
                            <div class="text-[10px] text-slate-400 font-semibold uppercase tracking-widest mt-0.5">By ${c.uploader}</div>
                        </div>`;
                    });
                    suggest.innerHTML = html;
                    suggest.classList.remove('hidden');
                } else {
                    suggest.innerHTML = `<div class="px-4 py-3 text-xs text-slate-400 italic">No evidence found.</div>`;
                    suggest.classList.remove('hidden');
                }
            }, 300);
        });

        document.addEventListener('click', (e) => {
            if (!input.contains(e.target) && !suggest.contains(e.target)) {
                suggest.classList.add('hidden');
            }
        });
    },

    setupAutocomplete: function(inputId, suggestId, type) {
        const input = document.getElementById(inputId);
        const suggest = document.getElementById(suggestId);
        if (!input || !suggest) return;

        input.addEventListener('input', (e) => {
            clearTimeout(this.searchDebounce);
            const val = e.target.value.trim();
            if (val.length < 2) {
                suggest.classList.add('hidden');
                return;
            }
            this.searchDebounce = setTimeout(async () => {
                const res = await postForm('searchCitizen', { query: val });
                if (res && res.length > 0) {
                    let html = '';
                    res.forEach(c => {
                        html += `
                        <div class="px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-blue-50 last:border-0 transition"
                             onclick="window.PageControllers.records.addEntity('${type}', '${c.citizenid}', '${c.firstname} ${c.lastname}', '${c.job}')">
                            <div class="text-xs font-bold text-blue-900">${c.firstname} ${c.lastname} <span class="text-[9px] text-blue-400 font-black uppercase tracking-widest ml-2">${c.citizenid}</span></div>
                            <div class="text-[10px] text-slate-400 font-semibold uppercase tracking-widest mt-0.5">${c.job || 'Unemployed'}</div>
                        </div>`;
                    });
                    suggest.innerHTML = html;
                    suggest.classList.remove('hidden');
                } else {
                    suggest.innerHTML = `<div class="px-4 py-3 text-xs text-slate-400 italic">No matches found.</div>`;
                    suggest.classList.remove('hidden');
                }
            }, 300);
        });

        // Hide on click outside
        document.addEventListener('click', (e) => {
            if (!input.contains(e.target) && !suggest.contains(e.target)) {
                suggest.classList.add('hidden');
            }
        });
    },

    addEntity: function(type, citizenid, name, desc) {
        document.getElementById(`${type}-v2-suggestions`).classList.add('hidden');
        document.getElementById(`${type}-v2-search-input`).value = '';

        if (type === 'medic') {
            if (!this.currentMedics.find(m => m.citizenid === citizenid)) {
                this.currentMedics.push({ citizenid, name, job: desc });
                this.renderMedicsList();
            }
        } else if (type === 'patient') {
            if (!this.currentPatients.find(p => p.citizenid === citizenid)) {
                this.currentPatients.push({ citizenid, name });
                this.renderPatientsList();
            }
        }
    },

    removeEntity: function(type, citizenid) {
        if (!this.isEditing) return;
        if (type === 'medic') {
            this.currentMedics = this.currentMedics.filter(m => m.citizenid !== citizenid);
            this.renderMedicsList();
        } else if (type === 'patient') {
            this.currentPatients = this.currentPatients.filter(p => p.citizenid !== citizenid);
            this.renderPatientsList();
        }
    },

    renderMedicsList: function() {
        const list = document.getElementById('record-v2-medics-list');
        list.innerHTML = this.currentMedics.map(m => `
            <li class="flex justify-between items-center bg-slate-50 border border-blue-50 rounded-xl px-4 py-2.5 shadow-sm">
                <div>
                    <div class="text-xs font-bold text-blue-900">${m.name}</div>
                    <div class="text-[9px] text-blue-400 font-black uppercase tracking-widest">${m.citizenid}</div>
                </div>
                ${this.isEditing ? `<button class="text-red-400 hover:text-red-600 transition" onclick="window.PageControllers.records.removeEntity('medic', '${m.citizenid}')"><i class="fas fa-trash-alt"></i></button>` : ''}
            </li>
        `).join('');
    },

    renderPatientsList: function() {
        const list = document.getElementById('record-v2-patients-list');
        list.innerHTML = this.currentPatients.map(p => `
            <li class="flex justify-between items-center bg-slate-50 border border-blue-50 rounded-xl px-4 py-2.5 shadow-sm">
                <div>
                    <div class="text-xs font-bold text-blue-900">${p.name}</div>
                    <div class="text-[9px] text-blue-400 font-black uppercase tracking-widest">${p.citizenid}</div>
                </div>
                ${this.isEditing ? `<button class="text-red-400 hover:text-red-600 transition" onclick="window.PageControllers.records.removeEntity('patient', '${p.citizenid}')"><i class="fas fa-trash-alt"></i></button>` : ''}
            </li>
        `).join('');
    },

    addAttachment: function(id, title, url) {
        document.getElementById('attachment-v2-suggestions').classList.add('hidden');
        document.getElementById('attachment-v2-search-input').value = '';

        if (!this.currentAttachments.find(a => a.id === id)) {
            this.currentAttachments.push({ id, title, url });
            this.renderAttachmentsList();
        }
    },

    removeAttachment: function(index) {
        if (!this.isEditing) return;
        this.currentAttachments.splice(index, 1);
        this.renderAttachmentsList();
    },

    renderAttachmentsList: function() {
        const list = document.getElementById('record-v2-attachments-list');
        list.innerHTML = this.currentAttachments.map((item, i) => {
            const url = typeof item === 'object' ? item.url : item;
            const title = typeof item === 'object' ? item.title : `Attachment ${i+1}`;
            return `
            <li class="flex justify-between items-center bg-slate-50 border border-purple-100 rounded-xl px-4 py-2.5 shadow-sm group">
                <button type="button" onclick="window.previewImage('${url}', '${title}')" class="text-[10px] font-bold text-purple-600 truncate underline max-w-[200px] hover:text-purple-800 flex items-center"><i class="fas fa-search-plus mr-2"></i> ${title}</button>
                ${this.isEditing ? `<button class="text-red-400 hover:text-red-600 transition" onclick="window.PageControllers.records.removeAttachment(${i})"><i class="fas fa-trash-alt"></i></button>` : `<button onclick="window.previewImage('${url}', '${title}')" class="text-purple-400 hover:text-purple-700"><i class="fas fa-eye"></i></button>`}
            </li>`;
        }).join('');
    },

    fetchRecords: async function() {
        try {
            const data = await postForm('getAllMedicalRecords', {});
            this.allRecords = data || [];
            this.renderRecordsList('');
        } catch (e) {
            console.error("[MDT] Error fetching records:", e);
        }
    },

    renderRecordsList: function(filterText) {
        const list = document.getElementById('records-list');
        if (!list) return;

        const filtered = this.allRecords.filter(r => {
            if (!filterText) return true;
            // Handle array structures safely
            let patientsStr = "";
            if (r.patients && r.patients.length > 0) {
                patientsStr = r.patients.map(p => p.name).join(" ").toLowerCase();
            } else {
                patientsStr = (r.patientName || "").toLowerCase();
            }

            return (
                patientsStr.includes(filterText) ||
                (r.attending_medic || "").toLowerCase().includes(filterText) ||
                (r.diagnosis || "").toLowerCase().includes(filterText)
            );
        });

        if (filtered.length === 0) {
            list.innerHTML = `
                <div class="py-20 flex flex-col items-center text-slate-300 opacity-60 space-y-4">
                    <i class="fas fa-database text-7xl opacity-20"></i>
                    <p class="font-black tracking-[0.2em] text-[11px] uppercase italic">No Data Found</p>
                </div>`;
            return;
        }

        let html = '';
        filtered.forEach(r => {
            const dateStr = new Date(r.date).toLocaleString([], { year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
            
            let displayPatient = r.patientName || "Unknown Citizen";
            if (r.patients && r.patients.length > 0) {
                displayPatient = r.patients[0].name;
                if (r.patients.length > 1) displayPatient += ` (+${r.patients.length - 1} more)`;
            }

            let displayCid = r.citizenid || "UNK";
            if (r.patients && r.patients.length > 0) displayCid = r.patients[0].citizenid;

            html += `
            <div class="grid grid-cols-4 gap-4 items-center bg-white hover:bg-blue-50/40 border border-blue-50/50 hover:border-blue-300 rounded-3xl px-6 py-5 mb-3 transition-all group cursor-pointer clinical-shadow shadow-blue-50/20"
                 onclick="window.PageControllers.records.viewRecordDetails(${r.id})">
                <div class="col-span-1 text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <i class="fas fa-clock text-blue-200"></i> ${dateStr}
                </div>
                <div class="col-span-1 text-sm font-extrabold text-blue-950 flex flex-col justify-center">
                    ${displayPatient}
                    <span class="text-[9px] text-blue-400 font-mono tracking-widest uppercase opacity-60">${displayCid}</span>
                </div>
                <div class="col-span-1 text-xs font-bold text-slate-500 uppercase tracking-tight flex items-center gap-2 truncate pr-2">
                    <i class="fas fa-user-md text-blue-300"></i> ${r.attending_medic}
                </div>
                <div class="col-span-1 text-sm font-black text-blue-600 uppercase tracking-tight truncate flex items-center justify-between">
                    <div class="truncate pr-4">
                        <i class="fas fa-stethoscope text-blue-300 mr-1 text-xs"></i> ${r.diagnosis || 'General Checkup'}
                    </div>
                    <i class="fas fa-chevron-right text-blue-100 group-hover:text-blue-500 group-hover:translate-x-1 transition-all"></i>
                </div>
            </div>`;
        });

        list.innerHTML = html;
    },

    openEditor: function() {
        this.isEditing = true;
        this.currentMedics = [];
        this.currentPatients = [];
        this.currentAttachments = [];
        
        document.getElementById('record-v2-id-display').innerText = "#NEW";
        document.getElementById('record-v2-title').value = "";
        document.getElementById('record-v2-treatment').value = "";
        
        document.getElementById('record-v2-title').readOnly = false;
        document.getElementById('record-v2-treatment').readOnly = false;
        
        document.getElementById('medic-v2-search-input').classList.remove('hidden');
        document.getElementById('patient-v2-search-input').classList.remove('hidden');
        document.getElementById('attachment-v2-search-input').classList.remove('hidden');
        
        document.getElementById('save-record-v2-btn').classList.remove('hidden');
        const saveBtn = document.getElementById('save-record-v2-btn');
        saveBtn.innerHTML = `<i class="fas fa-save"></i> Commit Record`;
        saveBtn.onclick = () => this.saveRecord();

        this.renderMedicsList();
        this.renderPatientsList();
        this.renderAttachmentsList();

        document.getElementById('records-v2-editor-view').classList.remove('hidden');
    },

    closeEditor: function() {
        document.getElementById('records-v2-editor-view').classList.add('hidden');
    },

    saveRecord: async function() {
        const title = document.getElementById('record-v2-title').value.trim();
        const treatment = document.getElementById('record-v2-treatment').value.trim();
        const btn = document.getElementById('save-record-v2-btn');

        if (!title || !treatment) {
            alert("Title and Treatment fields are required.");
            return;
        }

        btn.disabled = true;
        btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Saving...`;

        const payload = {
            diagnosis: title,
            treatment: treatment,
            notes: "Logged via Advanced System",
            medical_team: this.currentMedics,
            patients: this.currentPatients,
            attachments: this.currentAttachments
        };

        const res = await postForm('saveMedicalRecord', payload);
        btn.disabled = false;
        btn.innerHTML = `<i class="fas fa-save"></i> Commit Record`;

        if (res && res.success) {
            this.closeEditor();
            this.fetchRecords();
        } else {
            alert("Failed to save report.");
        }
    },

    updateRecord: async function(id) {
        const title = document.getElementById('record-v2-title').value.trim();
        const treatment = document.getElementById('record-v2-treatment').value.trim();
        const btn = document.getElementById('save-record-v2-btn');

        if (!title || !treatment) return;

        btn.disabled = true;
        btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Updating...`;

        const payload = {
            id: id,
            diagnosis: title,
            treatment: treatment,
            medical_team: this.currentMedics,
            patients: this.currentPatients,
            attachments: this.currentAttachments
        };

        const res = await postForm('updateMedicalRecord', payload);
        btn.disabled = false;
        btn.innerHTML = `<i class="fas fa-save"></i> Save Changes`;

        if (res && res.success) {
            this.closeEditor();
            this.fetchRecords();
        } else {
            alert("Failed to update report.");
        }
    },

    enableEditMode: function(id) {
        this.isEditing = true;
        document.getElementById('record-v2-title').readOnly = false;
        document.getElementById('record-v2-treatment').readOnly = false;

        document.getElementById('medic-v2-search-input').classList.remove('hidden');
        document.getElementById('patient-v2-search-input').classList.remove('hidden');
        document.getElementById('attachment-v2-search-input').classList.remove('hidden');
        
        const saveBtn = document.getElementById('save-record-v2-btn');
        saveBtn.classList.remove('hidden');
        saveBtn.innerHTML = `<i class="fas fa-save"></i> Save Changes`;
        saveBtn.onclick = () => this.updateRecord(id);
        
        document.getElementById('edit-record-v2-btn')?.classList.add('hidden');

        this.renderMedicsList();
        this.renderPatientsList();
        this.renderAttachmentsList();
    },

    viewRecordDetails: function(id) {
        const record = this.allRecords.find(r => r.id === id);
        if (!record) return;

        this.isEditing = false;
        this.currentMedics = record.medical_team && record.medical_team.length ? record.medical_team : [{name: record.attending_medic, citizenid: "UNK"}];
        this.currentPatients = record.patients && record.patients.length ? record.patients : [{name: record.patientName, citizenid: record.citizenid}];
        this.currentAttachments = record.attachments && record.attachments.length ? record.attachments : [];

        document.getElementById('record-v2-id-display').innerText = "#" + record.id;
        document.getElementById('record-v2-title').value = record.diagnosis || "";
        document.getElementById('record-v2-treatment').value = record.treatment || "";
        
        document.getElementById('record-v2-title').readOnly = true;
        document.getElementById('record-v2-treatment').readOnly = true;

        document.getElementById('medic-v2-search-input').classList.add('hidden');
        document.getElementById('patient-v2-search-input').classList.add('hidden');
        document.getElementById('attachment-v2-search-input').classList.add('hidden');
        
        document.getElementById('save-record-v2-btn').classList.add('hidden');
        
        let editBtn = document.getElementById('edit-record-v2-btn');
        if (!editBtn) {
            editBtn = document.createElement('button');
            editBtn.id = 'edit-record-v2-btn';
            editBtn.className = 'bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition shadow-lg flex items-center gap-2 active:scale-95 ml-3';
            editBtn.innerHTML = `<i class="fas fa-pen"></i> Edit Record`;
            document.getElementById('save-record-v2-btn').parentNode.appendChild(editBtn);
        }
        editBtn.classList.remove('hidden');
        editBtn.onclick = () => this.enableEditMode(id);

        this.renderMedicsList();
        this.renderPatientsList();
        this.renderAttachmentsList();

        document.getElementById('records-v2-editor-view').classList.remove('hidden');
    }
};
