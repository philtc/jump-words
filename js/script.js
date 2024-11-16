class FormUtil {

	//add a change callback
	addChangeCallback(elName, fun, scope = null) {
		var el = document.getElementById(elName);
		if (scope == null) {
			el.onkeyup = fun;
		} else {
			el.onkeyup = fun.bind(scope);
		}
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
let score = number;
let word;
let scoreText;
let wordText;
let newX = 0;
let oldX = 100;
let newY = 0;
let colorTop = '#0000ff';
let colorBottom = '#87cefa';

class Example extends Phaser.Scene {
	preload() {
		this.load.setBaseURL('assets/');
		this.load.image('idle', 'idle/frame-1.png');
		this.load.image('jump', 'jump/jump_up.png');
		this.load.image('tile', 'tile/tile.png');
	}

	create() {

		const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Create a Canvas texture
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

        // Add the gradient as an image
        this.add.image(0, 0, 'gradient').setOrigin(0);

		this.map = this.make.tilemap({ tileWidth: 20, tileHeight: 20, width: 20, height: 20 });
		this.tileset = this.map.addTilesetImage('tile');
		this.layer = this.map.createBlankLayer('layer1', this.tileset);
		this.layer.setCollisionByExclusion([-1]);

		this.idleSprite = this.physics.add.sprite(200, 400, 'idle');
		this.idleSprite.setScale(0.1);
		this.idleSprite.setCollideWorldBounds(true);
		this.idleSprite.setGravityY(200);
		
		// Add a collider between the sprite and the layer
		this.physics.add.collider(this.idleSprite, this.layer);

		scoreText = this.add.text(16, 16, 'Score: 0', {
			fontSize: '2em',
			fontFamily: 'Arial',
			fill: 'black'
		});

		wordText = this.add.text(200, 16, top100Words[0], {
			fontSize: '2em',
			fontFamily: 'Arial',
			fill: 'white'
		}).setOrigin(1, 0.1);

		this.formUtil = new FormUtil({ scene: this });
		this.formUtil.addChangeCallback("area51", this.textAreaChanged.bind(this));
		word = top100Words[number];
	}

	darkenColor = (hex, factor) => {
            let r = Math.max(0, Math.floor((parseInt(hex.substr(1, 2), 16) * factor)));
            let g = Math.max(0, Math.floor((parseInt(hex.substr(3, 2), 16) * factor)));
            let b = Math.max(0, Math.floor((parseInt(hex.substr(5, 2), 16) * factor)));

            return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        };

	textAreaChanged() {
		let text = this.formUtil.getTextAreaValue("area51");

		if (text.includes(word)) {
			number++;
			if (number >= top100Words.length) {
				alert("you've finished!");
				// TODO: Add confetti
			} else {
				newX = Phaser.Math.Between(50, 350);
				const tileX = this.map.worldToTileX(newX);
                const tileY = this.map.worldToTileY(360);
				this.layer.removeTileAt(this.map.worldToTileX(oldX), tileY);
                // Place a tile at the specified location
                const placedTile = this.layer.putTileAt(0, tileX, tileY);
                if (placedTile) {
                    placedTile.setCollision(true); // Enable collision on this tile
                }
				// Make the sprite "jump" by setting an upward velocity
				this.idleSprite.setTexture('jump');
				// this.idleSprite.setVelocityY(-150); // Adjust -300 for a higher/lower jump
				if (newX > oldX) {
					this.idleSprite.setFlipX(false); // Face right
				} else if (newX < oldX) {
					this.idleSprite.setFlipX(true); // Face left
				}

				this.physics.moveTo(this.idleSprite, newX, 300, 0, 300);
				oldX = newX;
				//this.layer.clear();
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
				document.getElementById('myForm').reset();
				//score += 10;
				scoreText.setText('Score: ' + (number*10));
				wordText.setText(word);
			}
		}
	}

	update() {
		const targetX = newX;
		const targetY = 300;
		const tolerance = 10; // Allowable distance before stopping
	
		if (Phaser.Math.Distance.Between(this.idleSprite.x, this.idleSprite.y, targetX, targetY) < tolerance) {
			this.idleSprite.body.setVelocity(0); // Stop the sprite
		}

	}

}

const config = {
	type: Phaser.AUTO,
	width: 400,
	height: 400,
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