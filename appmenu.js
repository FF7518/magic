const {app, Menu} = require('electron')

// const isMac = process.platform === 'darwin'

// template of Menu
exports.appMenuTemplate = [
    {
        label: 'File',
        submenu: []
    },
    {
        label: 'Edit',
        submenu: [
            { role: 'undo' },
            { role: 'redo' },
            { type: 'separator' },
            { role: 'cut' },
            { role: 'copy' },
            { role: 'paste' },
            { role: 'pasteandmatchstyle' },
            { role: 'delete' },
            { role: 'selectall' }
        ]
    },
    {
        label: 'View',
        submenu: [
            { role: 'reload' },
            { role: 'forcereload' },
            { role: 'toggledevtools' },
            { type: 'separator' },
            { role: 'resetzoom' },
            { role: 'zoomin' },
            { role: 'zoomout' },
            { type: 'separator' },
            { role: 'togglefullscreen' }
        ]
    },
    {
        label: 'Format',
        submenu: []
    },
    {
        role: 'help',
        submenu: [
            {
                label: 'Home Page',
                click: async () => {
                    const { shell } = require('electron')
                    await shell.openExternal('https://electronjs.org')
                }
            }
        ]
    }
]