const weatherApiKey = "457a7ae954018f0b3345ab7fcb74ff7c"; // Your OpenWeatherMap API key
const tzdbApiKey = "MN61Q54XZ8CZ"; // Your TimeZoneDB API key
const geoApiKey = "8d77756d87msh21ce876a2ed9ef4p1e2812jsna05f2f836032"; // GeoDB Cities API key
const geoApiHost = "wft-geo-db.p.rapidapi.com";

let cityClockInterval = null;

function getWeather() {
  const city = document.getElementById("cityInput").value.trim();
  if (!city) return alert("Please enter a city name!");
  fetchWeather(`q=${encodeURIComponent(city)}`);
}

function getLocationWeather() {
  if (!navigator.geolocation) return alert("Geolocation not supported");
  navigator.geolocation.getCurrentPosition(
    pos => fetchWeather(`lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`),
    err => handleGeoError(err)
  );
}

function handleGeoError(err) {
  switch(err.code) {
    case err.PERMISSION_DENIED:    alert("Location denied."); break;
    case err.POSITION_UNAVAILABLE: alert("Position unavailable."); break;
    case err.TIMEOUT:              alert("Location timeout."); break;
    default:                       alert("Unknown location error.");
  }
}

function fetchWeather(query) {
  const url = `https://api.openweathermap.org/data/2.5/weather?${query}&appid=${weatherApiKey}&units=metric`;

  fetch(url)
    .then(res => {
      if (!res.ok) throw new Error("City not found");
      return res.json();
    })
    .then(data => {
      const cityName = data.name;
      const temp = data.main.temp;
      const condition = data.weather[0].main.toLowerCase();
      const humidity = data.main.humidity;
      const wind = data.wind.speed;
      const iconCode = data.weather[0].icon;

      // Update UI
      document.getElementById("weatherResult").classList.remove("hidden");
      document.getElementById("cityName").textContent = cityName;
      document.getElementById("temp").textContent = temp;
      document.getElementById("condition").textContent = condition;
      document.getElementById("humidity").textContent = humidity;
      document.getElementById("wind").textContent = wind;

      // Set main weather icon as emoji
      let mainEmoji = '';
      switch (condition) {
        case 'clear': mainEmoji = '☀️'; break;
        case 'clouds': mainEmoji = '☁️'; break;
        case 'rain': mainEmoji = '🌧️'; break;
        case 'drizzle': mainEmoji = '🌦️'; break;
        case 'thunderstorm': mainEmoji = '⛈️'; break;
        case 'snow': mainEmoji = '❄️'; break;
        case 'mist':
        case 'fog':
        case 'haze': mainEmoji = '🌫️'; break;
        default: mainEmoji = '🌡️';
      }
      const iconElem = document.getElementById("icon");
      if (iconElem.tagName === 'IMG') {
        // Replace <img> with <span> for emoji
        const span = document.createElement('span');
        span.id = 'icon';
        span.style.fontSize = '64px';
        span.textContent = mainEmoji;
        iconElem.replaceWith(span);
      } else {
        iconElem.textContent = mainEmoji;
      }

      // Set background video
      updateBackgroundBasedOnWeather(condition);

      // Fetch timezone data
      fetch(`https://api.timezonedb.com/v2.1/get-time-zone?key=${tzdbApiKey}&format=json&by=position&lat=${data.coord.lat}&lng=${data.coord.lon}`)
        .then(res => res.json())
        .then(tzData => {
          startCityClock(tzData.zoneName, tzData.gmtOffset, data);
        })
        .catch(err => {
          console.error("Timezone error:", err);
        });

    // Fetch and display 24hr forecast
    fetchForecast(data.coord.lat, data.coord.lon);
    })
    .catch(err => {
      alert("Weather fetch failed: " + err.message);
    });
}
// Fetch 24hr (3-hour interval) forecast and display
function fetchForecast(lat, lon) {
  const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${weatherApiKey}&units=metric`;
  fetch(forecastUrl)
    .then(res => res.json())
    .then(data => {
      const forecastDiv = document.getElementById("hourlyForecast");
      forecastDiv.innerHTML = "";
      if (!data.list || data.list.length === 0) {
        forecastDiv.innerHTML = "<em>No forecast data available.</em>";
        return;
      }
      // Show next 10 intervals (3hr x 10 = 30hr)
      const next10 = data.list.slice(0, 10);
      next10.forEach((item, idx) => {
        const dt = new Date(item.dt * 1000);
        const dateStr = dt.toLocaleDateString([], { weekday: 'short', day: '2-digit', month: 'short' });
        const hour = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const temp = Math.round(item.main.temp);
        const icon = item.weather[0].icon;
        const desc = item.weather[0].main;
        const humidity = item.main.humidity;
        const wind = item.wind.speed;
        // Temperature symbol
        let tempSymbol = '';
        if (temp < 15) tempSymbol = '❄️';
        else if (temp > 35) tempSymbol = '🔥';
        else tempSymbol = '🌤️';
        // Weather description emoji
        let descEmoji = '';
        switch (desc.toLowerCase()) {
          case 'clear': descEmoji = '☀️'; break;
          case 'clouds': descEmoji = '☁️'; break;
          case 'rain': descEmoji = '🌧️'; break;
          case 'drizzle': descEmoji = '🌦️'; break;
          case 'thunderstorm': descEmoji = '⛈️'; break;
          case 'snow': descEmoji = '❄️'; break;
          case 'mist': descEmoji = '🌫️'; break;
          case 'fog': descEmoji = '🌫️'; break;
          case 'haze': descEmoji = '🌫️'; break;
          default: descEmoji = '🌡️';
        }
        // Highlight first card
        const highlight = idx === 0 ? ' forecast-item-highlight' : '';
        const html = `
          <div class="forecast-item${highlight}">
            <div style="font-size:13px;font-weight:bold;">${dateStr}</div>
            <div>${hour}</div>
            <img src="https://openweathermap.org/img/wn/${icon}.png" alt="${desc}">
            <div>${tempSymbol} ${temp}&deg;C</div>
            <div style="font-size:12px;">${descEmoji} ${desc}</div>
            <div class="forecast-badges">
              <span class="badge badge-humidity" title="Humidity">💧 ${humidity}%</span>
              <span class="badge badge-wind" title="Wind Speed">💨 ${wind} m/s</span>
            </div>
          </div>
        `;
        forecastDiv.innerHTML += html;
      });
    })
    .catch(err => {
      document.getElementById("hourlyForecast").innerHTML = "<em>Forecast unavailable.</em>";
      console.error("Forecast error:", err);
    });
}
// ...existing code...

function startCityClock(zoneName, gmtOffset, data) {
  clearInterval(cityClockInterval);
  const offsetHours = gmtOffset / 3600;
  const cityName = data.name;
  const countryName = data.sys.country;
  const regionName = data.name;
  const fullLocation = `${cityName}, ${regionName} ${countryName}`.trim();

  function updateCityClock() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString("en-IN", {
      timeZone: zoneName,
      hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true
    });

    const dateStr = now.toLocaleDateString("en-IN", {
      timeZone: zoneName,
      weekday: "long", year: "numeric", month: "long", day: "numeric"
    });

    document.getElementById("localTime").innerHTML = `
      <strong>Current time in ${fullLocation} (UTC${offsetHours >= 0 ? "+" : ""}${offsetHours})</strong><br>
      ${timeStr}<br>
      ${dateStr}
    `;
  }

  updateCityClock();
  cityClockInterval = setInterval(updateCityClock, 1000);
}

function resetWeather() {
  document.getElementById("cityInput").value = "";
  document.getElementById("weatherResult").classList.add("hidden");
  document.getElementById("hourlyForecast").innerHTML = "";
  clearInterval(cityClockInterval);
}

function toggleDarkMode() {
  document.body.classList.toggle("dark-mode");
}

function updateTime() {
  document.getElementById("timeDisplay").innerText = "🕒 " + new Date().toLocaleString();
}

setInterval(updateTime, 1000);

const cityInput = document.getElementById("cityInput");
const citySuggestions = document.getElementById("citySuggestions");

// Trigger search on Enter key (desktop and mobile)
cityInput.addEventListener("keydown", function (e) {
  if (e.key === "Enter" || e.keyCode === 13) {
    e.preventDefault();
    getWeather();
  }
});

cityInput.addEventListener("input", function () {
  const query = cityInput.value.trim();
  if (query.length < 2) return;

  fetch(`https://${geoApiHost}/v1/geo/cities?namePrefix=${query}&limit=10`, {
    method: "GET",
    headers: {
      "X-RapidAPI-Key": geoApiKey,
      "X-RapidAPI-Host": geoApiHost
    }
  })
    .then(res => res.json())
    .then(data => {
      citySuggestions.innerHTML = "";
      if (!data.data || data.data.length === 0) {
        return;
      }
      data.data.forEach(city => {
        const option = document.createElement("option");
        option.value = city.city;
        citySuggestions.appendChild(option);
      });
    })
    .catch(err => {
      console.error("City suggestion error:", err);
    });
});
function updateBackgroundBasedOnWeather(condition) {
  const video = document.getElementById("bgVideo");
  let videoSrc;

  switch (condition) {
    case "clear":
      videoSrc = "https://dm0qx8t0i9gc9.cloudfront.net/watermarks/video/rF_6xyohit7ckhp9/videoblocks-cloud-sky-time-lapse-cloud-moving-and-sun-light-4k-resolution-video_s5xkkk5n7__8ac2a8edeef42f75c9434c96fdd677e8__P360.mp4";
      break;
    case "clouds":
      videoSrc = "https://dm0qx8t0i9gc9.cloudfront.net/watermarks/video/r9E0QYuleiv25jmq9/videoblocks-the-scenic-stormy-clouds-stream-in-the-sky-time-lapse_bezxa1p68__6b820e25cae415ded2220f1d1d46a165__P360.mp4";
      break;
    case "rain":
      videoSrc = "https://dm0qx8t0i9gc9.cloudfront.net/watermarks/video/H67jTiuivkibc7mqx/videoblocks-a173c_st_aqlhnc__6a230d199bb9bcb170ef7e9cc7a35cdc__P360.mp4";
      break;
      
    case "drizzle":
      videoSrc = "https://dm0qx8t0i9gc9.cloudfront.net/watermarks/video/ruefkyi-il8e5psf4/videoblocks-rain-3_1_hrzm4n1as__69dd354b69c9a1990faef8a599e6c278__P360.mp4";
      break;
    case "thunderstorm":
      videoSrc = "https://dm0qx8t0i9gc9.cloudfront.net/watermarks/video/GTYSdDW/thunderstorm-and-dark-clouds-animation_ejd-iaz5g__1f1b022e70def96e5eee43497b25bcc4__P360.mp4";
      break;
    case "snow":
      videoSrc = "https://dm0qx8t0i9gc9.cloudfront.net/watermarks/video/V1xq1AADx/slow-motion-view-of-heavy-snow-fall-in-evergreen-forest_vyhxst3al__ebb581a2518274a9b86b8536dff81027__P360.mp4";

      break;
    case "fog":
      videoSrc = "https://dm0qx8t0i9gc9.cloudfront.net/watermarks/video/SE6H2xwPmjlia3kue/videoblocks-smoke-fog-and-rain-pass-through-forest-hills-time-lapse_sxsk91sph__d244147e5c8608cd4cb5c2bc06758c7e__P360.mp4";
      break;
    case "mist":
      videoSrc = "https://dm0qx8t0i9gc9.cloudfront.net/watermarks/video/SfgTbYmNJXjhkhi5b7/joel-tapernoux-b11-015-3udo7dsvu6__1743c92311729b39bf0beefcf10e442f__P360.mp4";
      break;
    case "haze":
      videoSrc = "https://cdn.coverr.co/videos/coverr-foggy-morning-7926/1080p.mp4";
      break;
    default:
      videoSrc = "https://dm0qx8t0i9gc9.cloudfront.net/watermarks/video/r9E0QYuleiv25jmq9/videoblocks-the-scenic-stormy-clouds-stream-in-the-sky-time-lapse_bezxa1p68__6b820e25cae415ded2220f1d1d46a165__P360.mp4";
      break;
  }

  if (video && videoSrc) {
    // Remove all <source> children
    while (video.firstChild) video.removeChild(video.firstChild);
    // Create and append a new <source> element
    const source = document.createElement('source');
    source.src = videoSrc;
    source.type = 'video/mp4';
    video.appendChild(source);
    video.load();
    video.play().catch(() => {});
  }
}

