/**
 * cron-runner.js
 * Llama al endpoint /api/cron cada 1 minuto.
 * El endpoint /api/cron decide internamente qué productos checar según
 * su checkIntervalMinutes y lastCheckedAt almacenados en Firestore.
 */

const http  = require('http');
const https = require('https');

const BASE_URL    = process.env.APP_URL   || 'http://localhost:3000';
const CRON_SECRET = process.env.CRON_SECRET || '1ff5c627-2db3-4349-bc3b-55a03b68e725';
const POLL_INTERVAL_MS = 60 * 1000; // llamar cada 1 minuto

function get(url, headers = {}) {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { headers }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', (e) => resolve({ status: 0, body: e.message }));
    req.setTimeout(120000, () => { req.destroy(); resolve({ status: 0, body: 'timeout' }); });
  });
}

async function runCron() {
  const { status, body } = await get(
    `${BASE_URL}/api/cron`,
    { Authorization: `Bearer ${CRON_SECRET}` }
  );
  const ts = new Date().toISOString();
  console.log(`[${ts}] Cron → HTTP ${status}: ${body}`);
}

async function loop() {
  // Espera 15 s a que el servidor Next.js arranque
  console.log(`[${new Date().toISOString()}] cron-runner iniciado — esperando 15s...`);
  await new Promise(r => setTimeout(r, 15000));

  while (true) {
    await runCron();
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
  }
}

loop().catch(console.error);
