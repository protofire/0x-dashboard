import React, { Component } from 'react';
import ReactTable from "react-table";
import "react-table/react-table.css";
import * as moment from 'moment';
import BigNumber  from 'bignumber.js';
import Constants from "./constants";
import * as Web3  from 'web3';
import { ZeroEx } from '0x.js';


class App extends Component {

    _networkId = 1; // mainnet
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
                <span> { this.formatLink(trade.txid, this.formatHex(trade.txid, 8), 'tx') }</span> )
        },
        {
            Header: 'Trade',
            accessor: 'makerToken',
            Cell: ({ original: trade }) => (
                <span>
                    <i>{ trade.makerVolume.toFixed(6) }</i> {this.formatTokenLink(trade.makerToken)}
                    <span>↔</span>
                    <i>{ trade.takerVolume.toFixed(6) }</i> {this.formatTokenLink(trade.takerToken)}
                </span> )
        },
        {
            Header: 'Price (⇄)',
            accessor: 'mtPrice',
            width: 180,
            Cell: ({ original: trade }) => (
                <span onClick={() => this.setState({priceInverted: !this.state.priceInverted})}>
                    {this.getPrice(trade)}
                </span>
            )
        },
        {
            Header: 'Relay',
            accessor: 'relayAddress',
            width: 180,
            Cell: ({ original: trade }) => (
                <span> { this.formatRelayLink(trade.relayAddress) } </span>
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

    constructor() {
        super();
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

        return this.state.priceInverted ? price1 : price2;
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
        const xhr = new XMLHttpRequest();
        xhr.open('GET', 'http://localhost:8080/trades', true);
        xhr.send();

        xhr.onreadystatechange = () => {
            if (xhr.readyState !== 4) return;

            if (xhr.status !== 200) {
                alert(xhr.status + ': ' + xhr.statusText);
            } else {
                let response = JSON.parse(xhr.responseText);
                console.log(response);
                response.trades.forEach((trade, index) => {
                    trade.makerVolume = +trade.makerVolume;
                    trade.mtPrice = +trade.mtPrice;
                    trade.takerFee = +trade.takerFee;
                    trade.takerVolume = +trade.takerVolume;
                    trade.tmPrice = +trade.tmPrice;
                    trade.makerFee = +trade.makerFee;
                    // _addNewTradeRow(index, trade);
                });

                this.setState({'data': response.trades});
            }

        }
    }

    formatRelayLink(address, digits) {
        if (Constants.ZEROEX_RELAY_ADDRESSES[this._networkId][address]) {
            return (
                <a href={Constants.ZEROEX_RELAY_ADDRESSES[this._networkId][address].website} target="_blank">
                    {Constants.ZEROEX_RELAY_ADDRESSES[this._networkId][address].name}
                </a>
            );
        } else if (!(new BigNumber(address, 16)).eq(0)) {
            return this.formatTokenAddressLink(Constants.ZEROEX_TOKEN_ADDRESS, address, this.formatHex(address, digits));
        } else {
            return "None";
        }
    }

    formatLink(txid, text, type) {
        let baseUrl = Constants.NETWORK_BLOCK_EXPLORER[this._networkId];

        if (baseUrl) {
            return (
                <a href={baseUrl + `/${type}/` + txid} target="_blank">{text}</a>
            );
        } else {
            return text;
        }
    }

    formatTokenAddressLink(token, address, text) {
        let baseUrl = Constants.NETWORK_BLOCK_EXPLORER[this._networkId];

        if (baseUrl) {
            return (
                <a href={baseUrl + '/token/' + token + "/?a=" + address} target="_blank">{text}</a>
            );
        } else {
            return text;
        }
    }

    formatTokenLink(address, digits) {
        if (Constants.ZEROEX_TOKEN_INFOS[address]) {
            return this.formatLink(address, Constants.ZEROEX_TOKEN_INFOS[address].symbol, 'address');
        } else {
            return this.formatLink(address, this.formatHex(address, digits), 'address');
        }
    }

    formatHex(hex, digits = 6) {
        if (digits >= 64)
            return hex;

        return hex.substring(0, 2 + digits) + "...";
    }

    formatDate(timestamp) {
        let date = new Date(timestamp * 1000);
        return moment(date).format('YYYY/MM/DD HH:mm:SS');
    }

  render() {
    return (
      <div className="App">
       <div >
         <ReactTable
             data={this.state.data}
             columns={this.columns}
             defaultPageSize="50"
         />
       </div>
      </div>
    );
  }


}

export default App;
