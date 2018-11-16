const EventEmitter = require('events');
const Sparks = require("gamesparks-node");


class GameSpark extends EventEmitter {
    constructor(config) {
        super();
        this._config = config;
        this._status = GameSpark.STATUS.DISCONNECTED;
        this._userId = null;
    }

    get status() {
        return this._status;
    }

    set status(value) {
        this._status = value;
        this.emit(GameSpark.EVENTS.OnStatusChanged, value);
    }

    /**
     * Connect to GameSpark server
     */
    start() {
        if (this._config.stage === "Live") {
            Sparks.initLiveListener(
                this._config.apiKey, this._config.serverSecret, 10,
                this._onMessage.bind(this), this._onInit.bind(this),
                this._onError.bind(this)
            );
        }
        else {
            Sparks.initPreviewListener(
                this._config.apiKey, this._config.serverSecret, 10,
                this._onMessage.bind(this), this._onInit.bind(this),
                this._onError.bind(this)
            );
        }
    }

    /**
     * Send event from server to GameSpark
     * @param {string} eventKey GameSpark event key
     * @param {object} key value pair of event data. e.g. { arg1: 1, arg2: "test" }
     */
    sendEvent(eventKey, data) {
        if (this._status === GameSpark.STATUS.DISCONNECTED) {
            console.log("Send Event Failed:", "Connection to GameSparks is disconnected.");
            return;
        }

        let evtData = { "eventKey": eventKey };
        for (let id in data) {
            evtData[id] = data[id];
        }

        Sparks.sendAs(this._userId, ".LogEventRequest", evtData, this._onEventResponse.bind(this, eventKey));
    }

    _onEventResponse(key, error, response) {
        if (error) {
            console.log(error.message);
            return;
        }

        console.log(JSON.stringify(response));
        this.emit(GameSpark.EVENTS.OnEventResponse, key, response);
    }

    _authenticate() {
        Sparks.sendAs(null, ".AuthenticationRequest", {
            userName: this._config.user.username,
            password: this._config.user.password
        }, this._onAuthenticate.bind(this));
    }

    _onInit() {
        console.log("GameSparks is ready, Authenticating ...");
        this._authenticate();
    }

    _onAuthenticate(error, response) {
        if (error) {
            console.log("Authentication failed: ", error.message);
            this._playerId = null;
            process.exit(1);
            return;
        }

        if (response.error) {
            console.log("Authentication failed: ", response.error.DETAILS);
            this._playerId = null;
            process.exit(1);
            return;
        }

        this._userId = response.userId;
        this.status = GameSpark.STATUS.CONNECTED;
        console.log("Connected to GameSparks ...");
    }

    _onMessage(message) {
        this.emit(GameSpark.EVENTS.OnMessage, message);
    }

    _onError(error) {
        console.log(error);
        process.exit(1);
    }
}

GameSpark.EVENTS = {
    OnStatusChanged: "OnStatusChanged",
    OnMessage: "OnMessage",
    OnEventResponse: "OnEventResponse"
};

GameSpark.STATUS = {
    DISCONNECTED: 0,
    CONNECTED: 1
};

module.exports = GameSpark;