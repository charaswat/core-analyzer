// ── ลงทะเบียน Service Worker (PWA) ──
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(e => console.log('SW error:', e.message));
}

document.getElementById('opacity-ctrl').addEventListener('input', (e) => {
    document.getElementById('core-analyzer-box').style.background = `rgba(255, 255, 255, ${e.target.value / 100})`;
});

function recordLog(msg) {
    const log = document.getElementById('event-log');
    log.innerHTML = `> [${new Date().toLocaleTimeString()}] ${msg}<br>` + log.innerHTML;
}

async function exportBrandedReport() {
    recordLog("Generating Branded Report...");
    document.getElementById('snapshot-date').innerText = new Date().toLocaleString();
    
    // Capture map via Proxy to avoid CORS
    const mapCanvas = await html2canvas(document.getElementById('map-container'), { useCORS: true });
    const placeholder = document.getElementById('snapshot-body');
    placeholder.innerHTML = '';
    placeholder.appendChild(mapCanvas);
    
    const finalCanvas = await html2canvas(document.getElementById('branding-capture'));
    const link = document.createElement("a");
    link.download = `CoreAnalyzer_Branded_${Date.now()}.png`;
    link.href = finalCanvas.toDataURL();
    link.click();
    recordLog("Success: Report Downloaded.");
}

function manualScan() { recordLog("Manual Scan: Correlating 4 Layers..."); }
// ── วิธีที่ 1: ปุ่มกดส่งภาพไป Telegram ──
document.getElementById('captureBtn').addEventListener('click', async () => {
  const btn = document.getElementById('captureBtn');
  btn.textContent = '⏳';
  try {
    const res = await fetch('/capture');
    const data = await res.json();
    btn.textContent = data.status === 'success' ? '✅' : '❌';
  } catch (e) {
    btn.textContent = '❌';
  }
  setTimeout(() => btn.textContent = '📸', 3000);
});

// ── วิธีที่ 2: ส่งอัตโนมัติทุก 30 นาที (ทำงานเฉพาะตอนเปิด Dashboard ไว้) ──
setInterval(async () => {
  try {
    await fetch('/capture');
    console.log('📸 Auto capture sent');
  } catch (e) {
    console.log('Auto capture error:', e.message);
  }
}, 30 * 60 * 1000); // 30 นาที
