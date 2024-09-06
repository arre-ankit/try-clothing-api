import express from 'express';
import axios from 'axios';
import cors from 'cors';
import { Client } from '@gradio/client';

const app = express();
app.use(express.json({ limit: '10mb' }));

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

// Utility function to fetch and return blob data from a URL
const fetchImageAsBlob = async (url) => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    return await response.blob();
  } catch (error) {
    console.error(`Error fetching image from ${url}:`, error);
    throw error;
  }
};

const extractUrl = (text) => {
  // Regular expression to match URLs
  const amazonUrlPattern = /(https:\/\/(amzn\.in|www\.amazon\.in)\/[^\s]+)/;
  const match = text.match(amazonUrlPattern);
  return match ? match[0] : null;
};

const getFullUrl = async (shortenedUrl) => {
  try {
    const response = await axios.get(shortenedUrl, {
      maxRedirects: 0,
      validateStatus: status => status >= 200 && status < 400
    });
    return response.headers.location;
  } catch (error) {
    if (error.response && error.response.headers.location) {
      return error.response.headers.location;
    } else {
      console.error('Error fetching the URL:', error.message);
      return null;
    }
  }
};


app.post('/process-images', async (req, res) => {
  try {
    let { amazon_img_url, model_img_url } = req.body;

    if (amazon_img_url) {
      const url = extractUrl(amazon_img_url);
      //console.log('Extracted Amazon URL:', url);
      if (url) {
        amazon_img_url = await getFullUrl(url);
        //console.log('Amazon URL:', amazon_img_url);
      }
    }

    // Fetch the Amazon page and extract the image URL with a timeout
    const amazonResponse = await axios.get(amazon_img_url, {
      timeout: 5000, // 5 seconds timeout
      headers: {
        // Include necessary headers
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; Pixel 3 XL Build/QQ1D.200205.002) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.138 Mobile Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.amazon.in',
      }
    });

    const htmlContent = amazonResponse.data;
    const imgPattern = /https:\/\/m\.media\-amazon\.com\/images\/[^"]+\.jpg/g;
    const imageUrls = htmlContent.match(imgPattern) || [];
    
    const pattern = /^https:\/\/m\.media-amazon\.com\/images\/I\/.+/;
    const amazonImageUrl = imageUrls.find(url => pattern.test(url)) || '';

    if (!amazonImageUrl) {
      return res.status(400).json({ error: "No valid Amazon image URL found" });
    }

    // Fetch images in parallel and handle potential errors
    const [exampleImage, exampleImage_a] = await Promise.all([
      fetchImageAsBlob(model_img_url),
      fetchImageAsBlob(amazonImageUrl)
    ]);

    const client = await Client.connect("Nymbo/Virtual-Try-On");

    const result = await client.predict("/tryon", [
      { "background": exampleImage, "layers": [], "composite": null }, 
      exampleImage_a,
      "Hello!!",
      true,
      true,
      25,
      25,
    ]).catch(error => {
      console.error("Prediction Error Details:", JSON.stringify(error, null, 2));
      throw new Error(`Prediction Error: ${error.message || JSON.stringify(error)}`);
    });

    res.json(result.data);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send(`An error occurred: ${error.message}`);
  }
});

app.listen(3005, () => {
    console.log('Backend service is running on port 3005');
});  

export default app;
