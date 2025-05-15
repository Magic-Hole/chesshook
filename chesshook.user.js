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

  const createExploitWindow = () => {
    const exploitWindow = vs.generateModalWindow({
      title: 'Exploits',
      unique: true,
    });

    if (!exploitWindow) return;

    exploitWindow.generateLabel({
      text: 'Force Scholars Mate against bot: ',
      tooltip: 'This feature simply does not work online. It will only work on the computer play page, and can be used to three crown all bots.'
    });

    exploitWindow.generateButton({
      text: 'Force Scholars Mate',
      callback: e => {
        e.preventDefault();
        if (!document.location.pathname.startsWith('/play/computer')) return alert('You must be on the computer play page to use this feature.');
        const board = document.querySelector('wc-chess-board');
        if (!board?.game?.move || !board?.game?.getFEN) return alert('You must be in a game to use this feature.');
        if (parseInt(board.game.getFEN().split(' ')[5]) > 1 || board.game.getFEN().split(' ')[1] !== 'w') return alert('It must be turn 1 and white to move to use this feature.');

        board.game.move('e4');
        board.game.move('e5');
        board.game.move('Qf3');
        board.game.move('Nc6');
        board.game.move('Bc4');
        board.game.move('Nb8');
        board.game.move('Qxf7#');
      }
    });

    exploitWindow.putNewline();

    exploitWindow.generateLabel({
      text: 'Force Draw against bot: ',
      tooltip: 'This feature simply does not work online. It will only work on the computer play page.'
    });

    exploitWindow.generateButton({
      text: 'Force Draw',
      callback: e => {
        e.preventDefault();
        if (document.location.hostname !== 'www.chess.com') return alert('You must be on chess.com to use this feature.');
        if (!document.location.pathname.startsWith('/play/computer')) return alert('You must be on the computer play page to use this feature.');
        const board = document.querySelector('wc-chess-board');
        if (!board?.game?.move) return alert('You must be in a game to use this feature.');

        board.game.agreeDraw();
      }
    });
  };

  const createConfigWindow = () => {
    vs.generateConfigWindow({
      height: 700,
      resizable: true
    });
  };

  const consoleQueue = [];
  const createConsoleWindow = () => {
    const consoleWindow = vs.generateModalWindow({
      title: 'Console',
      resizable: true,
      unique: true,
      tag: namespace + '_consolewindowtag'
    });

    if (!consoleWindow) return;

    consoleWindow.content.setAttribute('tag', namespace + '_consolewindowcontent');
    consoleWindow.content.style.padding = 0;

    while (consoleQueue.length > 0) {
      addConsoleLineElement(consoleQueue.shift());
    }
  };

  const addConsoleLineElement = (text) => {
    const consoleWindow = document.querySelector(`[tag=${namespace}_consolewindowtag]`);
    const consoleContent = consoleWindow?.querySelector(`[tag=${namespace}_consolewindowcontent]`);

    if (!consoleWindow || !consoleContent) {
      return console.warn('Cannot add console line');
    }

    const line = document.createElement('p');
    line.style.border = 'solid 1px';
    line.style.width = '100%';
    line.style.padding = '2px';
    line.innerText = text;
    consoleContent.appendChild(line);
  };

  const addToConsole = (text) => {
    const consoleWindow = document.querySelector(`[tag=${namespace}_consolewindowtag]`);
    const consoleContent = consoleWindow?.querySelector(`[tag=${namespace}_consolewindowcontent]`);

    if (!consoleWindow || !consoleContent) {
      consoleQueue.push(text);
      return;
    }

    addConsoleLineElement(text);
  };

  const namespace = 'chesshook';
  window[namespace] = {};

  // Stockfish Engine Integration
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

  const getStockfishMove = (fen) => {
    if (!stockfishEngine) return;
    
    const thinkTime = vs.queryConfigKey(namespace + '_stockfishthinkingtime');
    
    stockfishEngine.postMessage('ucinewgame');
    stockfishEngine.postMessage(`position fen ${fen}`);
    stockfishEngine.postMessage(`go movetime ${thinkTime}`);
    
    addToConsole(`Stockfish calculating move (${thinkTime}ms)...`);
  };

  // [Toutes les autres fonctions existantes...]

  const getEngineMove = () => {
    const board = document.querySelector('wc-chess-board');
    const fen = board.game.getFEN();
    
    if (!fen || engineLastKnownFEN === fen) return;
    engineLastKnownFEN = board.game.getFEN();

    if (!isMyTurn()) return;

    addToConsole(`Calculating move based on engine: ${vs.queryConfigKey(namespace + '_whichengine')}...`);

    if (vs.queryConfigKey(namespace + '_automoveinstamovestart') && parseInt(fen.split(' ')[5]) < 6) lastEngineMoveCalcStartTime = 0;
    else lastEngineMoveCalcStartTime = performance.now();

    if (vs.queryConfigKey(namespace + '_whichengine') === 'betafish') {
      betafishWorker.postMessage({ type: 'FEN', payload: fen });
      betafishWorker.postMessage({ type: 'GETMOVE' });
    } else if (vs.queryConfigKey(namespace + '_whichengine') === 'external') {
      // [Code existant pour external engine...]
    } else if (vs.queryConfigKey(namespace + '_whichengine') === 'random') {
      // [Code existant pour random engine...]
    } else if (vs.queryConfigKey(namespace + '_whichengine') === 'cccp') {
      // [Code existant pour cccp engine...]
    } else if (vs.queryConfigKey(namespace + '_whichengine') === 'stockfish') {
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
  };

  // [Toutes les autres fonctions et configurations existantes...]

  const init = () => {
    // [Configurations existantes...]

    vs.registerConfigValue({
      key: namespace + '_whichengine',
      type: 'dropdown',
      display: 'Which Engine: ',
      description: 'Which engine to use',
      value: 'none',
      options: ['betafish', 'random', 'cccp', 'external', 'stockfish'],
      showOnlyIf: () => !vs.queryConfigKey(namespace + '_legitmode') && !vs.queryConfigKey(namespace + '_puzzlemode'),
      callback: () => {
        if (vs.queryConfigKey(namespace + '_whichengine') === 'external') {
          // [Code existant...]
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

  // [Le reste du code existant...]

  document.addEventListener('readystatechange', () => {
    if (document.readyState === 'interactive') {
      init();
    }
  });
})();
