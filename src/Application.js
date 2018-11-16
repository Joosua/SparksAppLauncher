const os = require('os-utils');
const AppInstance = require('./AppInstance');
const GameSparks = require('./GameSpark.js');

class Application {
    constructor(config) {
        this._instances = [];
        this._ports = [];
        this._folder = "";
        this._file = "";
        this._arguments = [];
        this._timeout = -1;

        this.setConfig(config.application);

        os.loadavg(5);
        os.cpuUsage(this._onCpuLoad.bind(this));
        os.cpuFree(this._onCpuFree.bind(this));

        this._sparks = new GameSparks(config.gameSpark);
        this._sparks.on(GameSparks.EVENTS.OnStatusChanged, this._onConnectionChanged.bind(this));
        this._sparks.on(GameSparks.EVENTS.OnMessage, this._onMessage.bind(this));
        this._sparks.on(GameSparks.EVENTS.OnEventResponse, this._onResponse.bind(this));
    }

    /**
     * Setup configuration
     * @param {object|null} config options. If null use Application.DEFAULT_SETTINGS.
     */
    setConfig(config) {
        if (config === undefined) {
            console.error("application config data is missing from config.json.");
            process.exit(1);
        }

        for (let i = 0; i < config.ports.length; ++i) {
            let p = config.ports[i];
            for (let j = p.start; j < p.end; j++) {
                this._ports.push(j);
            }
        }
        this._ports.sort();

        this._folder = config.binFolder;
        this._file = config.fileName;
        this._arguments = config.starupArgs;
        this._timeout = config.timeout * 60 * 1000;
    }

    /**
     * Start hosting
     */
    startHost() {
        this._sparks.start();
    }

    /**
     * Stop hosting and kill all running application instances.
     */
    stopHost() {
        for(let i = 0; i < this._instances.length; ++i) {
            this._instances[i].stop();
        }
        this._instances = [];
    }

    _onConnectionChanged(status) {
        switch(status) {
            case GameSparks.STATUS.CONNECTED:
            break;
        }
    }

    _getFreePort() {
        if (this._ports.length === 0)
            return null;
        return this._ports[0];
    }

    _onMessage(message) {
        console.log("Message:", JSON.stringify(message, null, 2));
        switch(message.extCode)
        {
            case 'START_GAMESERVER':
            let port = this._getFreePort();
            if (port === null) {
                console.warn("Can't start new instance: all ports are taken.");
                // @TODO send respond back to spark
                return;
            }
            let app = this._createInstance(this._folder, this._file, this._arguments, port, this._timeout);
            app.start();
            break;
        }
    }

    _onResponse(event, message) {
        console.log(event, message);
    }

    /**
     * Start new application instance for given file and port
     * @param {string} folder path
     * @param {string} file name
     * @param {array} args array of start up arguments
     * @param {number} port number
     * @param {number} timeout auto shutdown time in ms. Auto shutdown is disabled when timeout value is less than zero.
     */
    _createInstance(folder, file, args, port, timeout) {
        let instance = new AppInstance(folder, file, args, port, timeout);
        instance.on(AppInstance.EVENTS.OnStatusChanged, this._onApplicationStatus.bind(this));
        return instance;
    }

    _onApplicationStatus(instance, status) {
        switch (status) {
            case AppInstance.STATUS.RUNNING:
                this._addInstance(instance);
            break;
            case AppInstance.STATUS.SHUTDOWN:
                this._removeInstance(instance);
            break;
        }
    }

    _removeInstance(instance) {
        this._ports.push(instance.port);
        this._ports.sort();
        this._instances = this._instances.filter(i => i !== instance);
        instance.removeListener(AppInstance.EVENTS.OnStatusChanged, this._onApplicationStatus.bind(this));
    }

    _addInstance(instance) {
        this._ports = this._ports.filter(p => p !== instance.port);
        this._instances.push(instance);
    }

    _onCpuLoad(value) {
        console.log('CPU Usage (%): ' + value);
    }

    _onCpuFree(value) {
        console.log('CPU Free (%): ' + value);
    }
}

module.exports = Application;