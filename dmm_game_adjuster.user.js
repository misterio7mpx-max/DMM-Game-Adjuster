// ==UserScript==
// @name         DMM Game Adjuster (Ver 4.0 Heart & Ripple)
// @namespace    http://tampermonkey.net/
// @version      4.0
// @description  人差し指カーソルを復帰させ、クリック時の光の波紋エフェクトを実装しました。
// @author       うさぎ
// @match        https://play.games.dmm.com/game/*
// @grant        GM_addStyle
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // 設定保存用キー（バージョン更新）
    const STORAGE_KEY = 'rabbit_game_settings_v30';

    // 1. 設定の読み込み
    const loadSettings = () => {
        const saved = localStorage.getItem(STORAGE_KEY);
        // デフォルト値：拡大1.098, 位置-6, 目隠し82.3, FPS 60, 緊急画像縮尺100%, 位置50%, 音声・緊急画像Ver3.1, ミュートVer3.2, 緊急クロップVer3.3, ランダム幅±25%, 位置散らばり±20px
        return saved ? JSON.parse(saved) : {
            zoom: 1.098, offset: -6, mask: 82.3,
            cropL: 0, cropR: 0, cropB: 0,
            soundUrl: "http://localhost:8000/heart.mp3",
            emergencyUrl: "http://localhost:8000/emergency.jpg",
            isMuted: false,
            // 緊急回避用デフォルト値（ご指定: 70, -50, 0）
            zoomEmergency: 70,
            offsetEmergencyX: -50,
            offsetEmergencyY: 0,
            heartRandomRange: 25,
            heartPosRandomRange: 20
        };
    };

    let settings = loadSettings();

    // カスタムカーソル用画像 (提供画像を再現した人差し指シルエット) - Base64
    const CURSOR_IMAGE_BASE64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAMAAACdt4HsAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAXVBMVEUAAAAAAAAAAAAAAAD///////////////////////////////////////////////////////////////////////////////////////////////////////883E1sAAAAHHRSTlMAAQIDBAUGBwgJCgsMDQ4PEBESExQXFxobHB4fIIHl2QAAAAlwSFlzAAALEwAACxMBAJqcGAAAAW9JREFUOMvNUoWOwzAMY3YZZv//pS8JzC7Z4o7D0g6p4I8Xm5b7fN114vW55bV9/HyeP0wWAAiCgDkAgBwQAQAggFpU13UA+T5U17wA5PvQtTQA5PtQXesCkO9Dd5oDQD7pTgcAkE+60zEA6L90w/oAoP86AIAcCAGAHBABAOCf6XreAPTb6XreAPTb6b4rAOj2G7rXDgD9dtpXAYB+O3WfB4B+f4G+NwCgv06XOgCgv05XGgDQ78f65gCg//fSfg4A+n3f5zcA6PfTvx4A+m/XFwSAfr89f4AABAEAhAEAkAMiAABfW1XvAUDfV9V7ANA/wX4NQD8G+/4NQD8O+6YAUBeNvk8AoIuy9/8IUP/fIADUCXWPB1AX9M0LUDfXPS5AnVNnK0CdVff8AHX+GvLFAXV6Y6kEVEs9M2qAOq9vRguoVp04GkBdu45lArXtOkNVAHXV6oA5oLp2BkgOUNfOqFQAdf0CqgPq9tUNYAcS8AcIuL9Uv535B/3L54V0AAAAAElFTkSuQmCC";

    const css = `
        html, body {
            margin: 0 !important; padding: 0 !important;
            background-color: #000 !important; overflow: hidden !important;
        }

        #game_frame {
            position: fixed !important; top: 0 !important; left: 0px;
            z-index: 999990 !important; transform-origin: top left; border: none !important;
        }

        /* 緊急回避用オーバーレイ（Ver 3.3 調整可能版） */
        #rabbit-emergency-overlay {
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background-color: #000;
            background-repeat: no-repeat;
            z-index: 1000100; /* 最前面 */
            display: none; cursor: pointer;
            background-size: var(--emergency-size, cover);
            background-position: var(--emergency-pos, center center);
        }

        /* ロック中カスタムカーソル（人差し指・Ver 3.7/Ver 4.0復活） */
        #rabbit-click-guard {
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: transparent; z-index: 999997;
            display: none;
            /* カスタムカーソル画像を設定。クリックポイントを指先（上中央）に調整 */
            cursor: url('${CURSOR_IMAGE_BASE64}') 32 0, pointer;
        }

        /* ロック中の画面端のガイド表示（Ver 3.9整理） */
        #rabbit-click-guard.active-lock {
            box-shadow: inset 0 0 40px rgba(255, 20, 147, 0.3); /* 画面端を薄くピンクに */
        }

        .rabbit-heart-wrapper {
            position: fixed; top: 0; left: 0; width: 0; height: 0;
            z-index: 999998; pointer-events: none;
        }

        /* ハートの形状（Ver 3.6 ランダムCSS変数対応） */
        .rabbit-heart-inner {
            position: absolute;
            width: var(--h-size); height: var(--h-size);
            background: #FFB6C1;
            transform: translate(-50%, -50%) rotate(45deg);
            filter: drop-shadow(0 0 2px #FF1493) drop-shadow(0 0 8px #FF1493);
            animation: rabbitHeartFade 1.2s ease-out forwards;
        }
        .rabbit-heart-inner::before, .rabbit-heart-inner::after {
            content: ''; position: absolute;
            width: var(--h-size); height: var(--h-size);
            background: #FFB6C1; border-radius: 50%;
        }
        .rabbit-heart-inner::before { top: calc(var(--h-size) / -2); left: 0; }
        .rabbit-heart-inner::after { top: 0; left: calc(var(--h-size) / -2); }

        /* ゆらゆら揺れながら昇るアニメーション（Ver 3.5復元） */
        @keyframes rabbitHeartFade {
            0% {
                opacity: 1;
                transform: translate(-50%, -50%) rotate(45deg) scale(1) translateX(0);
            }
            25% {
                transform: translate(-50%, -60px) rotate(45deg) scale(0.9) translateX(calc(var(--h-sway) * -1.5));
            }
            50% {
                transform: translate(-50%, -100px) rotate(45deg) scale(0.8) translateX(calc(var(--h-sway) * 1.5));
            }
            75% {
                transform: translate(-50%, -130px) rotate(45deg) scale(0.7) translateX(calc(var(--h-sway) * -1.0));
            }
            100% {
                opacity: 0;
                transform: translate(-50%, -160px) rotate(45deg) scale(0.4) translateX(0);
            }
        }

        /* --- 光の波紋（リップル）エフェクト (Ver 4.0追加) --- */
        .rabbit-ripple-effect {
            position: fixed;
            width: 10px; height: 10px;
            background: transparent;
            border: 4px solid #FF1493; /* ネオンピンクの縁取り */
            border-radius: 50%;
            z-index: 999998; /* ハートと同じレイヤー */
            pointer-events: none;
            transform: translate(-50%, -50%); /* 座標を中心にする */
            animation: rabbitRippleFade 0.6s ease-out forwards;
        }

        @keyframes rabbitRippleFade {
            0% {
                opacity: 1;
                width: 10px; height: 10px; border-width: 4px;
            }
            100% {
                opacity: 0;
                width: 100px; height: 100px; border-width: 1px; /* 拡大しながらフェードアウト */
            }
        }

        #rabbit-mask-right {
            position: fixed; top: 0; right: 0; bottom: 0;
            background: #000; z-index: 999995; pointer-events: none;
        }

        /* 共通ボタンスタイル（Ver 3.2整理） */
        .rabbit-side-btn {
            position: fixed; right: 15px; width: 40px; height: 40px;
            color: #fff; border-radius: 50%; display: flex;
            justify-content: center; align-items: center;
            cursor: pointer; z-index: 1000000; background: rgba(30,30,30,0.8);
            font-size: 20px; transition: all 0.3s;
        }
        #rabbit-gear-icon { top: 15px; font-size: 24px; }
        #rabbit-lock-btn { top: 65px; }
        #rabbit-mute-btn { top: 115px; }
        #rabbit-emergency-btn { top: 165px; }

        .active-red { background: rgba(255, 20, 147, 0.9) !important; box-shadow: 0 0 10px #FF1493; }

        #rabbit-control-panel {
            position: fixed; top: 15px; right: 15px;
            width: 440px; padding: 20px; background: rgba(25, 25, 25, 0.95);
            color: #fff; border-radius: 12px; z-index: 1000010;
            font-family: sans-serif; font-size: 14px; display: none;
            max-height: 90vh; overflow-y: auto; /* 長い場合にスクロール */
        }
        #rabbit-close-btn { position: absolute; top: 10px; right: 10px; width: 30px; height: 30px; cursor: pointer; color: #888; display: flex; justify-content: center; align-items: center; font-size: 20px; }

        .slider-group { margin-bottom: 15px; }
        .slider-group label { display: block; margin-bottom: 5px; color: #aaa; }
        .slider-group input { width: 100%; cursor: pointer; }
        .value-display { float: right; color: #00ffcc; font-weight: bold; }

        .input-group { margin-top: 10px; border-top: 1px solid #333; padding-top: 10px; }
        .input-group label { display: block; margin-bottom: 5px; color: #aaa; font-size: 11px; }
        .input-group input { width: 100%; background: #333; border: 1px solid #555; color: #fff; padding: 5px; border-radius: 4px; font-size: 11px; margin-bottom: 5px; }

        .btn-action { width: 100%; padding: 8px; color: #fff; border: 1px solid #555; border-radius: 6px; cursor: pointer; margin-top: 5px; font-size: 12px; }
        #sound-test-btn { background: #444; border-color: #ff1493; }

        #rabbit-blackout { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: #000; z-index: 9999999; pointer-events: none; transition: opacity 0.8s ease; }
        #dmm-ntgnav-bin, #foot, .area-nav, #area-game { display: none !important; }
    `;
    GM_addStyle(css);

    // 3. UIの作成
    const createElements = () => {
        if (document.getElementById('rabbit-control-panel')) return;

        // 緊急回避用レイヤー
        const emergencyOverlay = document.createElement('div');
        emergencyOverlay.id = 'rabbit-emergency-overlay';
        document.body.appendChild(emergencyOverlay);

        const maskEl = document.createElement('div');
        maskEl.id = 'rabbit-mask-right';
        document.body.appendChild(maskEl);

        const guardEl = document.createElement('div');
        guardEl.id = 'rabbit-click-guard';
        document.body.appendChild(guardEl);

        // ボタン作成
        const gear = document.createElement('div');
        gear.id = 'rabbit-gear-icon'; gear.className = 'rabbit-side-btn'; gear.innerHTML = '⚙';
        document.body.appendChild(gear);

        const lockBtn = document.createElement('div');
        lockBtn.id = 'rabbit-lock-btn'; lockBtn.className = 'rabbit-side-btn'; lockBtn.innerHTML = '🔓';
        document.body.appendChild(lockBtn);

        const muteBtn = document.createElement('div');
        muteBtn.id = 'rabbit-mute-btn'; muteBtn.className = 'rabbit-side-btn';
        muteBtn.innerHTML = settings.isMuted ? '🔇' : '🔊';
        document.body.appendChild(muteBtn);

        const emergencyBtn = document.createElement('div');
        emergencyBtn.id = 'rabbit-emergency-btn'; emergencyBtn.className = 'rabbit-side-btn'; emergencyBtn.innerHTML = '🙈';
        document.body.appendChild(emergencyBtn);

        const panel = document.createElement('div');
        panel.id = 'rabbit-control-panel';
        panel.innerHTML = `
            <div id="rabbit-close-btn">✖</div>
            <div style="font-weight:bold; margin-bottom:15px; border-bottom:1px solid #444; padding-bottom:10px;">画面レイアウト & 各種設定</div>
            <div class="slider-group"><label>拡大縮小 <span id="zoom-val" class="value-display"></span></label><input type="range" id="zoom-slider" min="0.5" max="1.5" step="0.001"></div>
            <div class="slider-group"><label>左右位置 (px) <span id="offset-val" class="value-display"></span></label><input type="range" id="offset-slider" min="-400" max="400" step="1"></div>
            <div class="slider-group"><label>右目隠し位置 (%) <span id="mask-val" class="value-display"></span></label><input type="range" id="mask-slider" min="70" max="100" step="0.1"></div>

            <div style="font-size:12px; color:#888; margin-bottom:10px; border-top: 1px solid #333; padding-top: 15px;">▼ ハートのゆらぎ設定</div>
            <div class="slider-group"><label>ハートの大きさランダム幅 (%) <span id="h-random-val" class="value-display"></span></label><input type="range" id="h-random-slider" min="0" max="50" step="1"></div>
            <div class="slider-group"><label>ハートの位置散らばり (px) <span id="h-pos-random-val" class="value-display"></span></label><input type="range" id="h-pos-random-slider" min="0" max="50" step="1"></div>

            <div style="font-size:12px; color:#888; margin-bottom:10px; border-top: 1px solid #333; padding-top: 15px;">▼ 緊急回避用クロップ</div>
            <div class="slider-group"><label>緊急縮尺 (%) <span id="e-zoom-val" class="value-display"></span></label><input type="range" id="e-zoom-slider" min="1" max="300" step="1"></div>
            <div class="slider-group"><label>緊急左右 (%) <span id="e-offsetx-val" class="value-display"></span></label><input type="range" id="e-offsetx-slider" min="-100" max="200" step="1"></div>
            <div class="slider-group"><label>緊急上下 (%) <span id="e-offsety-val" class="value-display"></span></label><input type="range" id="e-offsety-slider" min="-100" max="200" step="1"></div>

            <div class="input-group">
                <label>効果音URL (MP3)</label>
                <input type="text" id="sound-url-input">
                <label>緊急回避用画像URL</label>
                <input type="text" id="emergency-url-input">
            </div>

            <button id="sound-test-btn" class="btn-action">🎵 ハートの音を確認する</button>
            <button id="reset-btn" class="btn-action">設定をリセット</button>
        `;
        document.body.appendChild(panel);

        const frame = document.querySelector('#game_frame');
        const zoomS = document.getElementById('zoom-slider'), offsetS = document.getElementById('offset-slider'), maskS = document.getElementById('mask-slider');
        const eZoomS = document.getElementById('e-zoom-slider'), eOffsetX = document.getElementById('e-offsetx-slider'), eOffsetY = document.getElementById('e-offsety-slider');
        const soundI = document.getElementById('sound-url-input'), emergencyI = document.getElementById('emergency-url-input');
        // ランダム設定スライダー（Ver 3.8位置散らばり追加）
        const hRandomS = document.getElementById('h-random-slider');
        const hPosRandomS = document.getElementById('h-pos-random-slider');

        // 値の初期化
        zoomS.value = settings.zoom; offsetS.value = settings.offset; maskS.value = settings.mask;
        eZoomS.value = settings.zoomEmergency; eOffsetX.value = settings.offsetEmergencyX; eOffsetY.value = settings.offsetEmergencyY;
        soundI.value = settings.soundUrl; emergencyI.value = settings.emergencyUrl;
        // ランダム幅スライダーの初期値をセット（Ver 3.8）
        hRandomS.value = settings.heartRandomRange;
        hPosRandomS.value = settings.heartPosRandomRange;

        const update = () => {
            if (frame) {
                frame.style.transform = `scale(${zoomS.value})`;
                frame.style.left = `${offsetS.value}px`;
            }
            maskEl.style.left = `${maskS.value}%`;

            emergencyOverlay.style.setProperty('--emergency-size', `${eZoomS.value}% auto`);
            emergencyOverlay.style.setProperty('--emergency-pos', `${eOffsetX.value}% ${eOffsetY.value}%`);

            document.getElementById('zoom-val').textContent = zoomS.value;
            document.getElementById('offset-val').textContent = offsetS.value;
            document.getElementById('mask-val').textContent = maskS.value;
            document.getElementById('e-zoom-val').textContent = eZoomS.value;
            document.getElementById('e-offsetx-val').textContent = eOffsetX.value;
            document.getElementById('e-offsety-val').textContent = eOffsetY.value;
            // ランダム幅スライダーの値を表示（Ver 3.8）
            document.getElementById('h-random-val').textContent = `±${hRandomS.value}`;
            document.getElementById('h-pos-random-val').textContent = `±${hPosRandomS.value}`;

            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                zoom: zoomS.value, offset: offsetS.value, mask: maskS.value,
                cropL: 0, cropR: 0, cropB: 0,
                soundUrl: soundI.value, emergencyUrl: emergencyI.value,
                isMuted: settings.isMuted,
                zoomEmergency: eZoomS.value,
                offsetEmergencyX: eOffsetX.value,
                offsetEmergencyY: eOffsetY.value,
                heartRandomRange: hRandomS.value, // ランダム幅を保存
                heartPosRandomRange: hPosRandomS.value // 位置散らばりを保存（Ver 3.8）
            }));
            settings.soundUrl = soundI.value;
            settings.emergencyUrl = emergencyI.value;
            settings.zoomEmergency = eZoomS.value;
            settings.offsetEmergencyX = eOffsetX.value;
            settings.offsetEmergencyY = eOffsetY.value;
            settings.heartRandomRange = hRandomS.value; // settingsオブジェクトも更新
            settings.heartPosRandomRange = hPosRandomS.value; // settingsオブジェクトも更新（Ver 3.8）
        };

        const playHeartSound = () => {
            if (settings.isMuted || !settings.soundUrl) return;
            const audio = new Audio(settings.soundUrl);
            audio.volume = 0.5; audio.play().catch(()=>{});
        };

        // ミュート切り替え
        muteBtn.addEventListener('click', () => {
            settings.isMuted = !settings.isMuted;
            muteBtn.innerHTML = settings.isMuted ? '🔇' : '🔊';
            update();
        });

        // 緊急回避切り替え
        const toggleEmergency = () => {
            const isVisible = emergencyOverlay.style.display === 'block';
            if (isVisible) {
                emergencyOverlay.style.display = 'none';
            } else {
                emergencyOverlay.style.backgroundImage = `url('${settings.emergencyUrl}')`;
                emergencyOverlay.style.display = 'block';
            }
        };
        emergencyBtn.addEventListener('click', toggleEmergency);
        emergencyOverlay.addEventListener('click', toggleEmergency);

        // --- ロック切り替え (Ver 3.9の画面端ガイド対応) ---
        lockBtn.addEventListener('click', () => {
            const isLocked = guardEl.style.display === 'block';
            if (isLocked) {
                // 解除
                guardEl.style.display = 'none';
                guardEl.classList.remove('active-lock');
                lockBtn.innerHTML = '🔓';
                lockBtn.classList.remove('active-red');
            } else {
                // ロック
                guardEl.style.display = 'block';
                guardEl.classList.add('active-lock');
                lockBtn.innerHTML = '🔒';
                lockBtn.classList.add('active-red');
            }
        });

        // --- ハート生成 & 波紋エフェクト (Ver 4.0 波紋追加) ---
        guardEl.addEventListener('mousedown', (event) => {
            const x = event.clientX;
            const y = event.clientY;

            // --- 1. 波紋（リップル）エフェクト生成 (Ver 4.0追加) ---
            const ripple = document.createElement('div');
            ripple.className = 'rabbit-ripple-effect';
            ripple.style.left = `${x}px`;
            ripple.style.top = `${y}px`;
            document.documentElement.appendChild(ripple);
            // 0.6秒後（アニメーション終了後）に削除
            setTimeout(() => wrapper.remove(), 600);

            // --- 2. ハート生成 (位置散らばりVer 3.8) ---
            const wrapper = document.createElement('div');
            wrapper.className = 'rabbit-heart-wrapper';

            // スライダーの値に基づいて、基準100%から上下にランダムな倍率を計算 (Ver 3.6改修・Ver 3.7で幅調整)
            const rangePercentage = settings.heartRandomRange / 100;
            const minScale = 1 - rangePercentage;
            const maxScale = 1 + rangePercentage;
            const scale = minScale + (Math.random() * (maxScale - minScale));

            // 位置散らばりの計算（±settings.heartPosRandomRangeの範囲） (Ver 3.8改修)
            const range_px = settings.heartPosRandomRange;
            const dX = (Math.random() - 0.5) * 2 * range_px; // -range_px 〜 +range_px
            const dY = (Math.random() - 0.5) * 2 * range_px; // -range_px 〜 +range_px

            // 波紋の中心からハートを散らばらせる
            wrapper.style.transform = `translate(${x + dX}px, ${y + dY}px)`;

            const heart = document.createElement('div');
            heart.className = 'rabbit-heart-inner';

            // CSS変数にランダムな値をセット（Ver 3.6改修・Ver 3.7で幅調整）
            heart.style.setProperty('--h-size', `${48 * scale}px`); // 基準48pxにランダム倍率を適用
            heart.style.setProperty('--h-sway', `${10 * scale}px`); // 揺れ幅もサイズに比例

            wrapper.appendChild(heart);
            document.documentElement.appendChild(wrapper);
            setTimeout(() => wrapper.remove(), 1200);
            playHeartSound();
        });

        document.getElementById('sound-test-btn').addEventListener('click', playHeartSound);
        gear.addEventListener('click', () => { panel.style.display = 'block'; gear.style.display = 'none'; });
        document.getElementById('rabbit-close-btn').addEventListener('click', () => { panel.style.display = 'none'; gear.style.display = 'flex'; });
        // すべての入力要素にイベントリスナーを追加（Ver 3.8位置散らばりスライダー追加）
        [zoomS, offsetS, maskS, soundI, emergencyI, eZoomS, eOffsetX, eOffsetY, hRandomS, hPosRandomS].forEach(s => s.addEventListener('input', update));
        document.getElementById('reset-btn').addEventListener('click', () => {
            // リセット時のデフォルト値
            zoomS.value = 1.098; offsetS.value = -6; maskS.value = 82.3;
            soundI.value = "http://localhost:8000/heart.mp3";
            emergencyI.value = "http://localhost:8000/emergency.jpg";
            eZoomS.value = 100; eOffsetX.value = 50; eOffsetY.value = 50;
            hRandomS.value = 25; // ランダム幅をデフォルトに戻す
            hPosRandomS.value = 20; // 位置散らばりをデフォルトに戻す（Ver 3.8）
            update();
        });
        update();
    };

    const blackout = document.createElement('div');
    blackout.id = 'rabbit-blackout';
    document.documentElement.appendChild(blackout);
    setTimeout(() => { blackout.style.opacity = '0'; setTimeout(() => blackout.remove(), 800); }, 4000);

    setInterval(() => { if (document.querySelector('#game_frame')) createElements(); }, 500);
})();
