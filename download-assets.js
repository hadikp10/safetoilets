const fs = require('fs');
const path = require('path');
const https = require('https');

const dir = path.join(__dirname, 'public', 'icons');
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

function download(url, filename) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(path.join(dir, filename));
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${url}: status code ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`Downloaded ${filename}`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(path.join(dir, filename), () => {});
      reject(err);
    });
  });
}

// Write a simple valid base64 PNG for 1x1 green pixel to act as placeholder PWA icons
// We can use a standard minimal valid PNG base64 string
const base64Png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='; // green 1x1 pixel PNG
const greenBuffer = Buffer.from(base64Png, 'base64');

fs.writeFileSync(path.join(dir, 'icon-192.png'), greenBuffer);
fs.writeFileSync(path.join(dir, 'icon-512.png'), greenBuffer);
fs.writeFileSync(path.join(dir, 'icon-512-maskable.png'), greenBuffer);
console.log('Created placeholder PWA icons');

const leafletAssets = [
  { url: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png', name: 'marker-default.png' },
  { url: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png', name: 'marker-default-2x.png' },
  { url: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png', name: 'marker-shadow.png' }
];

Promise.all(leafletAssets.map(asset => download(asset.url, asset.name)))
  .then(() => {
    console.log('All assets ready.');
  })
  .catch(err => {
    console.error('Error downloading assets:', err);
    process.exit(1);
  });
