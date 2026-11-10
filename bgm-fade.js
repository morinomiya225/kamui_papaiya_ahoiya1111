// bgm-fade.js
// BGMをループさせず、曲の終わりでフェードアウトして止めるための追加スクリプト。
// ゲーム本体のスクリプトより「前」に読み込んでください。
//   <script src="bgm-fade.js"></script>
(function () {
  const PLAY_SEC = 8;    // BGMを何秒流して止めるか（曲がこれより短ければ曲の終わりで止まる）
  const FADE_SEC = 2;    // 止まる前の何秒でフェードアウトするか
  const BGM_MIN_SEC = 4; // これより長い音だけBGMとして扱う（短いSEはそのまま）

  // ループを無効化（本体が loop = true にしても無視する）
  Object.defineProperty(HTMLMediaElement.prototype, "loop", {
    configurable: true,
    get() { return false; },
    set(_) { /* 無視 */ }
  });

  const origPlay = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () {
    this.removeAttribute("loop"); // <audio loop> と書かれていても止める
    if (!this.__fadeHooked) hook(this);
    return origPlay.apply(this, arguments);
  };

  function hook(a) {
    a.__fadeHooked = true;
    a.__baseVol = null;

    const tick = () => {
      if (a.paused || a.ended) return;
      const d = a.duration;
      if (isFinite(d) && d >= BGM_MIN_SEC) {
        const stopAt = Math.min(d, PLAY_SEC);
        const rest = stopAt - a.currentTime;
        if (rest <= 0) {
          a.pause();
          if (a.__baseVol !== null) a.volume = a.__baseVol;
          a.__baseVol = null;
          return;
        }
        if (rest <= FADE_SEC) {
          if (a.__baseVol === null) a.__baseVol = a.volume;
          a.volume = Math.max(0, a.__baseVol * (rest / FADE_SEC));
        } else if (a.__baseVol !== null) {
          // 頭から再生し直されたら音量を戻す
          a.volume = a.__baseVol;
          a.__baseVol = null;
        }
      }
      requestAnimationFrame(tick);
    };

    a.addEventListener("play", () => requestAnimationFrame(tick));
    a.addEventListener("ended", () => {
      if (a.__baseVol !== null) {
        a.volume = a.__baseVol; // 次に同じ曲を流すときのために戻す
        a.__baseVol = null;
      }
    });
  }
})();