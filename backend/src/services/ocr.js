const vision = require('@google-cloud/vision');
const path = require('path');

const client = new vision.ImageAnnotatorClient({
  keyFilename: path.join(__dirname, '../../credentials.json')
});

async function recognizeText(imagePath) {
  const [result] = await client.textDetection(imagePath);
  return result.textAnnotations.map(a => a.description);
}

module.exports = { recognizeText };
