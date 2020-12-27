// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process because
// `nodeIntegration` is turned off. Use `preload.js` to
// selectively enable features needed in the rendering
// process.


/*
functions:
1.mdSwitchWithMDIt()
2.readText(file)
3.saveText(text, filepath)
4.updateRecentList(newFile)
5.getCurrentFilePath(command)
6.saveCurrentDoc(command)
7.askSaveIfNeed()
8.insertText(command, left=0, right=0)
9.exportToFile(format='pdf',options={})
10.newFile()
11.openFile()
*/


const {remote} = require('electron')
const {Menu, MenuItem} = remote

const {ipcRenderer} = require('electron')
const { event } = require('jquery')
const { dialog} = remote



// 当前文件路径
let currentFilePath = null
// 保存标识符
let isSaved = true
// 编辑区对象
let txtEditor = document.getElementById('txtEditor')
// 对象
let Body = document.getElementById('indexBody')

// 标题
document.title = 'Notepad - Untitled'


// 缓存文件夹
const fileCachePath = './file_cache'


// 最近访问文件列表存储路径
const listPath = './file_cache/.list'
// 最近访问文件列表最大容量
const maxCount = 10

// showdown : markdown parser
var showdown = require('showdown')
      
//var rawText = null
//var resHtml = null
mdSwitchWithSD = function() {
    var converter = new showdown.Converter()
    var rawText = document.getElementById('txtEditor').value
    var resHtml = converter.makeHtml(rawText)
    document.getElementById('txtShow').innerHTML = resHtml
}
      
// markdown-it : markdown parser
// markdown格式转换对象md
// String=>[md]=>html
var md = require('markdown-it')({
    html: true,
    linkify: true,
    typographer: true,
  });
// 转换图片路径 G://xx//xx

// markdown格式转换函数
mdSwitchWithMDIt = function() {
  try {
  var resHtml = md.render(document.getElementById('txtEditor').value)
  document.getElementById('txtShow').innerHTML = resHtml
  } catch(e) {
      errHandl(e)
  }
}


// 上下文菜单
const contextMenuTemplate=[
    { role: 'undo' },       //Undo菜单项
    { role: 'redo' },       //Redo菜单项
    { type: 'separator' },  //分隔线
    { role: 'cut' },        //Cut菜单项
    { role: 'copy' },       //Copy菜单项
    { role: 'paste' },      //Paste菜单项
    { role: 'delete' },     //Delete菜单项
    { type: 'separator' },  //分隔线
    { role: 'selectall' }   //Select All菜单项
]
const contextMenu = Menu.buildFromTemplate(contextMenuTemplate);
Body.addEventListener('contextmenu',(e)=>{
    e.preventDefault()
    // console.log('222222222')
    contextMenu.popup(remote.getCurrentWindow())
})

//  监听文件是否被修改
txtEditor.oninput=(e)=>{
    if(isSaved) document.title += ' *'
    isSaved = false
}

// 通信问题

// 控制字段内容列表
const insertTextTypes = {
    bold: ['**write here**',2,2],
    italic: ['*write here*',1,1],
}

// ipcRenderer通信
// channel: insertcmd
/* arg:
*
*   控制字段, in insertTextTypes
*
*/
ipcRenderer.on('insertcmd',(event, arg)=>{
    switch(arg) {
        case 'bold':
            insertText(insertTextTypes.bold[0],insertTextTypes.bold[1],insertTextTypes.bold[2])
            break
        case 'italic':
            insertText(insertTextTypes.italic[0],insertTextTypes.italic[1],insertTextTypes.italic[2])
            break
    }
})

// ipcRenderer通信
// channel: recentfilepath
/* arg:
*
*   文件路径名称
*
*/
ipcRenderer.on('recentfilepath',(event, arg)=>{
    // console.log(arg)
    openFile(arg)
})

// 错误处理子程序
/*  错误处理
*   input: err object
*   
*/
function errHandl(err) {
    console.log(err)
}

// 新建文件操作
/*  
*   action: 新建文件
*/
function newFile() {
    try {
        askSaveIfNeed()
        if(isSaved) {
            currentFilePath = null
            txtEditor.value=''
            document.title = 'Notepad - Untitled'
            isSaved = true
            mdSwitchWithMDIt()
        }
    } catch(e) {
        errHandl(e)
    }
}

// 打开文件操作
/*  
*   action: 打开文件
*   input: filepath, default=null
*   if filepath not exist, select one
*/
function openFile(filepath=null) {
    try {
        askSaveIfNeed()
        if(!filepath) 
            filepath = getCurrentFilePath('open')
        if(filepath) {
            currentFilePath = filepath
            const txtRead = readText(currentFilePath)
            txtEditor.value = txtRead
            document.title = 'Notepad - ' + currentFilePath
            isSaved = true
            mdSwitchWithMDIt()
        }
    } catch(e) {
        errHandl(e)
    }
}


// 读取文件
/*  
*   action: 读取文件内容
*   input: filepath
*   output: string content
*/
function readText(filepath) {
    // console.log('start reading file')
    try {
        let fs = require('fs');
        return fs.readFileSync(filepath, 'utf8')
    } catch(err) {
        errHandl(err)
    }
}


// 存储文件
/*
*   action: 存储文件，同时副本写入缓存文件夹，
*   更新最近访问文件列表。
*   input: 内容text,文件路径filepath
*   
*/
function saveText(text, filepath) {
    try {
        let fs = require('fs')
        fs.writeFileSync(filepath, text)
        // 同时应写入软件缓存文件夹
        // 作为当前文件的一个拷贝，如果发生了崩溃，则加载该文件 beta. 测试功能
        if(!fs.existsSync(fileCachePath))
            fs.mkdirSync(fileCachePath)
        tempFilepath = fileCachePath + '/' + 'temp.data'
        fs.writeFileSync(tempFilepath, text)
        updateRecentList(filepath)
    } catch(err) {
        errHandl(err)
    }
}


// 更新最近访问文件列表
/*
*   action: 更新文件列表
*   input: 新文件newFile
*
*/
function updateRecentList(newFile) {
    try {
        let fs = require('fs')
        if(!fs.existsSync(listPath))
            fs.writeFileSync(listPath,"")
        let cnt = 0
        let arr = []
        let fList = fs.readFileSync(listPath).toString().split("?")
        for(i = 0; i < fList.length; ++i) {
            if(cnt === maxCount-1) break
            let str = fList[i]
            if(str === "") continue
            str = "?" + str
            arr.push(str)
            cnt++
        }
        newFile = "?" + newFile
        arr.unshift(newFile)
        newString = arr.join("")
        console.log(newString)
        fs.writeFileSync(listPath, newString)
    } catch(e) {
        errHandl(e)
    }
}

// 获取文件选择路径 选择：open and save
/*
*   选择文件路径
*   command: open | save
*   打开文件或存储文件的路径
*/
function getCurrentFilePath(command) {
    let path
    switch(command) {
        case 'open':
            path = remote.dialog.showOpenDialogSync(remote.getCurrentWindow(),{
                filters: [
                    { name: 'Text Files', extensions: ['txt', 'md'] },
                    { name: 'All Files', extensions: ['*'] }
                ],
                properties: ['openFile']
            })
            // 打开方法返回的是String数组 String[] | undefined
            if(path) path = path[0]
            break

        case 'save':
            path = remote.dialog.showSaveDialogSync(remote.getCurrentWindow(),{
                filters: [
                    { name: 'Text Files', extensions: ['txt', 'md'] },
                    { name: 'All Files', extensions: ['*'] }
                ],
                properties: ['openFile', 'promptToCreate']
            })
            break
    }
    // path 要么有值String文件路径，要么是undefined无值
    return path
}

// 保存当前文档
/*
*   command: save | saveas
*   save: 直接保存
*   saveas: 另存为
*/
function saveCurrentDoc(command) {
    switch(command) {
        case 'save':
            try {
                if(!currentFilePath)
                    currentFilePath = getCurrentFilePath('save')
                if(currentFilePath) {
                    const txtSave = txtEditor.value
                    saveText(txtSave, currentFilePath)
                    isSaved = true
                    document.title = 'Notepad - ' + currentFilePath
                }
            } catch(e) {
                errHandl(e)
            }
            break
        case 'saveas':
            try {
                currentFilePath = getCurrentFilePath('save')
                if(currentFilePath) {
                    const txtSave = txtEditor.value
                    saveText(txtSave, currentFilePath)
                    isSaved = true
                    document.title = 'Notepad - ' + currentFilePath
                }
            } catch(e) {
                errHandl(e)
            }
            break
    }
}

// 询问当前页面文件是否需要保存
/*
*   action:如果是否保存标志字为真，则
*   无操作，否则跳出对话框询问。
*
*/
function askSaveIfNeed() {
    try {
        if(isSaved) return;
        const response = remote.dialog.showMessageBoxSync(remote.getCurrentWindow(),{
            message: 'Do ya want to save the current doc?',
            type: 'question',
            buttons: ['YES', 'NO']
        })
        if(response === 0) saveCurrentDoc('saveas')
    } catch(e) {
        errHandl(e)
    }
}

// render markdown to html
// markdown-it

// 使用JQuery
// window.$ = window.jQuery = require('jquery/dist/jquery.min.js');

// 向textarea光标处插入内容
/*
*   command: 插入的控制字符，如**bold**
*   left, right, default=0
*   左偏移，右偏移距离，用于设置文本选择的
*   范围
*/
function insertText(command, left=0, right=0) {
    try {
        let obj = document.getElementById('txtEditor')
        let insertString = command
        let temp = obj.value
        obj.focus()
        let pointIndex = obj.selectionStart
        let str1 = temp.substr(0,pointIndex)
        let str2 = temp.substr(pointIndex,temp.length)
        obj.value = str1 + insertString + str2
        let newIndex = pointIndex + insertString.length
        newIndex -= right
        pointIndex += left
        obj.setSelectionRange(pointIndex,newIndex)
        mdSwitchWithMDIt()
    } catch(e) {
        errHandl(e)
    }
}

// 插入图片控制字符
function insertImage(imgInfo="default", imgURL=null) {
    
}

// 改变样式
/*
*
*   
*
*/
// 界面样式 ：选择css文件路径 filepath 可选
// 
function chTheme(filepath=null, options={}) {
    let obj = document.getElementById('mainstyle')
    if(filepath)
        obj.setAttribute('href',filepath)
    console.log(filepath)

}


// 改变编辑区字体
// string fontFami : example 'YouYuan' ， 中文也可
function chCharSet(fontFami) {
    try {
        let obj1 = document.getElementById('txtEditor')
        let obj2 = document.getElementById('txtShow')
        obj1.style.fontFamily = fontFami
        obj2.style.fontFamily = fontFami
    } catch(e) {
        errHandl(e)
    }
}


// 测试函数
function testDriver() {
    // path = getCurrentFilePath('open')
    // // path = path.split('\\')
    // // path = path.join('\\\\')
    
    // let arg = "![image]("+path+")"
    
    // // console.log(arg)
    // arg = arg.replace(/\\/g,"/");
    // // console.log(arg)
    // // js中, \ 反斜杠是转义字符，表示自身需要用 \\ ，加 /g 替换所有反斜杠
    // let len = arg.length
    // insertText(arg,2,len-7)
}

// sub window
// 渲染进程中要使用remote引用，BrowerWindow是主进程的
// const { BrowserWindow } = require('electron').remote
// const path = require('path')
// function createSubWin() {
//     const child = new BrowserWindow({ 
//         width: 600, 
//         height: 600, 
//         webPreferences: {
//             preload: path.join(__dirname, 'preload.js'),
//             nodeIntegration: true, // enable js to visit node.js
//             enableRemoteModule: true,//after electron 10
//             webSecurity: false,
//         },
//         parent: remote.BrowserView,
//         modal: true,
//     })
//     // child.setMenu(null)
//     child.loadFile('./imgselector.html')
//     child.once('ready-to-show', () => {
//         child.show()
//     })
// }

// ipcRenderer.on('exportpdf-notice',(event,arg)=>{
//     //收到通知，准备接收参数
//     event.sender.send('exportpdf-ac',)
//     console.log('exportpdf-notice received, send exportpdf-ac')
// })

// 导出文件
/*
*   默认导出为pdf格式
*   format: pdf | html  
*   options: only for pdf
*   options = {
*   // papersize
*   'height', 'width' : '10mm' , cm/in/px are also allowed
*   or 'format' : 'Letter', 'A3', 'A4', 'A5', 'Legal', 'Tabloid'
*
*   // page
*   'border' : '0' or {'top' : '1in', and right,left,bottom}
*
*   }
*
*/
function exportToFile(format='pdf',options={}) {
    let filepath, html
    switch(format) {
        case 'pdf':
            try {
                filepath = remote.dialog.showSaveDialogSync(remote.getCurrentWindow(),{
                    filters: [
                        { name: 'PDF docs', extensions: ['pdf'] },
                        { name: 'All Files', extensions: ['*'] }
                    ],
                    properties: ['openFile', 'promptToCreate']
                })
                let pdf = require('html-pdf')
                html = document.getElementById('txtShow').innerHTML
                if(filepath) {
                    pdf.create(html, options).toFile(filepath, function (err, res) {
                        if (err) return console.log(err)
                        console.log(res)
                    })
                }
            } catch(e) {
                errHandl(e)
            }
            break

        case 'html':
            try {
                filepath = remote.dialog.showSaveDialogSync(remote.getCurrentWindow(),{
                    filters: [
                        { name: 'HTML Files', extensions: ['html','mhtml','htm'] },
                        { name: 'All Files', extensions: ['*'] }
                    ],
                    properties: ['openFile', 'promptToCreate']
                })
                html = document.getElementById('txtShow').innerHTML
                let fs = require('fs')
                fs.writeFileSync(filepath, html)
            } catch(e) {
                errHandl(e)
            }
            break
    }
}





// ipcRenderer通信
// channel: action
/* arg:
*
*   new, open, save, saveas, exiting
*
*/
ipcRenderer.on('action',(event, arg)=>{
    switch(arg) {
        case 'new':
            newFile()
            break
        case 'open':
            openFile()
            break
        case 'save':
            saveCurrentDoc('save')
            break
        case 'saveas':
            saveCurrentDoc('saveas')
            break
        case 'exiting':
            console.log('i know')
            askSaveIfNeed()
            console.log('i konw')
            ipcRenderer.sendSync('reqaction','exit')
            break
        default:
            errHandl(arg)

    }
})

// ipcRenderer通信
// channel: theme
/* arg:
*
*   css filepath
*/
ipcRenderer.on('theme',(event,arg)=>{
    try{
        chTheme(arg)
    } catch(e) {
        errHandl(e)
    }
})

// ipcRenderer通信
// channel: char
/* arg:
*
*   'YouYuan','宋体','黑体' etc
*
*/
ipcRenderer.on('char',(event, arg)=>{
    try {
        console.log(arg)
        chCharSet(arg)
    } catch(e) {
        errHandl(e)
    }
})

// ipcRenderer通信
// channel: req-img
/* arg:
*
*   filepath of image
*
*/
// 图片路径only支持正斜杠/
ipcRenderer.on('req-img',(event, arg)=>{
    console.log('receive ' + arg)
    arg = arg.replace(/\\/g,"/");
    arg = "![image]("+arg+")"
    console.log(arg)
    let len = arg.length
    insertText(arg,2,len-7)
})


// ipcRenderer通信
// channel: exportpdf-data
/* arg:
*
*   options
*
*/
ipcRenderer.on('exportpdf-data',(event,arg)=>{
    console.log(arg)
    if(arg.papersize === 'custom') {
        options = {
            'height': arg.h,
            'width': arg.w,
        }
        exportToFile('pdf',options)
    }
    else {
        options = {
            'format': arg.papersize
        }
        exportToFile('pdf',options)
    }
})

// ipcRenderer通信
// channel: exporthtml-data
/* arg:
*
*   none
*
*/
ipcRenderer.on('exporthtml-data',(event,arg)=>{
    exportToFile('html')
})