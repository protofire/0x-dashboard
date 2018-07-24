import React, { Component } from 'react';
import ReactGridLayout  from 'react-grid-layout';
import { ZeroEx } from '0x.js';
import * as Web3  from 'web3';
import * as moment from 'moment';
import BigNumber  from 'bignumber.js';
import Constants from "./constants";
import './App.css';

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
        trades: {},
    };
  }
  async componentDidMount() {
    try {
      await fetch('http://localhost:8080/trades', {
          method: 'GET',
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        }).then(response => response.json())
        .then(data => this.setState({trades: data.trades}));
    }
    catch (e) {
        console.log(e);
    }
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

      return this.state.priceInverted ? price1 : price2;
  }
  formatDate(timestamp) {
     let date = new Date(timestamp * 1000);
     return moment(date).format('YYYY/MM/DD HH:mm:SS');
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
  formatHex(hex, digits = 6) {
     if (digits >= 64)
         return hex;

     return hex.substring(0, 2 + digits) + "...";
  }
  renderContent(trades) {
    let content = [];
    for (let i = 0; i < trades.length; i++) {
      console.log(trades[i]);
       let key = i;
       content.push(
         <div key={key}>
            <div>{this.formatDate(trades[i].timestamp)}</div>
            <div>{this.formatLink(trades[i].txid, this.formatHex(trades[i].txid, 8), 'tx')}</div>
        </div>
       )
    }
    return content;
  }
  render() {
    const layout = [
        {i: 'a', x: 0, y: 0, w: 1, h: 2, static: true},
        {i: 'b', x: 2, y: 0, w: 1, h: 2, static: true},
        {i: 'c', x: 4, y: 0, w: 1, h: 2, static: true},
        {i: 'd', x: 6, y: 0, w: 1, h: 2, static: true},
        {i: 'f', x: 8, y: 0, w: 1, h: 2, static: true}
    ];
    console.log(this.state.trades);
    return (
      <div className="App">
        <header className="App-header">
          <h1 className="App-title">Ox dashboard</h1>
        </header>

        {this.state.trades && this.state.trades.length &&
          <ReactGridLayout  className="layout" layout={layout} cols={7} rowHeight={30} width={1200}>
            <div key={"a"}>
              <div><b>Time (Local)</b></div>
              <div><b>Txid</b></div>
              <div><b>Trade</b></div>
              <div><b>Price</b></div>
              <div><b>Relay</b></div>
              <div><b>Maker Fee</b></div>
              <div><b>Taker Fee</b></div>
            </div>
            {this.renderContent(this.state.trades)}
          </ReactGridLayout>
        }
      </div>
    );
  }
}

export default App;
