import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";
import { SignJWT, importPKCS8 } from "jose";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
  })
);

const privateKey = process.env.PRIVATE_KEY;

const generateJWT = async () => {
  const privateKeyObj = await importPKCS8(privateKey, "EdDSA");
  const iat = Math.floor(Date.now() / 1000) - 30;
  const exp = iat + 900;
  const payload = { sub: process.env.sub, iat, exp };
  const header = { alg: "EdDSA", kid: process.env.kid };
  const token = await new SignJWT(payload)
    .setProtectedHeader(header)
    .sign(privateKeyObj);
  return token;
};

app.get("/get-current-weather", async (req, res) => {
  const token = await generateJWT();
  let { lat, lon } = req.query;
  if (!lat || !lon) {
    return res
      .status(400)
      .json({ error: "Latitude and longitude are required" });
  }
  lat = Number(lat).toFixed(2);
  lon = Number(lon).toFixed(2);
  try {
    const geoRes = await fetch(
      `https://${process.env.API_HOST}/geo/v2/city/lookup?location=${lon},${lat}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!geoRes.ok) {
      throw new Error("Failed to fetch weather data");
    }
    const geoData = await geoRes.json();
    const location = geoData.location[0].id;
    if (!location) throw new Error("Location not found");
    const weatherRes = await fetch(
      `https://${process.env.API_HOST}/v7/weather/3d?location=${location}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const weatherData = await weatherRes.json();
    const forecast = weatherData.daily?.[0];
    if (!forecast) throw new Error("Weather data not found");
    const city = geoData.location[0].adm1;
    const date = forecast.fxDate;
    const card = {
      title: `${city} · ${date}天气`,
      description: `☀️ ${forecast.textDay}，🌙 ${forecast.textNight}\n气温：${forecast.tempMin}°C ~ ${forecast.tempMax}°C`,
      picUrl: `https://icons.qweather.com/assets/icons/${forecast.iconDay}.svg`,
      url: weatherData.fxLink,
    };
    res.json(card);
  } catch (error) {
    console.error("Error fetching weather data:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`Server is running on port ${process.env.PORT || 3000}`);
});
