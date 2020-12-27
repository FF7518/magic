// Modules to control application life and create native browser window
const {app, BrowserWindow, ipcRenderer} = require('electron')
const path = require('path')
const readline = require('readline')
const fs = require('fs')

const {Menu, MenuItem, dialog, ipcMain} = require('electron')
const {appMenuTemplate} = require(path.join(__dirname, 'appmenu.js'))

function createWindow () {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true, // enable js to visit node.js
      enableRemoteModule: true,//after electron 10
      webSecurity: false,
    }
  })

  // and load the index.html of the app.
  mainWindow.loadFile('index.html')

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()

  // 
  const menu = Menu.buildFromTemplate(appMenuTemplate);

  //add filemenu to menu
  menu.items[0].submenu.append(
    new MenuItem({
      label: 'New',
      click() {
        mainWindow.webContents.send('action','new');
      },
      accelerator: 'CmdOrCtrl+N'
    })
  )
  menu.items[0].submenu.append(
    new MenuItem({
      label: 'Open',
      click() {
        mainWindow.webContents.send('action','open');
      },
      accelerator: 'CmdOrCtrl+O'
    })
  )
  menu.items[0].submenu.append(
    new MenuItem({
      label: 'Save',
      click() {
        mainWindow.webContents.send('action','save');
      },
      accelerator: 'CmdOrCtrl+S'
    })
  )
  menu.items[0].submenu.append(
    new MenuItem({
      label: 'Save As',
      click() {
        mainWindow.webContents.send('action','saveas')
      },
      accelerator: 'CmdOrCtrl+Shift+S'
    })
  )
  menu.items[0].submenu.append(new MenuItem({
    type: 'separator'
  }))
  menu.items[0].submenu.append(new MenuItem({
    label: 'Recent Files',
    submenu: []
  }))
  menu.items[0].submenu.append(new MenuItem({
    type: 'separator'
  }))
  menu.items[0].submenu.append(
    new MenuItem({
      label: 'Export As PDF',
      click() {
        let child = new BrowserWindow({ 
          width: 500, 
          height: 300, 
          webPreferences: {
              preload: path.join(__dirname, 'preload.js'),
              nodeIntegration: true, // enable js to visit node.js
              enableRemoteModule: true,//after electron 10
              webSecurity: false,
          },
          parent: mainWindow,
          modal: true,
        })
        // child.setMenu(null)
          child.loadFile('./export.html')
          child.once('ready-to-show', () => {
          child.show()
        })

        // 监听子窗口信号
        ipcMain.once('pdfsetting',(event,arg)=>{
          if(arg) {
            mainWindow.webContents.send('exportpdf-data',arg)
          }
          child.close()
        })

      },
    })
  )
  menu.items[0].submenu.append(new MenuItem({
    label: 'Export As HTML',
    click() {
      mainWindow.webContents.send('exporthtml-data',)
    }
  }))
  menu.items[0].submenu.append(new MenuItem({
    type: 'separator'
  }))
  menu.items[0].submenu.append(new MenuItem({
    role: 'quit'
  }))

  // 在Format下插入子项
  menu.items[3].submenu.append(new MenuItem({
    label: '加粗',
    click() {
      mainWindow.webContents.send('insertcmd','bold')
    },
    accelerator: 'CmdOrCtrl+B'
  }))
  menu.items[3].submenu.append(new MenuItem({
    label: '斜体',
    click() {
      mainWindow.webContents.send('insertcmd','italic')
    },
    accelerator: 'CmdOrCtrl+I'
  }))
  menu.items[3].submenu.append(new MenuItem({
    type: 'separator'
  }))
  menu.items[3].submenu.append(new MenuItem({
    label: '插入图片',
    click() {
      
      let path = dialog.showOpenDialogSync(mainWindow ,{
          filters: [
              { name: 'Images', extensions: ['png', 'jpg', 'jpeg'] },
              { name: 'All Files', extensions: ['*'] }
          ],
          properties: ['openFile']
      })
      if(path) {
        path = path[0]
        mainWindow.webContents.send('req-img',path)
      }
      else {
        mainWindow.webContents.send('req-img','custom')
      }
    },
  }))
  menu.items[3].submenu.append(new MenuItem({
    type: 'separator'
  }))


  // 样式配置
  

  menu.items[3].submenu.append(new MenuItem({
    label: '字体 - 默认',
    click() {
      mainWindow.webContents.send('char', 'Microsoft Yahei')
    }
  }))
  menu.items[3].submenu.append(new MenuItem({
    label: '字体 - 幼圆',
    click() {
      mainWindow.webContents.send('char', '幼圆')
    }
  }))
  menu.items[3].submenu.append(new MenuItem({
    label: '字体 - 宋体',
    click() {
      mainWindow.webContents.send('char', '宋体')
    }
  }))
  menu.items[3].submenu.append(new MenuItem({
    label: '字体 - 黑体',
    click() {
      mainWindow.webContents.send('char', '黑体')
    }
  }))
  menu.items[3].submenu.append(new MenuItem({
    type: 'separator'
  }))
  menu.items[3].submenu.append(new MenuItem({
    label: '白色模式',
    click() {
      mainWindow.webContents.send('theme', './pure-style.css')
    }
  }))
  menu.items[3].submenu.append(new MenuItem({
    label: '深色模式',
    click() {
      mainWindow.webContents.send('theme', './dark-style.css')
    }
  }))

  const listPath = './file_cache/.list'
  // 初始化recent files 列表项
  if(!fs.existsSync(listPath))
    fs.writeFileSync(listPath,"")
  
  let fList = fs.readFileSync(listPath).toString().split("?")
  

  // console.log(fList)
  for(i = 0; i < fList.length; ++i) {
    let str = fList[i]
    if(str === "") continue
    menu.items[0].submenu.items[5].submenu.append(new MenuItem({
      label: str,
      click() {
        mainWindow.webContents.send('recentfilepath',str)
        console.log(str)
      }
    }))
  }

  Menu.setApplicationMenu(menu);
  
  // 退出检查
  mainWindow.on('close', (e)=>{
    e.preventDefault()
    mainWindow.webContents.send('action','exiting')
    ipcMain.once('reqaction',(event,arg)=>{
      if(arg === 'exit')
        app.exit()
    })
  });
}


// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow()
  
  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})



// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.

// app.on('window-all-closed', function () {
//   if (process.platform !== 'darwin') app.quit()
// })

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.


function initRecentFileList() {
  
}