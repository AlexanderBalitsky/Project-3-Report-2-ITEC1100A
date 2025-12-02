(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  const overlay = document.getElementById('overlay');
  const startBtn = document.getElementById('startBtn');
  const restartBtn = document.getElementById('restartBtn');
  const scoreEl = document.getElementById('score');
  const livesEl = document.getElementById('lives');
  const messageEl = document.getElementById('message');

  const PADDLE_WIDTH = 110;
  const PADDLE_HEIGHT = 14;
  const BALL_RADIUS = 9;
  const MAX_LEVEL = 3;

  let game = {
    running: false,
    score: 0,
    lives: 3,
    level: 1,
    ballSpeedMultiplier: 1,
    lastTime: 0,
    rafId: null
  };

  const paddle = {
    width: PADDLE_WIDTH,
    height: PADDLE_HEIGHT,
    x: canvas.width / 2 - PADDLE_WIDTH / 2,
    y: canvas.height - 50,
    speed: 7,
    moveLeft: false,
    moveRight: false
  };

  let ball = {
    x: canvas.width / 2,
    y: paddle.y - BALL_RADIUS - 4,
    radius: BALL_RADIUS,
    dx: 0,
    dy: 0,
    stuck: true
  };

  const brickConfig = {
    rows: 4,
    cols: 8,
    width: 80,
    height: 22,
    padding: 10,
    offsetTop: 60,
    offsetLeft: 46
  };

  let bricks = [];
  const levelBackgrounds = ['#081227','#072a2a','#24121b','#082418','#2b0824'];

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function buildBricks(level = 1) {
    bricks = [];
    const rows = brickConfig.rows + Math.floor((level - 1) / 1);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < brickConfig.cols; c++) {
        bricks.push({
          x: brickConfig.offsetLeft + c * (brickConfig.width + brickConfig.padding),
          y: brickConfig.offsetTop + r * (brickConfig.height + brickConfig.padding),
          width: brickConfig.width,
          height: brickConfig.height,
          destroyed: false,
          hits: (r % 3 === 0) ? 2 : 1
        });
      }
    }
  }

  function resetBall(sticky = true) {
    ball.x = paddle.x + paddle.width / 2;
    ball.y = paddle.y - ball.radius - 4;
    ball.stuck = sticky;
    ball.dx = 0;
    ball.dy = 0;
  }

  function resetGame() {
    game.running = false;
    game.score = 0;
    game.lives = 3;
    game.level = 1;
    game.ballSpeedMultiplier = 1;
    paddle.x = canvas.width / 2 - paddle.width / 2;
    paddle.speed = 7;
    buildBricks(game.level);
    resetBall(true);
    updateHUD();
    showOverlay(true);
    hideMessage();
    cancelAnimationFrame(game.rafId);
  }

  function updateHUD() {
    scoreEl.textContent = `Score: ${game.score}`;
    livesEl.textContent = `Lives: ${game.lives}`;
  }

  function showMessage(text) {
    messageEl.classList.remove('hidden');
    messageEl.textContent = text;
  }

  function hideMessage() {
    messageEl.classList.add('hidden');
    messageEl.textContent = '';
  }

  function showOverlay(show = true) {
    if (show) {
      overlay.classList.add('visible');
      overlay.classList.remove('hidden');
    } else {
      overlay.classList.remove('visible');
      overlay.classList.add('hidden');
    }
  }

  function launchBall() {
    if (!ball.stuck) return;
    ball.dx = (Math.random() * 2 - 1) * 3 * game.ballSpeedMultiplier;
    ball.dy = -4 * game.ballSpeedMultiplier;
    ball.stuck = false;
  }

  function rectCircleColliding(circle, rect) {
    const nx = clamp(circle.x, rect.x, rect.x + rect.width);
    const ny = clamp(circle.y, rect.y, rect.y + rect.height);
    const dx = circle.x - nx;
    const dy = circle.y - ny;
    return dx * dx + dy * dy <= circle.radius * circle.radius;
  }

  function hitBrick(b) {
    b.hits -= 1;
    if (b.hits <= 0) {
      b.destroyed = true;
      game.score += 100;
    } else {
      game.score += 60;
    }
    updateHUD();
  }

  function nextLevel() {
    if (game.level >= MAX_LEVEL) {
      showMessage('You Win! Press R to play again.');
      game.running = false;
      showOverlay(false);
      return;
    }
    game.level++;
    game.ballSpeedMultiplier *= 1.08;
    buildBricks(game.level);
    resetBall(true);
    updateHUD();
    showMessage(`Level ${game.level}!`);
    setTimeout(hideMessage, 900);
  }

  function loseLife() {
    game.lives--;
    updateHUD();
    if (game.lives <= 0) {
      game.running = false;
      showMessage('Game Over - Press R to restart');
      showOverlay(false);
      cancelAnimationFrame(game.rafId);
    } else {
      showMessage('Life lost! Press Space to continue.');
      resetBall(true);
      setTimeout(hideMessage, 800);
    }
  }

  function update(delta) {
    if (!game.running) return;

    if (paddle.moveLeft) paddle.x -= paddle.speed;
    if (paddle.moveRight) paddle.x += paddle.speed;
    paddle.x = clamp(paddle.x, 6, canvas.width - paddle.width - 6);

    if (ball.stuck) {
      ball.x = paddle.x + paddle.width / 2;
      ball.y = paddle.y - ball.radius - 4;
    } else {
      ball.x += ball.dx;
      ball.y += ball.dy;
    }

    if (ball.x - ball.radius <= 0) {
      ball.x = ball.radius;
      ball.dx = -ball.dx;
    } else if (ball.x + ball.radius >= canvas.width) {
      ball.x = canvas.width - ball.radius;
      ball.dx = -ball.dx;
    }
    if (ball.y - ball.radius <= 0) {
      ball.y = ball.radius;
      ball.dy = -ball.dy;
    }

    if (ball.y - ball.radius > canvas.height) {
      loseLife();
      return;
    }

    const paddleRect = { x: paddle.x, y: paddle.y, width: paddle.width, height: paddle.height };
    if (rectCircleColliding(ball, paddleRect) && ball.dy > 0) {
      const hitPos = (ball.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2);
      const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy) || (4 * game.ballSpeedMultiplier);
      const angle = hitPos * (Math.PI / 3);
      ball.dx = speed * Math.sin(angle);
      ball.dy = -Math.abs(speed * Math.cos(angle));
      if (Math.abs(ball.dy) < 3 * game.ballSpeedMultiplier) {
        ball.dy = -3 * game.ballSpeedMultiplier;
      }
    }

    let remaining = 0;
    for (let b of bricks) {
      if (b.destroyed) continue;
      remaining++;
      const rect = { x: b.x, y: b.y, width: b.width, height: b.height };

      if (rectCircleColliding(ball, rect)) {
        ball.dy = -ball.dy;
        hitBrick(b);
        break;
      }
    }

    if (remaining === 0) nextLevel();
  }

  function draw() {
    const bg = levelBackgrounds[(game.level - 1) % levelBackgrounds.length] || levelBackgrounds[0];
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let b of bricks) {
      if (b.destroyed) continue;
      ctx.fillStyle = b.hits > 1 ? '#ffb86b' : '#7ee787';
      ctx.fillRect(b.x, b.y, b.width, b.height);
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.strokeRect(b.x, b.y, b.width, b.height);
    }

    ctx.fillStyle = '#58a6ff';
    ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);

    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#ffd166';
    ctx.fill();
    ctx.closePath();

    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.font = '14px system-ui, Arial';
    ctx.fillText(`Level ${game.level}`, 10, canvas.height - 10);
  }

  function frameLoop(timestamp) {
    const delta = timestamp - (game.lastTime || timestamp);
    game.lastTime = timestamp;
    update(delta);
    draw();
    game.rafId = requestAnimationFrame(frameLoop);
  }

  document.addEventListener('keydown', e => {
    if (e.repeat) return;
    if (e.key === 'ArrowLeft' || e.key === 'Left') paddle.moveLeft = true;
    if (e.key === 'ArrowRight' || e.key === 'Right') paddle.moveRight = true;
    if (e.code === 'Space' || e.key === ' ') {
      launchBall();
      e.preventDefault();
    }
    if (e.key.toLowerCase() === 'r') {
      resetGame();
      game.running = true;
      showOverlay(false);
      hideMessage();
      game.rafId = requestAnimationFrame(frameLoop);
    }
  });

  document.addEventListener('keyup', e => {
    if (e.key === 'ArrowLeft' || e.key === 'Left') paddle.moveLeft = false;
    if (e.key === 'ArrowRight' || e.key === 'Right') paddle.moveRight = false;
  });

  startBtn.addEventListener('click', () => {
    resetGame();
    game.running = true;
    showOverlay(false);
    hideMessage();
    game.rafId = requestAnimationFrame(frameLoop);
  });

  restartBtn.addEventListener('click', () => {
    resetGame();
    game.running = true;
    showOverlay(false);
    hideMessage();
    game.rafId = requestAnimationFrame(frameLoop);
  });

  buildBricks(game.level);
  resetBall(true);
  updateHUD();
  showOverlay(true);

})();
