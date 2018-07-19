const express = require('express');
const Constants = require('./constants');
const Web3 = require('web3');
const path = require('path');
const Logger = require('./logger');
const FetchTradeData = require('./fetchTradeData');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);


/******************************************************************************/
/* Provider Engine Wrapper */
/******************************************************************************/
const Web3ProviderEngine = require('web3-provider-engine/index');
const FilterSubprovider = require('web3-provider-engine/subproviders/filters');
const FetchSubprovider = require('web3-provider-engine/subproviders/fetch');


function ZeroClientProvider(opts) {
    opts = opts || {rpcUrl: undefined};

    const engine = new Web3ProviderEngine();

    const filterSubprovider = new FilterSubprovider();
    engine.addProvider(filterSubprovider);

    const fetchSubprovider = new FetchSubprovider({rpcUrl: opts.rpcUrl});
    engine.addProvider(fetchSubprovider);

    engine.start();

    return engine;
}

/* Look up currency */
let paramDebug = process.env.DEBUG;
let paramCurrency = process.env.CURRENCY || Constants.FIAT_CURRENCY_DEFAULT;
const port = process.env.PORT || 8080;

if (paramDebug) {
    Logger.enable();
} else {
    Logger.disable();
}

let fiatCurrencyInfo = Constants.FIAT_CURRENCY_MAP[paramCurrency] || Constants.FIAT_CURRENCY_MAP[Constants.FIAT_CURRENCY_DEFAULT];

/*** Web3 ***/

let web3 = new Web3(ZeroClientProvider({getAccounts: (cb) => { cb(null, []); }, rpcUrl: Constants.INFURA_API_URL}));

// app.use('/api', [authController]);

app.get('/',function(req,res){
    res.sendFile(path.join(__dirname, '../client/index.html'));
});

io.on('connection', function (socket) {
    socket.emit('news', { hello: 'world' });
    socket.on('my other event', function (data) {
        console.log(data);
    });
});

app.listen(port, function () {

    console.log('Listening on:', port);

    const fetchData = new FetchTradeData(web3, fiatCurrencyInfo);

    fetchData.init();
});
