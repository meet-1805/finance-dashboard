const { chromium } = require('playwright');
const express = require('express');
const path = require('path');

const app = express();
app.use(express.static(path.join(__dirname, 'dist/client/browser')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/client/browser/index.html'));
});

const server = app.listen(4200, async () => {
  console.log('Server started on 4200');
  
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER:', msg.text()));
  
  // Mock backend API to return success for session
  await page.route('**/api/imports/session/*', async route => {
    const json = {
      sessionId: '123',
      transactions: [
        { _id: '1', amount: 100, type: 'Income', duplicate: false, approved: true }
      ]
    };
    await route.fulfill({ json });
  });

  await page.goto('http://localhost:4200/import/confirm/123');
  
  await page.waitForTimeout(3000);
  
  await browser.close();
  server.close();
});
