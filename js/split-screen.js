// Split screen: en hvid bold på sort område og en sort bold på hvidt område.
// Når en bold rammer et felt i sin egen farve, skifter feltet farve (så
// bolden får mere plads), og bolden får en ny, lidt tilfældig retning.

(function () {
  const BLACK = 0;
  const WHITE = 1;
  const COLORS = ["#111", "#fff"];

  // Bolden får en ny retning ved hvert sammenstød: den spejles, og så
  // drejes den tilfældigt op til +/- MAX_TURN radianer.
  const MAX_TURN = 0.35;
  // Undgå at bolden kører næsten vandret eller lodret i al evighed.
  const MIN_AXIS = 0.25;
  // Lille fast tidsskridt, så bolden ikke springer hen over felter.
  const STEP = 1 / 240;

  const canvas = document.getElementById("split-screen");
  const ctx = canvas.getContext("2d");
  const scoreEl = document.getElementById("score");

  let width, height, cell, cols, rows, grid, balls;

  function init() {
    const dpr = window.devicePixelRatio || 1;
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    cell = Math.max(12, Math.min(28, Math.round(Math.min(width, height) / 25)));
    cols = Math.ceil(width / cell);
    rows = Math.ceil(height / cell);

    // Venstre halvdel sort, højre halvdel hvid.
    grid = [];
    for (let c = 0; c < cols; c++) {
      grid.push(new Array(rows).fill(c < cols / 2 ? BLACK : WHITE));
    }

    const speed = cell * 30;
    balls = [
      // Den hvide bold kører på det sorte område.
      makeBall(WHITE, width / 4, height / 2, speed, Math.PI / 4),
      // Den sorte bold kører på det hvide område.
      makeBall(BLACK, (width * 3) / 4, height / 2, speed, (Math.PI * 5) / 4),
    ];
  }

  function makeBall(color, x, y, speed, angle) {
    return {
      color,
      x,
      y,
      r: cell / 2,
      speed,
      dx: Math.cos(angle) * speed,
      dy: Math.sin(angle) * speed,
    };
  }

  // Giv bolden en ny linje. signX/signY (-1, 0 eller 1) tvinger retningen
  // væk fra det, den lige har ramt.
  function newDirection(ball, signX, signY) {
    const angle = Math.atan2(ball.dy, ball.dx) + (Math.random() * 2 - 1) * MAX_TURN;
    let ux = Math.cos(angle);
    let uy = Math.sin(angle);

    if (Math.abs(ux) < MIN_AXIS) ux = MIN_AXIS * (Math.sign(ux) || 1);
    if (Math.abs(uy) < MIN_AXIS) uy = MIN_AXIS * (Math.sign(uy) || 1);
    const len = Math.hypot(ux, uy);
    ux /= len;
    uy /= len;

    if (signX) ux = Math.abs(ux) * signX;
    if (signY) uy = Math.abs(uy) * signY;

    ball.dx = ux * ball.speed;
    ball.dy = uy * ball.speed;
  }

  function update(ball, dt) {
    ball.x += ball.dx * dt;
    ball.y += ball.dy * dt;

    let signX = 0;
    let signY = 0;

    // Kanterne af skærmen.
    if (ball.x - ball.r < 0) { ball.x = ball.r; signX = 1; }
    if (ball.x + ball.r > width) { ball.x = width - ball.r; signX = -1; }
    if (ball.y - ball.r < 0) { ball.y = ball.r; signY = 1; }
    if (ball.y + ball.r > height) { ball.y = height - ball.r; signY = -1; }

    // Felter i boldens egen farve er "væggen" mod modstanderens område.
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      const cos = Math.cos(a);
      const sin = Math.sin(a);
      const c = Math.floor((ball.x + cos * ball.r) / cell);
      const r = Math.floor((ball.y + sin * ball.r) / cell);
      if (c < 0 || c >= cols || r < 0 || r >= rows) continue;
      if (grid[c][r] !== ball.color) continue;

      grid[c][r] = 1 - ball.color;
      if (Math.abs(cos) > Math.abs(sin)) {
        signX = -Math.sign(cos);
      } else {
        signY = -Math.sign(sin);
      }
    }

    if (signX || signY) newDirection(ball, signX, signY);
  }

  function draw() {
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        ctx.fillStyle = COLORS[grid[c][r]];
        ctx.fillRect(c * cell, r * cell, cell, cell);
      }
    }
    for (const ball of balls) {
      ctx.fillStyle = COLORS[ball.color];
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function updateScore() {
    let black = 0;
    let white = 0;
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        if (grid[c][r] === BLACK) black++;
        else white++;
      }
    }
    scoreEl.textContent = `sort ${black} | hvid ${white}`;
  }

  let last = null;
  let acc = 0;
  let frame = 0;

  function loop(now) {
    if (last !== null) {
      acc += Math.min(0.05, (now - last) / 1000);
      while (acc >= STEP) {
        for (const ball of balls) update(ball, STEP);
        acc -= STEP;
      }
    }
    last = now;
    draw();
    if (frame++ % 10 === 0) updateScore();
    requestAnimationFrame(loop);
  }

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (canvas.clientWidth !== width || canvas.clientHeight !== height) init();
    }, 200);
  });

  init();
  requestAnimationFrame(loop);
})();
