import React, { Component } from 'react';
import ReactTable from "react-table";
import "react-table/react-table.css";
import axios from "axios";
import * as moment from 'moment';
import BigNumber  from 'bignumber.js';
import Constants from "./constants";
import "./app.css";
import * as Web3  from 'web3';
import { ZeroEx } from '0x.js';
import config from './config';
import TokenStatistic from './token-statistic';
import { formatTokenLink, formatLink, formatRelayLink, formatHex } from './utils';


class App extends Component {

    _networkId = Constants.DEFAULT_NETWORK_ID;
    _priceInverted = false;
    _tradeMoreInfos = {};
    columns = [
        {
            Header: 'Time',
            accessor: 'timestamp',
            width: 200,
            Cell: row => ( <span> { this.formatDate(row.value) }</span> )
        },
        {
            Header: 'Txid',
            accessor: 'txid',
            width: 150,
            Cell: ({ original: trade }) => (
                <span> { formatLink(trade.txid, formatHex(trade.txid, 8), 'tx') }</span> )
        },
        {
            Header: 'Trade',
            accessor: 'makerToken',
            Cell: ({ original: trade }) => (
                <span>
                    <i>{ trade.makerVolume.toFixed(6) }</i> {formatTokenLink(trade.makerToken)}
                    <span>↔</span>
                    <i>{ trade.takerVolume.toFixed(6) }</i> {formatTokenLink(trade.takerToken)}
                </span> )
        },
        {
            Header: 'Price (⇄)',
            accessor: 'mtPrice',
            width: 180,
            Cell: ({ original: trade }) => {
                return (
                    <div onClick={() => this.setState({ priceInverted: !this.state.priceInverted })}>
                        { this.getPrice(trade) }
                    </div>
                )
            }
        },
        {
            Header: 'Relay',
            accessor: 'relayAddress',
            width: 180,
            Cell: ({ original: trade }) => (
                <span> { formatRelayLink(trade.relayAddress) } </span>
            )
        },
        {
            Header: 'Maker Fee',
            accessor: 'makerFee',
            width: 150,
            Cell: ({ original: trade }) => (
                <span> { trade.makerFee.toFixed(6) + " ZRX" } </span>
            )
        },
        {
            Header: 'Taker Fee',
            accessor: 'takerFee',
            width: 150,
            Cell: ({ original: trade }) => (
                <span> { trade.takerFee.toFixed(6) + " ZRX" } </span>
            )
        }
    ];

    constructor(props) {
        super(props);
        this.state = {
            data: [],
            priceInverted: false
        };
    }

    getPrice(trade) {
        let price1, price2;

        if (Constants.ZEROEX_TOKEN_INFOS[trade.makerToken] && Constants.ZEROEX_TOKEN_INFOS[trade.makerToken].symbol === "WETH") {
            price1 = trade.mtPrice ? trade.mtPrice : null;
            price2 = trade.tmPrice ? trade.tmPrice : null;
        } else if (Constants.ZEROEX_TOKEN_INFOS[trade.takerToken] && Constants.ZEROEX_TOKEN_INFOS[trade.takerToken].symbol === "WETH") {
            price1 = trade.tmPrice ? trade.tmPrice : null;
            price2 = trade.mtPrice ? trade.mtPrice : null;
        } else {
            price1 = trade.mtPrice ? trade.mtPrice : null;
            price2 = trade.tmPrice ? trade.tmPrice : null;
        }

        return (this.state.priceInverted ? price1 : price2) + "";
    }

    componentDidMount() {
        const web3 = new Web3(new Web3.providers.HttpProvider(Constants.INFURA_API_URL));
        this._zeroEx = new ZeroEx(web3.currentProvider, {networkId: this._networkId});

        this._zeroEx.tokenRegistry.getTokensAsync().then((tokens) => {
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
        });

        this.loadTradeData();
    }

    loadTradeData() {
        axios(config.API_URL + 'trades').then((response) => {
            if (response.status !== 200) {
                alert(response.status + ': ' + response.statusText);
            } else {
                console.log(response.data);
                let trades = response.data.trades;
                trades.forEach((trade, index) => {
                    trade.makerVolume = new BigNumber(trade.makerVolume);
                    trade.mtPrice = new BigNumber(trade.mtPrice);
                    trade.takerFee = new BigNumber(trade.takerFee);
                    trade.takerVolume = new BigNumber(trade.takerVolume);
                    trade.tmPrice = new BigNumber(trade.tmPrice);
                    trade.makerFee = new BigNumber(trade.makerFee);
                    // _addNewTradeRow(index, trade);
                });

                this.setState({'data': trades});
            }
        });
        const xhr = new XMLHttpRequest();
        xhr.open('GET', config.API_URL + 'trades', true);
        xhr.send();

        xhr.onreadystatechange = () => {
            if (xhr.readyState !== 4) return;

            if (xhr.status !== 200) {
                alert(xhr.status + ': ' + xhr.statusText);
            } else {
                let response = JSON.parse(xhr.responseText);
                console.log(response);
                response.trades.forEach((trade, index) => {
                    trade.makerVolume = new BigNumber(trade.makerVolume);
                    trade.mtPrice = new BigNumber(trade.mtPrice);
                    trade.takerFee = new BigNumber(trade.takerFee);
                    trade.takerVolume = new BigNumber(trade.takerVolume);
                    trade.tmPrice = new BigNumber(trade.tmPrice);
                    trade.makerFee = new BigNumber(trade.makerFee);
                    // _addNewTradeRow(index, trade);
                });

                this.setState({'data': response.trades});
            }

        }
    }


    formatDate(timestamp) {
        let date = new Date(timestamp * 1000);
        return moment(date).format('YYYY/MM/DD HH:mm:SS');
    }

  render() {
    return (
        <div className="App">
            <div>
                <TokenStatistic tradeData={this.state.data}/>
                <ReactTable
                    data={this.state.data}
                    columns={this.columns}
                    defaultPageSize={50}
                />
            </div>
        </div>
    );
  }


}

export default App;
