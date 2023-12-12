const path = require("path");
const express = require("express");
const expressWs = require("express-ws")(express());
const app = expressWs.app;

const port = 3000;

app.use(express.static("public"));

app.get("/", (req, res) => {
	res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(port, () => {
	console.log(`Example app listening at http://localhost:${port}`);
});

app.ws("/ws", (ws, req) => {
	ws.on("message", (msg) => {
		console.log(msg);
	});
});
