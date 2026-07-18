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

    // --- 3. CONFIG GRAFIK (DENGAN OPTIMASI SUMBUw WAKTU 24 JAM) ---
    const chartOpts = { 
        responsive: true, 
        maintainAspectRatio: false, 
        plugins: { 
            legend: { display: false } 
        }, 
        scales: { 
            x: { 
                grid: { display: false },
                ticks: {
                    maxTicksLimit: 12, // Membatasi label jam yang tampil (maksimal 12 titik) agar tidak menumpuk saat menampilkan 24 jam
                    maxRotation: 0,
                    minRotation: 0
                }
            } 
        } 
    };
    
    const createChart = (id, color, label) => new Chart(document.getElementById(id), { 
        type: 'line', 
        data: { 
            labels: [], 
            datasets: [{ 
                label, 
                data: [], 
                borderColor: color, 
                backgroundColor: color + '1A', 
                fill: true, 
                tension: 0.4,
                pointRadius: 2, // Ukuran titik diperkecil agar rapi saat data padat
                pointHoverRadius: 5
            }] 
        }, 
        options: chartOpts 
    });
    
    const cTeg = createChart('chartTegangan', '#0ab39c', 'V');
    const cArus = createChart('chartArus', '#e67e22', 'A');
    const cDaya = createChart('chartDaya', '#10B981', 'W');
    const cSuhu = createChart('chartSuhu', '#f06548', '°C');
    const cRpm = createChart('chartRpm', '#4b38b3', 'RPM');

    // --- 4. SETUP FIREBASE ---
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

    // --- 5. TIMER WATCHDOG (DETEKSI ESP32 MATI) ---
    let watchdogTimer = null;

    function setOfflineState() {
        document.getElementById('status-koneksi').innerHTML = "<i class='fas fa-exclamation-triangle text-danger'></i> ESP32 Terputus / Mati";
        
        document.getElementById('val-tegangan').innerText = "0.0";
        document.getElementById('val-arus').innerText = "0.00";
        document.getElementById('val-daya').innerText = "0.00";
        document.getElementById('val-suhu').innerText = "0.0";
        document.getElementById('val-rpm').innerText = "0";
        
        const valBaterai = document.getElementById('nilai-baterai');
        if (valBaterai) {
            valBaterai.innerText = "0";
            valBaterai.style.color = "var(--text-muted)";
        }
        
        const mStatus = document.getElementById('val-motor-status');
        if (mStatus) { mStatus.innerText = "OFF"; mStatus.className = "status-off"; }

        const sRelay = document.getElementById('status-relay');
        if (sRelay) {
            sRelay.className = "badge danger-badge";
            sRelay.innerHTML = "<i class='fas fa-power-off'></i> Mesin Offline";
        }

        const pTeg = document.getElementById('prot-val-tegangan'); if(pTeg) pTeg.innerText = "0.0";
        const pArus = document.getElementById('prot-val-arus'); if(pArus) pArus.innerText = "0.00";
        const pSuhu = document.getElementById('prot-val-suhu'); if(pSuhu) pSuhu.innerText = "0.0";

        const sUiTeg = document.getElementById('stat-ui-tegangan'); if(sUiTeg) { sUiTeg.className = "prot-badge"; sUiTeg.innerHTML = "Menunggu Koneksi..."; }
        const sUiArus = document.getElementById('stat-ui-arus'); if(sUiArus) { sUiArus.className = "prot-badge"; sUiArus.innerHTML = "Menunggu Koneksi..."; }
        const sUiSuhu = document.getElementById('stat-ui-suhu'); if(sUiSuhu) { sUiSuhu.className = "prot-badge"; sUiSuhu.innerHTML = "Menunggu Koneksi..."; }
    }
    
    setOfflineState();

    // --- 6. MENGAMBIL TABEL RIWAYAT & PLOT GRAFIK 24 JAM BERDASARKAN FOLDER TANGGAL ---
    const inputTanggal = document.getElementById('filter-tanggal');
    let currentLogListener = null; 
    let currentLogRef = null;

    // Set default kalender ke hari ini (Format YYYY-MM-DD)
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;
    
    if (inputTanggal) {
        inputTanggal.value = todayStr; // Tampilkan tanggal hari ini di kotak input
        
        // Memicu pencarian ulang jika user merubah tanggal kalender
        inputTanggal.addEventListener('change', (e) => {
            loadRiwayatData(e.target.value);
        });
    }

    function loadRiwayatData(tanggalDipilih) {
        // Matikan pendengar database lama agar tidak bentrok
        if (currentLogRef && currentLogListener) {
            currentLogRef.off('value', currentLogListener);
        }

        const tbody = document.getElementById('history-tbody');
        if (!tbody) return;

        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 20px; color: #6c757d;">Mencari data pada tanggal ${tanggalDipilih}...</td></tr>`;

        // Menunjuk ke lokasi folder harian Firebase (TANPA BATAS BARIS LIMIT)
        currentLogRef = firebase.database().ref(`PencacahRumput/Riwayat/${tanggalDipilih}`);
        
        currentLogListener = currentLogRef.on('value', (snapshot) => {
            let logs = [];
            
            // Array untuk menampung riwayat data grafik 24 jam
            let chartLabels = [];
            let chartDataTeg = [];
            let chartDataArus = [];
            let chartDataDaya = [];
            let chartDataSuhu = [];
            let chartDataRpm = [];

            snapshot.forEach((child) => {
                let row = child.val();
                if (row && row.tanggal && row.waktu && row.tanggal !== "-" && row.tanggal !== "N/A") {
                    // 1. Data untuk Tabel (diurutkan terbaru di atas / reverse)
                    logs.unshift(row); 
                    
                    // 2. Data untuk Grafik (diurutkan kronologis normal: pagi/00.00 ke malam)
                    chartLabels.push(row.waktu);
                    chartDataTeg.push(parseFloat(row.teg || 0));
                    chartDataArus.push(parseFloat(row.arus || 0));
                    chartDataDaya.push(parseFloat(row.daya || 0));
                    chartDataSuhu.push(parseFloat(row.suhu || 0));
                    chartDataRpm.push(parseInt(row.rpm || 0));
                }
            });

            // --- PLOT KE GRAFIK CHART.JS (MEMUAT RIWAYAT 24 JAM SEHARIAN PENUH) ---
            cTeg.data.labels = chartLabels;
            cTeg.data.datasets[0].data = chartDataTeg;
            cTeg.update();

            cArus.data.labels = chartLabels;
            cArus.data.datasets[0].data = chartDataArus;
            cArus.update();

            cDaya.data.labels = chartLabels;
            cDaya.data.datasets[0].data = chartDataDaya;
            cDaya.update();

            cSuhu.data.labels = chartLabels;
            cSuhu.data.datasets[0].data = chartDataSuhu;
            cSuhu.update();

            cRpm.data.labels = chartLabels;
            cRpm.data.datasets[0].data = chartDataRpm;
            cRpm.update();
            // ----------------------------------------------------------------------

            // Jika folder tanggal belum dibuat atau kosong
            if (logs.length === 0) {
                tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 20px; color: #dc3545; font-weight: bold;"><i class="fas fa-folder-open"></i> Tidak ada data terekam pada tanggal ${tanggalDipilih}.</td></tr>`;
                return;
            }

            // Render semua data riwayat harian ke tabel
            tbody.innerHTML = logs.map(row => `
                <tr>
                    <td>${row.tanggal}</td>
                    <td>${row.waktu}</td>
                    <td>${row.teg || '0.0'} V</td>
                    <td>${row.arus || '0.00'} A</td>
                    <td>${row.daya || '0.00'} W</td>
                    <td>${row.suhu || '0.0'} °C</td>
                    <td style="color:#f1c40f; font-weight:bold">${row.konsumsi || '0.00'} Wh</td>
                    <td class="${(row.status || '').includes('AMAN') ? 'status-on' : 'status-off'}">${row.status || '-'}</td>
                </tr>
            `).join('');
        });
    }

    // Panggil otomatis riwayat hari ini saat web pertama kali dibuka
    loadRiwayatData(todayStr);

    // --- 7. MENGAMBIL DATA REAL-TIME DARI FIREBASE (TELEMETRI LIVE) ---
    dbRef.on('value', snap => {
        const data = snap.val();
        if (!data) return;

        clearTimeout(watchdogTimer);
        watchdogTimer = setTimeout(setOfflineState, 15000); 

        document.getElementById('status-koneksi').innerHTML = "<i class='fas fa-wifi text-success'></i> Terhubung ke Alat";
        
        const teg = parseFloat(data.tegangan || 0);
        const arus = parseFloat(data.arus || 0);
        const suhu = parseFloat(data.suhu || 0);
        const rpm = data.rpm || 0;
        const daya = parseFloat(data.daya || 0);
        
        const bateraiPersen = parseFloat(data.baterai_persen || 0);
        const konsumsiGlobal = parseFloat(data.energi_hari_ini || 0);
        
        const elemenBaterai = document.getElementById('nilai-baterai');
        if (elemenBaterai) {
            elemenBaterai.innerText = Math.round(bateraiPersen);
            if (bateraiPersen > 50) {
                elemenBaterai.style.color = "#00b09b"; 
            } else if (bateraiPersen > 20) {
                elemenBaterai.style.color = "#FFA500"; 
            } else {
                elemenBaterai.style.color = "#FF0000"; 
            }
        }

        document.getElementById('val-konsumsi').innerText = konsumsiGlobal.toFixed(2);
        document.getElementById('val-tegangan').innerText = teg.toFixed(1);
        document.getElementById('val-arus').innerText = arus.toFixed(2);
        document.getElementById('val-daya').innerText = daya.toFixed(2);
        document.getElementById('val-suhu').innerText = suhu.toFixed(1);
        document.getElementById('val-rpm').innerText = rpm;
        
        const mStatus = document.getElementById('val-motor-status');
        if (mStatus) {
            mStatus.innerText = arus > 0.2 ? "ON" : "OFF";
            mStatus.className = arus > 0.2 ? "status-on" : "status-off";
        }

        const statusSistem = (data.status_relay || "AMAN").toUpperCase();
        const sRelay = document.getElementById('status-relay');
        if (sRelay) {
            const isSafe = statusSistem === "AMAN" || statusSistem === "STANDBY" || statusSistem === "SOFT-START";
            sRelay.className = isSafe ? "badge active-badge" : "badge danger-badge";
            sRelay.innerHTML = isSafe ? "<i class='fas fa-check-circle'></i> Mesin Siap & Aman" : `<i class='fas fa-lock'></i> ${statusSistem}`;
        }

        const protValTegangan = document.getElementById('prot-val-tegangan');
        const protValArus = document.getElementById('prot-val-arus');
        const protValSuhu = document.getElementById('prot-val-suhu');
        if(protValTegangan) protValTegangan.innerText = teg.toFixed(1);
        if(protValArus) protValArus.innerText = arus.toFixed(2);
        if(protValSuhu) protValSuhu.innerText = suhu.toFixed(1);

        const statUiTegangan = document.getElementById('stat-ui-tegangan');
        if(statUiTegangan){
            if (teg > 0 && teg <= 21.0) {
                statUiTegangan.className = "prot-badge bahaya"; statUiTegangan.innerHTML = "<i class='fas fa-exclamation-triangle'></i> BAHAYA (Drop)";
            } else {
                statUiTegangan.className = "prot-badge aman"; statUiTegangan.innerHTML = "<i class='fas fa-check-circle'></i> AMAN";
            }
        }

        const statUiArus = document.getElementById('stat-ui-arus');
        if(statUiArus){
            if (arus >= 20.0) {
                statUiArus.className = "prot-badge bahaya"; statUiArus.innerHTML = "<i class='fas fa-exclamation-triangle'></i> BAHAYA (Overcurrent)";
            } else {
                statUiArus.className = "prot-badge aman"; statUiArus.innerHTML = "<i class='fas fa-check-circle'></i> AMAN";
            }
        }

        const statUiSuhu = document.getElementById('stat-ui-suhu');
        if(statUiSuhu){
            if (statusSistem.includes("OVERHEAT")) {
                statUiSuhu.className = "prot-badge bahaya"; statUiSuhu.innerHTML = "<i class='fas fa-fire'></i> BAHAYA (Overheat)";
            } else if (statusSistem.includes("SENSOR ERROR")) {
                statUiSuhu.className = "prot-badge bahaya"; statUiSuhu.innerHTML = "<i class='fas fa-plug'></i> SENSOR ERROR";
            } else {
                statUiSuhu.className = "prot-badge aman"; statUiSuhu.innerHTML = "<i class='fas fa-check-circle'></i> AMAN";
            }
        }

        // ---> MODIFIKASI REAL-TIME UPDATE TANPA BATAS PEMOTONGAN KETERBATASAN WAKTU <---
        // Jika sedang melihat tanggal hari ini, tambahkan data live terbaru langsung ke ujung grafik
        const dateInputVal = document.getElementById('filter-tanggal') ? document.getElementById('filter-tanggal').value : '';
        if (dateInputVal === todayStr) {
            const timeStr = new Date().toLocaleTimeString('id-ID', { hour12: false });
            
            // Cek agar waktu tidak duplikat (mengindari plotting berulang pada detik yang sama di grafik)
            const lastLabel = cTeg.data.labels[cTeg.data.labels.length - 1];
            if (lastLabel !== timeStr) {
                [cTeg, cArus, cDaya, cSuhu, cRpm].forEach((c, i) => {
                    const val = [teg, arus, daya, suhu, rpm][i];
                    c.data.labels.push(timeStr);
                    c.data.datasets[0].data.push(val);
                    c.update();
                });
            }
        }
    });

    // --- 8. FUNGSI DOWNLOAD PDF ---
    const btnDownload = document.getElementById('btn-download-pdf');
    if (btnDownload) {
        btnDownload.addEventListener('click', () => {
            const dateStr = document.getElementById('filter-tanggal').value;
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('l', 'mm', 'a4');
            doc.setFontSize(18);
            doc.text(`Laporan Riwayat Data - Bhakti Farm (${dateStr})`, 14, 20);
            doc.autoTable({ html: '#history-table', startY: 30, theme: 'striped', headStyles: { fillColor: [10, 179, 156] } });
            doc.save(`Laporan_BhaktiFarm_${dateStr}.pdf`);
        });
    }
});