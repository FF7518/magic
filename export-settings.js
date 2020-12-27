const {remote} = require('electron')
const {ipcRenderer} = require('electron')

var driver = function() {
    let obj = document.getElementById('paperSel')
    document.getElementById('lb1').innerText = obj.value
    if(obj.value === 'custom') 
        document.getElementById('custom-div').style.display = 'inline'
    else
        document.getElementById('custom-div').style.display = 'none'

}

function submit() {
    let papersize = document.getElementById('paperSel').value
    let h = null
    let w = null
    if(papersize === 'custom') {
        h = String(document.getElementById('inheight').value) +
                String(document.getElementById('heightSel').value)
        w = String(document.getElementById('inwidth').value) +
                String(document.getElementById('widthSel').value)        
    }
    let str = papersize
    if(h && w) str = str + " " + h + " " + w
    document.getElementById('lb2').innerText = str
    let msg = {
        papersize : papersize,
        h : h,
        w : w,
    }
    ipcRenderer.send('pdfsetting',msg)
}