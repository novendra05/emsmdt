Config = {}

-- MDT Basic Configuration
Config.Command = "emsmdt"
Config.Animation = true -- Whether to play tablet animation
Config.EMSJobs = {
    ["ambulance"] = true,
    ["ems"] = true
}

-- Permissions
Config.Permissions = {
    DeleteRecord = 3, -- Minimum grade to delete a medical record
    ManageRoster = 4, -- Minimum grade to hire/fire
    EditBloodType = 2  -- Minimum grade to edit sensitive medical data
}

-- Dispatch Settings (Optional)
Config.Dispatch = {
    Enabled = true,
}

-- Blip Configuration
Config.Blips = {
    Enabled = true,
    Sprite = 1, -- Default person sprite (will change based on vehicle)
    Color = 2, -- Green for EMS
    Scale = 0.75,
    Category = 7, -- Performance optimization: shows blip names
    Priority = 9,
}
