var socket = new WebSocket("ws://mattbookpro.local:3000/ws");
var playerName = "Player 1";

const playerID = Math.floor(Math.random() * 1000000);
function joinGame() {
	playerName = $("#nameInput").val();
	// Send the player state to the server
	socket.send(
		JSON.stringify({
			type: "joinGame",
			name: playerName,
			id: playerID,
		})
	);

	$("#mainMenu").addClass("closed");
	$("#game").removeClass("closed");
}

socket.onmessage = function (event) {
	var message = JSON.parse(event.data);
	switch (message.type) {
		case "updatePlayers":
			var players = JSON.parse(message.players);
			gameManager.updatePlayers(players);
			break;
		case "playerInteraction":
			gameManager.playerInteraction(message.playerId, message.itemId);
			break;
		case "updateInteractions":
			var interactions = JSON.parse(message.interactions);
			// gameManager.updateInteractions(interactions);
			break;
		case "movePlayer":
			gameManager.movePlayer(message.x, message.y, message.id);
			break;
		case "updateSelectedItemSlot":
			gameManager.updateSelectedItemSlot(
				message.slotNum,
				gameManager.getPlayerById(message.id)
			);
			console.log(message);
			break;
		case "loadMap":
			var walls = JSON.parse(message.walls);
			gameManager.loadMap(walls);
			break;
	}
};

// wait 1 sec
// send a message to the server

setTimeout(joinGame, 500);
