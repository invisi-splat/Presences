const presence = new Presence({
		clientId: "802958833214423081",
	}),
	getStrings = async () => {
		return presence.getStrings(
			{
				play: "general.playing",
				pause: "general.paused",
				browse: "general.browsing",
				search: "general.searchSomething",
				listen: "general.buttonListenAlong",
			},
			await presence.getSetting<string>("lang").catch(() => "en")
		);
	},
	getElement = (query: string): string | undefined => {
		let text = "";

		const element = document.querySelector(query);
		if (element) {
			if (element.childNodes.length > 1)
				text = element.childNodes[0].textContent;
			else text = element.textContent;
		}
		return text.trimStart().trimEnd();
	},
	capitalize = (text: string): string => {
		return text.charAt(0).toUpperCase() + text.slice(1);
	};

let elapsed = Math.floor(Date.now() / 1000),
	prevUrl = document.location.href,
	strings: Awaited<ReturnType<typeof getStrings>>,
	oldLang: string = null;

const statics = {
	"/stream/": {
		details: "Browsing...",
		state: "Latest Posts",
	},
	"/terms-of-use/": {
		details: "Viewing...",
		state: "Terms of Service",
	},
	"/pages/privacy/": {
		details: "Viewing...",
		state: "Privacy Policy",
	},
	"/pages/cookies/": {
		details: "Viewing...",
		state: "Cookies Policy",
	},
	"/pages/copyright/": {
		details: "Viewing...",
		state: "Copyright",
	},
	"/pages/copyright/report": {
		details: "Viewing...",
		state: "Report Copyright Infringement",
	},
	"/pages/contact": {
		details: "Viewing...",
		state: "Contact",
	},
	"/imprint/": {
		details: "Viewing...",
		state: "Imprint",
	},
	"/community-guidelines/": {
		details: "Viewing...",
		state: "Community Guidelines",
	},
	"/law-enforcement-guidelines/": {
		details: "Viewing...",
		state: "Law Enforcement Guidelines",
	},
	"/network-enforcement-act/": {
		details: "Viewing...",
		state: "Network Enforcement Act",
	},
	"/mobile/": {
		details: "Viewing App...",
		state: "SoundCloud Mobile",
	},
	"/mobile/pulse/": {
		details: "Viewing App...",
		state: "Pulse",
	},
	"/notifications/": {
		details: "Browsing...",
		state: "Notifications",
	},
	"/messages/": {
		details: "Browsing...",
		state: "Messages",
	},
	"/popular/searches/": {
		details: "Browsing...",
		state: "Popular Searches",
	},
	"/people/": {
		details: "Viewing...",
		state: "Who to Follow",
	},
	"/upload": {
		details: "Uploading...",
	},
	"/logout": {
		details: "Logged Out",
	},
};

presence.on("UpdateData", async () => {
	const path = location.pathname.replace(/\/?$/, "/"),
		[showBrowsing, showSong, showTimestamps, showCover, showButtons, newLang] =
			await Promise.all([
				presence.getSetting<boolean>("browse"),
				presence.getSetting<boolean>("song"),
				presence.getSetting<boolean>("timestamp"),
				presence.getSetting<boolean>("cover"),
				presence.getSetting<boolean>("buttons"),
				presence.getSetting<string>("lang").catch(() => "en"),
			]),
		playing = Boolean(document.querySelector(".playControls__play.playing"));

	if (oldLang !== newLang || !strings) {
		oldLang = newLang;
		strings = await getStrings();
	}

	let presenceData: PresenceData = {
		largeImageKey: "soundcloud",
		startTimestamp: elapsed,
	};

	if (document.location.href !== prevUrl) {
		prevUrl = document.location.href;
		elapsed = Math.floor(Date.now() / 1000);
	}

	if ((playing || (!playing && !showBrowsing)) && showSong) {
		presenceData.details = getElement(
			".playbackSoundBadge__titleLink > span:nth-child(2)"
		);
		presenceData.state = getElement(".playbackSoundBadge__lightLink");

		const timePassed = document.querySelector(
				"div.playbackTimeline__timePassed > span:nth-child(2)"
			).textContent,
			durationString = document.querySelector(
				"div.playbackTimeline__duration > span:nth-child(2)"
			).textContent,
			[currentTime, duration] = [
				presence.timestampFromFormat(timePassed),
				(() => {
					if (!durationString.startsWith("-"))
						return presence.timestampFromFormat(durationString);
					else {
						return (
							presence.timestampFromFormat(durationString.slice(1)) +
							presence.timestampFromFormat(timePassed)
						);
					}
				})(),
			],
			[startTimestamp, endTimestamp] = presence.getTimestamps(
				currentTime,
				duration
			),
			pathLinkSong = document
				.querySelector(
					"#app > div.playControls.g-z-index-control-bar.m-visible > section > div > div.playControls__elements > div.playControls__soundBadge > div > div.playbackSoundBadge__titleContextContainer > div > a"
				)
				.getAttribute("href");

		presenceData.startTimestamp = startTimestamp;
		presenceData.endTimestamp = endTimestamp;

		if (showCover) {
			presenceData.largeImageKey =
				document
					.querySelector<HTMLSpanElement>(
						".playbackSoundBadge__avatar.sc-media-image > div > span"
					)
					.style.backgroundImage.match(/"(.*)"/)?.[1]
					.replace("-t50x50.jpg", "-t500x500.jpg") ?? "soundcloud";
		}
		presenceData.smallImageKey = playing ? "play" : "pause";
		presenceData.smallImageText = strings[playing ? "play" : "pause"];

		if (showButtons) {
			presenceData.buttons = [
				{
					label: strings.listen,
					url: `https://soundcloud.com${pathLinkSong}`,
				},
			];
		}
	}

	if ((!playing || !showSong) && showBrowsing) {
		for (const [k, v] of Object.entries(statics))
			if (path.match(k)) presenceData = { ...presenceData, ...v };

		if (path === "/") {
			presenceData.details = "Browsing...";
			presenceData.state = "Home";
		} else if (path.includes("/charts/")) {
			presenceData.details = "Browsing Charts...";

			const [heading] = path.split("/").slice(-2);
			presenceData.state =
				heading && !heading.includes("charts") && capitalize(heading);
		} else if (path.includes("/you/")) {
			presenceData.details = "Browsing My Content...";

			const heading = location.pathname.split("/").pop();
			presenceData.state = heading && capitalize(heading);
		} else if (path.includes("/settings/")) {
			presenceData.details = "Browsing Settings...";
			presenceData.state = getElement(".g-tabs-link.active");
		} else if (path.includes("/search/")) {
			presenceData.details = "Searching...";

			const searchBox = document.querySelector<HTMLInputElement>(
				".headerSearch__input"
			);
			presenceData.state = searchBox && searchBox.value;
		} else if (path.includes("/discover/")) {
			presenceData.details = "Discovering...";
			presenceData.state = "Music";

			const setLabel = getElement(".fullHero__titleTextLineBig > span");
			if (setLabel) {
				presenceData.details = "Browsing Set...";
				presenceData.state = setLabel;
			}
		} else if (path.includes("/stats/")) {
			presenceData.details = "Viewing Stats...";
			presenceData.state = getElement(".statsNavigation .g-tabs-link.active");
		}

		const username =
			getElement(".profileHeaderInfo__userName") ||
			getElement(".userNetworkTop__title > a");
		if (username) {
			presenceData.details = "Viewing Profile...";
			presenceData.state = `${username} (${getElement(".g-tabs-link.active")})`;
		}

		const waveform = document.querySelector(".fullListenHero .waveform__layer");
		if (waveform) {
			if (waveform.childElementCount >= 3)
				presenceData.details = "Viewing Song...";
			else presenceData.details = "Browsing Playlist/Album...";

			presenceData.state = `${getElement(
				".soundTitle__title > span"
			)} by ${getElement(".soundTitle__username")}`;
		}
	}

	if (presenceData.details) {
		if (presenceData.details.match("(Browsing|Viewing|Discovering)")) {
			presenceData.smallImageKey = "reading";
			presenceData.smallImageText = strings.browse;
		} else if (presenceData.details.match("(Searching)")) {
			presenceData.smallImageKey = "search";
			presenceData.smallImageText = strings.search;
		} else if (presenceData.details.match("(Uploading)")) {
			presenceData.smallImageKey = "uploading";
			presenceData.smallImageText = "Uploading..."; // no string available
		} else if (!showTimestamps || (!playing && !showBrowsing)) {
			delete presenceData.startTimestamp;
			delete presenceData.endTimestamp;
		}

		presence.setActivity(presenceData);
	} else presence.setActivity();
});
