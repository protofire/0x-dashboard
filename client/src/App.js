import React, { Component } from 'react';
import { ZeroEx } from '0x.js';
import * as Web3  from 'web3';
import * as moment from 'moment';
import BigNumber  from 'bignumber.js';
import Constants from "./constants";
import config from './config';
import TokenStatistic  from './token-statistic';
import { formatDate, formatTokenLink, formatLink, formatRelayLink, formatHex } from './utils';
import './App.css';

class App extends Component {
  _networkId = 1; // mainnet

  constructor(props) {
    super(props);
    this.state = {
        trades: [],
        priceInverted: false,
    };
  }

  async componentDidMount() {
    try {
      await fetch(config.API_URL + 'trades', {
          method: 'GET',
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        }).then(response => response.json())
        .then(response => {
          let trades = response.trades;
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
        })
    }
    catch (e) {
        console.log(e);
    }

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
  }
  renderPrice(trade) {
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
  renderContent(trades) {
    let content = [];
    trades.map((trade, key) => {
      content.push(
        <tr key={key}>
           <td data-th="Time (Local)">{formatDate(trade.timestamp)}</td>
           <td data-th="Txid">{formatLink(trade.txid, formatHex(trade.txid, 8), 'tx')}</td>
           <td data-th="Trade">
               <i>{ parseFloat(trade.makerVolume).toFixed(6) }</i> {formatTokenLink(trade.makerToken)}
               <span>↔</span>
               <i>{ parseFloat(trade.takerVolume).toFixed(6) }</i> {formatTokenLink(trade.takerToken)}
           </td>
           <td data-th="Price" onClick={() => this.setState({priceInverted: !this.state.priceInverted})}>
              {this.renderPrice(trade) ? this.renderPrice(trade) : 0}
           </td>
           <td data-th="Relay">{ formatRelayLink(trade.relayAddress) }</td>
           <td data-th="Maker Fee">{ parseFloat(trade.makerFee).toFixed(6) + " ZRX" }</td>
           <td data-th="Taker Fee">{ parseFloat(trade.takerFee).toFixed(6) + " ZRX" }</td>
       </tr>
    )})
    return content;
  }

  render() {
    return (
      <div className="App">
        <header className="App-header">
          <h1 className="App-title">Ox dashboard</h1>
        </header>
        {this.state.trades &&
          <TokenStatistic tradeData={this.state.trades} />
        }
        {this.state.trades && this.state.trades.length &&
          <table className="table table-bordered table-striped">
            <thead className="thead-dark">
              <tr>
                <th>Time (Local)</th>
                <th>Txid</th>
                <th>Trade</th>
                <th>Price</th>
                <th>Relay</th>
                <th>Maker Fee</th>
                <th>Taker Fee</th>
              </tr>
            </thead>
            <tbody>
              {this.renderContent(this.state.trades)}
            </tbody>
          </table>
        }
      </div>
    );
  }
}

export default App;
