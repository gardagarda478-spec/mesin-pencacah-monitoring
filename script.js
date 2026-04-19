document.addEventListener("DOMContentLoaded", function() {
    
    // --- 1. NAVIGASI TAB ---
    const menuItems = document.querySelectorAll('.menu-item');
    const tabContents = document.querySelectorAll('.tab-content');
    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            menuItems.forEach(m => m.classList.remove('active'));
            tabContents.forEach(t => t.classList.remove('active'));
            item.classList.add('active');
            document.getElementById(item.getAttribute('data-target')).classList.add('active');
        });
    });

    // --- 2. WAKTU & TANGGAL REAL-TIME ---
    function updateDateTime() {
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
        const el = document.getElementById('live-datetime');
        if (el) el.innerHTML = `<i class="far fa-clock"></i> ${now.toLocaleDateString('id-ID', options).replace(',', ' -')}`;
    }
    updateDateTime();
    setInterval(updateDateTime, 1000);

    // --- 3. CONFIG GRAFIK ---
    const chartOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } } } };
    const createChart = (id, color, label) => new Chart(document.getElementById(id), { type: 'line', data: { labels: [], datasets: [{ label, data: [], borderColor: color, backgroundColor: color + '1A', fill: true, tension: 0.4 }] }, options: chartOpts });
    
    const cTeg = createChart('chartTegangan', '#0ab39c', 'V');
    const cArus = createChart('chartArus', '#e67e22', 'A');
    const cDaya = createChart('chartDaya', '#10B981', 'W');
    const cSuhu = createChart('chartSuhu', '#f06548', '°C');
    const cRpm = createChart('chartRpm', '#4b38b3', 'RPM');

    // --- 4. FIREBASE & DATA PERSISTENCE ---
    const firebaseConfig = {
        apiKey: "AIzaSyAcX08fd30zKGfxeW_ghomAS-ZWRP7R3JU",
        authDomain: "smart-chopper-a3f98.firebaseapp.com",
        databaseURL: "https://smart-chopper-a3f98-default-rtdb.asia-southeast1.firebasedatabase.app",
        projectId: "smart-chopper-a3f98",
        storageBucket: "smart-chopper-a3f98.firebasestorage.app",
        messagingSenderId: "657402726135",
        appId: "1:657402726135:web:2bf1ab083add1efb5bb5f2"
    };

    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    const dbRef = firebase.database().ref('PencacahRumput');

    // Load Data dari Local Storage
    let historyData = JSON.parse(localStorage.getItem('riwayatPencacah')) || [];
    let totalEnergiWh = parseFloat(localStorage.getItem('lastKonsumsi')) || 0;
    let lastLogTime = 0;
    const LOG_INTERVAL = 60000; // 1 Menit

    function renderTable() {
        const tbody = document.getElementById('history-tbody');
        if (!tbody) return;
        tbody.innerHTML = historyData.map(row => `
            <tr>
                <td>${row.tanggal}</td>
                <td>${row.waktu}</td>
                <td>${row.teg} V</td>
                <td>${row.arus} A</td>
                <td>${row.daya} W</td>
                <td>${row.suhu} °C</td>
                <td style="color:#f1c40f; font-weight:bold">${row.konsumsi} Wh</td>
                <td class="${row.status === 'AMAN' ? 'status-on' : 'status-off'}">${row.status}</td>
            </tr>
        `).join('');
    }
    renderTable();

    let waktuUpdateWh = Date.now();

    dbRef.on('value', snap => {
        const data = snap.val();
        if (!data) return;

        document.getElementById('status-koneksi').innerHTML = "<i class='fas fa-wifi text-success'></i> Terhubung ke ESP32";
        
        const teg = parseFloat(data.tegangan || 0);
        const arus = parseFloat(data.arus || 0);
        const suhu = parseFloat(data.suhu || 0);
        const rpm = data.rpm || 0;
        const daya = teg * arus;

        // Update Dashboard
        document.getElementById('val-tegangan').innerText = teg.toFixed(1);
        document.getElementById('val-arus').innerText = arus.toFixed(2);
        document.getElementById('val-daya').innerText = daya.toFixed(2);
        document.getElementById('val-suhu').innerText = suhu.toFixed(1);
        document.getElementById('val-rpm').innerText = rpm;

        // Proteksi Tab
        document.getElementById('prot-val-tegangan').innerText = teg.toFixed(1);
        document.getElementById('prot-val-arus').innerText = arus.toFixed(2);
        document.getElementById('prot-val-suhu').innerText = suhu.toFixed(1);

        // Status Motor & Konsumsi
        const now = Date.now();
        totalEnergiWh += (daya * (now - waktuUpdateWh) / 3600000);
        waktuUpdateWh = now;
        localStorage.setItem('lastKonsumsi', totalEnergiWh);
        document.getElementById('val-konsumsi').innerText = totalEnergiWh.toFixed(2);
        
        const mStatus = document.getElementById('val-motor-status');
        mStatus.innerText = arus > 0.2 ? "ON" : "OFF";
        mStatus.className = arus > 0.2 ? "status-on" : "status-off";

        // Logic Status Utama
        const sRelay = document.getElementById('status-relay');
        const isSafe = (data.status_relay || "AMAN").toUpperCase() === "AMAN";
        sRelay.className = isSafe ? "badge active-badge" : "badge danger-badge";
        sRelay.innerHTML = isSafe ? "<i class='fas fa-check-circle'></i> Mesin Siap & Aman" : "<i class='fas fa-lock'></i> Terkunci (Cut-Off)";

        // Update Grafik
        const timeStr = new Date().toLocaleTimeString('id-ID', { hour12: false });
        [cTeg, cArus, cDaya, cSuhu, cRpm].forEach((c, i) => {
            const val = [teg, arus, daya, suhu, rpm][i];
            c.data.labels.push(timeStr);
            c.data.datasets[0].data.push(val);
            if(c.data.labels.length > 15) { c.data.labels.shift(); c.data.datasets[0].data.shift(); }
            c.update();
        });

        // --- LOGIKA RIWAYAT DATA (1 MENIT) ---
        if (now - lastLogTime >= LOG_INTERVAL) {
            const dateStr = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
            historyData.unshift({
                tanggal: dateStr,
                waktu: timeStr,
                teg: teg.toFixed(1),
                arus: arus.toFixed(2),
                daya: daya.toFixed(2),
                suhu: suhu.toFixed(1),
                rpm: rpm,
                konsumsi: totalEnergiWh.toFixed(2),
                status: isSafe ? "AMAN" : "BAHAYA"
            });
            if (historyData.length > 100) historyData.pop();
            localStorage.setItem('riwayatPencacah', JSON.stringify(historyData));
            renderTable();
            lastLogTime = now;
        }
    });

    // --- PDF DOWNLOAD ---
    document.getElementById('btn-download-pdf').addEventListener('click', () => {
        const doc = new jspdf.jsPDF('l', 'mm', 'a4');
        doc.text("Laporan Riwayat Data - Bhakti Farm", 14, 15);
        doc.autoTable({ html: '#history-table', startY: 25, theme: 'grid', headStyles: { fillColor: [10, 179, 156] } });
        doc.save(`Laporan_${Date.now()}.pdf`);
    });
});