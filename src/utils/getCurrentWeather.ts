export const getCurrentWeather = async () => {
  const position = await new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject);
  });
  const { latitude, longitude } = position.coords;
  const res = await fetch(
    `http://localhost:3000/get-current-weather?lat=${latitude}&lon=${longitude}`
  );
  const card = await res.json();
  console.log("Weather card:", card);
  return card;
};
