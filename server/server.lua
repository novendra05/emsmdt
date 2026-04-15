-- EMS MDT Server Logic - STABLE VERSION
-- Use MySQL.ready to ensure database connection before registering callbacks
MySQL.ready(function()
    print("^3[EMS-MDT]^7 Initializing Server Callbacks (MySQL Ready)...")
    
    
    -- Self-healing schema modifications for Medical Records V2
    pcall(function() MySQL.query.await("ALTER TABLE ems_medical_records ADD COLUMN medical_team LONGTEXT DEFAULT '[]'") end)
    pcall(function() MySQL.query.await("ALTER TABLE ems_medical_records ADD COLUMN patients LONGTEXT DEFAULT '[]'") end)
    pcall(function() MySQL.query.await("ALTER TABLE ems_medical_records ADD COLUMN attachments LONGTEXT DEFAULT '[]'") end)
    
    pcall(function() 
        MySQL.query.await([[
            CREATE TABLE IF NOT EXISTS `ems_evidences` (
                `id` int(11) NOT NULL AUTO_INCREMENT,
                `title` varchar(255) NOT NULL,
                `url` text NOT NULL,
                `uploader` varchar(100) NOT NULL,
                `date` timestamp NOT NULL DEFAULT current_timestamp(),
                PRIMARY KEY (`id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ]])
    end)
    pcall(function() 
        MySQL.query.await([[
            CREATE TABLE IF NOT EXISTS `ems_bulletins` (
                `id` int(11) NOT NULL AUTO_INCREMENT,
                `title` varchar(255) NOT NULL,
                `content` text NOT NULL,
                `author` varchar(100) NOT NULL,
                `date` timestamp NOT NULL DEFAULT current_timestamp(),
                PRIMARY KEY (`id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ]])
    end)

    local function hasEMSJob(source)
        local player = exports.qbx_core:GetPlayer(source)
        if player and player.PlayerData and player.PlayerData.job then
            local jobName = player.PlayerData.job.name
            local onDuty = player.PlayerData.job.onduty
            if onDuty == nil then onDuty = true end -- Fallback for frameworks not sync'ing duty to object

            if Config.EMSJobs[jobName] and onDuty then
                return true
            elseif Config.EMSJobs[jobName] and not onDuty then
                print("^1[EMS-MDT]^7 hasEMSJob: Rejection - Source " .. tostring(source) .. " is Off-Duty")
            else
                print("^1[EMS-MDT]^7 hasEMSJob: Job name '" .. tostring(jobName) .. "' not in Config.EMSJobs")
            end
        else
            print("^1[EMS-MDT]^7 hasEMSJob: Player data missing for source: " .. tostring(source))
        end
        return false
    end

    -- Callback to search for patients
    lib.callback.register('ems_mdt_searchCitizen', function(source, query)
        if not hasEMSJob(source) then return {} end
        
        local searchString = "%" .. query .. "%"
        print("^3[EMS-MDT]^7 Search Query: " .. searchString)

        local success, results = pcall(function()
            return MySQL.query.await([[
                SELECT DISTINCT p.citizenid, p.charinfo,
                       pg.`group` as job_group, pg.grade as job_grade
                FROM players p
                LEFT JOIN player_groups pg 
                    ON pg.citizenid COLLATE utf8mb4_unicode_ci = p.citizenid COLLATE utf8mb4_unicode_ci 
                    AND pg.type = 'job'
                WHERE (p.citizenid LIKE ? OR p.charinfo LIKE ?)
                LIMIT 15
            ]], {searchString, searchString})
        end)

        if not success then
            print("^1[EMS-MDT]^7 SQL Error during search: " .. tostring(results))
            return {}
        end

        print("^3[EMS-MDT]^7 DB returned " .. (results and #results or 0) .. " raw rows for query: " .. query)

        local formattedData = {}
        if results then
            for i=1, #results do
                local cid = results[i].citizenid
                local charinfo = nil
                if results[i].charinfo and results[i].charinfo ~= "" then
                    local decodeSuccess, decodeErr = pcall(function() charinfo = json.decode(results[i].charinfo) end)
                    if not decodeSuccess then
                        print("^1[EMS-MDT]^7 Failed to decode charinfo for CID: " .. tostring(cid) .. " Error: " .. tostring(decodeErr))
                    end
                end

                if charinfo then
                    table.insert(formattedData, {
                        citizenid = cid,
                        firstname = charinfo.firstname or "Unknown",
                        lastname = charinfo.lastname or "Unknown",
                        phone = charinfo.phone or "N/A",
                        dob = charinfo.birthdate or "N/A",
                        job = results[i].job_group or "Unemployed",
                        grade = results[i].job_grade or 0
                    })
                end
            end
        end
        print("^2[EMS-MDT]^7 Found "..#formattedData.." matches. Returning to client.")
        return formattedData
    end)

    -- Callback to fetch medical records
    lib.callback.register('ems_mdt_getMedicalRecords', function(source, citizenid)
        if not hasEMSJob(source) then return {} end
        
        local records = MySQL.query.await([[
            SELECT id, attending_medic, notes, diagnosis, treatment, date 
            FROM ems_medical_records 
            WHERE citizenid = ? 
            ORDER BY date DESC
        ]], {citizenid})
        
        local metadata = MySQL.single.await([[
            SELECT blood_type, allergies, conditions, notes 
            FROM ems_patient_metadata 
            WHERE citizenid = ?
        ]], {citizenid})
        
        if not metadata then
            metadata = { blood_type = 'Unknown', allergies = 'None documented', conditions = 'None', notes = '' }
        end

        return {
            records = records or {},
            metadata = metadata,
            notes = metadata.notes or ""
        }
    end)

    -- Callback to fetch all global medical records
    lib.callback.register('ems_mdt_getAllMedicalRecords', function(source)
        if not hasEMSJob(source) then return {} end
        
        local success, records = pcall(function()
            return MySQL.query.await([[
                SELECT id, citizenid, attending_medic, notes, diagnosis, treatment, date, medical_team, patients, attachments 
                FROM ems_medical_records
                ORDER BY date DESC
                LIMIT 100
            ]])
        end)
        
        local formattedRecords = {}
        if success and records then
            for i=1, #records do
                table.insert(formattedRecords, {
                    id = records[i].id,
                    citizenid = records[i].citizenid,
                    attending_medic = records[i].attending_medic,
                    notes = records[i].notes,
                    diagnosis = records[i].diagnosis,
                    treatment = records[i].treatment,
                    date = records[i].date,
                    medical_team = records[i].medical_team and json.decode(records[i].medical_team) or {},
                    patients = records[i].patients and json.decode(records[i].patients) or {},
                    attachments = records[i].attachments and json.decode(records[i].attachments) or {}
                })
            end
        end

        return formattedRecords
    end)

    -- Save Medical Record (V2)
    lib.callback.register('ems_mdt_saveMedicalRecord', function(source, data)
        if not hasEMSJob(source) then return {success = false} end
        local player = exports.qbx_core:GetPlayer(source)
        local primaryMedicName = player.PlayerData.charinfo.firstname .. ' ' .. player.PlayerData.charinfo.lastname
        
        -- To preserve legacy citizenid if first patient exists
        local primaryCitizenId = "VARIOUS"
        if data.patients and #data.patients > 0 then
            primaryCitizenId = data.patients[1].citizenid or "UNKNOWN"
        end
        
        local id = MySQL.insert.await([[
            INSERT INTO ems_medical_records 
            (citizenid, attending_medic, notes, diagnosis, treatment, medical_team, patients, attachments)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ]], {
            primaryCitizenId, 
            primaryMedicName, 
            data.notes or "", 
            data.diagnosis or "General Observation", 
            data.treatment or "",
            json.encode(data.medical_team or {}),
            json.encode(data.patients or {}),
            json.encode(data.attachments or {})
        })
        
        return {success = id ~= nil}
    end)

    -- Update Medical Record V2
    lib.callback.register('ems_mdt_updateMedicalRecord', function(source, data)
        if not hasEMSJob(source) then return {success = false} end
        
        local affected = MySQL.update.await([[
            UPDATE ems_medical_records 
            SET diagnosis = ?, treatment = ?, medical_team = ?, patients = ?, attachments = ?
            WHERE id = ?
        ]], {
            data.diagnosis, 
            data.treatment, 
            json.encode(data.medical_team or {}),
            json.encode(data.patients or {}),
            json.encode(data.attachments or {}),
            data.id
        })
        
        return {success = affected > 0}
    end)

    -- =================== EVIDENCES ===================
    lib.callback.register('ems_mdt_getAllEvidences', function(source)
        if not hasEMSJob(source) then return {} end
        return MySQL.query.await([[SELECT * FROM ems_evidences ORDER BY date DESC LIMIT 100]]) or {}
    end)

    lib.callback.register('ems_mdt_searchEvidence', function(source, query)
        if not hasEMSJob(source) then return {} end
        local likeQuery = '%' .. query .. '%'
        return MySQL.query.await([[SELECT * FROM ems_evidences WHERE id = ? OR title LIKE ? ORDER BY date DESC LIMIT 50]], {query, likeQuery}) or {}
    end)

    lib.callback.register('ems_mdt_saveEvidence', function(source, data)
        if not hasEMSJob(source) then return {success = false} end
        local player = exports.qbx_core:GetPlayer(source)
        local uploaderName = player.PlayerData.charinfo.firstname .. ' ' .. player.PlayerData.charinfo.lastname
        
        local id = MySQL.insert.await([[
            INSERT INTO ems_evidences (title, url, uploader) VALUES (?, ?, ?)
        ]], {data.title, data.url, uploaderName})
        return {success = id ~= nil}
    end)

    lib.callback.register('ems_mdt_deleteEvidence', function(source, evidenceId)
        if not hasEMSJob(source) then return {success = false} end
        local affected = MySQL.update.await('DELETE FROM ems_evidences WHERE id = ?', {evidenceId})
        return {success = affected > 0}
    end)

    -- =================== BULLETINS ===================
    lib.callback.register('ems_mdt_getAllBulletins', function(source)
        if not hasEMSJob(source) then return {} end
        return MySQL.query.await([[SELECT * FROM ems_bulletins ORDER BY date DESC LIMIT 50]]) or {}
    end)

    lib.callback.register('ems_mdt_saveBulletin', function(source, data)
        if not hasEMSJob(source) then return {success = false} end
        local player = exports.qbx_core:GetPlayer(source)
        local authorName = player.PlayerData.charinfo.firstname .. ' ' .. player.PlayerData.charinfo.lastname
        
        local id = MySQL.insert.await([[
            INSERT INTO ems_bulletins (title, content, author) VALUES (?, ?, ?)
        ]], {data.title, data.content, authorName})
        return {success = id ~= nil}
    end)

    lib.callback.register('ems_mdt_deleteBulletin', function(source, bulletinId)
        if not hasEMSJob(source) then return {success = false} end
        local player = exports.qbx_core:GetPlayer(source)
        if not player.PlayerData.job.isboss then return {success = false, msg = "Unauthorized"} end -- Optional admin check
        local affected = MySQL.update.await('DELETE FROM ems_bulletins WHERE id = ?', {bulletinId})
        return {success = affected > 0}
    end)

    -- Save Physician Notes
    lib.callback.register('ems_mdt_saveCitizenNote', function(source, citizenid, notes)
        if not hasEMSJob(source) then return {success = false} end
        local affectedRows = MySQL.update.await([[
            INSERT INTO ems_patient_metadata (citizenid, notes) 
            VALUES (?, ?) 
            ON DUPLICATE KEY UPDATE notes = ?
        ]], {citizenid, notes, notes})
        
        return {success = affectedRows > 0}
    end)

    -- ──────────────────────────────────────────────────────────────────────
    -- EMS STAFF MANAGEMENT (ROSTER)
    -- ──────────────────────────────────────────────────────────────────────

    local function canManageRoster(source)
        local player = exports.qbx_core:GetPlayer(source)
        if not player or not player.PlayerData or not player.PlayerData.job then return false end
        return player.PlayerData.job.grade.level >= (Config.Permissions.ManageRoster or 4)
    end

    lib.callback.register('ems_mdt_fetchRoster', function(source)
        if not hasEMSJob(source) then return {} end
        
        local jobNames = {}
        for jobName, _ in pairs(Config.EMSJobs) do
            table.insert(jobNames, "'" .. jobName .. "'")
        end
        local jobInClause = table.concat(jobNames, ", ")

        local success, results = pcall(function()
            local query = [[
                SELECT p.citizenid, p.charinfo,
                       pg.`group` as job_name, pg.grade as job_grade
                FROM players p
                INNER JOIN player_groups pg
                    ON pg.citizenid COLLATE utf8mb4_unicode_ci = p.citizenid COLLATE utf8mb4_unicode_ci
                    AND pg.type = 'job'
                WHERE pg.`group` IN (]] .. jobInClause .. [[)
            ]]
            return MySQL.query.await(query)
        end)

        if not success then
            print("^1[EMS-MDT]^7 SQL Error in fetchRoster: " .. tostring(results))
            return {}
        end
        
        local formattedData = {}
        local allJobs = exports.qbx_core:GetJobs() or {}
        local processedCids = {}
        
        if results then
            for i=1, #results do
                local cid = results[i].citizenid
                if cid and not processedCids[cid] then
                    processedCids[cid] = true
                    
                    local charinfo = nil
                    if results[i].charinfo and results[i].charinfo ~= "" then
                        pcall(function() charinfo = json.decode(results[i].charinfo) end)
                    end
                    
                    local player = exports.qbx_core:GetPlayerByCitizenId(cid)
                    local isOnline = (player ~= nil)
                    local onDuty = false
                    
                    if player and player.PlayerData then
                        onDuty = player.PlayerData.job.onduty
                        if onDuty == nil then onDuty = true end
                    end
                    
                    local jobName = results[i].job_name
                    local jobGrade = tonumber(results[i].job_grade) or 0
                    local gradeLabel = "Grade " .. jobGrade

                    if allJobs[jobName] and allJobs[jobName].grades and allJobs[jobName].grades[jobGrade] then
                        gradeLabel = allJobs[jobName].grades[jobGrade].name or gradeLabel
                    end
                    
                    table.insert(formattedData, {
                        citizenid = cid,
                        firstname = charinfo and charinfo.firstname or "Unknown",
                        lastname = charinfo and charinfo.lastname or "Medic",
                        phone = charinfo and charinfo.phone or "N/A",
                        job_name = jobName,
                        grade = jobGrade,
                        grade_label = gradeLabel,
                        is_online = isOnline,
                        on_duty = onDuty
                    })
                end
            end
        end

        return formattedData
    end)

    lib.callback.register('ems-mdt:server:getNearbyPlayersData', function(source, serverIds)
        local matchedPlayers = {}
        for _, id in ipairs(serverIds) do
            local p = exports.qbx_core:GetPlayer(id)
            if p then
                table.insert(matchedPlayers, {
                    serverid = id,
                    citizenid = p.PlayerData.citizenid,
                    name = p.PlayerData.charinfo.firstname .. ' ' .. p.PlayerData.charinfo.lastname
                })
            end
        end
        return matchedPlayers
    end)

    lib.callback.register('ems_mdt_getJobGrades', function(source)
        if not hasEMSJob(source) then return {} end
        local jobs = exports.qbx_core:GetJobs()
        local mainJob = jobs['ambulance'] or jobs['ems']
        if not mainJob or not mainJob.grades then return {} end
        
        local grades = {}
        for level, data in pairs(mainJob.grades) do
            table.insert(grades, {
                level = tonumber(level),
                label = data.name or ("Grade " .. level)
            })
        end
        
        table.sort(grades, function(a, b) return a.level < b.level end)
        return grades
    end)

    lib.callback.register('ems_mdt_hireStaff', function(source, data)
        if not canManageRoster(source) then return {success = false, msg = "Unauthorized"} end
        
        -- Default to 'ambulance' if no job specified, otherwise use first available
        local jobName = 'ambulance'
        for k, v in pairs(Config.EMSJobs) do jobName = k break end

        local success = exports.qbx_core:SetJob(data.citizenid, jobName, tonumber(data.grade))
        return {success = success}
    end)

    lib.callback.register('ems_mdt_updateStaffGrade', function(source, data)
        if not canManageRoster(source) then return {success = false, msg = "Unauthorized"} end
        
        local player = exports.qbx_core:GetPlayerByCitizenId(data.citizenid)
        local jobName = (player and player.PlayerData.job.name) or 'ambulance'
        
        local success = exports.qbx_core:SetJob(data.citizenid, jobName, tonumber(data.grade))
        return {success = success}
    end)

    lib.callback.register('ems_mdt_fireStaff', function(source, citizenid)
        if not canManageRoster(source) then return {success = false, msg = "Unauthorized"} end
        
        local success = exports.qbx_core:SetJob(citizenid, 'unemployed', 0)
        return {success = success}
    end)

    lib.callback.register('ems_mdt_getOverviewData', function(source)
        if not hasEMSJob(source) then 
            return { stats = { totalStaff = 0, activeMedics = 0, totalRecords = 0 }, recentRecords = {}, recentEvidences = {} } 
        end
        
        -- Get counts dynamically from Config
        local jobNames = {}
        for jobName, _ in pairs(Config.EMSJobs) do table.insert(jobNames, "'" .. jobName .. "'") end
        local jobInClause = table.concat(jobNames, ", ")

        print("^3[EMS-MDT]^7 Generating Overview Data for source " .. source)

        -- Total Personnel
        local totalStaff = 0
        local staffQuery = "SELECT COUNT(*) as count FROM player_groups WHERE type = 'job' AND `group` IN (" .. jobInClause .. ")"
        local staffRes = MySQL.query.await(staffQuery)
        if staffRes and staffRes[1] then totalStaff = staffRes[1].count or 0 end
        
        -- Total Records
        local totalRecords = 0
        local recordRes = MySQL.query.await("SELECT COUNT(*) as count FROM ems_medical_records")
        if recordRes and recordRes[1] then totalRecords = recordRes[1].count or 0 end
        
        -- Get active medics from positions table
        local activeMedicsCount = 0
        for src, _ in pairs(MedicPositions) do 
            activeMedicsCount = activeMedicsCount + 1 
        end

        -- Get recent records
        local recentRecords = MySQL.query.await([[
            SELECT diagnosis, attending_medic, date 
            FROM ems_medical_records 
            ORDER BY date DESC LIMIT 5
        ]]) or {}

        -- Get recent evidences
        local recentEvidences = MySQL.query.await([[
            SELECT title, uploader, date 
            FROM ems_evidences 
            ORDER BY date DESC LIMIT 5
        ]]) or {}

        print("^2[EMS-MDT]^7 Stats Found -> Staff: " .. totalStaff .. " | Active: " .. activeMedicsCount .. " | Records: " .. totalRecords)

        return {
            stats = {
                totalStaff = totalStaff,
                activeMedics = activeMedicsCount,
                totalRecords = totalRecords
            },
            recentRecords = recentRecords,
            recentEvidences = recentEvidences
        }
    end)

    print("^2[EMS-MDT]^7 All Server Callbacks Registered Successfully.")

    -- ──────────────────────────────────────────────────────────────────────
    -- EMS BLIPS / SYSTEM POSITION TRACKING (LSPD PATTERN)
    -- ──────────────────────────────────────────────────────────────────────

    local MedicPositions = {}

    RegisterNetEvent('ems-mdt:server:updateMedicPos')
    AddEventHandler('ems-mdt:server:updateMedicPos', function(data)
        local src = source
        local p = exports.qbx_core:GetPlayer(src)
        if not p or not p.PlayerData or not p.PlayerData.job then return end

        local onDuty = p.PlayerData.job.onduty
        if onDuty == nil then onDuty = true end

        if Config.EMSJobs[p.PlayerData.job.name] and onDuty and data.coords then
            MedicPositions[src] = {
                src = src,
                coords = data.coords,
                heading = data.heading,
                vehicle = data.vehicleType,
                job = p.PlayerData.job.name,
                callsign = p.PlayerData.metadata.callsign or "EMS",
                name = p.PlayerData.charinfo.firstname .. " " .. p.PlayerData.charinfo.lastname
            }
        else
            MedicPositions[src] = nil
        end
    end)

    -- Broadcast loop (Optimized LSPD Pattern)
    CreateThread(function()
        while true do
            local medicData = {}
            for src, data in pairs(MedicPositions) do
                medicData[#medicData + 1] = data
            end
            
            local players = exports.qbx_core:GetQBPlayers()
            for _, p in pairs(players) do
                if p.PlayerData and p.PlayerData.job and Config.EMSJobs[p.PlayerData.job.name] then
                    TriggerClientEvent('ems-mdt:client:updateMedicBlips', p.PlayerData.source, medicData)
                end
            end
            
            Wait(500)
        end
    end)

    -- Cleanup on drop
    AddEventHandler('playerDropped', function()
        local src = source
        if MedicPositions[src] then
            MedicPositions[src] = nil
        end
    end)

    -- Toggle Duty Logic
    local function ToggleDuty(src)
        local p = exports.qbx_core:GetPlayer(src)
        if p and p.PlayerData and p.PlayerData.job and Config.EMSJobs[p.PlayerData.job.name] then
            local currentDuty = p.PlayerData.job.onduty
            local newDuty = not currentDuty
            
            -- Use both core export and function fallback for maximum stability
            if exports.qbx_core.SetJobDuty then
                exports.qbx_core:SetJobDuty(src, newDuty)
            else
                p.Functions.SetJobDuty(newDuty)
            end
            
            if not newDuty then
                MedicPositions[src] = nil
            end
            
            local status = newDuty and "On Duty" or "Off Duty"
            local notifyType = newDuty and "success" or "error"
            TriggerClientEvent('ox_lib:notify', src, {
                title = 'EMS Duty',
                description = 'You are now ' .. status,
                type = notifyType
            })

            -- Trigger immediate client update to sync blips
            TriggerClientEvent('ems-mdt:client:forceUpdatePos', src)
        end
    end

    RegisterNetEvent('ems-mdt:server:toggleDuty', function()
        ToggleDuty(source)
    end)

    RegisterCommand('emsduty', function(source)
        ToggleDuty(source)
    end, false)
end)
