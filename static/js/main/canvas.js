const canvas = document.getElementById("game-canvas")
const ctx = canvas.getContext("2d")

window.addEventListener('resize', resizeCanvas)

function resizeCanvas () {
  document.getElementById("game-canvas").width = document.body.clientWidth - Math.min(document.body.clientWidth*0.35, 450) - 4 - 2
  document.getElementById("game-canvas").height = window.innerHeight - 64 - 4
  drawGame()
}
function initCanvas () {
  resizeCanvas()
}

function drawGame () {
  
}


canvas.addEventListener("click", e => {
  canvasClick(e.clientX, e.clientY)
})

function canvasClick (x, y) {
  const bounds = canvas.getBoundingClientRect()
  const realX = Math.floor(x - bounds.left - translateX)
  const realY = Math.floor(y - bounds.top - translateY)
  //TODO calculate clicked card
}
