var canvas = $("#game");
var ctx = canvas[0].getContext("2d");
var width = $("#game").width();
var height = $("#game").height();

window.addEventListener("resize", resizeCanvas, false);

function resizeCanvas() {
	// Get viewport dimensions
	var viewportWidth = $(window).width();
	var viewportHeight = $(window).height();

	// Set the internal canvas dimensions to match the viewport
	canvas[0].width = viewportWidth;
	canvas[0].height = viewportHeight;

	canvas.width = viewportWidth;
	canvas.height = viewportHeight;

	// Update the width and height variables
	width = viewportWidth;
	height = viewportHeight;

	// Optionally, if you want to set CSS dimensions explicitly
	canvas.css({
		width: viewportWidth + "px",
		height: viewportHeight + "px",
	});
}

resizeCanvas();
// Animate rings at tap location

class Entity {
	constructor(options) {
		this.x = options.x ?? 0;
		this.y = options.y ?? 0;
		this.delete = false;
	}

	// Update the entity's position
	update() {}

	// Draw the entity
	draw() {}

	// Check if this entity collides with another
	collidesWith(other) {
		return false;
	}

	// Handle collision with another entity
	handleCollision(other) {}
}

class Goose extends Entity {
	GOOSE_SPEED = 5;
	GOOSE_RADIUS = 10;

	constructor(options) {
		super(options);
		this.id = options.id ?? 0;
		this.name = options.name ?? "Player1";
	}

	draw() {
		ctx.beginPath();
		ctx.arc(this.x, this.y, this.GOOSE_RADIUS, 0, 2 * Math.PI);
		ctx.fillStyle = "black";
		ctx.fill();
		// Draw the name above the goose
		ctx.font = "12px Arial";
		ctx.textAlign = "center";
		ctx.fillStyle = "black";
		ctx.fillText(this.name, this.x, this.y - 20);
	}

	update() {
		if (this.destX && this.destY) {
			var dx = this.destX - this.x;
			var dy = this.destY - this.y;
			var dist = Math.sqrt(dx * dx + dy * dy);
			var velX = (dx / dist) * this.GOOSE_SPEED;
			var velY = (dy / dist) * this.GOOSE_SPEED;
			if (dist > this.GOOSE_SPEED) {
				this.x += velX;
				this.y += velY;
			}
		}
	}

	moveTo(x, y) {
		this.destX = x;
		this.destY = y;
	}
}

class Ring extends Entity {
	constructor(x, y, maxRadius, startTime) {
		super({ x, y });
		this.maxRadius = maxRadius;
		this.alpha = 1;
		this.startTime = startTime;
		this.finished = false;
	}

	update(timestamp) {
		var progress = timestamp - this.startTime;
		this.radius = (this.maxRadius * progress) / 3000;
		this.alpha = Math.max(this.alpha - progress / 3000, 0);

		if (progress >= 3000) {
			this.finished = true; // Mark the ring as finished
			this.delete = true; // Mark the ring for deletion
		}
	}

	draw() {
		if (!this.finished) {
			console.log("drawing ring");
			for (var i = 1; i <= 3; i++) {
				ctx.beginPath();
				ctx.arc(this.x, this.y, this.radius + i * 10, 0, 2 * Math.PI);
				ctx.strokeStyle = `rgba(0, 0, 0, ${this.alpha / i})`;
				ctx.stroke();
			}
		}
	}
}

class GameManager {
	constructor() {
		this.Entities = [];
		this.activePlayer = new Goose({ x: 100, y: 100 });
		this.Entities.push(this.activePlayer);
		this.gameTick();
	}

	gameTick() {
		var timestamp = performance.now();
		this.update(timestamp);
		this.draw();
		// Make sure to run only once every 10ms
		setTimeout(this.gameTick.bind(this), 10);
	}

	update(timestamp) {
		this.Entities.forEach((entity) => {
			entity.update(timestamp);
			if (entity.delete) {
				console.log("deleting", entity);
				this.Entities.splice(this.Entities.indexOf(entity), 1);
			}
		});
	}

	draw() {
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		this.Entities.forEach((entity) => {
			entity.draw();
		});
	}

	animateRings(x, y) {
		var startTime = performance.now();
		this.Entities.push(new Ring(x, y, 100, startTime));
		console.log(this.Entities);
	}

	moveActivePlayer(x, y) {
		this.activePlayer.moveTo(x, y);
		this.animateRings(x, y);
	}
}

var gameManager = new GameManager();

// Handle tap events
canvas.on("click", function (event) {
	var rect = canvas[0].getBoundingClientRect();
	var x = event.clientX - rect.left;
	var y = event.clientY - rect.top;
	gameManager.moveActivePlayer(x, y);
});
