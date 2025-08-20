class FormUtil {

	//add a change callback
	addChangeCallback(elName, fun, scope = null) {
		const el = document.getElementById(elName);
		const handler = scope ? fun.bind(scope) : fun;
		// Use input event for real-time updates; support IME via compositionend
		el.addEventListener('input', handler);
		el.addEventListener('compositionend', handler);
	}
	getTextAreaValue(elName) {
		var el = document.getElementById(elName);
		return el.value;
	}
	getTextValue(elName) {
		var el = document.getElementById(elName);
		return el.innerText;
	}
}

let number = 0;
let score = 0;
let word;
let scoreText;
let wordText;
let nextWordText;
let wpmText;
let wordsLeftText;
let newX = 0;
let oldX = 100;
let newY = 395;
let oldY = 395;
let colorTop = '#0000ff';
let colorBottom = '#87cefa';
let startTime = Date.now();
let endTime;

// Percentage of the screen height the platforms will rise over the full word list
const RISE_PERCENT = 0.65; // 65% of the screen height across all words
// Throttle interval for WPM updates (ms)
const WPM_UPDATE_MS = 1000;
let lastWpmUpdate = 0;

class Example extends Phaser.Scene {
	init() {
        number = 0;
        score = 0;
        word = undefined;
        scoreText = undefined;
        wordText = undefined;
        nextWordText = undefined;
        wpmText = undefined;
        wordsLeftText = undefined;
        newX = 0;
        oldX = 100;
        newY = 395;
        oldY = 395;
        colorTop = '#0000ff';
        colorBottom = '#87cefa';
        startTime = Date.now();
        endTime = undefined;
        lastWpmUpdate = 0;
    }
	preload() {
		this.load.setBaseURL('assets/');
		this.load.image('idle', 'idle/frame-1.png');
		this.load.image('jump', 'jump/jump_up.png');
		this.load.image('tile', 'tile/tile.png');
		this.load.image('star', 'star/star.png');
	}

	create() {

		const width = this.cameras.main.width;
		const height = this.cameras.main.height;
		// Compute per-word vertical rise based on total words and target percent of screen height
		this.perWordRise = (height * RISE_PERCENT) / top100Words.length;

		// Ensure required textures exist (generate procedurally if missing)
		if (!this.textures.exists('tile')) {
			const g = this.add.graphics();
			g.fillStyle(0x2e7d32, 1);
			g.fillRoundedRect(0, 12, 20, 8, 3); // a small green platform tile
			g.lineStyle(1, 0x1b5e20, 1);
			g.strokeRoundedRect(0, 12, 20, 8, 3);
			g.generateTexture('tile', 20, 20);
			g.destroy();
		}
		if (!this.textures.exists('star')) {
			const g2 = this.add.graphics();
			g2.clear();
			g2.fillStyle(0xffffff, 1);
			// simple 5-point star
			const pts = [];
			const cx2 = 16, cy2 = 16, outer = 14, inner = 6, spikes = 5;
			for (let i = 0; i < spikes * 2; i++) {
				const ang = (Math.PI / spikes) * i - Math.PI / 2;
				const r = i % 2 === 0 ? outer : inner;
				pts.push({ x: cx2 + Math.cos(ang) * r, y: cy2 + Math.sin(ang) * r });
			}
			g2.beginPath();
			g2.moveTo(pts[0].x, pts[0].y);
			for (let i = 1; i < pts.length; i++) g2.lineTo(pts[i].x, pts[i].y);
			g2.closePath();
			g2.fillPath();
			g2.generateTexture('star', 32, 32);
			g2.destroy();
		}
		if (!this.textures.exists('star')) {
			const gs = this.add.graphics();
			gs.fillStyle(0xffffff, 1);
			gs.fillCircle(3, 3, 3);
			gs.generateTexture('star', 6, 6);
			gs.destroy();
		}

		// Create a Canvas texture (remove if exists to avoid key collision on restart)
        if (this.textures.exists('gradient')) {
            this.textures.remove('gradient');
        }
        const gradientTexture = this.textures.createCanvas('gradient', width, height);

		// Get the context to draw on
		const ctx = gradientTexture.context;

		// Create the gradient
		const gradient = ctx.createLinearGradient(0, 0, 0, height);
		gradient.addColorStop(0, colorTop); // blue at the top
		gradient.addColorStop(1, colorBottom); // sky Blue at the bottom

		// Fill the canvas with the gradient
		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, width, height);

		// Update the texture so Phaser can use it
		gradientTexture.refresh();

		// Create a hidden input that the game controls
		const inputEl = document.createElement('input');
		inputEl.type = 'text';
		inputEl.id = 'area51';
		inputEl.setAttribute('autocomplete', 'off');
		inputEl.setAttribute('autocapitalize', 'off');
		inputEl.setAttribute('spellcheck', 'false');
		// Visually hidden but focusable
		Object.assign(inputEl.style, {
			position: 'fixed',
			opacity: '0',
			left: '-10000px',
			top: '0',
			width: '1px',
			height: '1px',
			pointerEvents: 'none'
		});
		document.body.appendChild(inputEl);
		this.hiddenInput = inputEl;
		// Ensure the typing input keeps focus, including after clicking the canvas
		inputEl.focus();
		this.input.on('pointerdown', () => {
			inputEl && inputEl.focus();
		});
		// Add the gradient as an image (background) and pin it to camera
		this.add.image(0, 0, 'gradient').setOrigin(0).setDepth(0).setScrollFactor(0);

		// Create a simple procedural cloud texture (remove if exists on restart)
        if (this.textures.exists('cloud')) {
            this.textures.remove('cloud');
        }
        const cw = 120, ch = 60;
		const cloudTex = this.textures.createCanvas('cloud', cw, ch);
		const cctx = cloudTex.context;
		cctx.clearRect(0, 0, cw, ch);
		cctx.fillStyle = 'rgba(255,255,255,0.9)';
		const circles = [
			{ x: 30,  y: 35, r: 18 },
			{ x: 50,  y: 25, r: 22 },
			{ x: 75,  y: 30, r: 20 },
			{ x: 95,  y: 38, r: 16 },
			{ x: 60,  y: 40, r: 24 }
		];
		cctx.beginPath();
		for (const {x, y, r} of circles) {
			cctx.moveTo(x + r, y);
			cctx.arc(x, y, r, 0, Math.PI * 2);
		}
		cctx.fill();
		cloudTex.refresh();

		// Create parallax cloud layers
		this.clouds = [];
		const makeCloud = (speed, scale, alpha) => {
			const img = this.add.image(
				Phaser.Math.Between(0, width),
				Phaser.Math.Between(0, height),
				'cloud'
			).setAlpha(alpha).setScale(scale).setDepth(0.2).setScrollFactor(0);
			img.speed = speed;
			img.baseAlpha = alpha;
			this.clouds.push(img);
		};
		for (let i = 0; i < 6; i++) makeCloud(4, Phaser.Math.FloatBetween(0.6, 0.9), 0.6);
		for (let i = 0; i < 4; i++) makeCloud(8, Phaser.Math.FloatBetween(0.9, 1.2), 0.8);

		// Create starfield layer (initially invisible), behind clouds
		this.stars = [];
		const makeStar = (speed, scale, maxAlpha) => {
			const s = this.add.image(
				Phaser.Math.Between(0, width),
				Phaser.Math.Between(0, height),
				'star'
			).setDepth(0.15).setScale(scale).setAlpha(0).setScrollFactor(0);
			s.speed = speed;
			s.maxAlpha = maxAlpha;
			this.stars.push(s);
		};
		for (let i = 0; i < 30; i++) makeStar(6, Phaser.Math.FloatBetween(0.05, 0.12), 0.7);
		for (let i = 0; i < 20; i++) makeStar(10, Phaser.Math.FloatBetween(0.08, 0.16), 1.0);

		// Make the tilemap very tall so we can scroll far upward
		this.map = this.make.tilemap({ tileWidth: 20, tileHeight: 20, width: 20, height: 10000 });
		this.tileset = this.map.addTilesetImage('tile');
		this.layer = this.map.createBlankLayer('layer1', this.tileset);
		this.layer.setCollisionByExclusion([-1]);
		this.layer.setDepth(0.5);
		// Shift the tile layer up so tile (0,0) starts at worldTop; allows using negative world Y
		this.worldTop = -100000; // effectively infinite space above
		this.layer.setPosition(0, this.worldTop);

		// Extend world and camera bounds far above the screen so we can scroll upward
		const mapHeightPx = this.map.height * this.map.tileHeight; // full map height in pixels
		this.physics.world.setBounds(0, this.worldTop, width, mapHeightPx);
		this.cameras.main.setBounds(0, this.worldTop, width, mapHeightPx);

		// Lazy platform generation: create initial chunk and generate more as player climbs
		this.platforms = [];
		const bottomMargin = 60;
		const startY = height - bottomMargin;
		const rowSpacing = 120; // vertical distance between rows
		this.generatedTopY = startY - 1200; // top Y of the generated region
		const generatePlatforms = (fromY, toY) => {
			for (let wy = fromY; wy >= toY; wy -= rowSpacing) {
				const platformsInRow = Phaser.Math.Between(1, 2);
				for (let k = 0; k < platformsInRow; k++) {
					const rx = Phaser.Math.Between(60, width - 60);
					const tx = this.map.worldToTileX(rx, true, this.cameras.main, this.layer);
					const ty = this.map.worldToTileY(wy, true, this.cameras.main, this.layer);
				if (ty < 0 || ty >= this.map.height) continue; // clamp to valid tile rows
					const length = Phaser.Math.Between(2, 4);
					const startTx = Phaser.Math.Clamp(tx - Math.floor(length / 2), 0, this.map.width - length);
					for (let dx = 0; dx < length; dx++) {
						const tile = this.layer.putTileAt(0, startTx + dx, ty);
						if (tile) tile.setCollision(true);
					}
					const leftX = this.map.tileToWorldX(startTx, this.cameras.main, this.layer);
					const wx = leftX + (length * this.map.tileWidth) / 2;
					const wytop = this.map.tileToWorldY(ty, this.cameras.main, this.layer);
					this.platforms.push({ tx: startTx, ty, wx, wytop, length });
				}
			}
		};
		this.generatePlatforms = generatePlatforms;
		// initial generation
		this.generatePlatforms(startY, this.generatedTopY);

		this.idleSprite = this.physics.add.sprite(200, 400, 'idle');
		this.idleSprite.setScale(0.1);
		this.idleSprite.setCollideWorldBounds(false);
		this.idleSprite.setGravityY(200);
		this.idleSprite.setDepth(1);

		// Add a collider between the sprite and the layer
		this.physics.add.collider(this.idleSprite, this.layer);

		// Start the player on the lowest generated platform (near bottom)
		if (this.platforms.length > 0) {
			const startPlat = this.platforms.reduce((a, b) => (a.wytop > b.wytop ? a : b));
			const bodyHalf = this.idleSprite.body ? this.idleSprite.body.height / 2 : (this.idleSprite.displayHeight / 2);
			this.idleSprite.setPosition(startPlat.wx, startPlat.wytop - bodyHalf);
			if (this.idleSprite.body) this.idleSprite.body.setVelocity(0, 0);
		}

		// Camera follow to create upward scrolling effect
		this.cameras.main.startFollow(this.idleSprite, true, 0.08, 0.08);
		this.cameras.main.setDeadzone(width * 0.6, 200);

		// HUD background for better readability
		this.hudBg = this.add.rectangle(0, 0, width, 90, 0x000000, 0.45).setOrigin(0).setScrollFactor(0).setDepth(4);

		scoreText = this.add.text(16, 16, 'Score: 0', {
			fontSize: '2em',
			fontFamily: 'Arial',
			fill: '#ffffff',
			stroke: '#000000',
			strokeThickness: 4
		}).setScrollFactor(0).setDepth(5);

		wpmText = this.add.text(16, 52, 'WPM (words/min): 0', {
			fontSize: '1.2em',
			fontFamily: 'Arial',
			fill: '#ffffff',
			stroke: '#000000',
			strokeThickness: 3
		}).setScrollFactor(0).setDepth(5);

		wordsLeftText = this.add.text(16, 74, 'Words left: ' + (top100Words.length - number), {
			fontSize: '1.1em',
			fontFamily: 'Arial',
			fill: '#ffffff',
			stroke: '#000000',
			strokeThickness: 3
		}).setScrollFactor(0).setDepth(5);

		// Center the current word in the middle of the HUD bar
        wordText = this.add.text(width / 2, 45, top100Words[0], {
            fontSize: '2.2em',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 5,
            align: 'center'
        }).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(5);

        // Measure a single space in the same style to position next word precisely
        const spaceMeasure = this.add.text(0, 0, ' ', {
            fontSize: '2.2em',
            fontFamily: 'Arial',
            fontStyle: 'bold'
        }).setVisible(false);
        this.spaceW = spaceMeasure.width || 8;
        spaceMeasure.destroy();

        // Grey next-word preview immediately after current word (one space apart)
        const rightNow = wordText.getBounds().right;
        nextWordText = this.add.text(rightNow + this.spaceW, 45, top100Words[1] || '', {
            fontSize: '1.6em',
            fontFamily: 'Arial',
            fill: '#9e9e9e',
            stroke: '#000000',
            strokeThickness: 3,
            align: 'left'
        }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(5);

		this.formUtil = new FormUtil({ scene: this });
		// Create hidden input for capturing typing if not present
		let hidden = document.getElementById('area51');
		if (!hidden) {
			hidden = document.createElement('input');
			hidden.type = 'text';
			hidden.id = 'area51';
			hidden.autocomplete = 'off';
			hidden.spellcheck = false;
			hidden.style.position = 'fixed';
			hidden.style.opacity = '0';
			hidden.style.pointerEvents = 'none';
			hidden.style.left = '0';
			hidden.style.top = '0';
			hidden.style.width = '1px';
			hidden.style.height = '1px';
			document.body.appendChild(hidden);
		}
		this.hiddenInput = hidden;
		this.hiddenInput.value = '';
		this.hiddenInput.focus();
		this.formUtil.addChangeCallback("area51", this.textAreaChanged.bind(this));

		// Pause/Resume handling on focus/visibility
		this.paused = false;
		// Semi-transparent full-screen pause overlay
		this.pauseOverlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.45)
			.setOrigin(0).setScrollFactor(0).setDepth(9).setVisible(false);
		this.pauseText = this.add.text(width / 2, height / 2, 'Paused', {
			fontSize: '28px',
			fontFamily: 'Arial',
			color: '#ffffff',
		}).setOrigin(0.5).setScrollFactor(0).setDepth(10).setVisible(false);

		// Win overlay (semi-opaque, full screen) shown when all words complete
		this.winOverlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.45)
			.setOrigin(0).setScrollFactor(0).setDepth(10).setVisible(false);

		// Pre-create win UI (banner + restart button), hidden by default
		this.winText = this.add.text(width / 2, height / 2 - 40, 'All words complete!', {
			fontSize: '32px',
			fontFamily: 'Arial',
			fontStyle: 'bold',
			color: '#ffffff',
			stroke: '#000000',
			strokeThickness: 6,
			align: 'center'
		}).setOrigin(0.5).setScrollFactor(0).setDepth(12).setVisible(false);
		this.restartBtn = this.add.rectangle(width / 2, height / 2 + 20, 180, 46, 0x2196f3)
			.setScrollFactor(0).setOrigin(0.5).setDepth(11).setVisible(false).setInteractive({ useHandCursor: true });
		this.restartLabel = this.add.text(width / 2, height / 2 + 20, 'Restart', {
			fontSize: '22px',
			fontFamily: 'Arial',
			color: '#ffffff',
			stroke: '#0d47a1',
			strokeThickness: 3
		}).setOrigin(0.5).setScrollFactor(0).setDepth(12).setVisible(false);
		this.restartBtn.on('pointerover', () => this.restartBtn.setFillStyle(0x42a5f5));
		this.restartBtn.on('pointerout', () => this.restartBtn.setFillStyle(0x2196f3));
		this.restartBtn.on('pointerup', () => {
			this.scene.restart();
		});

		this.pauseGame = () => {
			if (this.paused) return;
			this.paused = true;
			this.pauseOverlay.setVisible(true);
			this.pauseText.setVisible(true);
			this.physics.world && this.physics.world.pause();
		};

		this.resumeGame = () => {
			if (!this.paused) return;
			this.paused = false;
			this.physics.world && this.physics.world.resume();
			this.pauseText.setVisible(false);
			this.pauseOverlay.setVisible(false);
			// restore focus to input when resuming
			this.hiddenInput && this.hiddenInput.focus();
		};

		const onBlur = () => this.pauseGame();
		const onFocus = () => this.resumeGame();
		const onVisibility = () => (document.hidden ? this.pauseGame() : this.resumeGame());
		window.addEventListener('blur', onBlur);
		window.addEventListener('focus', onFocus);
		// Also listen to Phaser game-level focus/blur
		this.game.events.on('blur', onBlur);
		this.game.events.on('focus', onFocus);
		document.addEventListener('visibilitychange', onVisibility);
		this.events.once('shutdown', () => {
			window.removeEventListener('blur', onBlur);
			window.removeEventListener('focus', onFocus);
			this.game.events.off('blur', onBlur);
			this.game.events.off('focus', onFocus);
			document.removeEventListener('visibilitychange', onVisibility);
			// Remove hidden input
			if (this.hiddenInput && this.hiddenInput.parentNode) {
				this.hiddenInput.parentNode.removeChild(this.hiddenInput);
			}
		});
		word = top100Words[number];

	}

	darkenColor = (hex, factor) => {
		let r = Math.max(0, Math.floor((parseInt(hex.substr(1, 2), 16) * factor)));
		let g = Math.max(0, Math.floor((parseInt(hex.substr(3, 2), 16) * factor)));
		let b = Math.max(0, Math.floor((parseInt(hex.substr(5, 2), 16) * factor)));

		return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
	};
	
	calcScore(startTime, endTime) {
		// 5 points for over 200 WPM, 4 for over 150 WPM, 3 for over 100 WPM, 2 for over 50 WPM
		const WPM = 60000 / (endTime - startTime);
				switch (true) {
			case WPM > 200:
				return 5;
				break;
			case WPM > 150:
				return 4;
				break;
			case WPM > 100:
				return 3;
				break;
			case WPM > 50:
				return 2;
				break;
			default:
				return 1;
		}
	}

	textAreaChanged() {
		let text = this.formUtil.getTextAreaValue("area51");

		if (text.includes(word)) {
			number++;
			if (number >= top100Words.length) {
				// Big confetti/star explosion at camera center
				const cam = this.cameras.main;
				const cx = cam.worldView.centerX;
				const cy = cam.worldView.centerY;
				                // Phaser 3.90: factory returns a Particle Emitter Game Object directly
                const emitter = this.add.particles(cx, cy, 'star', {
                    angle: { min: 0, max: 360 },
                    speed: { min: 220, max: 520 },
                    gravityY: 300,
                    lifespan: { min: 900, max: 1600 },
                    scale: { start: 1.8, end: 0 },
                    blendMode: 'ADD',
                    quantity: 0,
                    emitting: false
                });
                emitter.setDepth(13);
                emitter.explode(260, cx, cy);
                this.time.delayedCall(1800, () => { emitter.destroy(); });

				document.getElementById("area51").style.display = 'none';
				wordText.setText('');
				nextWordText && nextWordText.setText('');
				// Show win overlay and UI (banner + restart)
				this.winOverlay.setVisible(true);
				this.winText.setVisible(true);
				this.restartBtn.setVisible(true);
				this.restartLabel.setVisible(true);
        } else {
            endTime = Date.now();
            // compute instantaneous WPM for the last word
            const instantWPM = 60000 / Math.max(1, (endTime - startTime));
            score += this.calcScore(startTime, endTime);
            startTime = Date.now();
            // update WPM immediately on word completion (outside of throttle)
            if (wpmText) {
                wpmText.setText('WPM (words/min): ' + Math.round(instantWPM));
            }
            // Pick nearest platform above current position
            const currentY = this.idleSprite.y;
            const candidates = this.platforms.filter(p => p.wytop < currentY - 10);
            const target = candidates.length > 0 ? candidates.reduce((a, b) => (Math.abs(currentY - a.wytop) < Math.abs(currentY - b.wytop) ? a : b)) : this.platforms[0];
            const centerX = target.wx;
            // Compute exact landing Y so feet rest on tile top
            const tileTop = target.wytop;
            const bodyHalf = this.idleSprite.body ? this.idleSprite.body.height / 2 : (this.idleSprite.displayHeight / 2);
            const landingY = tileTop - bodyHalf;
            // Animate a jump arc, then land exactly on the platform center
            this.idleSprite.setTexture('jump');
            // Prevent physics from fighting the tween path
            if (this.idleSprite.body) {
                this.idleSprite.body.setVelocity(0, 0);
                this.idleSprite.body.allowGravity = false;
            }
            if (centerX > oldX) {
                this.idleSprite.setFlipX(false);
            } else if (centerX < oldX) {
                this.idleSprite.setFlipX(true);
            }
            // Smooth arc using a quadratic Bezier curve
            const startX = this.idleSprite.x;
            const startY = this.idleSprite.y;
            const ctrlX = (startX + centerX) / 2;
            const ctrlY = Math.min(startY, landingY) - 80; // arc height above the higher of start/landing
            const curve = new Phaser.Curves.QuadraticBezier(
                new Phaser.Math.Vector2(startX, startY),
                new Phaser.Math.Vector2(ctrlX, ctrlY),
                new Phaser.Math.Vector2(centerX, landingY)
            );
            const tweenObj = { t: 0 };
            this.tweens.add({
                targets: tweenObj,
                t: 1,
                duration: 550,
                ease: 'Sine.easeInOut',
                onUpdate: () => {
                    const p = curve.getPoint(tweenObj.t);
                    this.idleSprite.setPosition(p.x, p.y);
                },
                onComplete: () => {
                    this.idleSprite.setTexture('idle');
                    // Re-enable gravity so the body rests naturally on the tile
                    if (this.idleSprite.body) {
                        this.idleSprite.body.allowGravity = true;
                        this.idleSprite.body.setVelocity(0, 0);
                    }
                }
            });

				oldX = centerX;
				oldY = tileTop;
				newX = centerX;
				newY = landingY + 40;
				colorTop = this.darkenColor(colorTop, 0.98);
				colorBottom = this.darkenColor(colorBottom, 0.98);

				// Recreate the gradient
				const width = this.cameras.main.width;
				const height = this.cameras.main.height;

				const gradientTexture = this.textures.get('gradient');
				const ctx = gradientTexture.context;

				const gradient = ctx.createLinearGradient(0, 0, 0, height);
				gradient.addColorStop(0, colorTop);
				gradient.addColorStop(1, colorBottom);

				ctx.fillStyle = gradient;
				ctx.fillRect(0, 0, width, height);

				// Refresh the texture to apply the changes
				gradientTexture.refresh();

				// Set a timer to switch back to the idle texture after a short delay
				this.time.delayedCall(500, () => {
					this.idleSprite.setTexture('idle');
				}, null, this);

				word = top100Words[number];
				if (this.hiddenInput) {
					this.hiddenInput.value = '';
					this.hiddenInput.focus();
				}
				scoreText.setText('Score: ' + score);
				wordText.setText(word);
				if (nextWordText) {
					nextWordText.setText(top100Words[number + 1] || '');
					const right = wordText.getBounds().right;
					nextWordText.setPosition(right + (this.spaceW || 8), nextWordText.y);
				}
				wordsLeftText.setText('Words left: ' + (top100Words.length - number));
			}
		}
	}

	update(time, delta) {
    const targetX = newX;
    const targetY = newY - 40;
    const tolerance = 20; // Allowable distance before stopping

    if (Phaser.Math.Distance.Between(this.idleSprite.x, this.idleSprite.y, targetX, targetY) < tolerance) {
        this.idleSprite.body.setVelocity(0); // Stop the sprite
    }

    // Lazy-generate more platforms as we approach the current generated top
    if (this.idleSprite && typeof this.generatedTopY === 'number') {
        const buffer = 400; // when within 400px of the generated top, extend further
        if (this.idleSprite.y < this.generatedTopY + buffer) {
            const newTop = this.generatedTopY - 1200;
            if (this.generatePlatforms) {
                this.generatePlatforms(this.generatedTopY, newTop);
                this.generatedTopY = newTop;
            }
        }
    }

    // Animate clouds to move downward (no sideways drift)
    // Also blend cloud/star alpha based on progress through the word list
    const h = this.cameras.main.height;
    const w = this.cameras.main.width;
    const progress = Math.min(1, Math.max(0, number / top100Words.length));
    const nightFactor = Phaser.Math.Clamp((progress - 0.5) / 0.5, 0, 1); // 0 until 50% progress, then ramps to 1

    if (this.clouds) {
        for (const c of this.clouds) {
            c.y += (c.speed * (delta / 1000));
            if (c.y > h + 40) {
                c.y = -40;
                c.x = Phaser.Math.Between(0, w);
            }
            // fade clouds out as nightFactor increases
            c.setAlpha(c.baseAlpha * (1 - nightFactor));
        }
    }

    // Animate starfield and fade in with nightFactor
    if (this.stars) {
        for (const s of this.stars) {
            s.y += (s.speed * (delta / 1000));
            if (s.y > h + 20) {
                s.y = -20;
                s.x = Phaser.Math.Between(0, w);
            }
            s.setAlpha(s.maxAlpha * nightFactor);
        }
    }

    // Update live WPM display (throttled)
    if (typeof startTime === 'number' && wpmText) {
        const now = Date.now();
        if (now - lastWpmUpdate >= WPM_UPDATE_MS) {
            const elapsed = Math.max(1, now - startTime); // avoid divide by zero
            const currentWPM = 60000 / elapsed;
            wpmText.setText('WPM: ' + Math.round(currentWPM));
            lastWpmUpdate = now;
        }
    }

}

}

const config = {
    parent: 'phaser-game',
    type: Phaser.AUTO,
    width: 400,
    height: 600,
    scene: Example,
    //backgroundColor: '#479cde',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 }
        }
    }
};

const game = new Phaser.Game(config);