import express from 'express';
import fetch from 'node-fetch';
import { Client } from '@gradio/client';

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Hello World!');
});

// Helper function to add timeout to fetch requests
async function fetchWithTimeout(url, options, timeout = 5000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
}

app.post('/process-images', async (req, res) => {
  try {
    const { amazon_img_url, model_img_url } = req.body;

    // Fetch images with timeout
    const response0 = await fetchWithTimeout(amazon_img_url, {}, 5000); // 5 seconds timeout
    const exampleImage = await response0.arrayBuffer();

    const response1 = await fetchWithTimeout(model_img_url, {}, 5000); // 5 seconds timeout
    const exampleImage_a = await response1.arrayBuffer();

    // Convert ArrayBuffer to Buffer
    const bufferImage = Buffer.from(exampleImage);
    const bufferImage_a = Buffer.from(exampleImage_a);

    // Connect to Gradio client
    const client = await Client.connect("Kwai-Kolors/Kolors-Virtual-Try-On");
    const result = await client.predict("/tryon", { 
      person_img: bufferImage,
      garment_img: bufferImage_a,
      seed: 0,
      randomize_seed: true,
    });

    // Return result
    res.json(result.data);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('An error occurred');
  }
});

app.listen(3000, () => {
  console.log('Backend service is running on port 3000');
});

export default app;
