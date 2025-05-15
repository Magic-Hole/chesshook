importScripts('https://cdn.jsdelivr.net/npm/stockfish.js@latest/stockfish.js');

const stockfish = new Stockfish();

self.onmessage = function(e) {
  const command = e.data.command;
  const fen = e.data.fen;

  if (command === 'init') {
    stockfish.postMessage('uci');
    stockfish.postMessage('isready');
  } else if (command === 'getMove') {
    stockfish.postMessage(`position fen ${fen}`);
    stockfish.postMessage('go depth 20');
  }
};

stockfish.onmessage = function(e) {
  const message = e.data;

  if (message.startsWith('bestmove')) {
    const bestMove = message.split(' ')[1];
    self.postMessage({ type: 'bestmove', payload: bestMove });
  }
};
