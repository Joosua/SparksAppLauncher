const config = require('./config.json');
const Applications = require('./src/Application');

let app = new Applications(config);
app.startHost();

process.on('exit', onShutdown.bind("exit"));
process.on('SIGINT', onShutdown.bind("SIGINT"));
process.on('uncaughtException', onShutdown.bind("uncaughtException"));


function onShutdown(code) {
    console.log(code);
    app.stopHost();
}