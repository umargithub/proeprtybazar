import { setDefaults, fromAddress } from "react-geocode";

setDefaults({
  key: process.env.GOOGLE_GEOCODING_API_KEY,
  language: "en",
  region: "us",
});

// Resolves a street/city/state/zipcode to { lat, lng }, or null if it can't be geocoded.
export async function geocodeLocation(location) {
  const { street, city, state, zipcode } = location;

  try {
    const res = await fromAddress(`${street} ${city} ${state} ${zipcode}`);

    if (res.results.length === 0) return null;

    const { lat, lng } = res.results[0].geometry.location;
    return { lat, lng };
  } catch (error) {
    console.error(error);
    return null;
  }
}
