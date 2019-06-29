let WebSocket = require("websocket").client;
let client = new WebSocket();
var stats = require("stats-lite");

let networkPerformance = [];
let recievedCurrencies = new Map();
let messages = 0;
let startTime = 0;
let interval = 5000;
let index = 1;
let currencies = [
  "ETHBTC",
  "ETHUSD",
  "BTCUSD",
  "DASHBTC",
  "DOGEBTC",
  "DOGEUSD",
  "EMCBTC",
  "LSKBTC",
  "LTCUSD",
  "NXTBTC",
  "SBDBTC",
  "SCBTC",
  "STEEMBTC",
  "XDNBTC",
  "XEMBTC",
  "XMRBTC",
  "ARDRBTC",
  "ZECBTC",
  "WAVESVTC",
  "MAIDBTC",
  "AMPBTC",
  "DGDBTC",
  "SNGLSBTC",
  "1STBTC",
  "TRSTBTC",
  "TIMEBTC",
  "GNOBTC",
  "REPBTC",
  "XMRUSD",
  "XMRUSD",
  "DASHUSD",
  "NXTUSD",
  "ZRCBTC",
  "BOSBTC",
  "DCTBTC",
  "ANTBTC",
  "AEONBTC",
  "GUPBTC",
  "PLUBTC"
];

let subQuery = symbol => {
  let query = {
    method: "subscribeOrderbook",
    params: {
      symbol: symbol
    },
    id: 1
  };
  return JSON.stringify(query);
};

let startUp = connection => {
  startTime = Date.now();
  connection.sendUTF(subQuery(currencies[0], 0));
  setTimeout(() => {}, 1000); // waiting for the initial bumps to clear out
};

let measurePerformance = connection => {
  // complete last round of measurements
  let measured = networkPerformance; // to avoid updates while calculations are made
  let messagesPerSecond = (messages / interval) * 1000;
  if (measured.length != 0) {
    console.log(
      `${index}, ${Math.round(stats.mean(measured) * 10) / 10}, ${stats.median(measured)}, ${Math.round(
        stats.stdev(measured) * 10
      ) / 10}, ${stats.percentile(measured, 0.25)}, ${stats.percentile(measured, 0.75)}, ${Math.round(
        messagesPerSecond * 10
      ) / 10}, ${recievedCurrencies.size}`
    );
  }

  // setup for next round of querying
  connection.sendUTF(subQuery(currencies[index], index));

  if (index == currencies.length) {
    console.log("Testing complete");
    process.exit();
  }

  networkPerformance = [];
  messages = 0;
  recievedCurrencies.clear();
  startTime = Date.now();
  index++;
};

client.on("connect", function(connection) {
  console.log("WebSocket Client Connected");
  startUp(connection);

  connection.on("error", function(error) {
    console.log("Connection Error: " + error.toString());
  });

  connection.on("close", function() {
    console.log("echo-protocol Connection Closed");
  });

  connection.on("message", function(message) {
    let response = JSON.parse(message.utf8Data);

    if (response.method === "updateOrderbook" || response.method === "snapshotOrderbook") {
      response = response.params;
      let serverTime = new Date(response.timestamp);
      let receptionTime = new Date();

      recievedCurrencies.set(
        response.symbol,
        recievedCurrencies.get(response.symbol) === undefined ? 1 : recievedCurrencies.get(response.symbol) + 1
      );
      networkPerformance.push(receptionTime.getTime() - serverTime.getTime());
      messages++;
      if (startTime + interval < Date.now()) measurePerformance(connection);
    }
  });
});

client.connect("wss://api.hitbtc.com/api/2/ws");
