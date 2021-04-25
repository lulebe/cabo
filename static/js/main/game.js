const socket = io(window.location.origin);
socket.on('connect', () => {
  socket.emit('main-name', gameName)
})
socket.on('players', function(data) {
  const connected = {}
  data.forEach(d => {
    connected[d.name] = d.connected
  })
  game.players.forEach(player => {
    player.connected = connected[player.name]
  })
  updateScoreboard()
  updateDeckdata()
})

const SE_NOTHING = 0
socket.on('screen-event', data => {
  switch (data.event) {
  }
})

function updateScreens () {
  socket.emit('screen-update', {gameName: gameName, data: game})
}

function warnScreens (warningNum) {
  socket.emit('screen-warning', {gameName: gameName, warningNum})
}

let startingPlayer = 0
const game = {name: gameName, players: playerNames.map(name => ({name, score: 0, connected: false, cards: []})), box: makeBox(), turn: 0}

if (canLoadGame()) //has saved game
  displayLoadGamePopup()
else
  initGame()

function initGame () {
  setStartingPlayer()
  updateScoreboard()
  initCanvas()
  updateScreens()
}

function canLoadGame () {
  if (!window.localStorage.getItem('nextRow') || !window.localStorage.getItem('game')) return false
  const savedPlayerNames = JSON.parse(window.localStorage.getItem('game')).players.map(p => p.name)
  return game.players.length === savedPlayerNames.length && game.players.every(p => savedPlayerNames.includes(p.name))
}

function displayLoadGamePopup () {
  document.getElementById('loadgame-popup').classList.add('visible')
}

function loadGame () {
  document.getElementById('loadgame-popup').classList.remove('visible')
  nextRow = parseInt(window.localStorage.getItem('nextRow'))
  const loadedGame = JSON.parse(window.localStorage.getItem('game'))
  game.players = loadedGame.players
  game.box = loadedGame.box
  game.table = loadedGame.table
  game.turn = loadedGame.turn
  updateScreens()
  document.getElementById('turn-player').innerHTML = game.players[game.turn].name
  updateScoreboard()
  initCanvas()
  updateScreens()
  displayBoxSize()
  updateDeckdata()
}

function startNewGame () {
  document.getElementById('loadgame-popup').classList.remove('visible')
  window.localStorage.clear()
  initGame()
}

//numbers = 0 to 13, each 4x but 0 and 13 2x
function makeBox () {
  const box = []
  for (let card = 1; card <= 12; card++) {
    for (let i = 0; i < 4; i++)
      box.push(card)
  }
  box.push(0)
  box.push(0)
  box.push(13)
  box.push(13)
  return arrShuffle(box)
}

function arrShuffle (array) {
  let currentIndex = array.length, temporaryValue, randomIndex
  while (0 !== currentIndex) {
    randomIndex = Math.floor(Math.random() * currentIndex)
    currentIndex -= 1
    temporaryValue = array[currentIndex]
    array[currentIndex] = array[randomIndex]
    array[randomIndex] = temporaryValue
  }
  return array
}

function setStartingPlayer () {
  game.turn = startingPlayer = game.players.indexOf(game.players.map(player => ({player, maxRow: getMaxRowFromDeck(player.deck)})).sort((a, b) => a.maxRow - b.maxRow).pop().player)
  document.getElementById('turn-player').innerHTML = game.players[game.turn].name
}

function makeTurn () {
  drawGame()
  fillDecks()
  toNextTurn()
  updateScoreboard()
  updateScreens()
}

function updateScoreboard () {
  const scoreboard = document.getElementById('scoreboard')
  const turn = game.players[game.turn]
  scoreboard.innerHTML = [...game.players].sort((a, b) => b.score - a.score).reduce((html, player) => html + `<li class="${player == turn ? "turn" : ""}"><div class="color-marker ${player.connected ? "connected" : "disconnected"}"></div>${player.name}: ${player.score}</li>`, "")
}

const WARN_NOTHING = 0
const WARN_GAME_OVER = 1
const warnings = [
  "",
  "Game is over. Highest score wins!"
]
let warningTimeout = null
function displayWarning (warningNum) {
  warningTimeout && clearTimeout(warningTimeout)
  document.getElementById("warning-box").innerHTML = warnings[warningNum]
  document.getElementById("warning-box").classList.add("visible")
  warningTimeout = setTimeout(() => {document.getElementById("warning-box").classList.remove("visible")}, 6000)
  warnScreens(warningNum)
}

function gameEnd () {
  displayWarning(WARN_GAME_OVER)
  updateScreens()
  socket.emit('game-end', {gameName})
  clearSavedGame()
}

function toNextTurn () {
  if (game.players[game.turn].deck.length === 0) {//end game
    game.players[game.turn].score += 6
    updateScoreboard()
    gameEnd()
  } else {
    game.turn = game.turn == game.players.length - 1 ? 0 : game.turn + 1
    document.getElementById('turn-player').innerHTML = game.players[game.turn].name
    displaySelectedPieces()
    saveGame()
  }
}

function swapPieces () {
  resetTurn()
  const player = game.players[game.turn]
  const toSwap = player.deck.filter(piece => piece.selected)
  player.deck = player.deck.filter(piece => !piece.selected)
  if (game.box.length < toSwap.length)
    return displayWarning(WARN_CANT_SWAP)
  while (player.deck.length < 6 && game.box.length > 0) {
    player.deck.push({piece: game.box.pop(), selected: false})
  }
  toSwap.forEach(piece => game.box.push(piece.piece))
  game.box = arrShuffle(game.box)
  removePrevTurnMarks()
  toNextTurn()
  updateScoreboard()
  updateScreens()
  updateDeckdata()
}

function removePrevTurnMarks () {
  Object.keys(game.table).forEach(sx => {
    const x = parseInt(sx)
    Object.keys(game.table[x]).forEach(sy => {
      const y = parseInt(sy)
      const piece = game.table[x][y]
      if (piece.prevTurn) {
        delete piece.prevTurn
      }
    })
  })
}

function resetTurn () {
  const newPiecePositions = []
  Object.keys(game.table).forEach(sx => {
    const x = parseInt(sx)
    Object.keys(game.table[x]).forEach(sy => {
      const y = parseInt(sy)
      const piece = game.table[x][y]
      if (piece.new) {
        newPiecePositions.push({x, y})
      }
    })
  })
  newPiecePositions.forEach(pos => {
    game.players[game.turn].deck.push({piece: game.table[pos.x][pos.y].piece, selected: false})
    delete game.table[pos.x][pos.y]
  })
  rowsChangedX.forEach(piece => {
    if (game.table[piece.x][piece.y] != null)
      game.table[piece.x][piece.y].rowX = piece.from
  })
  rowsChangedY.forEach(piece => {
    if (game.table[piece.x][piece.y] != null)
      game.table[piece.x][piece.y].rowY = piece.from
  })
  updateDeckdata()
  drawGame()
  updateScreens()
}

function saveGame () {
  window.localStorage.setItem('nextRow', nextRow)
  window.localStorage.setItem('game', JSON.stringify(game))
}
function clearSavedGame () {
  window.localStorage.clear()
}

document.getElementById('main-action-reset').addEventListener('click', resetTurn)
document.getElementById('main-action-swap').addEventListener('click', swapPieces)
document.getElementById('main-action-finish').addEventListener('click', makeTurn)
document.getElementById('loadgame-load').addEventListener('click', loadGame)
document.getElementById('loadgame-new').addEventListener('click', startNewGame)
