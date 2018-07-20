const Logger = require('./logger');
const { Web3Wrapper } = require('@0xproject/web3-wrapper');
const {
    ZeroEx,
    ExchangeEvents,
    BlockParamLiteral
} = require('0x.js');
const { BigNumber } = require('@0xproject/utils');
const Constants = require('./constants');
const fetch = require("node-fetch");

class TradeService {

    constructor(web3, fiatCurrencyInfo) {
        this._web3Wrapper = new Web3Wrapper(web3.currentProvider, {});
        this._web3 = web3;

        this._trades = [];
        this._tradesSeen = {};
        this._blockTimestamps = {};
        this._initialFetchDone = false;

        this._tokenPrices = {};
        this._fiatCurrencyInfo = fiatCurrencyInfo;
        this._priceVolumeHistory = new PriceVolumeHistory();
    }

    async init() {
        /* Fetch the network id */
        try {
            this._networkId = await this._web3Wrapper.getNetworkIdAsync();
        } catch (err) {
            Logger.log('[Model] Error determining network version');
            Logger.error(err);

        }

        Logger.log('[Model] Network ID: ' + this._networkId);


        /* Create our ZeroEx instance */
        this._zeroEx = new ZeroEx(this._web3Wrapper.getCurrentProvider(), {networkId: this._networkId});

        /* Set global exchange address (FIXME read-only override) */
        Constants.ZEROEX_EXCHANGE_ADDRESS = this._zeroEx.exchange.getContractAddress();

        /* Determine block height */
        try {
            this._blockHeight = await this._web3Wrapper.getBlockNumberAsync();
        } catch (err) {
            Logger.log('[Model] Error determining block height');
            Logger.error(err);

        }

        Logger.log('[Model] Block height: ' + this._blockHeight);


        /* Fetch token registry */
        try {
            let tokens = await this._zeroEx.tokenRegistry.getTokensAsync();

            for (let token of tokens) {
                /* Capture ZRX token address (FIXME read-only override) */
                if (token.symbol === "ZRX")
                    Constants.ZEROEX_TOKEN_ADDRESS = token.address;

                if (!Constants.ZEROEX_TOKEN_INFOS[token.address]) {
                    Constants.ZEROEX_TOKEN_INFOS[token.address] = {
                        decimals: token.decimals,
                        name: token.name,
                        symbol: token.symbol,
                        website: null
                    };
                }
            }
        } catch (err) {
            Logger.log('[Model] Error fetching token registry');
            Logger.error(err);
        }

        /* Update all token prices */
        this._updatePrices();

        /* Subscribe to new fill logs */
        this._zeroEx.exchange.subscribe(ExchangeEvents.LogFill, {}, (err, decodedLog) => { this._onLogFillEvent(err, decodedLog); });

        /* Fetch past fill logs */
        await this.fetchPastTradesDuration(Constants.STATISTICS_TIME_WINDOW);

        this._initialFetchDone = true;

/*        /!* Call fetching callback with done *!/
        this._callbacks.onFetching(this._trades.length, true);*/

    }

    getTradeData() {
        return this._trades;
    }

    async fetchPastTrades(count) {
        let fromBlock = this._oldestBlockFetched ? this._oldestBlockFetched - count : this._blockHeight - count;
        let toBlock = this._oldestBlockFetched ? this._oldestBlockFetched : BlockParamLiteral.Latest;

        Logger.log('[Model] Fetching ' + count + ' past logs from ' + fromBlock + ' to ' + toBlock);

        /* Clamp to 0x genesis block */
        if (fromBlock < Constants.ZEROEX_GENESIS_BLOCK[this._networkId])
            fromBlock = Constants.ZEROEX_GENESIS_BLOCK[this._networkId];

        this._oldestBlockFetched = fromBlock;

        let logs = await this._zeroEx.exchange.getLogsAsync(ExchangeEvents.LogFill, {fromBlock: fromBlock, toBlock: toBlock}, {});

        for (let log of logs) {
            await this._onLogFillEvent(null, {isRemoved: false, log: log});
        }
    }

    async fetchPastTradesDuration(duration) {
        let currentTimestamp = Math.round((new Date()).getTime() / 1000);

        let oldestFetchedTimestamp = this._oldestBlockFetched ?
            await this._getBlockTimestamp(this._oldestBlockFetched) : currentTimestamp;

        if ((currentTimestamp - oldestFetchedTimestamp) < duration) {
            await this.fetchPastTrades(Constants.BLOCK_FETCH_COUNT);
            await this.fetchPastTradesDuration(duration);
        }
    }

    async _updatePrices() {
        Logger.log('[Model] Fetching token prices');

        /* Split symbols from token registry into two queries */
        let numSymbols = Object.keys(Constants.ZEROEX_TOKEN_INFOS).length;
        let querySymbols = [['ETH'], []];
        let count = 0;
        for (let key in Constants.ZEROEX_TOKEN_INFOS) {
            if (count < numSymbols/2)
                querySymbols[0].push(Constants.ZEROEX_TOKEN_INFOS[key].symbol);
            else
                querySymbols[1].push(Constants.ZEROEX_TOKEN_INFOS[key].symbol);

            count += 1;
        }

        let endpoints = [
            Constants.PRICE_API_URL(querySymbols[0], this._fiatCurrencyInfo.code),
            Constants.PRICE_API_URL(querySymbols[1], this._fiatCurrencyInfo.code)
        ];

        for (let endpoint of endpoints) {
            let prices;

            try {
                prices = await fetch(endpoint);
                Logger.log('GEt Json, prices', prices);
            } catch (error) {
                Logger.error('[Model] Error fetching token prices:');
                Logger.error(error);

                Logger.log('[Model] Retrying in half update timeout');
                await this.delay(Math.floor(Constants.PRICE_UPDATE_TIMEOUT/2));
                await this._updatePrices();
                return;
            }

            Logger.log('[Model] Got token prices');
            Logger.log(prices);

            /* Extract prices */
            for (let token in prices)
                this._tokenPrices[token] = prices[token][this._fiatCurrencyInfo.code];

            /* Map WETH to ETH */
            if (this._tokenPrices['ETH'])
                this._tokenPrices['WETH'] = this._tokenPrices['ETH'];
        }

        await this.delay(Constants.PRICE_UPDATE_TIMEOUT);
        await this._updatePrices();
    }

    async _onLogFillEvent(err, decodedLog) {
        if (err) {
            Logger.error('[Model] Got Log Fill event error:');
            Logger.error(err);
            return;
        }

        Logger.log('[Model] Got Log Fill event');

        let log = decodedLog;

        /* If we've already processed this trade, skip it */
        if (this._tradesSeen[log.log.transactionHash + log.log.args.orderHash])
            return;

        let trade = {};
        trade.txid = log.log.transactionHash;
        trade.blockNumber = log.log.blockNumber;
        trade.takerAddress = log.log.args.taker;
        trade.makerAddress = log.log.args.maker;
        trade.feeAddress = log.log.args.feeRecipient;
        trade.takerToken = log.log.args.takerToken;
        trade.makerToken = log.log.args.makerToken;
        trade.makerVolume = log.log.args.filledMakerTokenAmount;
        trade.takerVolume = log.log.args.filledTakerTokenAmount;
        trade.makerFee = log.log.args.paidMakerFee;
        trade.takerFee = log.log.args.paidTakerFee;
        trade.orderHash = log.log.args.orderHash;
        trade.mtPrice = null;
        trade.tmPrice = null;
        trade.makerNormalized = false;
        trade.takerNormalized = false;

        /* Look up relay */
        if (Constants.ZEROEX_RELAY_ADDRESSES[this._networkId][trade.feeAddress]) {
            trade.relayAddress = trade.feeAddress;
        } else if (!(new BigNumber(trade.feeAddress, 16)).eq(0)) {
            trade.relayAddress = trade.feeAddress;
        } else if (Constants.ZEROEX_RELAY_ADDRESSES[this._networkId][trade.takerAddress]) {
            trade.relayAddress = trade.takerAddress;
        } else if (Constants.ZEROEX_RELAY_ADDRESSES[this._networkId][trade.makerAddress]) {
            trade.relayAddress = trade.makerAddress;
        } else {
            trade.relayAddress = trade.feeAddress;
        }

        /* Normalize traded volume and fee quantities */
        [trade.makerVolume, trade.makerNormalized] = this._normalizeQuantity(trade.makerToken, trade.makerVolume);
        [trade.takerVolume, trade.takerNormalized] = this._normalizeQuantity(trade.takerToken, trade.takerVolume);
        [trade.makerFee,] = this._normalizeQuantity(Constants.ZEROEX_TOKEN_ADDRESS, trade.makerFee);
        [trade.takerFee,] = this._normalizeQuantity(Constants.ZEROEX_TOKEN_ADDRESS, trade.takerFee);

        /* Compute prices */
        if (trade.makerNormalized && trade.takerNormalized) {
            trade.mtPrice = trade.makerVolume.div(trade.takerVolume);
            trade.tmPrice = trade.takerVolume.div(trade.makerVolume);
        } else if (trade.makerVolume.eq(trade.takerVolume)) {
            /* Special case of equal maker/take quantities doesn't require token
             * decimals */
            trade.mtPrice = new BigNumber(1);
            trade.tmPrice = new BigNumber(1);
        }

        /* Mark this trade as seen */
        this._tradesSeen[log.log.transactionHash + log.log.args.orderHash] = true;

        /* Fetch timestamp associated with this block */
        let timestamp = await this._getBlockTimestamp(trade.blockNumber);

        trade.timestamp = timestamp;

        /* Insert it in the right position in our trades */
        let index;
        for (index = 0; index < this._trades.length; index++) {
            if (this._trades[index].timestamp < trade.timestamp)
                break;
        }
        this._trades.splice(index, 0, trade);

        /* Update our price history for this token pair */
        if (trade.makerNormalized && trade.takerNormalized) {
            this._priceVolumeHistory.insert(Constants.ZEROEX_TOKEN_INFOS[trade.makerToken].symbol,
                Constants.ZEROEX_TOKEN_INFOS[trade.takerToken].symbol,
                trade.timestamp,
                trade.mtPrice.toNumber(), trade.tmPrice.toNumber(),
                trade.makerVolume.toNumber(), trade.takerVolume.toNumber());
        }


    }

    /* Token quantity normalization helper function */

    _normalizeQuantity(token, quantity) {
        if (Constants.ZEROEX_TOKEN_INFOS[token])
            return [quantity.div(Math.pow(10, Constants.ZEROEX_TOKEN_INFOS[token].decimals)), true];

        return [quantity, false];
    }

    /* Blockchain helper functions */

    async _getBlockTimestamp(blockNumber){
        if (this._blockTimestamps[blockNumber])
            return this._blockTimestamps[blockNumber];

        let block = null;

        try {
            block = await this._web3Wrapper.getBlockAsync(blockNumber);
        } catch (error) {
            Logger.error("[Model] Error fetching block number " + blockNumber + ": " + error);
        }

        if (block) {
            Logger.log("[Model] Got block info for " + blockNumber);
            this._blockTimestamps[blockNumber] = block.timestamp;
            return block.timestamp;
        } else {
            Logger.log("[Model] Block info unavailable for " + blockNumber);
            Logger.log("[Model] Retrying in " + Constants.BLOCK_INFO_RETRY_TIMEOUT/1000 + " seconds");
            await this.delay(Constants.BLOCK_INFO_RETRY_TIMEOUT);
            return await this._getBlockTimestamp(blockNumber);
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

}


class PriceVolumeHistory {

    constructor() {
        this._tokens = [];
        this._priceData = {};
        this._volumeData = {};
        this._timestamps = {};
    }

    /* Insert price/volume data for a token pair */
    insert(maker, taker, timestamp, mtPrice, tmPrice, makerVolume, takerVolume) {
        /* Initialize data structures */
        this._initialize(maker, taker);
        this._initialize(taker, maker);

        /* Find index for this data */
        let index = 0;
        for (index = 0; index < this._timestamps[maker][taker].length; index++) {
            if (this._timestamps[maker][taker][index] > timestamp)
                break;
        }

        /* Create date object */
        let date = new Date(timestamp*1000);

        /* Save the timestamp and prices */
        this._timestamps[maker][taker].splice(index, 0, timestamp);
        this._timestamps[taker][maker].splice(index, 0, timestamp);
        this._priceData[maker][taker].splice(index, 0, {x: date, y: mtPrice});
        this._priceData[taker][maker].splice(index, 0, {x: date, y: tmPrice});
        this._volumeData[maker][taker].splice(index, 0, {x: date, y: takerVolume});
        this._volumeData[taker][maker].splice(index, 0, {x: date, y: makerVolume});
    }

    /* Get price data for a token pair */
    getPriceData(tokenPair) {
        let [quote, base] = tokenPair.split("/");

        if (this._priceData[base] && this._priceData[base][quote])
            return this._priceData[base][quote];

        return [];
    }

    /* Get volume data for a token pair */
    getVolumeData(tokenPair) {
        let [quote, base] = tokenPair.split("/");

        if (this._volumeData[base] && this._volumeData[base][quote])
            return this._volumeData[base][quote];

        return [];
    }

    /* Get token pairs */
    getTokens() {
        return this._tokens;
    }

    /* Prune old data outside of statistics window */
    prune() {
        let currentTimestamp = Math.round((new Date()).getTime() / 1000);
        let cutoffTimestamp = currentTimestamp - Constants.STATISTICS_TIME_WINDOW;

        let pruned = false;

        for (let maker in this._timestamps) {
            for (let taker in this._timestamps) {
                while (this._timestamps[maker][taker] && this._timestamps[maker][taker][0] < cutoffTimestamp) {
                    this._timestamps[maker][taker].shift();
                    this._timestamps[taker][maker].shift();
                    this._priceData[maker][taker].shift();
                    this._priceData[taker][maker].shift();
                    this._volumeData[maker][taker].shift();
                    this._volumeData[taker][maker].shift();

                    if (this._timestamps[maker][taker].length == 0) {
                        this._tokens.splice(this._tokens.indexOf(maker + "/" + taker), 1);
                        this._tokens.splice(this._tokens.indexOf(taker + "/" + maker), 1);
                    }

                    pruned = true;
                }
            }
        }

        return pruned;
    }

    /* Initialize state for maker/taker tokens a and b */
    _initialize(a, b) {
        if (this._priceData[a] === undefined) {
            this._priceData[a] = {};
            this._volumeData[a] = {};
            this._timestamps[a] = {};
        }
        if (this._priceData[a][b] === undefined) {
            this._priceData[a][b] = [];
            this._volumeData[a][b] = [];
            this._timestamps[a][b] = [];
            this._tokens.push(a + "/" + b);
            this._tokens.sort();
        }
    }
}

module.exports = TradeService;