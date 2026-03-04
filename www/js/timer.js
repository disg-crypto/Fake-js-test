/* ═══════════════════════════════════════════
   timer.js – Round timer logic
   ═══════════════════════════════════════════ */

const TimerModule = (() => {
  let intervalId  = null;
  let totalSeconds = 0;
  let remaining   = 0;
  let isResting   = false;
  let currentRound = 1;
  let totalRounds  = 3;
  let roundDuration = 300; // seconds
  let restDuration  = 30;
  let running = false;

  const clockEl  = () => document.getElementById('timer-clock');
  const phaseEl  = () => document.getElementById('timer-phase');
  const barEl    = () => document.getElementById('timer-bar');
  const roundsEl = () => document.getElementById('timer-rounds-info');
  const displayEl= () => document.getElementById('timer-display');

  function pad(n) { return String(n).padStart(2, '0'); }

  function formatTime(secs) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${pad(m)}:${pad(s)}`;
  }

  function updateDisplay() {
    clockEl().textContent  = formatTime(remaining);
    roundsEl().textContent = `Round ${currentRound} / ${totalRounds}`;
    phaseEl().textContent  = isResting ? '🟢 Rest' : '🔴 Roll';

    const pct = (remaining / totalSeconds) * 100;
    barEl().style.width = pct + '%';

    displayEl().classList.toggle('rolling',  !isResting);
    displayEl().classList.toggle('resting',   isResting);
  }

  function rotateTip() {
    const tipEl = document.getElementById('tip-text');
    if (tipEl) tipEl.textContent = TIPS[Math.floor(Math.random() * TIPS.length)];
  }

  function tick() {
    remaining--;
    updateDisplay();

    if (remaining <= 0) {
      if (isResting) {
        // rest over → next round
        currentRound++;
        if (currentRound > totalRounds) {
          finish();
          return;
        }
        isResting = false;
        totalSeconds = roundDuration;
        remaining    = roundDuration;
        rotateTip();
      } else {
        // round over → rest (skip if last round)
        if (currentRound >= totalRounds) {
          finish();
          return;
        }
        if (restDuration > 0) {
          isResting    = true;
          totalSeconds = restDuration;
          remaining    = restDuration;
        } else {
          currentRound++;
          totalSeconds = roundDuration;
          remaining    = roundDuration;
          rotateTip();
        }
      }
      updateDisplay();
    }
  }

  function readSettings() {
    roundDuration = Math.max(1, parseInt(document.getElementById('round-minutes').value, 10) || 5) * 60;
    restDuration  = Math.max(0, parseInt(document.getElementById('rest-seconds').value,  10) || 30);
    totalRounds   = Math.max(1, parseInt(document.getElementById('num-rounds').value,    10) || 3);
  }

  function start() {
    if (running) return;
    readSettings();
    if (!intervalId) {
      // first start
      currentRound = 1;
      isResting    = false;
      totalSeconds = roundDuration;
      remaining    = roundDuration;
      rotateTip();
      updateDisplay();
    }
    running = true;
    intervalId = setInterval(tick, 1000);
    document.getElementById('btn-start-timer').disabled = true;
    document.getElementById('btn-pause-timer').disabled = false;
    setInputsDisabled(true);
  }

  function pause() {
    if (!running) return;
    running = false;
    clearInterval(intervalId);
    intervalId = null;
    document.getElementById('btn-start-timer').disabled = false;
    document.getElementById('btn-start-timer').textContent = '▶ Resume';
    document.getElementById('btn-pause-timer').disabled = true;
  }

  function reset() {
    running = false;
    clearInterval(intervalId);
    intervalId = null;
    currentRound = 1;
    isResting    = false;
    readSettings();
    totalSeconds = roundDuration;
    remaining    = roundDuration;
    updateDisplay();
    phaseEl().textContent = 'Ready';
    barEl().style.width   = '100%';
    displayEl().classList.remove('rolling', 'resting');
    document.getElementById('btn-start-timer').disabled = false;
    document.getElementById('btn-start-timer').textContent = '▶ Start';
    document.getElementById('btn-pause-timer').disabled = true;
    setInputsDisabled(false);
  }

  function finish() {
    clearInterval(intervalId);
    intervalId = null;
    running = false;
    phaseEl().textContent  = '✅ Done!';
    clockEl().textContent  = '0:00';
    barEl().style.width    = '0%';
    roundsEl().textContent = `All ${totalRounds} rounds complete!`;
    displayEl().classList.remove('rolling', 'resting');
    document.getElementById('btn-start-timer').disabled = false;
    document.getElementById('btn-start-timer').textContent = '▶ Start';
    document.getElementById('btn-pause-timer').disabled = true;
    setInputsDisabled(false);
    showToast('🏁 Training session complete! OSS!');
  }

  function setInputsDisabled(disabled) {
    ['round-minutes', 'rest-seconds', 'num-rounds'].forEach(id => {
      document.getElementById(id).disabled = disabled;
    });
  }

  function init() {
    document.getElementById('btn-start-timer').addEventListener('click', start);
    document.getElementById('btn-pause-timer').addEventListener('click', pause);
    document.getElementById('btn-reset-timer').addEventListener('click', reset);

    // show initial time
    readSettings();
    totalSeconds = roundDuration;
    remaining    = roundDuration;
    clockEl().textContent = formatTime(remaining);
    rotateTip();
  }

  return { init };
})();
