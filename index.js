let WebSocket = require("websocket").client;
let client = new WebSocket();
var stats = require("stats-lite");

let index = 1;
let currencies = ["ETHBTC", "ETHUSD", "BTCUSD"];
let networkPerformance = [];
let startTime = 0;
let interval = 10000;

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
};

let humanReadableOutput = () => {
  console.log(`For: ${index + 1} connections`);
  console.log(`Mean: ${stats.mean(measured)}`);
  console.log(`Median: ${stats.median(measured)}`);
  console.log(`Mode: ${stats.mode(measured)}`);
  console.log(`Deviation: ${stats.stdev(measured)}`);
  console.log(`25th - Percentile: ${stats.percentile(measured, 0.25)}`);
  console.log(`75th - Percentile: ${stats.percentile(measured, 0.75)}`);
};

let measurePerformance = connection => {
  // complete last round of measurements
  let measured = networkPerformance;
  if (measured.length != 0) {
    humanReadableOutput();
    console.log(
      `csv ouput: ${index + 1}, ${stats.mean(measured)}, ${stats.median(measured)}, ${stats.mode(
        measured
      )}, ${stats.stdev(measured)}, ${stats.percentile(measured, 0.25)}, ${stats.percentile(measured, 0.75)}`
    );
  }

  // setup for next round of querying
  connection.sendUTF(subQuery(currencies[index], index));

  if (index == currencies.length) {
    console.log("Testing complete");
    return;
  }

  console.log(`Starting performance benchmarks: ${index + 1} currency`);

  networkPerformance = [];
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
      networkPerformance.push(receptionTime.getTime() - serverTime.getTime());
      if (startTime + interval < Date.now()) measurePerformance(connection);
    }
  });
});

client.connect("wss://api.hitbtc.com/api/2/ws");
