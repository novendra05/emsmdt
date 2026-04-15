window.PageControllers.employees = {
    allEmployees: [],
    myGrade: 0,
    manageMinGrade: 4,

    init: function() {
        console.log("[MDT] Employees Controller Initialized (List Layout)");
        
        // Sync my data from session
        if (window.MDTData) {
            this.myGrade = window.MDTData.medicGrade;
            this.manageMinGrade = window.MDTData.manageGrade;
        }

        const searchInput = document.getElementById('search-roster-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.renderRoster(e.target.value.trim().toLowerCase());
            });
        }

        // Handle Hire button visibility
        const hireBtn = document.getElementById('hire-staff-btn');
        if (hireBtn) {
            if (this.myGrade >= this.manageMinGrade) {
                hireBtn.classList.remove('hidden');
            } else {
                hireBtn.classList.add('hidden');
            }
        }

        this.fetchRoster();
    },

    fetchRoster: async function() {
        try {
            const data = await postForm('ems_mdt_fetchRoster', {});
            this.allEmployees = data || [];
            this.renderRoster('');
        } catch (e) {
            console.error("[MDT] Error fetching roster", e);
        }
    },

    renderRoster: function(filter) {
        const list = document.getElementById('roster-list');
        if (!list) return;

        const filtered = this.allEmployees.filter(emp => {
            if (!filter) return true;
            const fullName = (emp.firstname + " " + emp.lastname).toLowerCase();
            return fullName.includes(filter) || emp.citizenid.toLowerCase().includes(filter);
        });

        // Update Stats
        document.getElementById('total-staff-count').innerText = this.allEmployees.length;
        document.getElementById('on-duty-count').innerText = this.allEmployees.filter(e => e.on_duty).length;

        if (filtered.length === 0) {
            list.innerHTML = `
            <div class="py-40 flex flex-col items-center text-blue-400/30">
                <i class="fas fa-users-slash text-6xl mb-6"></i>
                <p class="font-black tracking-[0.3em] text-[10px] uppercase italic">Filtered Result: Protocol Empty</p>
            </div>`;
            return;
        }

        list.innerHTML = filtered.map(emp => {
            const isOnline = emp.is_online;
            const onDuty = emp.on_duty;
            const isSelf = emp.citizenid === window.MDTData?.citizenid;
            const canManageThis = this.myGrade >= this.manageMinGrade && !isSelf;

            return `
            <div class="employee-row grid grid-cols-12 gap-4 items-center bg-white border border-blue-50/50 hover:border-blue-400 rounded-2xl px-10 py-5 transition-all clinical-shadow group">
                <!-- Status Column -->
                <div class="col-span-1 flex items-center">
                    <div class="w-3 h-3 rounded-full ${isOnline ? 'bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.6)]' : 'bg-slate-300'}" title="${isOnline ? 'Online' : 'Offline'}"></div>
                </div>

                <!-- Identity Column -->
                <div class="col-span-3 flex items-center gap-5">
                    <div class="w-11 h-11 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500 font-black text-sm group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                        ${emp.firstname[0]}${emp.lastname[0]}
                    </div>
                    <div>
                        <div class="text-blue-950 font-black text-sm tracking-tight flex items-center gap-2">
                            ${emp.firstname} ${emp.lastname}
                            ${isSelf ? '<span class="text-[8px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-md uppercase font-black tracking-widest border border-blue-200">You</span>' : ''}
                        </div>
                        <div class="text-[9px] text-blue-400 font-mono font-black uppercase tracking-widest opacity-60">${emp.citizenid}</div>
                    </div>
                </div>

                <!-- Contact Column -->
                <div class="col-span-2">
                    <div class="flex items-center gap-2 text-slate-500 group-hover:text-blue-600 transition-colors">
                        <i class="fas fa-phone-alt text-[10px] opacity-40"></i>
                        <span class="text-xs font-bold">${emp.phone || 'N/A'}</span>
                    </div>
                </div>

                <!-- Rank Column -->
                <div class="col-span-2 text-center">
                     <div class="text-xs font-extrabold text-blue-900">${emp.grade_label}</div>
                     <span class="text-[8px] font-black text-blue-400 uppercase bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">Level ${emp.grade}</span>
                </div>

                <!-- Network State Column -->
                <div class="col-span-2 text-center">
                    <span class="px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${onDuty ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-slate-50 text-slate-400 border border-slate-100'}">
                        ${onDuty ? 'On Duty' : 'Radio Silent'}
                    </span>
                </div>

                <!-- Operations Column -->
                <div class="col-span-2 text-right flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all">
                    ${canManageThis ? `
                        <button onclick="window.PageControllers.employees.manageGrade('${emp.citizenid}', '${emp.firstname} ${emp.lastname}', ${emp.grade})" 
                                class="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center shadow-sm border border-blue-100" title="Adjust Rank">
                            <i class="fas fa-user-pen text-xs"></i>
                        </button>
                        <button onclick="window.PageControllers.employees.fireStaff('${emp.citizenid}', '${emp.firstname} ${emp.lastname}')" 
                                class="w-10 h-10 rounded-xl bg-red-50 text-red-400 hover:bg-red-600 hover:text-white transition-all flex items-center justify-center shadow-sm border border-red-100" title="Terminate">
                            <i class="fas fa-user-xmark text-xs"></i>
                        </button>
                    ` : '<div class="text-[10px] text-slate-300 font-black uppercase tracking-widest py-2 pr-4 italic">Locked</div>'}
                </div>
            </div>`;
        }).join('');
    },

    openHireModal: async function() {
        const modal = document.getElementById('custom-modal');
        const modalBox = document.getElementById('custom-modal-box');
        
        modal.classList.remove('hidden');
        setTimeout(() => {
            modalBox.classList.remove('scale-95', 'opacity-0');
            modalBox.classList.add('scale-100', 'opacity-100');
        }, 10);
        
        document.getElementById('modal-title').innerHTML = `<i class="fas fa-user-plus mr-2 text-blue-500"></i> Recruitment Radar`;
        document.getElementById('modal-desc').innerHTML = `<div class="flex items-center text-blue-400 py-12 justify-center"><i class="fas fa-radar fa-spin mr-3 text-2xl opacity-40"></i> Scanning local frequency for unregistered personnel...</div>`;
        document.getElementById('modal-inputs').innerHTML = '';
        document.getElementById('modal-confirm-btn').classList.add('hidden');

        try {
            const nearby = await postForm('fetchNearbyPlayers', {});
            
            if (nearby && nearby.length > 0) {
                let html = `<p class="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mb-4 ml-2">Detected Bio-Signals (${nearby.length})</p><div class="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">`;
                nearby.forEach(p => {
                    html += `
                    <div class="flex justify-between items-center bg-blue-50/30 border border-blue-100 rounded-2xl p-4 hover:border-blue-400 transition-all cursor-pointer group"
                         onclick="window.PageControllers.employees.selectHireRank('${p.citizenid}', '${p.name}')">
                        <div>
                            <div class="text-blue-950 font-black text-sm">${p.name}</div>
                            <div class="text-[10px] text-blue-400 font-mono font-black uppercase tracking-widest opacity-60">${p.citizenid}</div>
                        </div>
                        <div class="text-[10px] font-black text-blue-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all flex items-center gap-2">
                            Initialize Bio-Link <i class="fas fa-chevron-right text-[8px]"></i>
                        </div>
                    </div>`;
                });
                html += `</div>`;
                document.getElementById('modal-desc').innerHTML = html;
            } else {
                document.getElementById('modal-desc').innerHTML = `
                <div class="py-12 flex flex-col items-center text-slate-300 opacity-60 space-y-4">
                    <i class="fas fa-person-circle-exclamation text-5xl opacity-20"></i>
                    <p class="font-black tracking-[0.2em] text-[10px] uppercase italic">No Unregistered Biosignatures Nearby</p>
                </div>`;
            }
        } catch (e) {
            document.getElementById('modal-desc').innerHTML = `<div class="text-red-500 p-10 text-center uppercase font-black tracking-widest">Local Link Radar Failure</div>`;
        }
    },

    selectHireRank: async function(citizenid, name) {
        document.getElementById('modal-title').innerHTML = `<i class="fas fa-id-badge mr-2 text-blue-500"></i> Commission for ${name}`;
        
        try {
            const grades = await postForm('ems_mdt_getJobGrades', {});
            let options = grades.map(g => `<option value="${g.level}">${g.label} (Level ${g.level})</option>`).join('');
            
            document.getElementById('modal-desc').innerHTML = `Assign a starting personnel hierarchy level for the new medical commission.`;
            document.getElementById('modal-inputs').innerHTML = `
                <div class="mt-4">
                    <select id="hire-grade-select" class="w-full bg-slate-50 border border-blue-100 rounded-xl px-4 py-4 text-sm text-blue-950 font-bold focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all">
                        ${options}
                    </select>
                </div>
            `;

            const confirmBtn = document.getElementById('modal-confirm-btn');
            confirmBtn.classList.remove('hidden');
            const newBtn = confirmBtn.cloneNode(true);
            confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);
            newBtn.innerHTML = "Confirm Bio-Link";

            newBtn.addEventListener('click', async () => {
                const grade = document.getElementById('hire-grade-select').value;
                newBtn.disabled = true;
                newBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Commissioning...`;
                
                const res = await postForm('ems_mdt_hireStaff', { citizenid, grade });
                window.closeModal();
                if (res && res.success) {
                    this.fetchRoster();
                } else {
                    alert("Bio-Link initialization protocol failed.");
                }
            });
        } catch (e) {
            alert("Protocol Communication Failure.");
        }
    },

    manageGrade: async function(citizenid, name, currentGrade) {
        const modal = document.getElementById('custom-modal');
        const modalBox = document.getElementById('custom-modal-box');
        
        modal.classList.remove('hidden');
        setTimeout(() => {
            modalBox.classList.remove('scale-95', 'opacity-0');
            modalBox.classList.add('scale-100', 'opacity-100');
        }, 10);

        document.getElementById('modal-title').innerHTML = `<i class="fas fa-award mr-2 text-blue-500"></i> Adjust Biological Rank`;
        document.getElementById('modal-desc').innerHTML = `Modifying hospital hierarchy authorization for: <span class="font-black text-blue-600">${name}</span>`;
        
        try {
            const grades = await postForm('ems_mdt_getJobGrades', {});
            let options = grades.map(g => `<option value="${g.level}" ${g.level == currentGrade ? 'selected' : ''}>${g.label} (Level ${g.level})</option>`).join('');
            
            document.getElementById('modal-inputs').innerHTML = `
                <div class="mt-4">
                    <select id="update-grade-select" class="w-full bg-slate-50 border border-blue-100 rounded-xl px-4 py-4 text-sm text-blue-950 font-bold focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all">
                        ${options}
                    </select>
                </div>
            `;

            const confirmBtn = document.getElementById('modal-confirm-btn');
            confirmBtn.classList.remove('hidden');
            const newBtn = confirmBtn.cloneNode(true);
            confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);
            newBtn.innerHTML = "Sync Status";

            newBtn.addEventListener('click', async () => {
                const grade = document.getElementById('update-grade-select').value;
                newBtn.disabled = true;
                newBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Syncing Hierarchy...`;
                
                const res = await postForm('ems_mdt_updateStaffGrade', { citizenid, grade });
                window.closeModal();
                if (res && res.success) {
                    this.fetchRoster();
                }
            });
        } catch (e) {
            alert("Central Protocol Error.");
        }
    },

    fireStaff: function(citizenid, name) {
        window.showConfirmModal(
            "Terminate Biological Link", 
            `Confirm permanent revocation of hospital authorization and biometric access for <span class="text-red-600 font-black">${name}</span>?`, 
            async () => {
                const res = await postForm('ems_mdt_fireStaff', { citizenid });
                if (res && res.success) {
                    this.fetchRoster();
                }
            }
        );
    }
};
