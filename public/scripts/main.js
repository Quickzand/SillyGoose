var localPlayerState = {
	name: "",
	id: "",
};

var socket = new WebSocket("ws://localhost:3000/ws");

function joinGame() {
	localPlayerState.name = $("#nameInput").val();
	// Generate a random ID for the player
	localPlayerState.id = Math.floor(Math.random() * 1000000000);
	// Send the player state to the server\
	socket.send(JSON.stringify(localPlayerState));

	$("#mainMenu").addClass("closed");
}

// wait 1 sec
// send a message to the server

setTimeout(joinGame, 500);
