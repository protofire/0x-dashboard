const express = require('express');
const Constants = require('./constants');
const Web3 = require('web3');
const path = require('path');
const TradeService = require('./tradeService');
const app = express();
const cors = require('cors');



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
let paramCurrency = process.env.CURRENCY || Constants.FIAT_CURRENCY_DEFAULT;
const port = process.env.PORT || 8080;


let fiatCurrencyInfo = Constants.FIAT_CURRENCY_MAP[paramCurrency] || Constants.FIAT_CURRENCY_MAP[Constants.FIAT_CURRENCY_DEFAULT];

/*** Web3 ***/

let web3 = new Web3(ZeroClientProvider({getAccounts: (cb) => { cb(null, []); }, rpcUrl: Constants.INFURA_API_URL}));

app.use(cors()); // enable CORS

// app.use('/api', [authController]);
app.use('/', express.static(path.join(__dirname, '../build')));

app.get('/', function(req,res){
    res.sendFile(path.join(__dirname, '../build/index.html'));
});

app.get('/trades', function(req,res){

    res.json({
        success: true,
        trades: tradeService.getLast24TradeData()
    })
});


let tradeService;

app.listen(port, function () {

    console.log('Listening on:', port);

    tradeService = new TradeService(web3, fiatCurrencyInfo);

    tradeService.init();
});
