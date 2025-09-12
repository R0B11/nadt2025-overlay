let teams, mappool;
(async () => {
	$.ajaxSetup({ cache: false });
	teams = await $.getJSON('../_data/teams.json');
	mappool = await $.getJSON('../_data/beatmaps.json');
	if (mappool?.stage) $('#stage_name').text(mappool.stage);
})();

const cache = {};
const socket = new ReconnectingWebSocket('ws://' + location.host + '/websocket/v2');
socket.onopen = () => { console.log('Successfully Connected'); };
socket.onclose = event => { console.log('Socket Closed Connection: ', event); socket.send('Client Closed!'); };
socket.onerror = error => { console.log('Socket Error: ', error); };

socket.onmessage = async event => {
	const data = JSON.parse(event.data);

	if (teams && (cache.points_r !== data.tourney.points.left || cache.points_b !== data.tourney.points.right)) {
		cache.points_r = data.tourney.points.left;
		cache.points_b = data.tourney.points.right;
		const red_team = teams.find(team => team.name === data.tourney.team.left);
		const blue_team = teams.find(team => team.name === data.tourney.team.right);

		if (red_team && blue_team) {
			const team = cache.points_r > cache.points_b ? red_team : blue_team;
			$('#team_name').text(team.name);
			$('#player1').text(team.players[0]);
			$('#player2').text(team.players[1]);
			$('#scoreline').text(cache.points_r > cache.points_b ? `${cache.points_r} - ${cache.points_b}` : `${cache.points_b} - ${cache.points_r}`);
		}
	}
};
