// ==UserScript==
// @name         Aigs Adjuster (V11.0 Final)
// @namespace    http://tampermonkey.net/
// @version      11.0
// @description  UI最適化、巨大ハート、背面レイヤー、不要機能廃止、上限拡張
// @author       うさぎ
// @match        https://play.games.dmm.co.jp/game/*
// @grant        GM_addStyle
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    const STORAGE_KEY = 'rabbit_game_settings_v110';

    const loadSettings = () => {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : {
            zoom: 1.0, offset: -6, mask: 82.4,
            soundUrl: "http://localhost:8000/heart.mp3",
            heartRandomRange: 25, heartPosRandomRange: 20,
            dynZoom: 3.5,
            dynOffsetX: 800,
            dynOffsetY: 500
        };
    };

    let settings = loadSettings();

    let isZoomMode = false;
    let currentMouseX = window.innerWidth / 2;
    let currentMouseY = window.innerHeight / 2;

    const CURSOR_IMAGE_BASE64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAMAAACdt4HsAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAXVBMVEUAAAAAAAAAAAAAAAD///////////////////////////////////////////////////////////////////////////////////////////////////////883E1sAAAAHHRSTlMAAQIDBAUGBwgJCgsMDQ4PEBESExQXFxobHB4fIIHl2QAAAAlwSFlzAAALEwAACxMBAJqcGAAAAW9JREFUOMvNUoWOwzAMY3YZZv//pS8JzC7Z4o7D0g6p4I8Xm5b7fN114vW55bV9/HyeP0wWAAiCgDkAgBwQAQAggFpU13UA+T5U17wA5PvQtTQA5PtQXesCkO9Dd5oDQD7pTgcAkE+60zEA6L90w/oAoP86AIAcCAGAHBABAOCf6XreAPTb6XreAPTb6b4rAOj2G7rXDgD9dtpXAYB+O3WfB4B+f4G+NwCgv06XOgCgv05XGgDQ78f65gCg//fSfg4A+n3f5zcA6PfTvx4A+m/XFwSAfr89f4AABAEAhAEAkAMiAABfW1XvAUDfV9V7ANA/wX4NQD8G+/4NQD8O+6YAUBeNvk8AoIuy9/8IUP/fIADUCXWPB1AX9M0LUDfXPS5AnVNnK0CdVff8AHX+GvLFAXV6Y6kEVEs9M2qAOq9vRguoVp04GkBdu45lArXtOkNVAHXV6oA5oLp2BkgOUNfOqFQAdf0CqgPq9tUNYAcS8AcIuL9Uv535B/3L54V0AAAAAElFTkSuQmCC";

    const css = `
        html, body {
            margin: 0 !important; padding: 0 !important;
            background-color: #000 !important; overflow: hidden !important;
        }

        #rabbit-base-bg {
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background-color: #000; z-index: 999980; pointer-events: none;
        }

        #game_frame {
            position: fixed !important; top: 0px; left: 0px;
            z-index: 999990 !important; transform-origin: top left; border: none !important;
            transition: transform 0.15s ease-out, left 0.15s ease-out, top 0.15s ease-out;
        }

        #rabbit-click-guard {
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: transparent; z-index: 999997; display: none;
            cursor: url('${CURSOR_IMAGE_BASE64}') 32 0, pointer;
        }

        #rabbit-click-guard.active-lock { box-shadow: inset 0 0 40px rgba(255, 20, 147, 0.3); }

        .rabbit-heart-wrapper { position: fixed; top: 0; left: 0; width: 0; height: 0; z-index: 999998; pointer-events: none; }

        .rabbit-heart-inner {
            position: absolute; width: var(--h-size); height: var(--h-size); background: #FFB6C1;
            transform: translate(-50%, -50%) rotate(45deg);
            filter: drop-shadow(0 0 2px #FF1493) drop-shadow(0 0 8px #FF1493);
            animation: rabbitHeartFade 1.2s ease-out forwards;
        }
        .rabbit-heart-inner::before, .rabbit-heart-inner::after {
            content: ''; position: absolute; width: var(--h-size); height: var(--h-size); background: #FFB6C1; border-radius: 50%;
        }
        .rabbit-heart-inner::before { top: calc(var(--h-size) / -2); left: 0; }
        .rabbit-heart-inner::after { top: 0; left: calc(var(--h-size) / -2); }

        @keyframes rabbitHeartFade {
            0% { opacity: 1; transform: translate(-50%, -50%) rotate(45deg) scale(1) translateX(0); }
            25% { transform: translate(-50%, -60px) rotate(45deg) scale(0.9) translateX(calc(var(--h-sway) * -1.5)); }
            50% { transform: translate(-50%, -100px) rotate(45deg) scale(0.8) translateX(calc(var(--h-sway) * 1.5)); }
            75% { transform: translate(-50%, -130px) rotate(45deg) scale(0.7) translateX(calc(var(--h-sway) * -1.0)); }
            100% { opacity: 0; transform: translate(-50%, -160px) rotate(45deg) scale(0.4) translateX(0); }
        }

        .rabbit-ripple-effect {
            position: fixed; width: 10px; height: 10px; background: transparent;
            border: 4px solid #FF1493; border-radius: 50%; z-index: 999998; pointer-events: none;
            transform: translate(-50%, -50%); animation: rabbitRippleFade 0.6s ease-out forwards;
        }

        @keyframes rabbitRippleFade {
            0% { opacity: 1; width: 10px; height: 10px; border-width: 4px; }
            100% { opacity: 0; width: 100px; height: 100px; border-width: 1px; }
        }

        #rabbit-mask-right {
            position: fixed; top: 0; right: 0; bottom: 0;
            background: #000; z-index: 999995; pointer-events: auto; cursor: pointer;
            transition: background-color 0.2s;
        }
        #rabbit-mask-right:hover { background: rgba(20, 20, 20, 1); }

        .rabbit-side-btn {
            position: fixed; right: 15px; width: 40px; height: 40px;
            color: #fff; border-radius: 50%; display: flex;
            justify-content: center; align-items: center;
            cursor: pointer; z-index: 1000000; background: rgba(30,30,30,0.8);
            font-size: 20px; transition: all 0.3s;
        }
        #rabbit-gear-icon { top: 15px; font-size: 24px; }

        #rabbit-panel-backdrop {
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0,0,0,0.5); z-index: 1000005; display: none;
        }

        #rabbit-control-panel {
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            width: 880px; padding: 20px;
            background: rgba(25, 25, 25, 0.95); color: #fff; border-radius: 12px;
            z-index: 1000010; font-family: sans-serif; font-size: 14px; display: none;
            max-height: 45vh; overflow-y: auto;
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

    const createElements = () => {
        if (document.getElementById('rabbit-control-panel')) return;

        const baseBg = document.createElement('div');
        baseBg.id = 'rabbit-base-bg';
        document.body.appendChild(baseBg);

        const maskEl = document.createElement('div');
        maskEl.id = 'rabbit-mask-right';
        document.body.appendChild(maskEl);

        const guardEl = document.createElement('div');
        guardEl.id = 'rabbit-click-guard';
        document.body.appendChild(guardEl);

        const gear = document.createElement('div');
        gear.id = 'rabbit-gear-icon'; gear.className = 'rabbit-side-btn'; gear.innerHTML = '⚙';
        document.body.appendChild(gear);

        const panelBackdrop = document.createElement('div');
        panelBackdrop.id = 'rabbit-panel-backdrop';
        document.body.appendChild(panelBackdrop);

        const panel = document.createElement('div');
        panel.id = 'rabbit-control-panel';
        panel.innerHTML = `
            <div id="rabbit-close-btn">✖</div>
            <div style="font-weight:bold; margin-bottom:15px; border-bottom:1px solid #444; padding-bottom:10px;">画面レイアウト & 各種設定</div>
            <div class="slider-group"><label>通常 拡大縮小 <span id="zoom-val" class="value-display"></span></label><input type="range" id="zoom-slider" min="0.5" max="1.5" step="0.001"></div>
            <div class="slider-group"><label>通常 左右位置 (px) <span id="offset-val" class="value-display"></span></label><input type="range" id="offset-slider" min="-400" max="400" step="1"></div>
            
            <div style="font-size:12px; color:#888; margin-bottom:10px; border-top: 1px solid #333; padding-top: 15px;">▼ マスク・ダイナミックズーム設定</div>
            <div style="font-size:11px; color:#ffb6c1; margin-bottom:10px;">※右側の目隠しを左クリックで画面ロック＆ズーム<br>※ロック中、目隠しを左クリックか画面右クリックで解除</div>
            <div class="slider-group"><label>ズーム倍率 <span id="dyn-zoom-val" class="value-display"></span></label><input type="range" id="dyn-zoom-slider" min="1.1" max="4.0" step="0.1"></div>
            <div class="slider-group"><label>ズーム時 Xズレ (左右 px) <span id="dyn-offset-x-val" class="value-display"></span></label><input type="range" id="dyn-offset-x-slider" min="-1200" max="1200" step="10"></div>
            <div class="slider-group"><label>ズーム時 Yズレ (上下 px) <span id="dyn-offset-y-val" class="value-display"></span></label><input type="range" id="dyn-offset-y-slider" min="-1200" max="1200" step="10"></div>

            <div class="slider-group"><label>右目隠し位置 (%) <span id="mask-val" class="value-display"></span></label><input type="range" id="mask-slider" min="70" max="100" step="0.1"></div>

            <div style="font-size:12px; color:#888; margin-bottom:10px; border-top: 1px solid #333; padding-top: 15px;">▼ ハートのゆらぎ設定</div>
            <div class="slider-group"><label>ハートの大きさランダム幅 (%) <span id="h-random-val" class="value-display"></span></label><input type="range" id="h-random-slider" min="0" max="400" step="1"></div>
            <div class="slider-group"><label>ハートの位置散らばり (px) <span id="h-pos-random-val" class="value-display"></span></label><input type="range" id="h-pos-random-slider" min="0" max="400" step="1"></div>

            <div class="input-group">
                <label>効果音URL (MP3)</label>
                <input type="text" id="sound-url-input" placeholder="空欄にすると音が鳴りません">
            </div>

            <button id="sound-test-btn" class="btn-action">🎵 ハートの音を確認する</button>
            <button id="reset-btn" class="btn-action">設定をリセット</button>
        `;
        document.body.appendChild(panel);

        const frame = document.querySelector('#game_frame');
        const zoomS = document.getElementById('zoom-slider'), offsetS = document.getElementById('offset-slider'), maskS = document.getElementById('mask-slider');
        const soundI = document.getElementById('sound-url-input');
        const hRandomS = document.getElementById('h-random-slider'), hPosRandomS = document.getElementById('h-pos-random-slider');
        const dynZoomS = document.getElementById('dyn-zoom-slider'), dynOffsetX = document.getElementById('dyn-offset-x-slider'), dynOffsetY = document.getElementById('dyn-offset-y-slider');

        zoomS.value = settings.zoom; offsetS.value = settings.offset; maskS.value = settings.mask;
        soundI.value = settings.soundUrl;
        hRandomS.value = settings.heartRandomRange; hPosRandomS.value = settings.heartPosRandomRange;
        dynZoomS.value = settings.dynZoom; dynOffsetX.value = settings.dynOffsetX; dynOffsetY.value = settings.dynOffsetY;

        const applyDynamicZoom = () => {
            if (!frame) return;
            const S0 = parseFloat(zoomS.value);
            const L0 = parseFloat(offsetS.value);
            const multiplier = parseFloat(dynZoomS.value);
            const offsetX = parseFloat(dynOffsetX.value);
            const offsetY = parseFloat(dynOffsetY.value);
            const S1 = S0 * multiplier;
            
            const L1 = currentMouseX - ((currentMouseX - L0) * (S1 / S0)) + offsetX;
            const T1 = currentMouseY - ((currentMouseY - 0) * (S1 / S0)) + offsetY;

            frame.style.transform = `scale(${S1})`;
            frame.style.left = `${L1}px`;
            frame.style.top = `${T1}px`;
        };

        const update = () => {
            if (frame) {
                if (isZoomMode) {
                    applyDynamicZoom();
                } else {
                    frame.style.transform = `scale(${zoomS.value})`;
                    frame.style.left = `${offsetS.value}px`;
                    frame.style.top = `0px`;
                }
            }
            maskEl.style.left = `${maskS.value}%`;

            document.getElementById('zoom-val').textContent = zoomS.value;
            document.getElementById('offset-val').textContent = offsetS.value;
            document.getElementById('mask-val').textContent = maskS.value;
            document.getElementById('h-random-val').textContent = `±${hRandomS.value}`;
            document.getElementById('h-pos-random-val').textContent = `±${hPosRandomS.value}`;
            document.getElementById('dyn-zoom-val').textContent = `x${dynZoomS.value}`;
            document.getElementById('dyn-offset-x-val').textContent = dynOffsetX.value;
            document.getElementById('dyn-offset-y-val').textContent = dynOffsetY.value;

            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                zoom: zoomS.value, offset: offsetS.value, mask: maskS.value,
                soundUrl: soundI.value,
                heartRandomRange: hRandomS.value, heartPosRandomRange: hPosRandomS.value,
                dynZoom: dynZoomS.value, dynOffsetX: dynOffsetX.value, dynOffsetY: dynOffsetY.value
            }));
            
            settings.soundUrl = soundI.value;
            settings.heartRandomRange = hRandomS.value; settings.heartPosRandomRange = hPosRandomS.value;
            settings.dynZoom = dynZoomS.value; settings.dynOffsetX = parseFloat(dynOffsetX.value); settings.dynOffsetY = parseFloat(dynOffsetY.value);
        };

        const playHeartSound = () => {
            if (!settings.soundUrl || settings.soundUrl.trim() === "") return;
            const audio = new Audio(settings.soundUrl);
            audio.volume = 0.5; audio.play().catch(()=>{});
        };

        const spawnEffect = (x, y) => {
            const ripple = document.createElement('div');
            ripple.className = 'rabbit-ripple-effect';
            ripple.style.left = `${x}px`;
            ripple.style.top = `${y}px`;
            document.documentElement.appendChild(ripple);
            setTimeout(() => ripple.remove(), 600);

            const wrapper = document.createElement('div');
            wrapper.className = 'rabbit-heart-wrapper';

            const rangePercentage = settings.heartRandomRange / 100;
            const minScale = 1 - rangePercentage;
            const maxScale = 1 + rangePercentage;
            const scale = minScale + (Math.random() * (maxScale - minScale));

            const range_px = settings.heartPosRandomRange;
            const dX = (Math.random() - 0.5) * 2 * range_px;
            const dY = (Math.random() - 0.5) * 2 * range_px;

            wrapper.style.transform = `translate(${x + dX}px, ${y + dY}px)`;

            const heart = document.createElement('div');
            heart.className = 'rabbit-heart-inner';

            heart.style.setProperty('--h-size', `${144 * scale}px`);
            heart.style.setProperty('--h-sway', `${30 * scale}px`);

            wrapper.appendChild(heart);
            document.documentElement.appendChild(wrapper);
            setTimeout(() => wrapper.remove(), 1200);
            playHeartSound();
        };

        maskEl.addEventListener('mousedown', (e) => {
            if (e.button === 0 && !isZoomMode) {
                isZoomMode = true;
                guardEl.style.display = 'block';
                guardEl.classList.add('active-lock');
                currentMouseX = e.clientX;
                currentMouseY = e.clientY;
                applyDynamicZoom();
            }
        });

        guardEl.addEventListener('mousedown', (event) => {
            if (event.button === 0) { 
                const maskLeft = window.innerWidth * (maskS.value / 100);
                if (event.clientX >= maskLeft) {
                    isZoomMode = false;
                    guardEl.style.display = 'none';
                    guardEl.classList.remove('active-lock');
                    update();
                } else {
                    spawnEffect(event.clientX, event.clientY);
                }
            } else if (event.button === 2) { 
                isZoomMode = false;
                guardEl.style.display = 'none';
                guardEl.classList.remove('active-lock');
                update();
            }
        });

        guardEl.addEventListener('contextmenu', (event) => {
            event.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            currentMouseX = e.clientX;
            currentMouseY = e.clientY;
            if (isZoomMode) {
                applyDynamicZoom();
            }
        });

        document.getElementById('sound-test-btn').addEventListener('click', playHeartSound);
        
        const openPanel = () => {
            panel.style.display = 'block';
            panelBackdrop.style.display = 'block';
            gear.style.display = 'none';
        };
        const closePanel = () => {
            panel.style.display = 'none';
            panelBackdrop.style.display = 'none';
            gear.style.display = 'flex';
        };
        
        gear.addEventListener('click', openPanel);
        document.getElementById('rabbit-close-btn').addEventListener('click', closePanel);
        panelBackdrop.addEventListener('click', closePanel);
        
        [zoomS, offsetS, maskS, soundI, hRandomS, hPosRandomS, dynZoomS, dynOffsetX, dynOffsetY].forEach(s => s.addEventListener('input', update));
        
        document.getElementById('reset-btn').addEventListener('click', () => {
            zoomS.value = 1.0; offsetS.value = -6; maskS.value = 82.4;
            soundI.value = "http://localhost:8000/heart.mp3";
            hRandomS.value = 25; hPosRandomS.value = 20; dynZoomS.value = 3.5; dynOffsetX.value = 800; dynOffsetY.value = 500;
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
