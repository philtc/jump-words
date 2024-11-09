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

class Example extends Phaser.Scene {
	preload() {
		this.load.setBaseURL('assets/');
		this.load.image('idle', 'idle/frame-1.png');
		this.load.image('jump', 'jump/jump_up.png');
	}

	create() {

		this.idleSprite = this.physics.add.sprite(400,600, 'idle');
		this.idleSprite.setScale(0.15);
		this.idleSprite.setCollideWorldBounds(true);
		
		scoreText = this.add.text(16, 16, 'Score: 0', {
			fontSize: '48px',
			fontFamily: 'Arial',
			fill: 'black'
		});

		wordText = this.add.text(400, 50, top100Words[0], {
			fontSize: '48px',
			fontFamily: 'Arial',
			fill: 'white'
		}).setOrigin(0.5, 0.5);
		/*
		            const logo = this.physics.add.image(400, 100, 'logo');
		            logo.setVelocity(100, 200);
		            logo.setBounce(1, 1);
		            logo.setCollideWorldBounds(true);
		            particles.startFollow(logo);
		*/

		//field.addEventListener("keyup", checkWord());
		this.formUtil = new FormUtil({
			scene: this
		});
		this.formUtil.addChangeCallback("area51", this.textAreaChanged.bind(this));
		word = top100Words[number];

	}

	textAreaChanged() {
		var text = this.formUtil.getTextAreaValue("area51");
		//console.log(text);
		if (text.includes(word)) {
			number++;
			if (number >= top100Words.length) {
				alert("you've finihsed!");
				// TODO: Add confetti
			} else {
				// Make the sprite "jump" by setting an upward velocity
				this.idleSprite.setTexture('jump');
				this.idleSprite.setVelocityY(-150); // Adjust -300 for a higher/lower jump

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

	update() {}

}

const config = {
	type: Phaser.AUTO,
	width: 800,
	height: 600,
	scene: Example,
	backgroundColor: '#479cde',
	physics: {
		default: 'arcade',
		arcade: {
			gravity: {
				y: 200
			}
		}
	}
};

const game = new Phaser.Game(config);
