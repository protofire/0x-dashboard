document.addEventListener("DOMContentLoaded", function (event) {

    const root = $("#root");
    const _networkId = 1; // mainnet
    const _priceInverted = false;
    const _tradeMoreInfos = {};

    // const socket = io.connect(window.location.origin);
    // socket.on('tradeData', function (data) {
    //     console.log(data);
    //     data.trades.forEach((trade, index) => {
    //         trade.makerVolume = +trade.makerVolume;
    //         trade.mtPrice = +trade.mtPrice;
    //         trade.takerFee = +trade.takerFee;
    //         trade.takerVolume = +trade.takerVolume;
    //         trade.tmPrice = +trade.tmPrice;
    //         trade.makerFee = +trade.makerFee;
    //         _addNewTradeRow(index, trade);
    //     });
    //
    // });

    const xhr = new XMLHttpRequest();
    xhr.open('GET', 'trades', true);
    xhr.send();

    xhr.onreadystatechange = function() {
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
                _addNewTradeRow(index, trade);
            });
        }

    }



    function _addNewTradeRow(index, trade) {
        /* Format timestamp */
        let date = new Date(trade.timestamp * 1000);
        let timestamp = $("<span></span>")
            .append($("<span></span>")
                .addClass("time-utc")
                .text(formatDateTime(date)));

        /* Add relative time tooltip */
        // timestamp.tooltip({title: () => moment(trade.timestamp*1000).fromNow(), placement: "right"});

        /* Format trade string */
        let swap = $("<span></span>")
            .append($(trade.makerNormalized ? "<span></span>" : "<i></i>").text(trade.makerVolume.toDigits(6) + " "))
            .append(formatTokenLink(trade.makerToken))
            .append($("<span></span>").text(" ↔ "))
            .append($(trade.takerNormalized ? "<span></span>" : "<i></i>").text(trade.takerVolume.toDigits(6) + " "))
            .append(formatTokenLink(trade.takerToken));

        /* Prefer WETH in the numerator for non-inverted price */
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

        /* Format price */
        let price = $("<span></span>")
            .append($("<span></span>")
                .toggle(_priceInverted)
                .addClass("price1")
                .text(price1 ? price1.toDigits(8).toString() : "Unknown"))
            .append($("<span></span>")
                .toggle(_priceInverted)
                .addClass("price2")
                .text(price2 ? price2.toDigits(8).toString() : "Unknown"));

        /* Create row for trade list */
        let elem = $('<tr></tr>')
            .addClass('trade')
            .append($('<td></td>')            /* Expand */
                .append($("<i></i>").addClass("icon-right-dir").addClass("more-info"))
                .append($("<i></i>").addClass("icon-down-dir").addClass("more-info").toggle(false)))
            .append($('<td></td>')            /* Time */
                .append(timestamp))
            .append($('<td></td>')            /* Transaction ID */
                .append(formatTxidLink(trade.txid, formatHex(trade.txid, 8))))
            .append($('<td></td>')            /* Trade */
                .addClass('overflow')
                .append(swap))
            .append($('<td></td>')            /* Price */
                .append(price))
            .append($('<td></td>')            /* Relay */
                .append(formatRelayLink(trade.relayAddress)))
            .append($('<td></td>')            /* Maker Fee */
                .addClass('overflow-sm')
                .text(trade.makerFee.toDigits(6) + " ZRX"))
            .append($('<td></td>')            /* Taker Fee */
                .addClass('overflow-sm')
                .text(trade.takerFee.toDigits(6) + " ZRX"));

        elem.find(".more-info").click(() => {
            _handleClick(elem, trade);
        });

        /* Add to trade list */
        if (root.find("table.recent-trades tbody").children().length === 0) {
            root.find("table.recent-trades tbody").append(elem);
        } else if (index === 0) {
            root.find("table.recent-trades tbody tr.trade").eq(0).before(elem);
        } else {
            root.find("table.recent-trades tbody tr.trade").eq(index - 1).after(elem);
        }
    }

    function formatDateTime(datetime) {
        let year, month, day, hours, minutes, seconds;

        year = datetime.getFullYear();
        month = ((datetime.getMonth() + 1) < 10) ? ("0" + (datetime.getMonth() + 1)) : (datetime.getMonth() + 1);
        day = (datetime.getDate() < 10) ? ("0" + datetime.getDate()) : datetime.getDate();
        hours = (datetime.getHours() < 10) ? ("0" + datetime.getHours()) : datetime.getHours();
        minutes = (datetime.getMinutes() < 10) ? ("0" + datetime.getMinutes()) : datetime.getMinutes();
        seconds = (datetime.getSeconds() < 10) ? ("0" + datetime.getSeconds()) : datetime.getSeconds();

        return year + "/" + month + "/" + day + " " + hours + ":" + minutes + ":" + seconds;
    }

    function formatTokenLink(address, digits) {
        if (Constants.ZEROEX_TOKEN_INFOS[address]) {
            return formatAddressLink(address, Constants.ZEROEX_TOKEN_INFOS[address].symbol);
        } else {
            return formatAddressLink(address, formatHex(address, digits));
        }
    }

    function formatAddressLink(address, text, showLinkIcon = false) {
        let baseUrl = Constants.NETWORK_BLOCK_EXPLORER[_networkId];

        if (baseUrl) {
            let elem = $('<a></a>')
                .attr('href', baseUrl + "/address/" + address)
                .attr('target', '_blank')
                .text(text);

            if (showLinkIcon)
                elem = elem.append($('<i></i>').addClass('icon-link-ext'));

            return elem;
        } else {
            return text;
        }
    }

    function formatTxidLink(txid, text, showLinkIcon = false) {
        let baseUrl = Constants.NETWORK_BLOCK_EXPLORER[_networkId];

        if (baseUrl) {
            let elem = $('<a></a>')
                .attr('href', baseUrl + "/tx/" + txid)
                .attr('target', '_blank')
                .text(text);

            if (showLinkIcon)
                elem = elem.append($('<i></i>').addClass('icon-link-ext'));

            return elem;
        } else {
            return text;
        }
    }

    function formatRelayLink(address, digits) {
        if (Constants.ZEROEX_RELAY_ADDRESSES[_networkId][address]) {
            let elem = $('<a></a>')
                .attr('href', Constants.ZEROEX_RELAY_ADDRESSES[_networkId][address].website)
                .attr('target', '_blank')
                .text(Constants.ZEROEX_RELAY_ADDRESSES[_networkId][address].name);

            return elem;
        } else if (!(new BigNumber(address, 16)).eq(0)) {
            return formatTokenAddressLink(Constants.ZEROEX_TOKEN_ADDRESS, address, formatHex(address, digits));
        } else {
            return $("<span></span>").text("None");
        }
    }

    function formatTokenAddressLink(token, address, text, showLinkIcon = false) {
        let baseUrl = Constants.NETWORK_BLOCK_EXPLORER[_networkId];

        if (baseUrl) {
            let elem = $('<a></a>')
                .attr('href', baseUrl + "/token/" + token + "/?a=" + address)
                .attr('target', '_blank')
                .text(text);

            if (showLinkIcon)
                elem = elem.append($('<i></i>').addClass('icon-link-ext'));

            return elem;
        } else {
            return text;
        }
    }

    function _handleClick(dom, trade) {
        dom.find(".more-info").toggle();

        if (_tradeMoreInfos[trade.txid + trade.orderHash]) {
            _tradeMoreInfos[trade.txid + trade.orderHash].toggle();
        } else {
            let table = $(`
                <table class="table table-responsive table-condensed table-sm borderless trade-more-info">
                    <tbody>
                        <tr><th>Transaction ID</th><td></td></tr>
                        <tr><th>Block Number</th><td></td></tr>
                        <tr><th>Timestamp</th><td></td></tr>
                        <tr><th>Maker Address</th><td></td></tr>
                        <tr><th>Taker Address</th><td></td></tr>
                        <tr><th>Fee Address</th><td></td></tr>
                        <tr><th>Relay</th><td></td></tr>
                        <tr><th>Maker Amount</th><td></td></tr>
                        <tr><th>Taker Amount</th><td></td></tr>
                        <tr><th>Maker Fee</th><td></td></tr>
                        <tr><th>Taker Fee</th><td></td></tr>
                        <tr><th>Gas Used</th><td></td></tr>
                        <tr><th>Tx Fee</th><td></td></tr>
                        <tr><th>Order Hash</th><td></td></tr>
                        <tr><th>Order JSON</th><td></td></tr>
                    </tbody>
                </table>
            `);

            /* Transaction ID */
            table.find('td').eq(0).append(formatTxidLink(trade.txid, trade.txid));
            /* Block number */
            table.find('td').eq(1).append(formatBlockNumberLink(trade.blockNumber));
            /* Timestamp */
            table.find('td').eq(2).text((new Date(trade.timestamp * 1000)).toUTCString());
            /* Maker Address */
            table.find('td').eq(3).append(formatAddressLink(trade.makerAddress, trade.makerAddress));
            /* Taker Address */
            table.find('td').eq(4).append(formatAddressLink(trade.takerAddress, trade.takerAddress));
            /* Fee Address */
            table.find('td').eq(5).append(formatAddressLink(trade.feeAddress, trade.feeAddress));
            /* Relay */
            table.find('td').eq(6).append(formatRelayLink(trade.relayAddress));
            /* Maker Volume/Token */
            table.find('td').eq(7).append($("<span></span>")
                .append($(trade.makerNormalized ? "<span></span>" : "<i></i>")
                    .text(trade.makerVolume + " "))
                .append(formatTokenLink(trade.makerToken, 64)));
            /* Taker Volume/Token */
            table.find('td').eq(8).append($("<span></span>")
                .append($(trade.takerNormalized ? "<span></span>" : "<i></i>")
                    .text(trade.takerVolume + " "))
                .append(formatTokenLink(trade.takerToken, 64)));
            /* Maker Fee */
            table.find('td').eq(9).text(trade.makerFee + " ZRX");
            /* Taker Fee */
            table.find('td').eq(10).text(trade.takerFee + " ZRX");
            /* Order Hash */
            table.find('td').eq(13).text(trade.orderHash);

            // TODO: need import later
            /*        /!* Fetch the order information *!/
             this.fetchOrder(table, trade);*/

            let elem = $('<tr></tr>')
                .append($('<td></td>'))
                .append($('<td></td>')
                    .attr('colspan', 7)
                    .append(table));

            dom.after(elem);

            _tradeMoreInfos[trade.txid + trade.orderHash] = elem;
        }
    }

    function formatBlockNumberLink(blockNumber, showLinkIcon = false) {
        let baseUrl = Constants.NETWORK_BLOCK_EXPLORER[_networkId];

        if (baseUrl) {
            let elem = $('<a></a>')
                .attr('href', baseUrl + "/block/" + blockNumber)
                .attr('target', '_blank')
                .text(blockNumber);

            if (showLinkIcon)
                elem = elem.append($('<i></i>').addClass('icon-link-ext'));

            return elem;
        } else {
            return blockNumber.toString();
        }
    }

    function formatHex(hex, digits = 6) {
        if (digits >= 64)
            return hex;

        return hex.substring(0, 2 + digits) + "...";
    }


    const Constants = {
        ZEROEX_TOKEN_INFOS: {
            /* Token infos from the registry */
            "0xe41d2489571d322189246dafa5ebde1f4699f498": {
                "name": "0x Protocol Token",
                "symbol": "ZRX",
                "decimals": 18,
                "website": "https://0xproject.com",
            },
            "0x2956356cd2a2bf3202f771f50d3d14a367b48070": {
                "name": "Wrapped Ether (deprecated)",
                "symbol": "WETH",
                "decimals": 18,
                "website": "https://weth.io",
            },
            "0xe94327d07fc17907b4db788e5adf2ed424addff6": {
                "name": "Augur Reputation Token",
                "symbol": "REP",
                "decimals": 18,
                "website": "https://augur.net",
            },
            "0xe0b7927c4af23765cb51314a0e0521a9645f0e2a": {
                "name": "Digix DAO Token",
                "symbol": "DGD",
                "decimals": 9,
                "website": "https://digix.global",
            },
            "0xfa05a73ffe78ef8f1a739473e462c54bae6567d9": {
                "name": "Lunyr",
                "symbol": "LUN",
                "decimals": 18,
                "website": "https://lunyr.com",
            },
            "0xc66ea802717bfb9833400264dd12c2bceaa34a6d": {
                "name": "MakerDAO (Deprecated)",
                "symbol": "MKR",
                "decimals": 18,
                "website": "https://makerdao.com",
            },
            "0xbeb9ef514a379b997e0798fdcc901ee474b6d9a1": {
                "name": "Melon Token",
                "symbol": "MLN",
                "decimals": 18,
                "website": "https://melonport.com",
            },
            "0x9a642d6b3368ddc662ca244badf32cda716005bc": {
                "name": "Qtum",
                "symbol": "QTUM",
                "decimals": 18,
                "website": "https://qtum.org",
            },
            "0xd26114cd6ee289accf82350c8d8487fedb8a0c07": {
                "name": "OmiseGO",
                "symbol": "OMG",
                "decimals": 18,
                "website": "https://omisego.network",
            },
            "0xb97048628db6b661d4c2aa833e95dbe1a905b280": {
                "name": "TenXPay",
                "symbol": "PAY",
                "decimals": 18,
                "website": "https://www.tenx.tech",
            },
            "0x86fa049857e0209aa7d9e616f7eb3b3b78ecfdb0": {
                "name": "Eos",
                "symbol": "EOS",
                "decimals": 18,
                "website": "https://eos.io",
            },
            "0x888666ca69e0f178ded6d75b5726cee99a87d698": {
                "name": "Iconomi",
                "symbol": "ICN",
                "decimals": 18,
                "website": "https://www.iconomi.net",
            },
            "0x744d70fdbe2ba4cf95131626614a1763df805b9e": {
                "name": "StatusNetwork",
                "symbol": "SNT",
                "decimals": 18,
                "website": "https://status.im",
            },
            "0x6810e776880c02933d47db1b9fc05908e5386b96": {
                "name": "Gnosis",
                "symbol": "GNO",
                "decimals": 18,
                "website": "https://gnosis.pm",
            },
            "0x0d8775f648430679a709e98d2b0cb6250d2887ef": {
                "name": "Basic Attention Token",
                "symbol": "BAT",
                "decimals": 18,
                "website": "https://basicattentiontoken.org",
            },
            "0xb64ef51c888972c908cfacf59b47c1afbc0ab8ac": {
                "name": "Storj",
                "symbol": "STORJ",
                "decimals": 8,
                "website": "https://storj.io",
            },
            "0x1f573d6fb3f13d689ff844b4ce37794d79a7ff1c": {
                "name": "Bancor",
                "symbol": "BNT",
                "decimals": 18,
                "website": "https://bancor.network",
            },
            "0x960b236a07cf122663c4303350609a66a7b288c0": {
                "name": "Aragon",
                "symbol": "ANT",
                "decimals": 18,
                "website": "https://aragon.one",
            },
            "0x0abdace70d3790235af448c88547603b945604ea": {
                "name": "district0x",
                "symbol": "DNT",
                "decimals": 18,
                "website": "https://district0x.io",
            },
            "0xaec2e87e0a235266d9c5adc9deb4b2e29b54d009": {
                "name": "SingularDTV",
                "symbol": "SNGLS",
                "decimals": 0,
                "website": "https://singulardtv.com",
            },
            "0x419d0d8bdd9af5e606ae2232ed285aff190e711b": {
                "name": "FunFair",
                "symbol": "FUN",
                "decimals": 8,
                "website": "https://funfair.io",
            },
            "0xaf30d2a7e90d7dc361c8c4585e9bb7d2f6f15bc7": {
                "name": "FirstBlood",
                "symbol": "1ST",
                "decimals": 18,
                "website": "https://firstblood.io",
            },
            "0x08711d3b02c8758f2fb3ab4e80228418a7f8e39c": {
                "name": "Edgeless",
                "symbol": "EDG",
                "decimals": 0,
                "website": "https://edgeless.io",
            },
            "0x5af2be193a6abca9c8817001f45744777db30756": {
                "name": "Bitquence",
                "symbol": "BQX",
                "decimals": 8,
                "website": "https://www.ethos.io",
            },
            "0x607f4c5bb672230e8672085532f7e901544a7375": {
                "name": "iExec",
                "symbol": "RLC",
                "decimals": 9,
                "website": "https://iex.ec",
            },
            "0x667088b212ce3d06a1b553a7221e1fd19000d9af": {
                "name": "Wings",
                "symbol": "WINGS",
                "decimals": 18,
                "website": "https://wings.ai",
            },
            "0x41e5560054824ea6b0732e656e3ad64e20e94e45": {
                "name": "Civic",
                "symbol": "CVC",
                "decimals": 8,
                "website": "https://www.civic.com",
            },
            "0xb63b606ac810a52cca15e44bb630fd42d8d1d83d": {
                "name": "Monaco",
                "symbol": "MCO",
                "decimals": 8,
                "website": "https://mona.co",
            },
            "0xf433089366899d83a9f26a773d59ec7ecf30355e": {
                "name": "Metal",
                "symbol": "MTL",
                "decimals": 8,
                "website": "https://www.metalpay.com",
            },
            "0x12fef5e57bf45873cd9b62e9dbd7bfb99e32d73e": {
                "name": "Cofoundit",
                "symbol": "CFI",
                "decimals": 18,
                "website": "https://cofound.it/en",
            },
            "0xaaaf91d9b90df800df4f55c205fd6989c977e73a": {
                "name": "Monolith TKN",
                "symbol": "TKN",
                "decimals": 8,
                "website": "https://tokencard.io",
            },
            "0xe7775a6e9bcf904eb39da2b68c5efb4f9360e08c": {
                "name": "Token-as-a-Service",
                "symbol": "TAAS",
                "decimals": 6,
                "website": "https://taas.fund",
            },
            "0x2e071d2966aa7d8decb1005885ba1977d6038a65": {
                "name": "DICE",
                "symbol": "ROL",
                "decimals": 16,
                "website": null,
            },
            "0xcb94be6f13a1182e4a4b6140cb7bf2025d28e41b": {
                "name": "Trustcoin",
                "symbol": "TRST",
                "decimals": 6,
                "website": "https://www.wetrust.io",
            },
            "0x1776e1f26f98b1a5df9cd347953a26dd3cb46671": {
                "name": "Numeraire",
                "symbol": "NMR",
                "decimals": 18,
                "website": "https://numer.ai",
            },
            "0x7c5a0ce9267ed19b22f8cae653f198e3e8daf098": {
                "name": "Santiment Network Token",
                "symbol": "SAN",
                "decimals": 18,
                "website": "https://www.santiment.net",
            },
            "0xdd974d5c2e2928dea5f71b9825b8b646686bd200": {
                "name": "Kyber Network Crystal",
                "symbol": "KNC",
                "decimals": 18,
                "website": "https://kyber.network",
            },
            "0x01afc37f4f85babc47c0e2d0eababc7fb49793c8": {
                "name": "Wrapped Golem Network Token",
                "symbol": "WGNT",
                "decimals": 18,
                "website": null,
            },
            "0xd0d6d6c5fe4a677d343cc433536bb717bae167dd": {
                "name": "adToken",
                "symbol": "ADT",
                "decimals": 9,
                "website": "https://adtoken.com",
            },
            "0xab16e0d25c06cb376259cc18c1de4aca57605589": {
                "name": "FinallyUsableCryptoKarma",
                "symbol": "FUCK",
                "decimals": 4,
                "website": "https://fucktoken.com",
            },
            "0x701c244b988a513c945973defa05de933b23fe1d": {
                "name": "openANX",
                "symbol": "OAX",
                "decimals": 18,
                "website": "https://www.openanx.org",
            },
            "0x514910771af9ca656af840dff83e8264ecf986ca": {
                "name": "ChainLink",
                "symbol": "LINK",
                "decimals": 18,
                "website": "https://link.smartcontract.com",
            },
            "0x8f8221afbb33998d8584a2b05749ba73c37a938a": {
                "name": "Request Network",
                "symbol": "REQ",
                "decimals": 18,
                "website": "https://request.network",
            },
            "0x27054b13b1b798b345b591a4d22e6562d47ea75a": {
                "name": "AirSwap",
                "symbol": "AST",
                "decimals": 4,
                "website": "https://www.airswap.io",
            },
            "0xf0ee6b27b759c9893ce4f094b49ad28fd15a23e4": {
                "name": "Enigma",
                "symbol": "ENG",
                "decimals": 8,
                "website": "https://enigma.co",
            },
            "0x818fc6c2ec5986bc6e2cbf00939d90556ab12ce5": {
                "name": "Kin",
                "symbol": "KIN",
                "decimals": 18,
                "website": "https://kin.kik.com",
            },
            "0x27dce1ec4d3f72c3e457cc50354f1f975ddef488": {
                "name": "AirToken",
                "symbol": "AIR",
                "decimals": 8,
                "website": "https://www.airtoken.com",
            },
            "0x12480e24eb5bec1a9d4369cab6a80cad3c0a377a": {
                "name": "Substratum",
                "symbol": "SUB",
                "decimals": 2,
                "website": "https://substratum.net",
            },
            "0xb7cb1c96db6b22b0d3d9536e0108d062bd488f74": {
                "name": "Walton",
                "symbol": "WTC",
                "decimals": 18,
                "website": "https://www.waltonchain.org",
            },
            "0x4156d3342d5c385a87d264f90653733592000581": {
                "name": "Salt",
                "symbol": "SALT",
                "decimals": 8,
                "website": "https://www.saltlending.com",
            },

            /* Token infos not yet in the registry */
            "0xd4fa1460f537bb9085d22c7bccb5dd450ef28e3a": {
                "name": "Populous Platform",
                "symbol": "PPT",
                "decimals": 8,
                "website": "https://populous.co",
            },
            "0x0e0989b1f9b8a38983c2ba8053269ca62ec9b195": {
                "name": "Po.et",
                "symbol": "POE",
                "decimals": 8,
                "website": "https://po.et",
            },
            "0x8ae4bf2c33a8e667de34b54938b0ccd03eb8cc06": {
                "name": "Patientory",
                "symbol": "PTOY",
                "decimals": 8,
                "website": "https://www.patientory.com",
            },
            "0x0f5d2fb29fb7d3cfee444a200298f468908cc942": {
                "name": "Decentraland MANA",
                "symbol": "MANA",
                "decimals": 18,
                "website": "https://decentraland.org",
            },
            "0xea38eaa3c86c8f9b751533ba2e562deb9acded40": {
                "name": "Fuel Token",
                "symbol": "FUEL",
                "decimals": 18,
                "website": "https://etherparty.io",
            },
            "0xf970b8e36e23f7fc3fd752eea86f8be8d83375a6": {
                "name": "Ripio Credit Network Token",
                "symbol": "RCN",
                "decimals": 18,
                "website": "https://ripiocredit.network",
            },
            "0x386467f1f3ddbe832448650418311a479eecfc57": {
                "name": "Embers",
                "symbol": "EMB",
                "decimals": 0,
                "website": null,
            },
            "0x814964b1bceaf24e26296d031eadf134a2ca4105": {
                "name": "Newbium",
                "symbol": "NEWB",
                "decimals": 0,
                "website": "http://newbium.com",
            },
            "0x2fd41f516fac94ed08e156f489f56ca3a80b04d0": {
                "name": "eBTC",
                "symbol": "EBTC",
                "decimals": 8,
                "website": "https://ebitcoin.org",
            },
            "0x99ea4db9ee77acd40b119bd1dc4e33e1c070b80d": {
                "name": "Quantstamp Token",
                "symbol": "QSP",
                "decimals": 18,
                "website": "https://quantstamp.com",
            },
            "0x56ba2ee7890461f463f7be02aac3099f6d5811a8": {
                "name": "BlockCAT Token",
                "symbol": "CAT",
                "decimals": 18,
                "website": "https://www.catcoins.org",
            },
            "0x24692791bc444c5cd0b81e3cbcaba4b04acd1f3b": {
                "name": "UnikoinGold",
                "symbol": "UKG",
                "decimals": 18,
                "website": "https://unikoingold.com",
            },
            "0xea1f346faf023f974eb5adaf088bbcdf02d761f4": {
                "name": "Blocktix Token",
                "symbol": "TIX",
                "decimals": 18,
                "website": "https://blocktix.io",
            },
            "0xd2d6158683aee4cc838067727209a0aaf4359de3": {
                "name": "Bounty0x Token",
                "symbol": "BNTY",
                "decimals": 18,
                "website": "https://bounty0x.io",
            },
            "0x672a1ad4f667fb18a333af13667aa0af1f5b5bdd": {
                "name": "Verify Token",
                "symbol": "CRED",
                "decimals": 18,
                "website": "https://verify.as",
            },
            "0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359": {
                "name": "Dai Stablecoin v1.0",
                "symbol": "DAI",
                "decimals": 18,
                "website": "https://makerdao.com",
            },
            "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2": {
                "name": "Wrapped Ether",
                "symbol": "WETH",
                "decimals": 18,
                "website": "https://weth.io",
            },
            "0xf7b098298f7c69fc14610bf71d5e02c60792894c": {
                "name": "Guppy",
                "symbol": "GUP",
                "decimals": 3,
                "website": "https://matchpool.co/guppy",
            },
            "0xc997d07b0bc607b6d1bcb6fb9d4a5579c466c3e5": {
                "name": "Flip",
                "symbol": "FLIP",
                "decimals": 0,
                "website": "http://www.etherflip.co",
            },
            "0x255aa6df07540cb5d3d297f0d0d4d84cb52bc8e6": {
                "name": "Raiden Token",
                "symbol": "RDN",
                "decimals": 18,
                "website": "https://raiden.network",
            },
            "0x42d6622dece394b54999fbd73d108123806f6a18": {
                "name": "SpankChain",
                "symbol": "SPANK",
                "decimals": 18,
                "website": "https://spankchain.com",
            },
            "0xc27a2f05fa577a83ba0fdb4c38443c0718356501": {
                "name": "Lamden Tau",
                "symbol": "TAU",
                "decimals": 18,
                "website": "https://www.lamden.io",
            },
            "0x107c4504cd79c5d2696ea0030a8dd4e92601b82e": {
                "name": "Bloom Token",
                "symbol": "BLT",
                "decimals": 18,
                "website": "https://hellobloom.io",
            },
            "0xb45a50545beeab73f38f31e5973768c421805e5e": {
                "name": "Trackr",
                "symbol": "TKR",
                "decimals": 18,
                "website": "https://www.trackr.im",
            },
            "0x0af44e2784637218dd1d32a322d44e603a8f0c6a": {
                "name": "Matryx Token",
                "symbol": "MTX",
                "decimals": 18,
                "website": "https://matryx.ai",
            },
            "0x3d1ba9be9f66b8ee101911bc36d3fb562eac2244": {
                "name": "Rivet",
                "symbol": "RVT",
                "decimals": 18,
                "website": "https://rivetzintl.com",
            },
            "0x4ceda7906a5ed2179785cd3a40a69ee8bc99c466": {
                "name": "AION",
                "symbol": "AION",
                "decimals": 8,
                "website": "https://aion.network",
            },
            "0xd0a4b8946cb52f0661273bfbc6fd0e0c75fc6433": {
                "name": "STORM",
                "symbol": "STORM",
                "decimals": 18,
                "website": "https://stormtoken.com",
            },
            "0x340d2bde5eb28c1eed91b2f790723e3b160613b7": {
                "name": "BLOCKv Token",
                "symbol": "VEE",
                "decimals": 18,
                "website": "https://blockv.io",
            },
            "0x9af839687f6c94542ac5ece2e317daae355493a1": {
                "name": "Hydro Protocol Token",
                "symbol": "HOT",
                "decimals": 18,
                "website": "https://thehydrofoundation.com",
            },
            "0x595832f8fc6bf59c85c527fec3740a1b7a361269": {
                "name": "PowerLedger",
                "symbol": "POWR",
                "decimals": 6,
                "website": "https://powerledger.io",
            },
            "0x39bb259f66e1c59d5abef88375979b4d20d98022": {
                "name": "Wax Token",
                "symbol": "WAX",
                "decimals": 8,
                "website": "https://wax.io",
            },
            "0xffe8196bc259e8dedc544d935786aa4709ec3e64": {
                "name": "Hedge Token",
                "symbol": "HDG",
                "decimals": 18,
                "website": "https://hedge-crypto.com",
            },
            "0x52a7cb918c11a16958be40cba7e31e32a499a465": {
                "name": "fidentiaX",
                "symbol": "FDX",
                "decimals": 18,
                "website": "https://www.fidentiax.com",
            },
            "0x0cf0ee63788a0849fe5297f3407f701e122cc023": {
                "name": "Steamr DATAcoin",
                "symbol": "DATA",
                "decimals": 18,
                "website": "https://www.streamr.com",
            },
            "0x5ca9a71b1d01849c0a95490cc00559717fcf0d1d": {
                "name": "Aeternity",
                "symbol": "AE",
                "decimals": 18,
                "website": "https://www.aeternity.com",
            },
            "0xe2e6d4be086c6938b53b22144855eef674281639": {
                "name": "Link Platform",
                "symbol": "LNK",
                "decimals": 18,
                "website": "https://ethereum.link",
            },
            "0x12b19d3e2ccc14da04fae33e63652ce469b3f2fd": {
                "name": "GRID Token",
                "symbol": "GRID",
                "decimals": 12,
                "website": "https://gridplus.io",
            },
            "0xfec0cf7fe078a500abf15f1284958f22049c2c7e": {
                "name": "Maecenas ART Token",
                "symbol": "ART",
                "decimals": 18,
                "website": "https://www.maecenas.co",
            },
            "0xbf2179859fc6d5bee9bf9158632dc51678a4100e": {
                "name": "ELF Token",
                "symbol": "ELF",
                "decimals": 18,
                "website": "https://aelf.io",
            },
            "0x80fb784b7ed66730e8b1dbd9820afd29931aab03": {
                "name": "EthLend Token",
                "symbol": "LEND",
                "decimals": 18,
                "website": "https://ethlend.io",
            },
            "0xc438b4c0dfbb1593be6dee03bbd1a84bb3aa6213": {
                "name": "Ethereum Qchain Token",
                "symbol": "EQC",
                "decimals": 8,
                "website": "https://qchain.co",
            },
            "0xf6b55acbbc49f4524aa48d19281a9a77c54de10f": {
                "name": "WOLK Token",
                "symbol": "WLK",
                "decimals": 18,
                "website": "https://www.wolk.com",
            },
            "0xac3211a5025414af2866ff09c23fc18bc97e79b1": {
                "name": "DOVU",
                "symbol": "DOV",
                "decimals": 18,
                "website": "https://dovu.io",
            },
            "0x168296bb09e24a88805cb9c33356536b980d3fc5": {
                "name": "RChain",
                "symbol": "RHOC",
                "decimals": 8,
                "website": "https://www.rchain.coop",
            },
            "0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2": {
                "name": "MakerDAO",
                "symbol": "MKR",
                "decimals": 18,
                "website": "https://makerdao.com",
            },
            "0xb5a5f22694352c15b00323844ad545abb2b11028": {
                "name": "ICON",
                "symbol": "ICX",
                "decimals": 18,
                "website": "https://icon.foundation",
            },
            "0xeb2da9fac54284cea731d1f10bb34eecb3c00c14": {
                "name": "POW Token",
                "symbol": "POW",
                "decimals": 18,
                "website": "https://powtoken.com",
            },
            "0xba5f11b16b155792cf3b2e6880e8706859a8aeb6": {
                "name": "Aeron",
                "symbol": "ARN",
                "decimals": 8,
                "website": "https://aeron.aero",
            },
            "0x151202c9c18e495656f372281f493eb7698961d5": {
                "name": "Debitum",
                "symbol": "DEB",
                "decimals": 18,
                "website": "https://debitum.network",
            },
            "0x09d8b66c48424324b25754a873e290cae5dca439": {
                "name": "Nova Token",
                "symbol": "NVT",
                "decimals": 18,
                "website": "https://novablitz.com",
            },
            "0xb98d4c97425d9908e66e53a6fdf673acca0be986": {
                "name": "ArcBlock",
                "symbol": "ABT",
                "decimals": 18,
                "website": "https://www.arcblock.io",
            },
            "0x27695e09149adc738a978e9a678f99e4c39e9eb9": {
                "name": "KickCoin",
                "symbol": "KICK",
                "decimals": 8,
                "website": "https://www.kickico.com",
            },
            "0xada00d9468c54a17564e33058bdd9451f75462ad": {
                "name": "Elemental",
                "symbol": "ELEM",
                "decimals": 10,
                "website": "https://elemco.in",
            },
            "0x23352036e911a22cfc692b5e2e196692658aded9": {
                "name": "Friendz Coin",
                "symbol": "FDZ",
                "decimals": 18,
                "website": "https://friendz.io",
            },
            "0x12b306fa98f4cbb8d4457fdff3a0a0a56f07ccdf": {
                "name": "Spectre.ai D-Token",
                "symbol": "SXDT",
                "decimals": 18,
                "website": "https://spectre.ai",
            },
            "0xef2463099360a085f1f10b076ed72ef625497a06": {
                "name": "Sharpe Platform Token",
                "symbol": "SHP",
                "decimals": 18,
                "website": "https://sharpe.capital",
            },
            "0xcb5ea3c190d8f82deadf7ce5af855ddbf33e3962": {
                "name": "Qubitica",
                "symbol": "QBIT",
                "decimals": 6,
                "website": "https://www.qubitica.net/",
            },
            "0x9992ec3cf6a55b00978cddf2b27bc6882d88d1ec": {
                "name": "Polymath",
                "symbol": "POLY",
                "decimals": 18,
                "website": "https://www.polymath.network/",
            },
            "0x9e46a38f5daabe8683e10793b06749eef7d733d1": {
                "name": "Nectar",
                "symbol": "NCT",
                "decimals": 18,
                "website": "https://polyswarm.io",
            },
        },
        NETWORK_BLOCK_EXPLORER: {
            1: "https://etherscan.io",
            3: "https://ropsten.etherscan.io",
            4: "https://rinkeby.etherscan.io",
            42: "https://kovan.etherscan.io",
        },
        ZEROEX_RELAY_ADDRESSES: {
            1: {
                "0xa258b39954cef5cb142fd567a46cddb31a670124": {
                    name: "Radar Relay",
                    website: "https://radarrelay.com",
                },
                "0xeb71bad396acaa128aeadbc7dbd59ca32263de01": {
                    name: "IDT Exchange",
                    website: "https://www.idtexchange.com",
                },
                "0xc22d5b2951db72b44cfb8089bb8cd374a3c354ea": {
                    name: "OpenRelay",
                    website: "https://openrelay.xyz",
                },
                "0x173a2467cece1f752eb8416e337d0f0b58cad795": {
                    name: "ERC dEX",
                    website: "https://ercdex.com",
                },
                "0xe269e891a2ec8585a378882ffa531141205e92e9": {
                    name: "DDEX",
                    website: "https://ddex.io",
                },
                "0x4969358e80cdc3d74477d7447bffa3b2e2acbe92": {
                    name: "Paradex",
                    website: "https://paradex.io",
                },
            },
            42: {
                "0xa258b39954cef5cb142fd567a46cddb31a670124": {
                    name: "Radar Relay",
                    website: "https://radarrelay.com",
                },
            },
        }
    };


});


Number.prototype.toDigits = Number.prototype.toFixed;