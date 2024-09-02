import express from 'express';
import { Client } from '@gradio/client';
import fetch from 'node-fetch';

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.post('/process-images', async (req, res) => {
  try {
    // Fetch images from URLs in the request body
    const { amazon_img_url, model_img_url } = req.body;
    
    const response0 = await fetch(amazon_img_url);
    const exampleImage = await response0.blob();

    const response1 = await fetch(model_img_url);
    const exampleImage_a = await response1.blob();

    // Connect to Gradio client
    const client = await Client.connect("Kwai-Kolors/Kolors-Virtual-Try-On");
    const result = await client.predict("/tryon", { 
      person_img: exampleImage,
      garment_img: exampleImage_a,
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
