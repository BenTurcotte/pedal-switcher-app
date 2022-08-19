class MidiCcParameter {
    name;
    id;
    value;
    minValue;
    maxValue;
    legalValues;
}

class MidiConfig {
    channel;
    ccParameters;
    defaultSetting; // of via CC, or "always-on" PC, etc.
}

class Pedal {
    constructor(name, loop) {
        this.name = name;
        this.loop = loop;
        this.midiConfig = new MidiConfig();
    }
    
}
