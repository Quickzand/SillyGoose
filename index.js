const express = require("express");
const expressWs = require("express-ws");
const path = require("path");

const app = express();
expressWs(app);

const walls = [
	{ x: -200, y: 0, width: 10, height: 500 },
	{ x: 200, y: 0, width: 10, height: 500 },
];

let interactions = [];

class Player {
	constructor(ws) {
		this.ws = ws;
		this.x = Math.random() * 100; // Give a random pos between 0 and 500
		this.y = 100; // Example position attribute
	}

	// Update the player's location
	updateLocation(x, y) {
		this.x = x;
		this.y = y;
	}

	// Send a message to this player
	sendMessage(message) {
		if (this.ws && typeof this.ws.send === "function") {
			this.ws.send(JSON.stringify(message));
		} else {
			console.error("WebSocket send function is not available");
		}
	}
}

class GameManager {
	players = [];

	addPlayer(newPlayer) {
		this.players.push(newPlayer);
	}

	removePlayer(player) {
		this.players = this.players.filter((p) => p !== player);
		this.broadcastToAll({
			type: "updatePlayers",
			players: JSON.stringify(this.getAllPlayersWithoutWS()),
		});
	}

	broadcastToAll(message) {
		this.players.forEach((player) => {
			player.sendMessage(message);
		});
	}

	broadcastToAllExcept(message, player) {
		this.players.forEach((p) => {
			if (p !== player) {
				p.sendMessage(message);
			}
		});
	}

	getAllPlayersWithoutWS() {
		return this.players.map((player) => ({
			name: player.name,
			x: player.x,
			y: player.y,
			id: player.id,
		}));
	}

	// Additional game logic methods can be added here
}

const gameManager = new GameManager();

app.ws("/ws", (ws, req) => {
	console.log("WebSocket connection established");
	const player = new Player(ws);

	ws.on("message", (msg) => {
		try {
			const message = JSON.parse(msg);
			switch (message.type) {
				case "joinGame":
					player.name = message.name;
					player.id = message.id;
					gameManager.addPlayer(player);
					console.log("Player joined:", player.name, player.id);
					ws.send(
						player.sendMessage({
							type: "updateInteractions",
							interactions: JSON.stringify(interactions),
						})
					);
					gameManager.broadcastToAll({
						type: "updatePlayers",
						players: JSON.stringify(gameManager.getAllPlayersWithoutWS()),
					});
					ws.send(
						JSON.stringify({
							type: "loadMap",
							walls: JSON.stringify(walls),
						})
					);
					break;
				case "movePlayer":
					gameManager.broadcastToAll({
						type: "movePlayer",
						x: message.x,
						y: message.y,
						id: message.id,
					});
					break;
				case "updateLocation":
					player.updateLocation(message.x, message.y);
					gameManager.broadcastToAll({
						type: "updateLocation",
						players: JSON.stringify(gameManager.getAllPlayersWithoutWS()),
					});
					break;
				case "playerInteraction":
					gameManager.broadcastToAllExcept(
						{
							type: "playerInteraction",
							playerId: message.playerId,
							itemId: message.itemId,
						},
						player
					);

					interactions.push({
						type: "playerInteraction",
						playerId: message.playerId,
						itemId: message.itemId,
					});
					break;
				case "updateSelectedItemSlot":
					gameManager.broadcastToAllExcept(
						{
							type: "updateSelectedItemSlot",
							slotNum: message.slotNum,
							id: message.id,
						},
						player
					);
					break;
				default:
					console.error("Unknown message type:", message.type);
			}
		} catch (e) {
			console.error("Error handling message:", e);
		}
	});

	ws.on("close", () => {
		gameManager.removePlayer(player);
		console.log("WebSocket connection closed");
	});
});

const PORT = 3000;
app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});

app.use(express.static("public"));

app.get("/", (req, res) => {
	res.sendFile(path.join(__dirname, "public", "index.html"));
});
