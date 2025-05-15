// stockfish.js - Wrapper pour le moteur Stockfish

class StockfishEngine {
  constructor() {
    this.engine = null;
    this.onMessage = null;
    this.ready = false;
  }

  async init() {
    if (window.Stockfish) {
      this.engine = await window.Stockfish();
      this.engine.addMessageListener(msg => this.onMessage && this.onMessage(msg));
      this.ready = true;
      return true;
    }
    return false;
  }

  postMessage(cmd) {
    if (this.ready && this.engine) {
      this.engine.postMessage(cmd);
    }
  }

  setOption(name, value) {
    this.postMessage(`setoption name ${name} value ${value}`);
  }

  setPosition(fen) {
    this.postMessage(`position fen ${fen}`);
  }

  go(time) {
    this.postMessage(`go movetime ${time}`);
  }

  stop() {
    this.postMessage('stop');
  }
}

function createStockfishEngine() {
  return new StockfishEngine();
}
