require("dotenv").config();

const axios = require("axios");
const { App } = require("@slack/bolt");

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true
});

const GITHUB_REPO_PATTERN = /^[\w.-]+\/[\w.-]+$/;
const APP_NAME = "ContribBot_REPO";
const MEDALS = [":first_place_medal:", ":second_place_medal:", ":third_place_medal:"];
const EARTH_RADIUS_MILES = 3958.8;

function getNominatimHeaders() {
  return {
    "User-Agent": "ContribBot_REPO/1.0 Slack location command"
  };
}

async function geocodePlace(query) {
  const response = await axios.get("https://nominatim.openstreetmap.org/search", {
    headers: getNominatimHeaders(),
    params: {
      q: query,
      format: "jsonv2",
      addressdetails: 1,
      extratags: 1,
      limit: 1
    }
  });

  if (!Array.isArray(response.data) || !response.data.length) {
    return null;
  }

  return response.data[0];
}

function parseMapsCommand(text) {
  const trimmedText = text.trim();

  if (!trimmedText) {
    return {
      mode: "help"
    };
  }

  if (trimmedText.toLowerCase().startsWith("distance ")) {
    const distanceText = trimmedText.slice("distance ".length).trim();
    const [fromPlace, toPlace] = distanceText.split("|").map((part) => part.trim());

    return {
      mode: "distance",
      fromPlace,
      toPlace
    };
  }

  return {
    mode: "place",
    query: trimmedText
  };
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function buildFlagImageUrl(countryCode = "") {
  if (!countryCode) {
    return null;
  }

  return `https://flagcdn.com/w160/${countryCode.toLowerCase()}.png`;
}

function formatCoordinate(value) {
  return Number(value).toFixed(4);
}

function getPlaceName(place) {
  return place.name || place.display_name.split(",")[0];
}

function getOpenStreetMapUrl(place) {
  return `https://www.openstreetmap.org/?mlat=${place.lat}&mlon=${place.lon}#map=10/${place.lat}/${place.lon}`;
}

function getDistanceMiles(fromPlace, toPlace) {
  const fromLatitude = Number(fromPlace.lat);
  const fromLongitude = Number(fromPlace.lon);
  const toLatitude = Number(toPlace.lat);
  const toLongitude = Number(toPlace.lon);

  const latitudeDelta = ((toLatitude - fromLatitude) * Math.PI) / 180;
  const longitudeDelta = ((toLongitude - fromLongitude) * Math.PI) / 180;
  const fromLatitudeRadians = (fromLatitude * Math.PI) / 180;
  const toLatitudeRadians = (toLatitude * Math.PI) / 180;

  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitudeRadians) *
      Math.cos(toLatitudeRadians) *
      Math.sin(longitudeDelta / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_MILES * c;
}

function buildMapsHelpResponse() {
  return {
    text: "BeautifyMaps help",
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "BeautifyMaps"
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*Search any place:*\n`/beatifymaps Tokyo, Japan`\n\n*Distance between places:*\n`/beatifymaps distance Los Angeles | San Francisco`"
        }
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: "Powered by OpenStreetMap Nominatim. Please avoid bulk or spammy lookups."
          }
        ]
      }
    ]
  };
}

function buildPlaceResponse(query, place) {
  const countryCode = place.address?.country_code;
  const flagUrl = buildFlagImageUrl(countryCode);
  const fields = [
    {
      type: "mrkdwn",
      text: `*Type*\n${place.type || "place"}`
    },
    {
      type: "mrkdwn",
      text: `*Coordinates*\n${formatCoordinate(place.lat)}, ${formatCoordinate(place.lon)}`
    }
  ];

  return {
    text: `BeautifyMaps result for ${query}`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "BeautifyMaps Explorer"
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${getPlaceName(place)}*\n${place.display_name}`
        },
        ...(flagUrl && {
          accessory: {
          type: "image",
          image_url: flagUrl,
          alt_text: `${place.address?.country || "country"} flag`
          }
        })
      },
      {
        type: "section",
        fields
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "View Map"
            },
            url: getOpenStreetMapUrl(place)
          }
        ]
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: "Map data from OpenStreetMap contributors."
          }
        ]
      }
    ]
  };
}

function buildDistanceResponse(fromPlace, toPlace, distanceMiles) {
  const kilometers = distanceMiles * 1.60934;
  const fromCountryCode = fromPlace.address?.country_code;
  const flagUrl = buildFlagImageUrl(fromCountryCode);

  return {
    text: `Distance from ${getPlaceName(fromPlace)} to ${getPlaceName(toPlace)}`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "BeautifyMaps Distance"
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${getPlaceName(fromPlace)}* to *${getPlaceName(toPlace)}*\n:straight_ruler: ${distanceMiles.toFixed(1)} miles / ${kilometers.toFixed(1)} km`
        },
        ...(flagUrl && {
          accessory: {
            type: "image",
            image_url: flagUrl,
            alt_text: `${fromPlace.address?.country || "country"} flag`
          }
        })
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*From*\n${fromPlace.display_name}\n\`${formatCoordinate(fromPlace.lat)}, ${formatCoordinate(fromPlace.lon)}\``
          },
          {
            type: "mrkdwn",
            text: `*To*\n${toPlace.display_name}\n\`${formatCoordinate(toPlace.lat)}, ${formatCoordinate(toPlace.lon)}\``
          }
        ]
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "View From"
            },
            url: getOpenStreetMapUrl(fromPlace)
          },
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "View To"
            },
            url: getOpenStreetMapUrl(toPlace)
          }
        ]
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: "Distance uses coordinates from OpenStreetMap Nominatim and the haversine formula."
          }
        ]
      }
    ]
  };
}

app.command("/beatifymaps", async ({ command, ack, respond }) => {
  await ack();

  try {
    const mapsCommand = parseMapsCommand(command.text);

    if (mapsCommand.mode === "help") {
      await respond(buildMapsHelpResponse());
      return;
    }

    if (mapsCommand.mode === "distance") {
      if (!mapsCommand.fromPlace || !mapsCommand.toPlace) {
        await respond({
          text: "Try `/beatifymaps distance Los Angeles | San Francisco`."
        });
        return;
      }

      const fromPlace = await geocodePlace(mapsCommand.fromPlace);
      await wait(1100);
      const toPlace = await geocodePlace(mapsCommand.toPlace);

      if (!fromPlace || !toPlace) {
        await respond({
          text: "I could not find both places. Try `/beatifymaps distance Los Angeles | San Francisco`."
        });
        return;
      }

      const distanceMiles = getDistanceMiles(fromPlace, toPlace);
      await respond(buildDistanceResponse(fromPlace, toPlace, distanceMiles));
      return;
    }

    const place = await geocodePlace(mapsCommand.query);

    if (!place) {
      await respond({
        text: `I could not find "${mapsCommand.query}". Try a more specific place name.`
      });
      return;
    }

    await respond(buildPlaceResponse(mapsCommand.query, place));
  } catch (error) {
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message;
    console.error("Error fetching map data:", { status, message });
    await respond({
      text: `Error fetching map data${status ? ` (${status})` : ""}. Check the bot terminal for details.`
    });
  }
});

function normalizeCelestialObject(text) {
  return text.trim().toLowerCase();
}

const SLACK_TEXT_LIMIT = 2900;
const SLACK_PLAIN_TEXT_LIMIT = 150;

function truncate(value, limit) {
  if (typeof value !== "string") {
    return "";
  }
  if (value.length <= limit) {
    return value;
  }
  return value.slice(0, Math.max(0, limit - 1)).trimEnd() + "\u2026";
}

function safeObjectName(data) {
  return truncate(String(data?.object || "celestial object"), SLACK_PLAIN_TEXT_LIMIT);
}

async function fetchBootprint(path, object) {
  try {
    const response = await axios.get(`https://api.bootprint.space/${path}/${object}`, {
      timeout: 8000,
      headers: { "User-Agent": "calcgoal-bot/1.0" }
    });
    return response.data;
  } catch (error) {
    const status = error.response?.status;
    const apiMessage =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message;
    console.error("Bootprint fetch failed:", { path, object, status, apiMessage });
    throw error;
  }
}

function buildSpaceHelpResponse() {
  return {
    text: "Space command help",
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "Space Commands"
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text:
            "*Available commands:*\n" +
            "`/dsb-help` - Show this help menu\n" +
            "`/dsb-space mars` - Show a space image and fact\n" +
            "`/dsb-space-img moon` - Show only a space image\n" +
            "`/dsb-space-fact jupiter` - Show only a space fact"
        }
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: "Use a celestial object name like `mars`, `jupiter`, or `moon`."
          }
        ]
      }
    ]
  };
}

function buildBootprintAllResponse(data) {
  const name = safeObjectName(data);
  const fact = truncate(String(data?.fact || "No fact available."), SLACK_TEXT_LIMIT);
  return {
    text: `Space fact for ${name}`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `${name} Snapshot`
        }
      },
      {
        type: "image",
        image_url: data.image,
        alt_text: `${name} image`
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Fact:*\n${fact}`
        }
      }
    ]
  };
}

function buildBootprintImageResponse(data) {
  const name = safeObjectName(data);
  return {
    text: `Space image for ${name}`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `${name} Image`
        }
      },
      {
        type: "image",
        image_url: data.image,
        alt_text: `${name} image`
      }
    ]
  };
}

function buildBootprintFactResponse(data) {
  const name = safeObjectName(data);
  const fact = truncate(String(data?.fact || "No fact available."), SLACK_TEXT_LIMIT);
  return {
    text: `Space fact for ${name}`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `${name} Fact`
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: fact
        }
      }
    ]
  };
}

async function handleBootprintCommand({ command, ack, respond }, path, buildResponse) {
  try {
    await ack();
  } catch (err) {
    console.error("ack() failed for", path, err);
  }

  const object = normalizeCelestialObject(command.text);

  const safeRespond = async (payload) => {
    try {
      await respond(payload);
    } catch (err) {
      console.error("respond() failed for", path, object, err);
    }
  };

  if (!object) {
    await safeRespond({
      text: "Please add a celestial object. Example: `/dsb-space mars`"
    });
    return;
  }

  try {
    const data = await fetchBootprint(path, object);

    if (data && data.error) {
      await safeRespond({ text: data.error });
      return;
    }

    await safeRespond(buildResponse(data));
  } catch (error) {
    const status = error.response?.status;
    const message =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message;
    console.error("Error fetching Bootprint data:", { path, object, status, message });
    await safeRespond({
      text: `Failed to fetch space data${status ? ` (${status})` : ""}. Try another object like \`mars\`, \`jupiter\`, or \`moon\`.`
    });
  }
}

app.command("/dsb-help", async ({ ack, respond }) => {
  await ack();
  await respond(buildSpaceHelpResponse());
});

app.command("/dsb-space", async (args) => {
  try {
    await handleBootprintCommand(args, "all", buildBootprintAllResponse);
  } catch (err) {
    console.error("Unhandled /dsb-space error:", err);
    try { await args.ack(); } catch (_) { /* ignore */ }
    try {
      await args.respond({
        text: "Something went wrong fetching space data. Check the bot terminal for details."
      });
    } catch (respondErr) {
      console.error("Fallback respond failed for /dsb-space:", respondErr);
    }
  }
});

app.command("/dsb-space-img", async (args) => {
  try {
    await handleBootprintCommand(args, "img", buildBootprintImageResponse);
  } catch (err) {
    console.error("Unhandled /dsb-space-img error:", err);
    try { await args.ack(); } catch (_) { /* ignore */ }
    try {
      await args.respond({
        text: "Something went wrong fetching the space image. Check the bot terminal for details."
      });
    } catch (respondErr) {
      console.error("Fallback respond failed for /dsb-space-img:", respondErr);
    }
  }
});

app.command("/dsb-space-fact", async (args) => {
  try {
    await handleBootprintCommand(args, "fact", buildBootprintFactResponse);
  } catch (err) {
    console.error("Unhandled /dsb-space-fact error:", err);
    try { await args.ack(); } catch (_) { /* ignore */ }
    try {
      await args.respond({
        text: "Something went wrong fetching the space fact. Check the bot terminal for details."
      });
    } catch (respondErr) {
      console.error("Fallback respond failed for /dsb-space-fact:", respondErr);
    }
  }
});

function getGithubHeaders() {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "contribbot-repo"
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  return headers;
}

async function fetchGithubJson(url) {
  const response = await fetch(url, { headers: getGithubHeaders() });

  if (response.status === 404) {
    throw new Error("repo_not_found");
  }

  if (response.status === 403) {
    throw new Error("github_forbidden");
  }

  if (!response.ok) {
    throw new Error(`github_error_${response.status}`);
  }

  return response.json();
}

async function getRepoData(repo) {
  const [repoDetails, contributors] = await Promise.all([
    fetchGithubJson(`https://api.github.com/repos/${repo}`),
    fetchGithubJson(`https://api.github.com/repos/${repo}/contributors?per_page=10`)
  ]);

  return { repoDetails, contributors };
}

function buildProgressBar(value, maxValue) {
  if (!maxValue) {
    return "----------";
  }

  const filledCount = Math.max(1, Math.round((value / maxValue) * 10));
  return "#".repeat(filledCount) + "-".repeat(10 - filledCount);
}

function getRankLabel(index) {
  return MEDALS[index] || `${index + 1}.`;
}

function formatLeaderboardText(contributors) {
  if (!contributors.length) {
    return "No contributors found.";
  }

  const topContributionCount = contributors[0].contributions;
  const rows = contributors.map((contributor, index) => {
    const rank = getRankLabel(index);
    const profileUrl = contributor.html_url;
    const progressBar = buildProgressBar(contributor.contributions, topContributionCount);

    return `${rank} <${profileUrl}|${contributor.login}>  ${progressBar}  ${contributor.contributions} commits`;
  });

  return rows.join("\n");
}

function formatRepoStats(repoDetails) {
  return `:star: ${repoDetails.stargazers_count} stars   :fork_and_knife: ${repoDetails.forks_count} forks   :large_green_circle: ${repoDetails.open_issues_count} open issues   :seedling: ${repoDetails.default_branch}`;
}

function buildLeaderboardResponse(repo, repoDetails, contributors) {
  const leaderboardText = formatLeaderboardText(contributors);

  return {
    text: `${APP_NAME} leaderboard for ${repo}`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `${APP_NAME} Leaderboard`
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*<${repoDetails.html_url}|${repo}>*\n${formatRepoStats(repoDetails)}`
        }
      },
      {
        type: "divider"
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: leaderboardText
        }
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "View Repo"
            },
            url: repoDetails.html_url
          }
        ]
      }
    ]
  };
}

app.command("/calcgoal", async ({ command, ack, respond }) => {
  await ack();

  const repo = command.text.trim();

  if (!GITHUB_REPO_PATTERN.test(repo)) {
    await respond({
      text: "Send a repo like `/calcgoal owner/repo` to see the contribution leaderboard."
    });
    return;
  }

  try {
    const { repoDetails, contributors } = await getRepoData(repo);
    await respond(buildLeaderboardResponse(repo, repoDetails, contributors));
  } catch (error) {
    if (error.message === "repo_not_found") {
      await respond({ text: `I could not find ${repo}. Check the owner/repo name or repo access.` });
      return;
    }

    if (error.message === "github_forbidden") {
      await respond({
        text: "GitHub blocked this request. Add a valid GITHUB_TOKEN to .env, then restart the bot."
      });
      return;
    }

    console.error(error);
    await respond({ text: "I could not load the GitHub leaderboard right now." });
  }
});

(async () => {
  try {
    await app.start();
    console.log("bot is running!");
  } catch (error) {
    console.error("Error starting bot:", error);
    process.exit(1);
  }
})();
