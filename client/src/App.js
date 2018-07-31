import React, { Component } from 'react';
import {withRouter} from "react-router-dom";
import "react-table/react-table.css";
import axios from "axios";
import BigNumber  from 'bignumber.js';
import * as Web3  from 'web3';
import { ZeroEx } from '0x.js';
import Routes from "./Routes";
import "./App.css";
import config from './config';
import Constants from "./constants";
import Navigation from './Navigation';
import TokenStatistic  from './token-statistic';

class App extends Component {
    _networkId = Constants.DEFAULT_NETWORK_ID;
    _priceInverted = false;
    _tradeMoreInfos = {};

    constructor(props) {
        super(props);
        this.state = {
            trades: [],
            navCollapse: true,
        };
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

                this.setState({trades: trades});
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
                response.trades.forEach((trade, index) => {
                    trade.makerVolume = new BigNumber(trade.makerVolume);
                    trade.mtPrice = new BigNumber(trade.mtPrice);
                    trade.takerFee = new BigNumber(trade.takerFee);
                    trade.takerVolume = new BigNumber(trade.takerVolume);
                    trade.tmPrice = new BigNumber(trade.tmPrice);
                    trade.makerFee = new BigNumber(trade.makerFee);
                    // _addNewTradeRow(index, trade);
                });

                this.setState({trades: response.trades});
            }

        }
    }

  render() {
    const childProps = {
        trades: this.state.trades
    };
    const currentPath = window && window.location ? window.location.href.split('/') : null;
    const path = currentPath[currentPath.length - 1];
    console.log(path)
    console.log(path === '')
    return (
        <div className="App">
            <Navigation
              navCollapse={this.state.navCollapse}
              handleNav={() => this.setState({navCollapse: !this.state.navCollapse})}
            />
            <div className={this.state.navCollapse ? "content nav-open" : "content"}>
                <Routes childProps={childProps} />
                {this.state.trades &&
                  <div className={path === '' ? 'visible': 'hidden'}>
                    <TokenStatistic tradeData={this.state.trades} />
                  </div>
                }
            </div>
        </div>
    );
  }
}

export default withRouter(App);
