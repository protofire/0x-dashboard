import React, { Component } from "react";
import ReactTable from "react-table";
import * as moment from 'moment';
import "react-table/react-table.css";
import Constants from "./../constants";
import { formatTokenLink, formatLink, formatRelayLink, formatHex } from './../utils';

export default class Trades extends Component {
  constructor(props) {
      super(props);
      this.state = {
          priceInverted: false,
      };
  }
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

  formatDate(timestamp) {
      let date = new Date(timestamp * 1000);
      return moment(date).format('YYYY/MM/DD HH:mm:ss');
  }

  render() {
    return [
        <div className="container-title">
          <div className="container-title-content">
            <h2 className="title">Recent Trades</h2>
          </div>
        </div>,
        <div className="container-panel">
          {this.props.trades && this.props.trades.length &&<ReactTable
              className="table table-bordered table-striped"
              data={this.props.trades}
              columns={this.columns}
              defaultPageSize={50}
          />}
        </div>
    ]
  }
}
