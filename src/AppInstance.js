const EventEmitter = require('events');
const cp = require('child_process');

class AppInstance extends EventEmitter {
    constructor(folder, file, port, timeout) {
        super();
        this._folder = folder;
        this._file = file;
        this._port = port;
        this._status = AppInstance.STATUS.INIT;
        this._process = null;
        this._timeout = timeout;
        this._timeoutTimer = null;
    }

    get port() {
        return this._port;
    }

    get status() {
        return this._status;
    }

    set status(value) {
        if (value === this._status) {
            return;
        }
        this._status = value;
        this.emit(AppInstance.EVENTS.OnStatusChanged, this, this._status);
    }

    get process() {
        return this._process;
    }

    get timeout() {
        return this._timeout;
    }

    /**
     * Start application processs
     */
    start() {
        if (this._process !== null) {
            console.warn('Apllication is already running');
            return;
        }
        console.log('Starting new apllication ' + this._file + ':' + this._port + '.');
        this._process = cp.spawn(this._folder + this._file, [/*"-quit", "-batchmode", */"-port", this._port]);
        this._process.on('exit', this._onExit.bind(this));
        this.status = AppInstance.STATUS.RUNNING;

        if (this._timeout > 0.0) {
            this._timeoutTimer = setTimeout(this.stop.bind(this), this._timeout);
        }
    }

    /**
     * Stop running application and reset all timers.
     */
    stop() {
        if (this._process === null) {
            return;
        }

        this.status = AppInstance.STATUS.SHUTDOWN;
        this._process.kill();
        this._process = null;

        if (this._timeoutTimer !== null) {
            clearTimeout(this._timeoutTimer);
            this._timeoutTimer = null;
        }
    }

    _onExit(code) {
        this.stop();
        console.log("Application " + this._file + ":" + this._port +  " shutdown, code: " + code + ".");
    }
}

AppInstance.EVENTS = {
    OnStatusChanged: 0
};

AppInstance.STATUS = {
    INIT: 0,
    RUNNING: 1,
    SHUTDOWN: 2
};

module.exports = AppInstance;