require('dotenv').config();
const express = require('express');
const puppeteer = require('puppeteer');
const { createClient } = require('pexels');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 3000;

const client = createClient(process.env.PEXELS_API_KEY);

async function getRandomImageUrl() {
    try {
        const query = 'nature';
        const { photos } = await client.photos.search({ query, per_page: 1, page: Math.floor(Math.random() * 1000 + 1) });
        if (photos.length > 0) {
            console.log("Fetched image URL:", photos[0].src.original);
            return photos[0].src.original;
        } else {
            console.log("No photos returned from Pexels.");
            return 'https://example.com/default-background.jpg';
        }
    } catch (error) {
        console.error('Failed to fetch image from Pexels:', error);
        return 'https://example.com/default-background.jpg';
    }
}

app.get('/generate-pdf', async (req, res) => {
    const imageUrl = await getRandomImageUrl();
    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body, html {
                    margin: 0;
                    padding: 0;
                    width: 100%;
                    height: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover; /* Cover the entire page */
                }
                .content {
                    position: absolute;
                    font-size: 24px;
                    color: white;
                    background-color: rgba(255, 0, 0, 0.5);
                }
            </style>
        </head>
        <body>
            <img src="${imageUrl}" alt="Background Image">
            <div class="content">Hello World</div>
        </body>
        </html>
    `;

    const tempHtmlPath = path.join(__dirname, 'temp.html');
    fs.writeFileSync(tempHtmlPath, htmlContent);

    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--enable-features=NetworkService']
    });
    const page = await browser.newPage();
    await page.goto(`file://${tempHtmlPath}`, { waitUntil: 'networkidle0' });

    const pdf = await page.pdf({ format: 'A4' });
    await browser.close();
    fs.unlinkSync(tempHtmlPath); // Clean up the temporary file

    res.contentType('application/pdf');
    res.send(pdf);
});

app.listen(port, () => {
    console.log(`PDF generator API running on http://localhost:${port}`);
});
