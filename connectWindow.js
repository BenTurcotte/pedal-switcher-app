const electron = require('electron');
const {ipcRenderer} = electron;

const ab1Elem = document.querySelector('#addressByte1');
const ab2Elem = document.querySelector('#addressByte2');
const ab3Elem = document.querySelector('#addressByte3');
const ab4Elem = document.querySelector('#addressByte4');
const portElem = document.querySelector('#port');
const connectBtn = document.getElementById('connectBtn');

connectBtn.addEventListener('click', (sender) => {
  sender.preventDefault();
  
  const info = {
    "address" : `${ab1Elem.value}.${ab2Elem.value}.${ab3Elem.value}.${ab4Elem.value}`,
    "port" : portElem.value
  };
  
  ipcRenderer.send('connect-to-box', info);
})

const cancelBtn = document.getElementById('cancelBtn')
cancelBtn.addEventListener('click', (sender) => {
  sender.preventDefault();
  ipcRenderer.send('box-connect-cancelled');
});

// NOTE: THIS IS THE ONLY WAY I COULD GET IPC TO WORK RN...  IDK WHY SUBs DONT WORK IMMEDITELY WHEN WINDOW IS SHOWN???
let c = ipcRenderer.sendSync('get-prev-connection', '');
if (c.address && c.port) {
  const address = c.address;
  const port = c.port;
  console.log(`prev conection exists (${address}:${port})`);
  let splitAddr = address.split(".");
  ab1Elem.value = splitAddr[0];
  ab2Elem.value = splitAddr[1];
  ab3Elem.value = splitAddr[2];
  ab4Elem.value = splitAddr[3];
  portElem.value = port;
}