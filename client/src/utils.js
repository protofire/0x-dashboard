import React from 'react';
import Constants from "./constants";
import BigNumber  from 'bignumber.js';


let _networkId = Constants.DEFAULT_NETWORK_ID;
let fiatCurrencyInfo = Constants.FIAT_CURRENCY_MAP["USD"];

function formatTokenWebsiteLink(address, digits) {
    if (Constants.ZEROEX_TOKEN_INFOS[address] && Constants.ZEROEX_TOKEN_INFOS[address].website) {
        return (
            <a href={Constants.ZEROEX_TOKEN_INFOS[address].website} target="_blank">
                {Constants.ZEROEX_TOKEN_INFOS[address].symbol}
            </a>
        );
    } else {
        return formatTokenLink(address, digits);
    }
}

function formatRelayLink(address, digits) {
    if (Constants.ZEROEX_RELAY_ADDRESSES[_networkId][address]) {
        return (
            <a href={Constants.ZEROEX_RELAY_ADDRESSES[_networkId][address].website} target="_blank">
                {Constants.ZEROEX_RELAY_ADDRESSES[_networkId][address].name}
            </a>
        );
    } else if (!(new BigNumber(address, 16)).eq(0)) {
        return formatTokenAddressLink(Constants.ZEROEX_TOKEN_ADDRESS, address, formatHex(address, digits));
    } else {
        return "None";
    }
}

function formatLink(txid, text, type) {
    let baseUrl = Constants.NETWORK_BLOCK_EXPLORER[_networkId];

    if (baseUrl) {
        return (
            <a href={baseUrl + `/${type}/` + txid} target="_blank">{text}</a>
        );
    } else {
        return text;
    }
}

function formatTokenAddressLink(token, address, text) {
    let baseUrl = Constants.NETWORK_BLOCK_EXPLORER[_networkId];

    if (baseUrl) {
        return (
            <a href={baseUrl + '/token/' + token + "/?a=" + address} target="_blank">{text}</a>
        );
    } else {
        return text;
    }
}

function formatTokenLink(address, digits) {
    if (Constants.ZEROEX_TOKEN_INFOS[address]) {
        return formatLink(address, Constants.ZEROEX_TOKEN_INFOS[address].symbol, 'address');
    } else {
        return formatLink(address, formatHex(address, digits), 'address');
    }
}

function formatHex(hex, digits = 6) {
    if (digits >= 64)
        return hex;

    return (hex || "").substring(0, 2 + digits) + "...";
}

function formatPrice(price) {
    if (fiatCurrencyInfo) {
        let priceString = price.toNumber().toLocaleString(undefined, {minimumFractionDigits: fiatCurrencyInfo.decimal_digits});
        return fiatCurrencyInfo.symbol + priceString + " " + fiatCurrencyInfo.code;
    }

    return price.toString();
}

export {
    formatTokenWebsiteLink,
    formatRelayLink,
    formatLink,
    formatTokenAddressLink,
    formatTokenLink,
    formatHex,
    formatPrice
}