# how start
1. clone repo
2. do npm things to get the packages n stuff
3. run app w cmd `$ npm run start`

# how config
Location of `user-data.json` depends on OS.
| OS      | Path                           |
|---------|--------------------------------|
| Mac OS  | ~/Library/Application Support/ |
| Windows | C:\Users\AppData\Local\        |
| Linux   | ~/.config/                     |

Contains properties used to configure APP so it reflects how BOX is configured.
4 main "properties":
1. `"address"`
2. `"port"`
3. `"audioLoops"`
4. `"midiDevices"`
Each section is surrounded by squiggle braces {} and delimited by a comma.  More info on json [here](https://www.json.org/json-en.html).

## `address`
IP address of box.  
Might need to turn wifi off on comp to connect to box successfully via ethernet.  

## `port`
Port to use for comm w BOX at specified address

## `audioLoops`
Each audio loop object should consist of 2 properties:
1. engagged
2. name

### `engagged` -- hmmmmmm...  looks like my dumb arse is gonna have to deal with that typo at some point
Indicates whether the audio loop is currently engaged (or the state of that audio loop when BOX was most recently disconnected).
Legal values:
- `true`
- `false`

### `name`
The name to display on the button in APP for this audio loop.
Legal values:
- `"a good pedal"`

Note: fontsize is fixed, so try to keep it under 10 characters

## `midiDevices`
An array of objects that each describe a midi device.

I'll try to remember to do a full write up for this later...  Its basically same same but more

Example:
```json
    "midiDevices": [
        {
            "name": "Warped Vinyl",
            "channel": 6,
            "pc": {
                "min": 0,
                "max": 122,
                "currentValue": 0
            },
            "cc": {
                "knobs": [
                    {
                        "name": "Tone",
                        "param": 14,
                        "min": 0,
                        "max": 127,
                        "currentValue": 64
                    },
                    {
                        "name": "Lag",
                        "param": 15,
                        "min": 0,
                        "max": 127,
                        "currentValue": 64
                    },
                    {
                        "name": "Mix",
                        "param": 16,
                        "min": 0,
                        "max": 127,
                        "currentValue": 64
                    }
                ],
                "selectors": [
                    {
                        "name": "TapDiv",
                        "param": 21,
                        "currentValue": 0,
                        "valueOptions": [
                            {
                                "name": "1/1",
                                "value": 0
                            },
                            {
                                "name": "1/2",
                                "value": 1
                            },
                            {
                                "name": "1/4t",
                                "value": 2
                            },
                            {
                                "name": "1/4",
                                "value": 3
                            },
                            {
                                "name": "1/8",
                                "value": 4
                            },
                            {
                                "name": "1/16",
                                "value": 5
                            }
                        ]
                    },
                    {
                        "name": "Midi Clock Mode",
                        "param": 51,
                        "currentValue": 127,
                        "valueOptions": [
                            {
                                "name": "Ignore",
                                "value": 0
                            },
                            {
                                "name": "Listen",
                                "value": 127
                            }
                        ]
                    }
                ],
                "singles": [
                    {
                        "name": "Bypass",
                        "param": 102,
                        "value": 0
                    },
                    {
                        "name": "Engage",
                        "param": 102,
                        "value": 127
                    },
                    {
                        "name": "Tap",
                        "param": 93,
                        "value": 127
                    }
                ]
            }
        }
    ]
```

# how dev
1. write code
2. make sure kind of works
3. put "TODO:" comment where want to make edit/add
4. put "FIXME:" comment where not work, broken, \[inclusive\]or ugly

## app structure rn
### entry point: main.js  
### >= 2 processes (threads):  
1. main process--only one ever
2. renderer process--could have multiple

main makes `BrowserWindow mainWindow`  
`mainWindow` is on renderer process, `main` is on main process  
pass events back and fourth via ipcRenderer, ipcMain, mainWindow.webContents, et al.
there are some security threats doing it this way...  but i think inly if the app comms w the internet...  LAN is as safe as you make it and we make it safe so the kids have safe place to play.

_end of story bye for now_

# box cmd - experiment: map to midi
## pc messages
PC messages will be used to trigger specific "presets".  
A BOX "preset" consists of:
- length of "preset" in bytes (1 byte--1-253)
- one-hot representation of audio loop states (1 byte total)
- Midi messages to be sent out to midi devices (max total length in bytes: 252)
- CR (1 byte)
- LF (1 byte)
Therefore, a preset is a max of 256 bytes long.

## cc messages
| cc param | Use | Values |
+----------+-----+--------+
|  1 | Loop 1 | 0 = off, 127 = on, 64 = toggle |
|  2 | Loop 2 | 0 = off, 127 = on, 64 = toggle |
|  3 | Loop 3 | 0 = off, 127 = on, 64 = toggle |
|  4 | Loop 4 | 0 = off, 127 = on, 64 = toggle |
|  5 | Loop 5 | 0 = off, 127 = on, 64 = toggle |
|  6 | Loop 6 | 0 = off, 127 = on, 64 = toggle |
|  7 | Loop 7 | 0 = off, 127 = on, 64 = toggle |
|  8 | Loop 8 | 0 = off, 127 = on, 64 = toggle |
+----------+-----+--------+
|  9 | Boost  | 0 = off, 127 = on, 64 = toggle |
| 10 | Tuner  | 0 = off, 127 = on, 64 = toggle |
+----------+-----+--------+

## saving a preset
Use 0xF0 midi msg id a.k.a. "System Exclusive"

from [System Common Messages section of midi docs](https://www.midi.org/specifications-old/item/table-1-summary-of-midi-message):
"System Exclusive.
This message type allows manufacturers to create their own messages (such as bulk dumps, patch parameters, and other non-spec data) and provides a mechanism for creating additional MIDI Specification messages. The Manufacturer's ID code (assigned by MMA or AMEI) is either 1 byte (0iiiiiii) or 3 bytes (0iiiiiii 0iiiiiii 0iiiiiii). Two of the 1 Byte IDs are reserved for extensions called Universal Exclusive Messages, which are not manufacturer-specific. If a device recognizes the ID code as its own (or as a supported Universal message) it will listen to the rest of the message (0ddddddd). Otherwise, the message will be ignored. (Note: Only Real-Time messages may be interleaved with a System Exclusive.)"

| byte 1 | b2 | b3 | b4 | b5 | b6 | b7 | b8 |
+--------+----+----+----+----+----+----+----+
| 
