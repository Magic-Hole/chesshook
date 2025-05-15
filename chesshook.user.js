// ==UserScript==
// @name        Chesshook
// @include     https://www.chess.com/*
// @grant       none
// @require     https://raw.githubusercontent.com/0mlml/chesshook/master/betafish.js
// @require     https://raw.githubusercontent.com/0mlml/vasara/main/vasara.js
// @require     https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js
// @require     https://raw.githubusercontent.com/Magic-Hole/chesshook/master/stockfish.js
// @version     2.3
// @author      0mlml
// @description Chess.com Cheat Userscript with Stockfish support
// @updateURL   https://raw.githubusercontent.com/Magic-Hole/chesshook/master/chesshook.user.js
// @downloadURL https://raw.githubusercontent.com/Magic-Hole/chesshook/master/chesshook.user.js
// @run-at      document-start
// ==/UserScript==

(() => {
  const vs = vasara();

  // [Toutes les fonctions existantes restent les mêmes jusqu'à la section init()]

  const init = () => {
    // [Configurations existantes...]

    // Ajout de la configuration pour Stockfish
    vs.registerConfigValue({
      key: namespace + '_whichengine',
      type: 'dropdown',
      display: 'Which Engine: ',
      description: 'Which engine to use',
      value: 'none',
      options: ['betafish', 'random', 'cccp', 'external', 'stockfish'], // Ajout de Stockfish
      showOnlyIf: () => !vs.queryConfigKey(namespace + '_legitmode') && !vs.queryConfigKey(namespace + '_puzzlemode'),
      callback: () => {
        if (vs.queryConfigKey(namespace + '_whichengine') === 'external') {
          if (!vs.queryConfigKey(namespace + '_externalengineurl')) {
            addToConsole('Please set the path to the external engine in the config.');
            return;
          }
          externalEngineWorker.postMessage({ type: 'INIT', payload: vs.queryConfigKey(namespace + '_externalengineurl') });
        } else if (vs.queryConfigKey(namespace + '_whichengine') === 'stockfish') {
          if (!window.Stockfish) {
            addToConsole('Stockfish engine not loaded, please refresh the page');
          }
        }
      }
    });

    vs.registerConfigValue({
      key: namespace + '_stockfishthinkingtime',
      type: 'number',
      display: 'Stockfish Thinking Time: ',
      description: 'The amount of time in ms to think for each move',
      value: 1000,
      min: 0,
      max: 20000,
      step: 100,
      showOnlyIf: () => !vs.queryConfigKey(namespace + '_legitmode') && vs.queryConfigKey(namespace + '_whichengine') === 'stockfish'
    });

    // [Le reste des configurations existantes...]
  };

  // [Toutes les autres fonctions existantes...]

  let stockfishEngine = null;

  const initStockfish = async () => {
    if (!window.Stockfish) {
      addToConsole('Stockfish engine not available');
      return false;
    }
    
    try {
      stockfishEngine = await window.Stockfish();
      stockfishEngine.addMessageListener(handleStockfishMessage);
      addToConsole('Stockfish engine initialized');
      return true;
    } catch (e) {
      addToConsole('Failed to initialize Stockfish: ' + e);
      return false;
    }
  };

  const handleStockfishMessage = (message) => {
    if (message.startsWith('bestmove')) {
      const bestMove = message.split(' ')[1];
      addToConsole(`Stockfish computed best move: ${bestMove}`);
      handleEngineMove(bestMove);
    }
  };

  const getEngineMove = () => {
    const board = document.querySelector('wc-chess-board');
    const fen = board.game.getFEN();
    
    // [Code existant...]

    if (vs.queryConfigKey(namespace + '_whichengine') === 'stockfish') {
      if (!stockfishEngine) {
        initStockfish().then(success => {
          if (success) {
            getStockfishMove(fen);
          }
        });
      } else {
        getStockfishMove(fen);
      }
    }
    // [Autres moteurs...]
  };

  const getStockfishMove = (fen) => {
    if (!stockfishEngine) return;
    
    const thinkTime = vs.queryConfigKey(namespace + '_stockfishthinkingtime');
    
    stockfishEngine.postMessage('ucinewgame');
    stockfishEngine.postMessage(`position fen ${fen}`);
    stockfishEngine.postMessage(`go movetime ${thinkTime}`);
    
    addToConsole(`Stockfish calculating move (${thinkTime}ms)...`);
  };

  // [Le reste du code existant...]

  document.addEventListener('readystatechange', () => {
    if (document.readyState === 'interactive') {
      init();
    }
  });
})();
