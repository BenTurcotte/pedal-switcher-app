const electron = require('electron');
const {ipcRenderer} = electron;
const mainWindowApp = angular.module('mainWindowApp', []);

mainWindowApp.run(function($rootScope) {
  let c = ipcRenderer.sendSync('get-prev-connection');
  $rootScope.boxAddress = c.address;
  $rootScope.boxPort = c.port;
});

mainWindowApp.controller('loopsCtrl', function($scope) {
  const audioLoops = ipcRenderer.sendSync('get-audio-loops-config', '');
  if (audioLoops) {
    $scope.loops = audioLoops;
    // assume if there are less than 8 loop specified, loops are populated from lowest # to highest
    while ($scope.loops.length < 8) {
      $scope.loops.push({
        name: "(empty)",
        engagged: false
      });
    }
  }
  else {
    $scope.loops = Array(8).fill({
      name: "(empty)",
      engagged: false
    });
  }
  $scope.loops.forEach(element => {
    element.toggleState = () => {
      element.engagged = !element.engagged;
      ipcRenderer.send('send-box-cmd-audio-preset-change', $scope.loops.map(l => l.engagged));
      ipcRenderer.send('persist-audio-loops', $scope.loops);
    }
  });
  // ensure app is in sync with box
  ipcRenderer.send('persist-audio-loops', $scope.loops);
  ipcRenderer.send('send-box-cmd-audio-preset-change', $scope.loops.map(l => l.engagged));
});

mainWindowApp.controller('midiDevicesCtrl', function($scope) {
  const devices = ipcRenderer.sendSync('get-midi-devices-config', '');
  $scope.devices = devices;
  $scope.devices.forEach(device => {

    // PC commands
    device.pc.sendCommand = () => {
      ipcRenderer.send('send-box-cmd-midi', {
        channel: device.channel,
        type: 'PC',
        byte1: device.pc.currentValue
      });
    };
    
    // knobs/sliders
    device.cc.knobs.forEach(knob => {
      knob.onValueChanged = () => {
        ipcRenderer.send('send-box-cmd-midi', {
          channel: device.channel,
          type: 'CC',
          byte1: knob.param,
          byte2: knob.currentValue
        });
      };
    });
    
    // selectors (multi-option switches)
    device.cc.selectors.forEach(sel => {
      sel.onValueChanged = () => {
        console.log(`${sel.name} value changed to ${sel.currentValue}`)
        ipcRenderer.send('send-box-cmd-midi', {
          channel: device.channel,
          type: 'CC',
          byte1: sel.param,
          byte2: sel.currentValue
        });
      };
    });

    // one-shot cc commands
    device.cc.singles.forEach(sgl => {
      sgl.sendCommand = () => {
        ipcRenderer.send('send-box-cmd-midi', {
          channel: device.channel,
          type: 'CC',
          byte1: sgl.param,
          byte2: sgl.value
        });
      }
    })
  });
  // NOTE: use $scope.$apply to apply changes immediately for ipcRender.on event subscriptions
  // $scope.$apply(() => {
  //   // update $scope variables here!
  //   });
});