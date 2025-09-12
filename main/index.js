const TEAMSIZE = 2;
const DEBUG = false;

const cache = {};
let mappool;
(async () => {
	$.ajaxSetup({ cache: false });
	let stage = await $.getJSON('../_data/beatmaps.json');
	mappool = stage.beatmaps;
	if (stage.stage) $('#stage_name').text(stage.stage);
})();

const animation = {
	red_score: new CountUp('score_red', 0, 0, 0, .3, { useEasing: true, useGrouping: true, separator: '', decimal: '.', pad: 7 }),
	blue_score: new CountUp('score_blue', 0, 0, 0, .3, { useEasing: true, useGrouping: true, separator: '', decimal: '.', pad: 7 }),
	score_diff: new CountUp('score_diff', 0, 0, 0, .3, { useEasing: true, useGrouping: true, separator: '', decimal: '.', pad: 7 }),
}

const socket = new ReconnectingWebSocket(DEBUG ? 'ws://127.0.0.1:24051/' : `ws://${location.host}/websocket/v2`);
socket.onopen = () => { console.log('Successfully Connected'); };
socket.onclose = event => { console.log('Socket Closed Connection: ', event); socket.send('Client Closed!'); };
socket.onerror = error => { console.log('Socket Error: ', error); };

socket.onmessage = async event => {
	const data = JSON.parse(event.data);
	const now = Date.now();

	if (cache.scoreVisible !== data.tourney.scoreVisible) {
		cache.scoreVisible = data.tourney.scoreVisible;

		if (cache.scoreVisible) {
			$('#chat_container').css('opacity', 0);
			$('#score_container').css('opacity', 1);
		} else {
			$('#chat_container').css('opacity', 1);
			$('#score_container').css('opacity', 0);
		}
	}

	if (cache.starsVisible !== data.tourney.starsVisible) {
		cache.starsVisible = data.tourney.starsVisible;
		if (cache.starsVisible) {
			$('#blue_points').css('opacity', 1);
			$('#red_points').css('opacity', 1);

		} else {
			$('#blue_points').css('opacity', 0);
			$('#red_points').css('opacity', 0);
		}
	}

	if (cache.nameRed !== data.tourney.team.left) {
		cache.nameRed = data.tourney.team.left || 'Red Team';
		$('#red_name').text(cache.nameRed);
	}

	if (cache.nameBlue !== data.tourney.team.right) {
		cache.nameBlue = data.tourney.team.right || 'Blue Team';
		$('#blue_name').text(cache.nameBlue);
	}

	if (cache.bestOf !== data.tourney.bestOF) {
		const newmax = Math.ceil(data.tourney.bestOF / 2);
		if (cache.bestOf === undefined) {
			for (let i = 1; i <= newmax; i++) {
				$('#red_points').append($('<div></div>').attr('id', `red${i}`).addClass('team-point red'));
				$('#blue_points').append($('<div></div>').attr('id', `blue${i}`).addClass('team-point blue'));
			}
		}
		else if (cache.bestOf < data.tourney.bestOF) {
			for (let i = cache.firstTo + 1; i <= newmax; i++) {
				$('#red_points').append($('<div></div>').attr('id', `red${i}`).addClass('team-point red'));
				$('#blue_points').append($('<div></div>').attr('id', `blue${i}`).addClass('team-point blue'));
			}
		}
		else {
			for (let i = firstTo; i > newmax; i--) {
				$(`#red${i}`).remove();
				$(`#blue${i}`).remove();
			}
		}
		cache.bestOf = data.tourney.bestOF;
		cache.firstTo = newmax;
	}

	if (cache.starsRed !== data.tourney.points.left) {
		cache.starsRed = data.tourney.points.left;
		for (let i = 1; i <= cache.starsRed; i++) { $(`#red${i}`).addClass('filled'); }
		for (let i = cache.starsRed + 1; i <= cache.firstTo; i++) { $(`#red${i}`).removeClass('filled'); }
	}

	if (cache.starsBlue !== data.tourney.points.right) {
		cache.starsBlue = data.tourney.points.right;
		for (let i = 1; i <= cache.starsBlue; i++) { $(`#blue${i}`).addClass('filled'); }
		for (let i = cache.starsBlue + 1; i <= cache.firstTo; i++) { $(`#blue${i}`).removeClass('filled'); }
	}

	if (mappool && cache.md5 !== data.beatmap.checksum) {
		cache.md5 = data.beatmap.checksum;
		setTimeout(() => { cache.update_stats = true }, 250);
	}

	if (cache.update_stats) {
		cache.update_stats = false;
		cache.mapid = data.beatmap.id;
		const map = mappool?.beatmaps ? mappool.beatmaps.find(m => m.beatmap_id === cache.mapid || m.md5 === cache.md5) ?? { id: cache.mapid, mods: 'NM', identifier: null } : { id: null, mods: 'NM', identifier: null };
		cache.map = map;
		const mods = map?.mods ?? 'NM';
		const stats = getModStats(data.beatmap.stats.cs.original, data.beatmap.stats.ar.original, data.beatmap.stats.od.original, data.beatmap.stats.bpm.common, mods);
		const len_ = data.beatmap.time.lastObject - data.beatmap.time.firstObject;

		$('#cs').text(stats.cs.toFixed(1));
		$('#ar').text(stats.ar.toFixed(1));
		$('#od').text(stats.od.toFixed(1));
		const bpm_data = data.beatmap.stats.bpm;
		$('#bpm').html(bpm_data.min === bpm_data.max ? bpm_data.min : `${bpm_data.min}-${bpm_data.max}`);
		$('#length').text(`${Math.trunc((len_ / stats.speed) / 1000 / 60)}:${Math.trunc((len_ / stats.speed) / 1000 % 60).toString().padStart(2, '0')}`);
		$('#sr').text(`${Number(map?.sr ?? data.beatmap.stats.stars.total).toFixed(2)}`);

		$('#map_title').text(`${data.beatmap.artist} - ${data.beatmap.title}`);
		$('#map_diff').text(`[${data.beatmap.version}]`);

		apply_overflow('map_title', 198);
		apply_overflow('map_diff', 198);

		$('#map_slot').text(map.identifier || 'XX');

		const path = `http://${location.host}/Songs/${data.folders.beatmap}/${data.files.background}`.replace(/#/g, '%23').replace(/%/g, '%25').replace(/\\/g, '/').replace(/'/g, `\\'`);
		$('#beatmap_image').css('background-image', `url('${path}')`);
	}

	if (cache.scoreVisible) {
		const scores = [];
		for (let i = 0; i < TEAMSIZE * 2; i++) {
			let score = data.tourney.clients[i]?.play?.score || 0;
			if (data.tourney.clients[i]?.play?.mods?.name?.toUpperCase().includes('EZ')) score *= 1.75;
			scores.push({ id: i, score });
		}

		cache.scoreRed = scores.filter(s => s.id < TEAMSIZE).map(s => s.score).reduce((a, b) => a + b);
		cache.scoreBlue = scores.filter(s => s.id >= TEAMSIZE).map(s => s.score).reduce((a, b) => a + b);
		const scorediff = Math.abs(cache.scoreRed - cache.scoreBlue);

		animation.red_score.update(cache.scoreRed);
		animation.blue_score.update(cache.scoreBlue);
		animation.score_diff.update(scorediff);

		const lead_bar_width = `${Math.max(10, 360 * (Math.min(0.5, Math.pow(scorediff / 1000000, 0.7)) * 2))}px`;

		if (cache.scoreRed > cache.scoreBlue) {
			$('#score_red').addClass('winning');
			$('#score_blue').removeClass('winning');

			$('#score_diff_red').addClass('visible');
			$('#score_diff_blue').removeClass('visible');

			$('#lead_bar').css('width', lead_bar_width);
			$('#lead_bar').addClass('red').removeClass('blue');
		}
		else if (cache.scoreBlue > cache.scoreRed) {
			$('#score_red').removeClass('winning');
			$('#score_blue').addClass('winning');

			$('#score_diff_red').removeClass('visible');
			$('#score_diff_blue').addClass('visible');

			$('#lead_bar').css('width', lead_bar_width);
			$('#lead_bar').removeClass('red').addClass('blue');
		}
		else {
			$('#score_red').removeClass('winning');
			$('#score_blue').removeClass('winning');

			$('#score_diff_red').removeClass('visible');
			$('#score_diff_blue').removeClass('visible');

			$('#lead_bar').css('width', '0px');
			$('#lead_bar').removeClass('red blue');
		}
	}

	if (cache.chatLen !== data.tourney.chat.length) {
		const current_chat_len = data.tourney.chat.length;
		if (cache.chatLen === 0 || (cache.chatLen > 0 && cache.chatLen > current_chat_len)) { $('#chat').html(''); cache.chatLen = 0; }

		for (let i = cache.chatLen || 0; i < current_chat_len; i++) {
			const chat = data.tourney.chat[i];
			const body = chat.message;
			const timestamp = chat.timestamp;
			if (body.toLowerCase().startsWith('!mp')) continue;

			const player = chat.name;
			if (player === 'BanchoBot' && body.startsWith('Match history')) continue;

			const chatParent = $('<div></div>').addClass(`chat-message ${chat.team}`);

			chatParent.append($('<div></div>').addClass('chat-time').text(timestamp));
			chatParent.append($('<div></div>').addClass(`chat-name ${chat.team}`).text(player));
			chatParent.append($('<div></div>').addClass('chat-body').text(body));
			$('#chat').prepend(chatParent);
		}

		cache.chatLen = data.tourney.chat.length;
		cache.chat_loaded = true;
	}
}

const apply_overflow = (element_id, width) => {
	const element = document.getElementById(element_id);
	const overflow = element.scrollWidth > width;
	if (overflow) element.classList.add('overflow');
	else element.classList.remove('overflow');
};

const getModStats = (cs_raw, ar_raw, od_raw, bpm_raw, mods) => {
	mods = mods.replace('NC', 'DT');

	const speed = mods.includes('DT') ? 1.5 : mods.includes('HT') ? 0.75 : 1;

	let ar = mods.includes('HR') ? ar_raw * 1.4 : mods.includes('EZ') ? ar_raw * 0.5 : ar_raw;
	const ar_ms = Math.max(Math.min(ar <= 5 ? 1800 - 120 * ar : 1200 - 150 * (ar - 5), 1800), 450) / speed;
	ar = ar < 5 ? (1800 - ar_ms) / 120 : 5 + (1200 - ar_ms) / 150;

	const cs = mods.includes('HR') ? cs_raw * 1.3 : mods.includes('EZ') ? cs_raw * 0.5 : cs_raw;

	let od = Math.min(mods.includes('HR') ? od_raw * 1.4 : mods.includes('EZ') ? od_raw * 0.5 : od_raw, 10);
	if (speed !== 1) od = (79.5 - Math.min(79.5, Math.max(19.5, 79.5 - Math.ceil(6 * od))) / speed) / 6;

	return {
		cs: Math.round(cs * 10) / 10,
		ar: Math.round(ar * 10) / 10,
		od: Math.round(od * 10) / 10,
		bpm: Math.round(bpm_raw * speed * 10) / 10,
		speed
	}
}
