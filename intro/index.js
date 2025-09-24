let comingup, teams, mappool;
(async () => {
	$.ajaxSetup({ cache: false });
	comingup = await $.getJSON('../_data/coming_up.json');
	teams = await $.getJSON('../_data/teams.json');
	mappool = await $.getJSON('../_data/beatmaps.json');
	if (mappool.stage) $('#stage_name').text(mappool.stage);

	update_match(comingup);
})();

const update_match = match => {
	const red_team = teams.find(team => team.name === match.red_team);
	const blue_team = teams.find(team => team.name === match.blue_team);
	update_team('red', red_team);
	update_team('blue', blue_team);

	if (match.time > Date.now()) {
		let timer_int = setInterval(() => {
			if (match.time < Date.now()) {
				clearInterval(timer_int);
				$('#timer').text('00:00');
			}
			let remaining = Math.floor((match.time - Date.now()) / 1000);
			let hours = Math.floor(remaining / 60 / 60);
			let date = new Date(null);
			date.setSeconds(remaining);
			let text = hours > 0 ? date.toISOString().slice(11, 19) : date.toISOString().slice(14, 19);
			if (timer && remaining > 0) $('#timer').text(text);
		}, 1000);
	}
};

const update_team = (color, team) => {
	$(`#${color}_team`).text(team.name);
	$(`#${color}_players`).html('');
	for (const player of team.players) {
		$(`#${color}_players`).append($('<div></div>').addClass('player').text(player));
	}
};
