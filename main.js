// process.env.NODE_ENV = 'production'; // comment out to enable devtools

const electron = require('electron');
const path = require('path');
const net = require('net');
const os = require('os');
const Store = require('./appData.js');

const {app, BrowserWindow, Menu, ipcMain} = electron;

let mainWindow;
let connectWin;
let mainMenu;
let client;

// App Data Storage ------------------------------------------------------------
const config = new Store({
  configName: 'user-data'
});

// Ensure Cleanup --------------------------------------------------------------
function ensureCleanup() {
  if (connectWin) {
    connectWin.close();
    connectWin = null;
  }
  if (client) {
    client.end();
    client.destroy();
    client = null;
  }
  if (mainWindow) {
    if (mainWindow)
    mainWindow.close();
    mainWindow = null;
  }
}

// create MainWindow -----------------------------------------------------------
function createMainWindow() {
  mainWindow = new BrowserWindow({
    icon: path.join(__dirname, 'assets/icons/png/icon.png'),
    webPreferences: {
      nodeIntegration: true
    }
  })
  mainWindow.maximize();
  mainWindow.loadFile(path.join(__dirname, 'mainWindow.html'));

  mainWindow.on('closed', function() {
    mainWindow = null
    ensureCleanup();
    app.quit();
  });

  mainWindow.webContents.send('app-ready', config);

  mainWindow.show();
}

// handle create connectWindow -------------------------------------------------
function createConnectWindow(){
  connectWin = new BrowserWindow({
    icon: path.join(__dirname, 'assets/icons/png/icon.png'),
    alwaysOnTop:true,
    width:300,
    height:130,
    center:true,
    title:'Connect To Box',
    webPreferences: {
      nodeIntegration: true
    }
  });
  connectWin.loadFile(path.join(__dirname, 'connectWindow.html'));
  connectWin.on('closed', function() {
    connectWin = null;
  });
};

ipcMain.on('get-prev-connection', (event, arg) => {
  console.log('config was requested...');
  event.returnValue = {'address' : config.get('address'), 'port' : config.get('port')};
});

ipcMain.on('get-audio-loops-config', (event, arg) => {
  console.log('audio loop info was requested...');
  event.returnValue = config.get('audioLoops');
});

ipcMain.on('get-midi-devices-config', (event, arg) => {
  console.log('midi device info was requested...');
  
  if (!config.get('midiDevices')) {
    console.log('no configured midi devices found, adding warped vinyl for example')
    config.set('midiDevices', [
      {
        name: 'Warped Vinyl',
        channel: 5,
        pc: {
          min: 0,
          max: 122,
          currentValue: 0
        },
        cc: {
          knobs: [
            {
              name: 'Tone',
              param: 14,
              min: 0,
              max: 127,
              currentValue: 64
            },
            {
              name: 'Volume',
              param: 15,
              min: 0,
              max: 127,
              currentValue: 64
            }
          ],
          selectors: [
            {
              name: 'TapDiv',
              param: 21,
              currentValue: 0,
              valueOptions: [
                {
                  name: '1/1',
                  value: 0
                },
                {
                  name: '1/2',
                  value: 1
                },
                {
                  name: '1/4t',
                  value: 2
                },
                {
                  name: '1/4',
                  value: 3
                },
                {
                  name: '1/8',
                  value: 4
                },
                {
                  name: '1/16',
                  value: 5
                }
              ]
            },
            {
              name: 'Midi Clock Mode',
              param: 51,
              currentValue: 127,
              valueOptions: [
                {
                  name: 'Ignore',
                  value: 0
                },
                {
                  name: 'Listen',
                  value: 127
                }
              ]
            }
          ],
          singles: [
            {
              name: 'Bypass',
              param: 102,
              value: 0
            },
            {
              name: 'Engage',
              param: 102,
              value: 127
            },
            {
              name: 'Tap',
              param: 93,
              value: 127
            }
          ]
        }
      }
    ]);
  }
  event.returnValue = config.get('midiDevices');
});

// BOX CONNECTION --------------------------------------------------------------
ipcMain.on('connect-to-box', function(e, info) {

  if (client == null || typeof(client) != typeof(net.Socket)) {
    console.log(`Attempting to create a new client connection (${info.address}:${info.port})`)
    client = new net.Socket();
    client.setEncoding('utf-8')
    
    client.on('error', (err) => {
      console.error(err);
      if (connectWin && typeof(connectWin) == typeof(BrowserWindow))
        connectWin.webContents.send('box-connection-attempt-error', err.message);
    });

    client.on('close', () =>{
      console.log('Box connection closing.');
      if (mainWindow)
        mainWindow.webContents.send('box-connection-ended');
    });

    client.on('timeout', () => {
      console.log('Box connection timed out.');
      if (mainWindow)
        mainWindow.webContents.send('box-connection-ended');
    });

    client.on('end', () => {
      console.log('Box connection ended.');
      if (mainWindow)
        mainWindow.webContents.send('box-connection-ended');
    });
    
    client.on('data', (data) => {
      console.log(`Received data from server: ${data}`);
      mainWindow.webContents.send('server-data-received', data);
    });
    
    client.on('connect', () => {

      // update IP address & port in config
      config.set('address', info.address);
      config.set('port', info.port);

      console.log(`Connected to server at ${info.address}:${info.port}`);
      
      createMainWindow();
      
      if (connectWin)
      {
        connectWin.close();
        connectWin = null;
      }
    });
    
    client.connect({port:info.port, host:info.address});
  }
  else {
    console.log('Tried to connect to box when client already exists.');
    ensureCleanup();
    app.quit();
  }
});

ipcMain.on('box-connect-cancelled', () => {
  ensureCleanup();
  app.quit()
});


// BOX COMMUNICATION -----------------------------------------------------------
ipcMain.on('send-box-cmd-audio-preset-change', (e, args)=>{
  let oneHot = 0x00;
  for (let i = 0; i < args.length; i++) {
    if (args[i] == true){
      oneHot += (1 << i);
    }
  }
  
  // Msg bytes:
  // [
  //   A (65),
  //   binary one-hot rep of loop states,
  //   line feed (13),
  //   new-line (10)
  // ]
  let boxCmd = Buffer.from([0x41, oneHot, 0x0D, 0x0A])
  
  console.log(`Sending loop states to BOX.`);
  console.log(`  Loop States: ${args}`);
  console.log(`  Bytes: ${boxCmd.readUInt8(0)}, ${boxCmd.readUInt8(1)}, ${boxCmd.readUInt8(2)}, ${boxCmd.readUInt8(3)}`)
  
  sendMessageToBox(boxCmd);
});

ipcMain.on('send-box-cmd-midi', (elem, msgObj) => {
  
  // Msg bytes for PC:
  // [
  //   P (80),
  //   midi channel,
  //   pc value,
  //   line feed (13),
  //   new-line (10)
  // ]

  // Msg bytes for CC:
  // [
  //   C (67),
  //   midi channel,
  //   cc param id,
  //   cc value,
  //   line feed (13),
  //   new-line (10)
  // ]

  const cmdId = msgObj.type == 'PC' ? 0x50 : 0x43;
  const chan = parseInt(msgObj.channel);
  const b1 = parseInt(msgObj.byte1);
  const b2 = parseInt(msgObj.byte2);

  let boxCmd;
  if (msgObj.type == 'PC') {
    boxCmd = Buffer.from([cmdId, chan, b1, 0x0D, 0x0A]);
    console.log(`Sending midi PC command to BOX.`);
    console.log(`  cmd id, midi channel, pc value`);
    console.log(`  Bytes: ${boxCmd.readUInt8(0)}, ${boxCmd.readUInt8(1)}, ${boxCmd.readUInt8(2)}`);
  }
  else {
    boxCmd = Buffer.from([cmdId, chan, b1, b2, 0x0D, 0x0A]);
    console.log(`Sending midi CC command to BOX.`);
    console.log(`cmd id, midi channel, cc param, cc value`)
    console.log(`  Bytes: ${boxCmd.readUInt8(0)}, ${boxCmd.readUInt8(1)}, ${boxCmd.readUInt8(2)}, ${boxCmd.readUInt8(3)}`)
  }

  sendMessageToBox(boxCmd);
});

function sendMessageToBox(msg) {
  if (client && client.writable)
    client.write(msg);
  else
    console.log('Cannot send cmd to box.  Connection quality is bad (client is not writable).');
}


// User Data Persistance -------------------------------------------------------
ipcMain.on('persist-audio-loops', (e, loops) => {
  console.log('persisting audio loop data');
  console.log(loops);
  config.set('audioLoops', loops)
});

ipcMain.on('persist-midi-devices', (e, devices) => {
  console.log('persisting midi devices');
  console.log(devices);
  config.set('midiDevices', devices)
});


// MENU TEMPLATE --------------------------------------------------------
const mainMenuTemplate = [
  {
    label:'APP',
    submenu:[
      {
        label:'Quit',
        accelerator: process.platform == 'darwin'
        ? 'Command+Q'
        : 'Ctrl+Q',
        click(){
          ensureCleanup();
          app.quit();
        }
      }
    ]
  }
];

// add devtools if not in production
if (process.env.NODE_ENV !== 'production') {
  mainMenuTemplate.push({
    label: 'DevTools',
    submenu:[
      {
        label: 'Toggle DevTools',
        accelerator: process.platform == 'darwin'
        ? 'Command+I'
        : 'Ctrl+I',
        click(item, focusedWindow) {
          focusedWindow.toggleDevTools();
        }
      },
      {type: 'separator'},
      {
        role: 'reload'
      },
      {
        label: 'Show Experiment Window',
        accelerator: process.platform == 'darwin'
        ? 'Command+X'
        : 'Ctrl+X',
        click(item, focusedWindow) {
          const xwin = new BrowserWindow({
            frame:true,
            title:'Experiment Window',
            webPreferences: {
              nodeIntegration: true // bc fk ur security
            }
          })
          xwin.loadFile(path.join(__dirname, 'experimentWindow.html'))
        }
      }
    ]
  })
}

// APP STARTUP =====================================================================================
if (os.platform === 'darwin') {
  // show proper icon in dock if on mac
  const image = electron.nativeImage.createFromPath(
    app.getAppPath() + "/assets/icons/mac/icon.icns"
  );
  console.log(`Retrieving icon image from: ${app.getAppPath() + iconPath}`);
  app.dock.setIcon(image);
}

function OnAppReady() {
  // build menu from template
  mainMenu = Menu.buildFromTemplate(mainMenuTemplate);
  Menu.setApplicationMenu(mainMenu);

  createConnectWindow();
}

app.allowRendererProcessReuse = false; // will default to 'true' in electron 9
app.on('ready', OnAppReady);
