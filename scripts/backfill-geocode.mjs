// One-off script: geocode any property missing location.lat/lng.
// Usage: node scripts/backfill-geocode.mjs
process.loadEnvFile(new URL("../.env", import.meta.url));

const mongoose = (await import("mongoose")).default;
// react-geocode's package.json exports map has a typo ("export" instead of
// "exports"), so bare-specifier resolution falls back to its CJS build under
// plain Node. Import the ESM build directly instead.
const { setDefaults, fromAddress } = await import(
  "../node_modules/react-geocode/dist/index.es.js"
);

setDefaults({
  key: process.env.GOOGLE_GEOCODING_API_KEY,
  language: "en",
  region: "us",
});

async function geocodeLocation({ street, city, state, zipcode }) {
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

await mongoose.connect(process.env.MONGODB_URI);

// Minimal schema mirroring models/Property.js — only the fields this
// script touches. Loaded ad hoc so this standalone script doesn't have
// to fight Next's module bundling to import the real model.
const Property = mongoose.model(
  "Property",
  new mongoose.Schema(
    {
      name: String,
      location: {
        street: String,
        city: String,
        state: String,
        zipcode: String,
        lat: Number,
        lng: Number,
      },
    },
    { strict: false },
  ),
);

const properties = await Property.find({
  $or: [{ "location.lat": { $exists: false } }, { "location.lat": null }],
});

console.log(`Found ${properties.length} propert${properties.length === 1 ? "y" : "ies"} without coordinates.`);

let updated = 0;
let failed = 0;

for (const property of properties) {
  const coords = await geocodeLocation(property.location);

  if (coords) {
    property.location.lat = coords.lat;
    property.location.lng = coords.lng;
    await property.save();
    updated++;
    console.log(`✓ ${property.name}`);
  } else {
    failed++;
    console.log(`✗ ${property.name} — could not geocode`);
  }
}

console.log(`Done. Updated: ${updated}, failed: ${failed}.`);

await mongoose.disconnect();
