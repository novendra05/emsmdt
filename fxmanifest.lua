fx_version 'cerulean'
games { 'gta5' }

author 'Antigravity'
description 'Advanced EMS MDT System - Premium Edition'
version '1.0.1'

ui_page 'web/index.html'

-- Explicitly load ox_lib first in all contexts
shared_scripts {
    '@ox_lib/init.lua',
    'config.lua'
}

client_scripts {
    'client/client.lua'
}

server_scripts {
    '@oxmysql/lib/MySQL.lua',
    'server/server.lua'
}

files {
    'web/index.html',
    'web/style.css',
    'web/app.js',
    'web/pages/*.html',
    'web/js/pages/*.js',
    'web/js/router.js'
}

dependency 'qbx_core'
dependency 'oxmysql'
dependency 'ox_lib'

lua54 'yes'
