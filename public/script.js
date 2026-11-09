// --- Core Analyzer Logic ---

const state = {
    lat: 13.9918,
    lon: 110.6035,
    zoom: 5,
    opacity: 20
};

// Elements
const opacityCtrl = document.getElementById('opacity-ctrl');
const opacityVal = document.getElementById('opacity-val');
const layers = document.querySelectorAll('.weather-layer');
const analyzerBox = document.getElementById('core-analyzer-box');
const eventLog = document.getElementById('event-log');

// 1. ฟังก์ชันควบคุมความโปร่งใส
function updateUIOpacity(value) {
    state.opacity = value;
    const decimal = value / 100;
    layers.forEach(l => { l.style.opacity = decimal; });
    if(analyzerBox) analyzerBox.style.background = `rgba(15, 15, 15, 0.8)`; 
    if(opacityVal) opacityVal.innerText = value + '%';
}

// 2. ระบบบันทึก Log
function recordLog(msg) {
    if(eventLog) {
        const time = new Date().toLocaleTimeString();
        eventLog.innerHTML = `<div><span style="color:#00ff00">[${time}]</span> ${msg}</div>` + eventLog.innerHTML;
    }
}

// 3. ปรับปรุงระบบ Broadcast ให้รองรับ Auto-Sync
function broadcastSync(sourceFrame = null) {
    const data = {
        type: 'MAP_SYNC',
        lat: state.lat,
        lon: state.lon,
        zoom: state.zoom,
        timestamp: Date.now()
    };

    // 1. ส่งให้เลเยอร์อากาศทั้ง 4
    layers.forEach(iframe => {
        if (iframe.contentWindow === sourceFrame) return; // ข้ามถ้าเป็นต้นทาง
        try {
            iframe.contentWindow.postMessage(data, '*');
        } catch (e) {}
    });

    // 2. ส่งให้ Base Map (windy-frame) ของหน้าหลักด้วย
    const baseMapFrame = document.getElementById('windy-frame');
    if (baseMapFrame && baseMapFrame.contentWindow !== sourceFrame) {
        try {
            baseMapFrame.contentWindow.postMessage(data, '*');
        } catch (e) {}
    }
}

// 5. การส่งออกภาพไป Telegram
async function exportBrandedReport() {
    recordLog("🚀 Preparing Telegram Report...");
    const dateStr = new Date().toLocaleString('th-TH');
    const branding = document.getElementById('branding-capture');
    try {
        const canvas = await html2canvas(branding, { scale: 2, backgroundColor: '#111', useCORS: true, logging: false });        
        canvas.toBlob(async (blob) => {
            const formData = new FormData();
            formData.append('photo', blob, 'report.png');
            formData.append('caption', `📡 AI ANALYZER REPORT\n⏰ ${dateStr}\n📍 Status: Cross-Domain Synced`);
            const response = await fetch('/capture', { method: 'POST', body: formData });
            if (response.ok) recordLog("✅ Success: Sent to Telegram");
        }, 'image/png');
    } catch (e) { recordLog("❌ Capture Failed: " + e.message); }
}

// 6. เปลี่ยนแผนที่ฐานและผูก Auto-Update
function changeBaseMap(type) {
    const frame = document.getElementById('windy-frame');
    const container = document.getElementById('map-container');
    container.style.background = 'none';
    
    switch(type) {
        case 'google-hybrid': frame.src = `https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}`; break;
        case 'google-terrain': frame.src = `https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}`; break;
        case 'canvas-dark': frame.style.display = 'none'; container.style.background = '#050505'; break;
        default:
            frame.style.display = 'block';
            frame.src = `https://embed.windy.com/embed2.html?lat=${state.lat}&lon=${state.lon}&zoom=${state.zoom}&overlay=wind`;
    }
}

function recenterAll() {
    state.lat = 13.9918; state.lon = 110.6035; state.zoom = 5;
    const frame = document.getElementById('windy-frame');
    if (frame) frame.src = `https://embed.windy.com/embed2.html?lat=${state.lat}&lon=${state.lon}&zoom=${state.zoom}&overlay=wind`;
	// สั่งให้เลเยอร์อากาศทั้ง 4 ย้ายตามทันที
	broadcastSync();
	recordLog("🏠 Recenter: Map reset to Home (13.7, 100.5)");
}

// --- Initialization & Auto-EventListeners ---
document.addEventListener('DOMContentLoaded', () => {
	// 1. Reference all elements 
	const exportBtn = document.getElementById('main-export-btn') || document.getElementById('btn-export'); 
	const syncBtn = document.getElementById('main-sync-btn') || document.getElementById('btn-scan'); 
	const recenterBtn = document.getElementById('main-recenter-btn'); 
	const mapSelect = document.getElementById('map-select'); 
	const opacityCtrl = document.getElementById('opacity-ctrl');
	// 2. Attach Event Listeners (with safety checks)
	if (exportBtn) exportBtn.addEventListener('click', exportBrandedReport);
	if (syncBtn) syncBtn.addEventListener('click', broadcastSync);
	if (recenterBtn) recenterBtn.addEventListener('click', recenterAll);

	if (mapSelect) {
		mapSelect.addEventListener('change', (e) => changeBaseMap(e.target.value));
	}

	if (opacityCtrl) {
		opacityCtrl.addEventListener('input', (e) => updateUIOpacity(e.target.value));
		// 3. Initial Setup
		updateUIOpacity(20);
		recordLog("System Initialized at 20% Opacity");
	}
}); 
// Initial Setup 
opacityCtrl.addEventListener('input', (e) => updateUIOpacity(e.target.value)); 
window.onload = () => { updateUIOpacity(20); recordLog("System Initialized at 20% Opacity"); };
};

function manualSync() { layers.forEach(iframe => { 
	// เปลี่ยน '*' เป็น URL ของ Worker จริง 
	const targetOrigin = new URL(iframe.src).origin; 
	iframe.contentWindow.postMessage({ type: 'MAP_SYNC', lat: state.lat, lon: state.lon, zoom: state.zoom }, targetOrigin); }); 
}	

// Initial Setup
window.onload = () => {
    recordLog("System Online");
};
window.addEventListener('message', (event) => {
    // รับสัญญาณการขยับจากหน้าใดหน้าหนึ่ง (Layer หรือ Base Map)
    if (event.data.type === 'LAYER_MOVE' || event.data.type === 'MAP_SYNC_REQ') {
        const { lat, lon, zoom } = event.data;
        
        // อัปเดตพิกัดกลาง
        state.lat = lat;
        state.lon = lon;
        state.zoom = zoom;

        // กระจายพิกัดไปให้ "ทุกส่วน" ที่เหลือ
        broadcastSync(event.source);
    }
});
