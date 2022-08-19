// Thanks to Cameron Nokes.
// Reference: https://medium.com/cameron-nokes/how-to-store-user-data-in-electron-3ba6bf66bc1e
//
// user-data.json paths:
// Mac OS: ~/Library/Application Support/<Your App Name (taken from the name property in package.json)>
// Windows: C:\Users\<you>\AppData\Local\<Your App Name>
// Linux: ~/.config/<Your App Name>

const electron = require('electron');
const path = require('path');
const fs = require('fs');

class Store {
  constructor(opts) {
    const userDataPath = (electron.app || electron.remote.app).getPath('userData');
    this.path = path.join(userDataPath, opts.configName + '.json');
    this.data = parseDataFile(this.path, opts.defaults ?? {});
    console.log(`User data path: ${this.path}`);
  }
  
  get(key) {
    return this.data[key];
  }
  
  set(key, val) {
    console.log(`key: ${key}\nval: ${val}`);
    this.data[key] = val;
    try {
      fs.writeFileSync(this.path, JSON.stringify(this.data, null, 4));
    } catch (error) {
      console.log(error);
    }
  }
}

function parseDataFile(filePath, defaults) {
  try {
    return JSON.parse(fs.readFileSync(filePath));
  } catch(error) {
    // if there was some kind of error, return the passed in defaults instead.
    return defaults;
  }
}

module.exports = Store;