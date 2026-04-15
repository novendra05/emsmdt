local isMDTOpen = false
local tabletObject = nil
local PlayerData = {}

-- Initial PlayerData fetch
local function FetchPlayerData()
    local data = exports.qbx_core:GetPlayerData()
    if data and data.job then
        PlayerData = data
    end
end

CreateThread(function()
    while not exports.qbx_core:GetPlayerData() or not exports.qbx_core:GetPlayerData().job do 
        Wait(500) 
    end
    FetchPlayerData()
end)

-- State updating events (Supporting both QBX and QBCore naming for compatibility)
local function OnPlayerLoaded()
    FetchPlayerData()
end

RegisterNetEvent('qbx_core:client:onPlayerLoaded', OnPlayerLoaded)
RegisterNetEvent('QBCore:Client:OnPlayerLoaded', OnPlayerLoaded)

local function OnJobUpdate(job)
    if not PlayerData then PlayerData = {} end
    PlayerData.job = job
    TriggerEvent('ems-mdt:client:forceUpdatePos')
end

RegisterNetEvent('qbx_core:client:onJobUpdate', function(_, job) OnJobUpdate(job) end)
RegisterNetEvent('QBCore:Client:OnJobUpdate', OnJobUpdate)

RegisterNetEvent('QBCore:Client:SetDuty', function(onDuty)
    if PlayerData and PlayerData.job then
        PlayerData.job.onduty = onDuty
    end
end)

-- Open MDT Event/Function
RegisterNetEvent('ems-mdt:client:openMDT', function()
    -- Just-in-time refresh if data is missing
    if not PlayerData or not PlayerData.job then
        FetchPlayerData()
    end

    if not PlayerData or not PlayerData.job then
        lib.notify({ title = 'Error', description = 'Player data not loaded yet. Try again in a moment.', type = 'error' })
        return
    end
    
    if not Config.EMSJobs[PlayerData.job.name] then
        lib.notify({ title = 'Access Denied', description = 'You are not authorized.', type = 'error' })
        return
    end

    if PlayerData.job.onduty == false then
        lib.notify({ title = 'Operation Restricted', description = 'You must be On-Duty to access the MDT Network.', type = 'error' })
        return
    end

    if not isMDTOpen then
        isMDTOpen = true
        SetNuiFocus(true, true)
        print("^3[EMS-MDT]^7 Opening UI...")

        local firstName = (PlayerData.charinfo and PlayerData.charinfo.firstname) or "Unknown"
        local lastName = (PlayerData.charinfo and PlayerData.charinfo.lastname) or "Medic"
        local rankName = (PlayerData.job.grade and PlayerData.job.grade.name) or "Staff"

        SendNUIMessage({
            type = "open_mdt",
            medicName = firstName .. ' ' .. lastName,
            medicRank = rankName,
            medicGrade = (PlayerData.job and PlayerData.job.grade and PlayerData.job.grade.level) or 0,
            citizenid = PlayerData.citizenid,
            manageGrade = Config.Permissions.ManageRoster or 4
        })

        if Config.Animation then
            CreateThread(function()
                local animDict = "amb@code_human_in_bus_passenger_idles@female@tablet@idle_a"
                local tabletPropModel = `prop_cs_tablet`
                
                if lib.requestAnimDict(animDict) and lib.requestModel(tabletPropModel) then
                    local ped = cache.ped
                    if not isMDTOpen then return end
                    
                    tabletObject = CreateObject(tabletPropModel, GetEntityCoords(ped), true, true, true)
                    AttachEntityToEntity(tabletObject, ped, GetPedBoneIndex(ped, 28422), -0.05, 0.0, 0.0, 0.0, -90.0, 0.0, true, true, false, true, 1, true)
                    TaskPlayAnim(ped, animDict, "idle_a", 3.0, 3.0, -1, 49, 0, false, false, false)
                end
            end)
        end
    end
end)

RegisterCommand(Config.Command, function()
    TriggerEvent('ems-mdt:client:openMDT')
end, false)

RegisterNUICallback('closeUI', function(data, cb)
    isMDTOpen = false
    SetNuiFocus(false, false)
    print("^3[EMS-MDT]^7 Closing UI...")
    ClearPedTasks(cache.ped)
    if tabletObject and DoesEntityExist(tabletObject) then
        DeleteEntity(tabletObject)
        tabletObject = nil
    end
    cb('ok')
end)

RegisterNUICallback('fetchNearbyPlayers', function(data, cb)
    local players = GetActivePlayers()
    local myPed = cache.ped
    local myCoords = GetEntityCoords(myPed)
    local nearbyIds = {}

    for i = 1, #players do
        local targetPed = GetPlayerPed(players[i])
        local targetId = GetPlayerServerId(players[i])
        
        if targetId ~= cache.serverId then
            local dist = #(myCoords - GetEntityCoords(targetPed))
            if dist < 10.0 then
                table.insert(nearbyIds, targetId)
            end
        end
    end

    if #nearbyIds > 0 then
        lib.callback('ems-mdt:server:getNearbyPlayersData', false, function(results)
            cb(results)
        end, nearbyIds)
    else
        cb({})
    end
end)

-- Callbacks Proxy (Updated Naming Convention for Stability)
RegisterNUICallback('searchCitizen', function(data, cb)
    print("^3[EMS-MDT]^7 NUI Search Request for: " .. tostring(data.query))
    lib.callback('ems_mdt_searchCitizen', false, function(results)
        print("^2[EMS-MDT]^7 Received search results, returning to JS.")
        cb(results or {})
    end, data.query)
end)

RegisterNUICallback('getPatientRecords', function(data, cb)
    lib.callback('ems_mdt_getMedicalRecords', false, function(results)
        cb(results or {})
    end, data.citizenid)
end)

RegisterNUICallback('saveMedicalRecord', function(data, cb)
    lib.callback('ems_mdt_saveMedicalRecord', false, function(result)
        cb(result)
    end, data)
end)

RegisterNUICallback('saveCitizenNote', function(data, cb)
    lib.callback('ems_mdt_saveCitizenNote', false, function(result)
        cb(result)
    end, data.citizenid, data.notes)
end)

RegisterNUICallback('getAllMedicalRecords', function(data, cb)
    lib.callback('ems_mdt_getAllMedicalRecords', false, function(results)
        cb(results or {})
    end)
end)

RegisterNUICallback('updateMedicalRecord', function(data, cb)
    lib.callback('ems_mdt_updateMedicalRecord', false, function(res) cb(res) end, data)
end)

RegisterNUICallback('getAllEvidences', function(data, cb)
    lib.callback('ems_mdt_getAllEvidences', false, function(res) cb(res) end)
end)

RegisterNUICallback('searchEvidence', function(data, cb)
    lib.callback('ems_mdt_searchEvidence', false, function(res) cb(res) end, data.query)
end)

RegisterNUICallback('saveEvidence', function(data, cb)
    lib.callback('ems_mdt_saveEvidence', false, function(res) cb(res) end, data)
end)

RegisterNUICallback('deleteEvidence', function(data, cb)
    lib.callback('ems_mdt_deleteEvidence', false, function(res) cb(res) end, data.id)
end)

RegisterNUICallback('getAllBulletins', function(data, cb)
    lib.callback('ems_mdt_getAllBulletins', false, function(res) cb(res) end)
end)

RegisterNUICallback('saveBulletin', function(data, cb)
    lib.callback('ems_mdt_saveBulletin', false, function(res) cb(res) end, data)
end)

RegisterNUICallback('deleteBulletin', function(data, cb)
    lib.callback('ems_mdt_deleteBulletin', false, function(res) cb(res) end, data.id)
end)

-- Roster Management Proxies
RegisterNUICallback('ems_mdt_fetchRoster', function(data, cb)
    lib.callback('ems_mdt_fetchRoster', false, function(res) cb(res or {}) end)
end)

RegisterNUICallback('ems_mdt_getJobGrades', function(data, cb)
    lib.callback('ems_mdt_getJobGrades', false, function(res) cb(res or {}) end)
end)

RegisterNUICallback('ems_mdt_hireStaff', function(data, cb)
    lib.callback('ems_mdt_hireStaff', false, function(res) cb(res) end, data)
end)

RegisterNUICallback('ems_mdt_updateStaffGrade', function(data, cb)
    lib.callback('ems_mdt_updateStaffGrade', false, function(res) cb(res) end, data)
end)

RegisterNUICallback('ems_mdt_fireStaff', function(data, cb)
    lib.callback('ems_mdt_fireStaff', false, function(res) cb(res) end, data)
end)

RegisterNUICallback('getOverviewData', function(data, cb)
    print("^3[EMS-MDT]^7 NUI Requesting Overview Data...")
    lib.callback('ems_mdt_getOverviewData', false, function(res)
        print("^2[EMS-MDT]^7 Server returned overview data, sending to NUI.")
        cb(res or {})
    end)
end)

-- ======================================================================
-- EMS BLIPS / TEAM TRACKING
-- ======================================================================

local medicBlips = {}

-- Update position to server (Transmitter) - LSPD BLIP PATTERN
CreateThread(function()
    while true do
        local sleep = 500
        
        if PlayerData and PlayerData.job and Config.EMSJobs[PlayerData.job.name] then
            local onDuty = PlayerData.job.onduty
            if onDuty == nil then onDuty = true end 
            
            if onDuty then
                local ped = cache.ped
                local coords = GetEntityCoords(ped)
                local heading = GetEntityHeading(ped)
                local vehicleType = 'foot'
                local veh = (cache.seat == -1 and cache.vehicle) or 0
                
                if veh ~= 0 then
                    local class = GetVehicleClass(veh)
                    
                    -- Suppress default GTA vehicle blips for duty vehicles
                    SetVehicleHasBeenOwnedByPlayer(veh, false)
                    local vBlip = GetBlipFromEntity(veh)
                    if DoesBlipExist(vBlip) then SetBlipDisplay(vBlip, 0) end

                    if class == 8 or class == 13 then vehicleType = 'bike'
                    elseif class == 15 then vehicleType = 'heli'
                    elseif class == 16 then vehicleType = 'plane'
                    elseif class == 14 then vehicleType = 'boat'
                    else vehicleType = 'car' end
                end
                
                TriggerServerEvent('ems-mdt:server:updateMedicPos', {
                    coords = coords,
                    heading = heading,
                    vehicleType = vehicleType
                })
            else
                -- Off-Duty: Hapus paksa semua blip EMS & Beritahu server
                TriggerServerEvent('ems-mdt:server:updateMedicPos', { coords = nil })
                for src, blip in pairs(medicBlips) do
                    if DoesBlipExist(blip) then RemoveBlip(blip) end
                end
                medicBlips = {}
            end
        end
        Wait(sleep)
    end
end)

-- Force update helper (LSPD PATTERN)
RegisterNetEvent('ems-mdt:client:forceUpdatePos', function()
    if PlayerData and PlayerData.job and Config.EMSJobs[PlayerData.job.name] then
        local onDuty = PlayerData.job.onduty
        if onDuty == nil then onDuty = true end 
        
        if onDuty then
            local ped = cache.ped
            local coords = GetEntityCoords(ped)
            local heading = GetEntityHeading(ped)
            local vehicleType = 'foot'
            local veh = (cache.seat == -1 and cache.vehicle) or 0
            
            if veh ~= 0 then
                local class = GetVehicleClass(veh)
                
                -- Suppress default GTA vehicle blips for duty vehicles
                SetVehicleHasBeenOwnedByPlayer(veh, false)
                local vBlip = GetBlipFromEntity(veh)
                if DoesBlipExist(vBlip) then SetBlipDisplay(vBlip, 0) end

                if class == 8 or class == 13 then vehicleType = 'bike'
                elseif class == 15 then vehicleType = 'heli'
                elseif class == 16 then vehicleType = 'plane'
                elseif class == 14 then vehicleType = 'boat'
                else vehicleType = 'car' end
            end
            
            TriggerServerEvent('ems-mdt:server:updateMedicPos', {
                coords = coords,
                heading = heading,
                vehicleType = vehicleType
            })
        else
            TriggerServerEvent('ems-mdt:server:updateMedicPos', { coords = nil })
            for src, blip in pairs(medicBlips) do
                if DoesBlipExist(blip) then RemoveBlip(blip) end
            end
            medicBlips = {}
        end
    end
end)
-- Receive and render blips (LSPD BLIP PATTERN)
RegisterNetEvent('ems-mdt:client:updateMedicBlips', function(medicData)
    local onDuty = (PlayerData and PlayerData.job and Config.EMSJobs[PlayerData.job.name] and PlayerData.job.onduty)
    if onDuty == nil and PlayerData and PlayerData.job and Config.EMSJobs[PlayerData.job.name] then onDuty = true end

    -- JIKA TIDAK SEDANG TUGAS: Hapus SEMUA blip di peta pemain dan hentikan proses
    if not onDuty then
        for src, blip in pairs(medicBlips) do
            if DoesBlipExist(blip) then RemoveBlip(blip) end
        end
        medicBlips = {}
        return 
    end

    if not medicData then return end
    
    -- 1. Cleanup
    for src, blip in pairs(medicBlips) do
        local found = false
        for _, data in pairs(medicData) do
            if tonumber(data.src) == tonumber(src) then
                found = true
                break
            end
        end
        if not found then
            if DoesBlipExist(blip) then RemoveBlip(blip) end
            medicBlips[src] = nil
        end
    end

    -- 2. Render Team
    for _, data in pairs(medicData) do
        local src = tonumber(data.src)
        
        if not medicBlips[src] then
            local blip = AddBlipForCoord(data.coords.x, data.coords.y, data.coords.z)
            SetBlipColour(blip, 2) -- Green for EMS
            SetBlipScale(blip, 0.75)
            SetBlipAsShortRange(blip, false)
            SetBlipCategory(blip, 7)
            SetBlipPriority(blip, 9)
            
            BeginTextCommandSetBlipName("STRING")
            AddTextComponentString(("[#%s] %s"):format(data.callsign or "EMS", data.name or "Medic"))
            EndTextCommandSetBlipName(blip)
            
            medicBlips[src] = blip
        end
        
        local blip = medicBlips[src]
        if DoesBlipExist(blip) then
            SetBlipCoords(blip, data.coords.x, data.coords.y, data.coords.z)
            SetBlipRotation(blip, math.ceil(data.heading))
            SetBlipColour(blip, 2) 
            
            local sprite = 1
            if data.vehicle == 'car' then sprite = 225
            elseif data.vehicle == 'bike' then sprite = 226
            elseif data.vehicle == 'heli' then sprite = 43
            elseif data.vehicle == 'boat' then sprite = 427
            elseif data.vehicle == 'plane' then sprite = 251
            end
            
            if GetBlipSprite(blip) ~= sprite then
                SetBlipSprite(blip, sprite)
            end

            -- Ensure scale is maintained
            SetBlipScale(blip, 0.75)
        end
    end
end)
