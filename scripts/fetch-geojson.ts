import "dotenv/config";
import * as fs from "fs";
import * as path from "path";

/**
 * Fetch London boroughs GeoJSON from data.london.gov.uk
 * Saves to public/geo/london-boroughs.geojson
 */
async function main() {
  const outPath = path.join(process.cwd(), "public/geo/london-boroughs.geojson");

  // Try the statistical GIS boundary files API
  const urls = [
    "https://data.london.gov.uk/download/statistical-gis-boundary-files-london/9ba8c833-6370-4b11-abdc-314aa020d5e0/statistical-gis-boundaries-london.json",
    "https://raw.githubusercontent.com/martinjc/UK-GeoJSON/master/json/eng/topo_lad.json",
    // Fallback: generate a minimal GeoJSON with London borough names
  ];

  for (const url of urls) {
    try {
      console.log(`Fetching from ${url}...`);
      const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (!res.ok) {
        console.log(`  HTTP ${res.status}, trying next...`);
        continue;
      }
      const text = await res.text();
      const json = JSON.parse(text) as Record<string, unknown>;

      // Validate it's GeoJSON with features
      if (json.type === "FeatureCollection" && Array.isArray(json.features) && json.features.length >= 20) {
        fs.mkdirSync(path.dirname(outPath), { recursive: true });
        fs.writeFileSync(outPath, text);
        console.log(`Saved ${json.features.length} features to ${outPath}`);
        console.log(`File size: ${fs.statSync(outPath).size} bytes`);
        return;
      }
      console.log(`  Not valid GeoJSON FeatureCollection with ≥20 features, trying next...`);
    } catch (err) {
      console.log(`  Error: ${err instanceof Error ? err.message : String(err)}, trying next...`);
    }
  }

  // Fallback: create a minimal GeoJSON with London borough centroids as points
  console.log("Creating fallback GeoJSON with London borough centroids...");
  const boroughs = [
    { name: "Barking and Dagenham", lat: 51.5397, lng: 0.1313 },
    { name: "Barnet", lat: 51.6252, lng: -0.1517 },
    { name: "Bexley", lat: 51.4549, lng: 0.1505 },
    { name: "Brent", lat: 51.5588, lng: -0.2817 },
    { name: "Bromley", lat: 51.4039, lng: 0.0198 },
    { name: "Camden", lat: 51.5290, lng: -0.1255 },
    { name: "City of London", lat: 51.5155, lng: -0.0922 },
    { name: "Croydon", lat: 51.3762, lng: -0.0982 },
    { name: "Ealing", lat: 51.5130, lng: -0.3089 },
    { name: "Enfield", lat: 51.6538, lng: -0.0799 },
    { name: "Greenwich", lat: 51.4892, lng: 0.0648 },
    { name: "Hackney", lat: 51.5450, lng: -0.0553 },
    { name: "Hammersmith and Fulham", lat: 51.4927, lng: -0.2339 },
    { name: "Haringey", lat: 51.6000, lng: -0.1119 },
    { name: "Harrow", lat: 51.5898, lng: -0.3346 },
    { name: "Havering", lat: 51.5812, lng: 0.1837 },
    { name: "Hillingdon", lat: 51.5441, lng: -0.4760 },
    { name: "Hounslow", lat: 51.4746, lng: -0.3680 },
    { name: "Islington", lat: 51.5465, lng: -0.1058 },
    { name: "Kensington and Chelsea", lat: 51.5020, lng: -0.1947 },
    { name: "Kingston upon Thames", lat: 51.4085, lng: -0.3064 },
    { name: "Lambeth", lat: 51.4571, lng: -0.1231 },
    { name: "Lewisham", lat: 51.4452, lng: -0.0209 },
    { name: "Merton", lat: 51.4098, lng: -0.1949 },
    { name: "Newham", lat: 51.5077, lng: 0.0469 },
    { name: "Redbridge", lat: 51.5590, lng: 0.0741 },
    { name: "Richmond upon Thames", lat: 51.4613, lng: -0.3037 },
    { name: "Southwark", lat: 51.5035, lng: -0.0804 },
    { name: "Sutton", lat: 51.3618, lng: -0.1945 },
    { name: "Tower Hamlets", lat: 51.5099, lng: -0.0059 },
    { name: "Waltham Forest", lat: 51.5886, lng: -0.0117 },
    { name: "Wandsworth", lat: 51.4567, lng: -0.1910 },
    { name: "Westminster", lat: 51.4975, lng: -0.1357 },
  ];

  const geojson = {
    type: "FeatureCollection",
    features: boroughs.map((b) => ({
      type: "Feature",
      properties: { name: b.name },
      geometry: {
        type: "Point",
        coordinates: [b.lng, b.lat],
      },
    })),
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(geojson, null, 2));
  console.log(`Created fallback GeoJSON with ${boroughs.length} boroughs`);
  console.log(`File size: ${fs.statSync(outPath).size} bytes`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
