const presence = new Presence({
	clientId: "1020784141098287124"
})
const strings = presence.getStrings({
	play: "presence.playback.playing",
	pause: "presence.playback.paused"
});

const logoURL = "https://i.imgur.com/bddB3ru.png";
let query: string;

presence.on("UpdateData", async () => {
	const presenceData: PresenceData = {
		largeImageKey: logoURL,
		startTimestamp: Date.now() / 1000
	};
	
	if (location.pathname === "/" || location.pathname === "/index.php" || location.pathname.includes("/video/")) {
		presenceData.details = "Browsing anime";
	} else if (location.pathname.includes("/search/") || location.pathname.includes("/gs.php")) {
		query = document.querySelector("body > div.wrap.fix > div.content.left.space > div.pl2.content_box.border > div.caption > dl > dt > a > font").innerHTML;
		presenceData.details = "Searching anime";
		presenceData.state = "Query: " + query;
	} else if (location.pathname.includes("/playlist/")) {
		presenceData.details = "Browsing playlists";
	} else if (location.pathname.includes("/special/")) {
		presenceData.details = "Browsing sketchy stuff";
	} else if (new RegExp(/\/\d{6,7}/gm).test(location.pathname))  {
		try { query = document.querySelector("body > div:nth-child(7) > div.content.left > div > div.caption > h3").innerHTML }
		catch { query = document.querySelector("body > div:nth-child(6) > div.content.left > div > div.caption > h3").innerHTML }
		finally {
			presenceData.details = "Watching anime";
			presenceData.state = query;
		}
	}

	if (presenceData.details) presence.setActivity(presenceData);
	else presence.setActivity();
});