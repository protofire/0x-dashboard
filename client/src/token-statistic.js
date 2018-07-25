import React, {Component} from 'react';
import BigNumber  from 'bignumber.js';
import Constants from "./constants";
import axios from "axios";
import { formatTokenWebsiteLink, formatPrice, formatTokenLink } from './utils';

class TokenStatistic extends Component {
    fiatCurrencyInfo = Constants.FIAT_CURRENCY_MAP["USD"];
    tokenPrices = {};

    constructor(props) {
        super(props);

        this.state = {
            isUpdatedStatistic: false,
            statistics: { fees: {totalFees: new BigNumber(0)}, volume: {totalVolumeFiat: new BigNumber(0)}, counts: {} }
        }
    }

    componentWillReceiveProps() {
        this.updatePrices();
    }

    updateStatistics() {
        let statistics = { fees: {}, volume: {}, counts: {} };
        statistics.fees.totalFees = new BigNumber(0);
        statistics.fees.relays = {};
        statistics.fees.feeCount = 0;
        statistics.fees.feelessCount = 0;
        statistics.fees.totalFeesFiat = null;
        statistics.fees.zrxPrice = null;
        statistics.volume.totalTrades = 0;
        statistics.volume.totalVolumeFiat = new BigNumber(0);
        statistics.volume.tokens = {};
        statistics.counts.relays = {};

        for (let trade of this.props.tradeData) {

            let relayAddress = trade.relayAddress;
            let relayFee = trade.makerFee.plus(trade.takerFee);

            if (statistics.fees.relays[relayAddress] === undefined)
                statistics.fees.relays[relayAddress] = new BigNumber(0);

            /* Fee per relay and total relay fees */
            statistics.fees.relays[relayAddress] = statistics.fees.relays[relayAddress].plus(relayFee);
            statistics.fees.totalFees = statistics.fees.totalFees.plus(relayFee);

            /* Fee vs Feeless trade count */
            if (!relayFee.eq(0))
                statistics.fees.feeCount += 1;
            else
                statistics.fees.feelessCount += 1;

            /*** Trades per relay ***/

            if (statistics.counts.relays[relayAddress] === undefined)
                statistics.counts.relays[relayAddress] = 0;

            statistics.counts.relays[relayAddress] += 1;

            /*** Token volume and count statistics ***/

            let makerToken = trade.makerToken;
            let takerToken = trade.takerToken;
            let makerVolume = trade.makerVolume;
            let takerVolume = trade.takerVolume;
;
            let makerTokenSymbol = trade.makerNormalized ? (Constants.ZEROEX_TOKEN_INFOS[makerToken] || {}).symbol : null;
            let takerTokenSymbol = trade.takerNormalized ? (Constants.ZEROEX_TOKEN_INFOS[takerToken] || {}).symbol : null;

            if (statistics.volume.tokens[makerToken] === undefined)
                statistics.volume.tokens[makerToken] = {
                    volume: new BigNumber(0),
                    volumeFiat: new BigNumber(0),
                    count: 0
                };
            if (statistics.volume.tokens[takerToken] === undefined)
                statistics.volume.tokens[takerToken] = {
                    volume: new BigNumber(0),
                    volumeFiat: new BigNumber(0),
                    count: 0
                };

            /* Volume per token */
            statistics.volume.tokens[makerToken].volume = statistics.volume.tokens[makerToken].volume.plus(makerVolume);
            statistics.volume.tokens[takerToken].volume = statistics.volume.tokens[takerToken].volume.plus(takerVolume);

            /* Fiat volume per token */
            if (makerTokenSymbol && this.tokenPrices[makerTokenSymbol]) {
                let fiatMakerVolume = makerVolume.times(this.tokenPrices[makerTokenSymbol]);
                statistics.volume.tokens[makerToken].volumeFiat = statistics.volume.tokens[makerToken].volumeFiat.plus(fiatMakerVolume);
                statistics.volume.totalVolumeFiat = statistics.volume.totalVolumeFiat.plus(fiatMakerVolume);
            }
            if (takerTokenSymbol && this.tokenPrices[takerTokenSymbol]) {
                let fiatTakerVolume = takerVolume.times(this.tokenPrices[takerTokenSymbol]);
                statistics.volume.tokens[takerToken].volumeFiat = statistics.volume.tokens[takerToken].volumeFiat.plus(fiatTakerVolume);
                statistics.volume.totalVolumeFiat = statistics.volume.totalVolumeFiat.plus(fiatTakerVolume);
            }
            /* Trade count per token and total trades */
            statistics.volume.tokens[makerToken].count += 1;
            statistics.volume.tokens[takerToken].count += 1;
            statistics.volume.totalTrades += 1;
        }

        /* Compute relay fees in fiat currency, if available */
        let zrxPrice = this.tokenPrices['ZRX'];
        if (zrxPrice) {
            statistics.fees.totalFeesFiat = statistics.fees.totalFees.times(zrxPrice);
            statistics.fees.zrxPrice = new BigNumber(zrxPrice);
        }

        this.setState({statistics: statistics, isUpdatedStatistic: true});

    }

    async updatePrices() {

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
            Constants.PRICE_API_URL(querySymbols[0], this.fiatCurrencyInfo.code),
            Constants.PRICE_API_URL(querySymbols[1], this.fiatCurrencyInfo.code)
        ];

        for (let endpoint of endpoints) {
            let prices;

            try {
                prices = (await axios(endpoint)).data;
            } catch (error) {
                // await Model.delay(Math.floor(Constants.PRICE_UPDATE_TIMEOUT/2));
                await this.updatePrices();
                return;
            }


            /* Extract prices */
            for (let token in prices)
                this.tokenPrices[token] = prices[token][this.fiatCurrencyInfo.code];

            /* Map WETH to ETH */
            if (this.tokenPrices['ETH'])
                this.tokenPrices['WETH'] = this.tokenPrices['ETH'];
        }

        /* Update statistics */
        this.updateStatistics();

        // await Model.delay(Constants.PRICE_UPDATE_TIMEOUT);
        // await this.updatePrices();
    }

    listTokens() {
        /* Token Volumes */
        let tokens = Object.keys(this.state.statistics.volume.tokens);

        /* Filter tokens by existence in registry */
        tokens = tokens.filter((token) => Constants.ZEROEX_TOKEN_INFOS[token] !== undefined);

        /* Sort tokens by fiat volume */
        tokens.sort((a, b) => Number(this.state.statistics.volume.tokens[a].volumeFiat.lt(this.state.statistics.volume.tokens[b].volumeFiat)) - 0.5);

        return tokens.map((token, index) => {
            let volume = this.state.statistics.volume.tokens[token].volume.toFixed(6);
            if (this.state.statistics.volume.tokens[token].volumeFiat.gt(0)) {
                volume += " (" + formatPrice(this.state.statistics.volume.tokens[token].volumeFiat) + ")";
            }
            return (
                <tr key={index}>
                    <th>{formatTokenWebsiteLink(token)}</th>
                    <td>{volume}</td>
                </tr>
            )
        })
    }

    render() {
        let aggregateVolume = "";
        if (this.state.statistics.volume.totalVolumeFiat.gt(0)) {
            aggregateVolume = (
                <tr>
                    <th>Aggregate Volume</th>
                    <td>{formatPrice(this.state.statistics.volume.totalVolumeFiat)}</td>
                </tr>
            );
        }

        /* ZRX Fees */
        let totalRelayFees = this.state.statistics.fees.totalFees.toFixed(6);
        if (this.state.statistics.fees.totalFeesFiat) {
            totalRelayFees += " (" + formatPrice(this.state.statistics.fees.totalFeesFiat) + ")";
        }

        let relayFees = (
            <tr>
                <th>{formatTokenLink(Constants.ZEROEX_TOKEN_ADDRESS) }<span>Relay Fees</span></th>
                <td>{totalRelayFees}</td>
            </tr>
        );

        let tBody = (<tbody></tbody>);
        if (this.state.isUpdatedStatistic) {
            tBody = (
                <tbody>
                    {aggregateVolume}
                    {relayFees}
                    {this.listTokens.call(this)}
                </tbody>
            )
        }

        return (
            <div>
                <h2>Volume 24h</h2>
                <div className="row">
                    <table className="table table-condensed table-sm volume-statistics">
                        {tBody}
                    </table>
                </div>
            </div>
        )
    }

}

export default TokenStatistic

