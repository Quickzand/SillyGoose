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
		this.rotation = options.rotation ?? 0;
		this.interactable = options.interactable ?? false;
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
	GOOSE_SIZE = 50;

	constructor(options) {
		super(options);
		this.id = options.id ?? 0;
		this.name = options.name ?? "Player1";
		this.inventory = [];
		this.selectedItemSlot = 0;
		// Set the sprite, there is an image in the header with the id #playerGooseSprite
		this.sprite = document.getElementById("playerGooseSprite");
	}

	draw() {
		// Draw the goose sprite keeping in mind rotation
		ctx.save(); // Save the current context state

		// Move the canvas origin to the goose's position
		ctx.translate(this.x, this.y);

		// Rotate the canvas context
		ctx.rotate(this.rotation);

		// Draw the goose sprite centered on its position
		ctx.drawImage(
			this.sprite,
			-this.GOOSE_SIZE / 2,
			-this.GOOSE_SIZE / 2,
			this.GOOSE_SIZE,
			this.GOOSE_SIZE
		);

		// Reset rotation and move back to original position
		ctx.restore();

		// Draw the name above the goose
		ctx.font = "12px Arial";
		ctx.textAlign = "center";
		ctx.fillStyle = "black";
		ctx.fillText(this.name + " | " + this.id, this.x, this.y + 50);
	}

	collidesWithWall(futureX, futureY) {
		var walls = gameManager.Walls;
		for (let wall of walls) {
			// Calculate the center of the goose for collision detection
			var gooseCenterX = futureX;
			var gooseCenterY = futureY;

			// Check for collision
			if (
				gooseCenterX - this.GOOSE_SIZE / 2 < wall.x + wall.width &&
				gooseCenterX + this.GOOSE_SIZE / 2 > wall.x &&
				gooseCenterY - this.GOOSE_SIZE / 2 < wall.y + wall.height &&
				gooseCenterY + this.GOOSE_SIZE / 2 > wall.y
			) {
				return true; // Collision detected
			}
		}
		return false;
	}

	update() {
		if (this.destInteractable) {
			// If the interactable item is close enough, interact
			if (
				Math.sqrt(
					Math.pow(this.destInteractable.x - this.x, 2) +
						Math.pow(this.destInteractable.y - this.y, 2)
				) < this.destInteractable.width
			) {
				this.destInteractable.interact(this);
				console.log("Interacting with item...");
				if (this.id == playerID) {
					socket.send(
						JSON.stringify({
							type: "playerInteraction",
							playerId: playerID,
							itemId: this.destInteractable.id,
						})
					);
				}
				this.destInteractable = null;
			}
		}
		if (this.destX && this.destY) {
			this.finishedMoving = false;
			var dx = this.destX - this.x;
			var dy = this.destY - this.y;
			var dist = Math.sqrt(dx * dx + dy * dy);
			var velX = (dx / dist) * this.GOOSE_SPEED;
			var velY = (dy / dist) * this.GOOSE_SPEED;
			this.rotation = Math.atan2(dy, dx) + Math.PI / 2;

			// Calculate future position
			var futureX = this.x + velX;
			var futureY = this.y + velY;

			// Check for potential collision with the future position
			if (!this.collidesWithWall(futureX, futureY)) {
				if (dist > this.GOOSE_SPEED) {
					this.x = futureX;
					this.y = futureY;
				}
			} else {
				// If there is a collision, stop moving
				this.finishedMoving = true;
				this.destX = null;
				this.destY = null;
			}
		} else {
			if (!this.finishedMoving) {
				this.finishedMoving = true;
				if (this.id == playerID)
					socket.send(
						JSON.stringify({
							type: "updateLocation",
							x: this.x,
							y: this.y,
							id: playerID,
						})
					);
			}
		}
	}

	moveTo(x, y) {
		this.destX = x;
		this.destY = y;
	}

	moveToInteract(x, y, item) {
		this.destX = x;
		this.destY = y;
		this.destInteractable = item;
	}
}

class Item extends Entity {
	constructor(options) {
		options.handleCollision = false;
		options.interactable = true;
		options.interactDistance = options.interactDistance ?? 50;
		super(options);
		this.width = options.width ?? 0;
		this.height = options.height ?? 0;
		this.sprite = document.getElementById(options.spriteID);
		this.id = options.id ?? Math.floor(Math.random() * 1000000);
		this.name = options.name ?? "Item";
	}

	draw() {
		ctx.drawImage(this.sprite, this.x, this.y, this.width, this.height);
	}

	interact(player) {
		console.log("Interacting with item...");
		// Add to player inventory
		if (player) player.inventory.push(this);
		this.delete = true;
	}
}

class Glock extends Item {
	constructor(options) {
		options.width = 50;
		options.height = 50;
		options.spriteID = "glockSprite";
		options.name = "Glock";
		super(options);

		this.actionButtonText = "Shoot";
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
			for (var i = 1; i <= 3; i++) {
				ctx.beginPath();
				ctx.arc(this.x, this.y, this.radius + i * 10, 0, 2 * Math.PI);
				ctx.strokeStyle = `rgba(0, 0, 0, ${this.alpha / i})`;
				ctx.stroke();
			}
		}
	}
}

class Wall extends Entity {
	constructor(options) {
		super(options);
		this.width = options.width ?? 0;
		this.height = options.height ?? 0;
	}

	draw() {
		ctx.fillStyle = "black";
		ctx.fillRect(this.x, this.y, this.width, this.height);
	}
}

class GameManager {
	constructor() {
		this.Entities = [];
		this.Entities.push(new Glock({ x: 100, y: 100, id: 1 }));
		this.Walls = [];
		this.players = [];
		this.gameTick();
	}

	gameTick() {
		var timestamp = performance.now();
		this.update(timestamp);
		this.draw();
		// Make sure to run only once every 10ms
		setTimeout(() => this.gameTick(), 10);
	}

	loadMap(walls) {
		this.Walls = walls.map((wall) => new Wall(wall));
	}

	update(timestamp) {
		this.displayInventory();
		this.Entities.forEach((entity) => {
			entity.update(timestamp);
			if (entity.delete) {
				this.Entities.splice(this.Entities.indexOf(entity), 1);
			}
		});
	}

	updateInteractions(interactions) {
		for (var i = 0; i < interactions.length; i++) {
			var interaction = interactions[i];
			var entity = this.Entities.find(
				(entity) => entity.id == interaction.itemId
			);
			var player = this.players.find(
				(player) => player.id == interaction.playerId
			);
			if (entity) {
				entity.interact(player);
			}
		}
	}

	draw() {
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		// Draw the background
		ctx.fillStyle = "#4eb152";
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		if (this.activePlayer) {
			// Calculate the camera offset
			const camX = canvas.width / 2 - this.activePlayer.x;
			const camY = canvas.height / 2 - this.activePlayer.y;

			// Translate the canvas context
			ctx.save(); // Save the current context state
			ctx.translate(camX, camY);

			// Draw all entities relative to the active player's position
			this.Entities.forEach((entity) => {
				entity.draw();
			});

			// Draw the walls
			this.Walls.forEach((wall) => {
				wall.draw();
			});

			// Restore the context to its original state
			ctx.restore();
		}
	}

	animateRings(x, y) {
		var startTime = performance.now();
		this.Entities.push(new Ring(x, y, 100, startTime));
	}

	moveActivePlayer(x, y) {
		if (this.activePlayer) {
			this.animateRings(x, y);
			// Check and see if the click is within the distance of an interactable item
			var interactableItems = this.Entities.filter(
				(entity) => entity.interactable
			);

			var closestItem = null;

			// Find the item closest to the click
			if (interactableItems.length > 1) {
				closestItem = interactableItems.reduce((prev, curr) => {
					var prevDist = Math.sqrt(
						Math.pow(prev.x - x, 2) + Math.pow(prev.y - y, 2)
					);
					var currDist = Math.sqrt(
						Math.pow(curr.x - x, 2) + Math.pow(curr.y - y, 2)
					);
					return prevDist < currDist ? prev : curr;
				}, null);
			} else {
				closestItem = interactableItems[0];
			}

			console.log();

			// If the click is close enough to the item, start interaction
			if (
				closestItem &&
				(Math.sqrt(
					Math.pow(closestItem.x - x, 2) + Math.pow(closestItem.y - y, 2)
				) < closestItem.width ||
					Math.sqrt(
						Math.pow(closestItem.x - x, 2) + Math.pow(closestItem.y - y, 2)
					) < closestItem.height)
			) {
				console.log("Moving to pick up item...");
				this.activePlayer.moveToInteract(
					closestItem.x,
					closestItem.y,
					closestItem
				);
			} else {
				this.activePlayer.moveTo(x, y);
			}
			socket.send(
				JSON.stringify({
					type: "movePlayer",
					x: x,
					y: y,
					id: playerID,
				})
			);
		} else {
			console.error("No active player set");
		}
	}

	movePlayer(x, y, id) {
		var player = this.players.find((player) => player.id == id);
		if (player) {
			player.moveTo(x, y);
		}
	}

	updatePlayers(players) {
		console.log("updating players...");
		this.players = players.map((player) => new Goose(player));
		this.players.forEach((player) => {
			// Add all players to the Entities array that arent already in it (you can tell from the id)
			if (!this.Entities.find((entity) => entity.id == player.id)) {
				this.Entities.push(player);
				if (player.id == playerID) {
					this.activePlayer = player;
				}
			}
		});
	}

	displayInventory() {
		if (!this.activePlayer) return;
		var inventory = this.activePlayer.inventory;
		// Get every inventory slot
		var slots = $(".inventorySlot");
		// Loop through the inventory and set the image of each slot
		for (var i = 0; i < inventory.length; i++) {
			var slot = slots[i];
			// Get the slot's image element
			var slotImage = $(slot).find("img");
			// Set the image source
			slotImage.attr("src", inventory[i].sprite.src);
			// Update the slot's span to show the name
			$(slot).find("span").text(inventory[i].name);
		}
		try {
			// Get the selected slot and set the action button
			var actionButton = $("#actionButton");
			actionButton.show();
			actionButton.text(
				inventory[this.activePlayer.selectedItemSlot].actionButtonText
			);
		} catch (e) {
			$("#actionButton").text("");
			$("#actionButton").hide();
		}
	}

	updateSelectedItemSlot(slotNum) {
		this.activePlayer.selectedItemSlot = slotNum;
		$(".inventorySlot").removeClass("selected");
		$(".inventorySlot").eq(slotNum).addClass("selected");
	}
}

var gameManager = new GameManager();

gameManager.updateSelectedItemSlot(0);

$(".inventorySlot").on("click", function (event) {
	var slotNum = $(this).index();
	console.log(slotNum);
	gameManager.updateSelectedItemSlot(slotNum);
});
// Handle tap events
canvas.on("click", function (event) {
	var rect = canvas[0].getBoundingClientRect();
	var clickX = event.clientX - rect.left;
	var clickY = event.clientY - rect.top;

	if (gameManager.activePlayer) {
		// Calculate the camera offset
		const camX = canvas.width / 2 - gameManager.activePlayer.x;
		const camY = canvas.height / 2 - gameManager.activePlayer.y;

		// Adjust click coordinates
		var gameX = clickX - camX;
		var gameY = clickY - camY;

		gameManager.moveActivePlayer(gameX, gameY);
	}
});
