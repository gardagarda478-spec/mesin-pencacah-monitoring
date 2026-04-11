document.addEventListener("DOMContentLoaded", function() {
    
    // --- 1. LOGIKA NAVIGASI TAB (MENU KIRI) ---
    const menuItems = document.querySelectorAll('.menu-item');
    const tabContents = document.querySelectorAll('.tab-content');

    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            menuItems.forEach(m => m.classList.remove('active'));
            tabContents.forEach(t => t.classList.remove('active'));
            
            item.classList.add('active');
            const targetId = item.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');
        });
    });

    // --- 2. FUNGSI TANGGAL & WAKTU REAL-TIME ---
    function updateDateTime() {
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
        const formattedDateTime = now.toLocaleDateString('id-ID', options);
        const elDateTime = document.getElementById('live-datetime');
        if (elDateTime) elDateTime.innerHTML = `<i class="far fa-clock"></i> ${formattedDateTime.replace(',', ' -')}`;
    }
    updateDateTime();
    setInterval(updateDateTime, 1000);

    // --- 3. KONFIGURASI 5 GRAFIK CHART.JS ---
    const commonOptions = {
        responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, 
        scales: { y: { beginAtZero: false }, x: { grid: { display: false } } }
    };

    const chartTegangan = new Chart(document.getElementById('chartTegangan').getContext('2d'), { type: 'line', data: { labels: [], datasets: [{ label: 'Tegangan (V)', data: [], borderColor: '#0ab39c', backgroundColor: 'rgba(10, 179, 156, 0.1)', borderWidth: 2, tension: 0.4, fill: true }] }, options: commonOptions });
    const chartArus = new Chart(document.getElementById('chartArus').getContext('2d'), { type: 'line', data: { labels: [], datasets: [{ label: 'Arus (A)', data: [], borderColor: '#e67e22', backgroundColor: 'rgba(230, 126, 34, 0.1)', borderWidth: 2, tension: 0.4, fill: true }] }, options: commonOptions });
    const chartDaya = new Chart(document.getElementById('chartDaya').getContext('2d'), { type: 'line', data: { labels: [], datasets: [{ label: 'Daya (W)', data: [], borderColor: '#10B981', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderWidth: 2, tension: 0.4, fill: true }] }, options: commonOptions });
    const chartSuhu = new Chart(document.getElementById('chartSuhu').getContext('2d'), { type: 'line', data: { labels: [], datasets: [{ label: 'Suhu (°C)', data: [], borderColor: '#f06548', backgroundColor: 'rgba(240, 101, 72, 0.1)', borderWidth: 2, tension: 0.4, fill: true }] }, options: commonOptions });
    const chartRpm = new Chart(document.getElementById('chartRpm').getContext('2d'), { type: 'line', data: { labels: [], datasets: [{ label: 'RPM', data: [], borderColor: '#4b38b3', backgroundColor: 'rgba(75, 56, 179, 0.1)', borderWidth: 2, tension: 0.4, fill: true }] }, options: commonOptions });

    // --- 4. SETUP FIREBASE & VARIABEL ---
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
    const db = firebase.database();
    const dbRef = db.ref('PencacahRumput');

    // Variabel Simulasi Konsumsi Daya (Wh)
    let totalEnergiWh = 0;
    let waktuUpdateTerakhir = Date.now();

    // Elemen DOM
    const elTegangan = document.getElementById('val-tegangan');
    const elArus = document.getElementById('val-arus');
    const elDaya = document.getElementById('val-daya');
    const elSuhu = document.getElementById('val-suhu');
    const elRpm = document.getElementById('val-rpm');
    const elStatusKoneksi = document.getElementById('status-koneksi');
    const elStatusRelay = document.getElementById('status-relay');
    const elMotorStatus = document.getElementById('val-motor-status');
    const elKonsumsi = document.getElementById('val-konsumsi');

    const protValTegangan = document.getElementById('prot-val-tegangan');
    const protValArus = document.getElementById('prot-val-arus');
    const protValSuhu = document.getElementById('prot-val-suhu');
    const statUiTegangan = document.getElementById('stat-ui-tegangan');
    const statUiArus = document.getElementById('stat-ui-arus');
    const statUiSuhu = document.getElementById('stat-ui-suhu');

    // --- LISTENER UTAMA FIREBASE ---
    dbRef.on('value', (snapshot) => {
        const data = snapshot.val();
        
        if (data) {
            if(elStatusKoneksi) elStatusKoneksi.innerHTML = "<i class='fas fa-wifi text-success'></i> Terhubung ke ESP32";
            
            // Ekstrak & Kalkulasi Daya
            const valTeg = data.tegangan !== undefined ? parseFloat(data.tegangan) : 0;
            const valArus = data.arus !== undefined ? parseFloat(data.arus) : 0;
            const valSuhu = data.suhu !== undefined ? parseFloat(data.suhu) : 0;
            const valRpm = data.rpm !== undefined ? data.rpm : 0;
            const dayaBeban = valTeg * valArus; 
            
            // Logika Status Motor (ON jika arus > 0.2A)
            const statusMotor = valArus > 0.2 ? "ON" : "OFF";
            const motorColorClass = valArus > 0.2 ? "status-on" : "status-off";
            if(elMotorStatus) {
                elMotorStatus.innerText = statusMotor;
                elMotorStatus.className = motorColorClass;
            }

            // Logika Konsumsi Daya (Wh)
            const waktuSekarang = Date.now();
            const selisihWaktuJam = (waktuSekarang - waktuUpdateTerakhir) / 3600000; 
            waktuUpdateTerakhir = waktuSekarang;
            if (data.energi !== undefined) { totalEnergiWh = parseFloat(data.energi); } 
            else { totalEnergiWh += (dayaBeban * selisihWaktuJam); }
            if(elKonsumsi) elKonsumsi.innerText = totalEnergiWh.toFixed(2);

            // Update Angka di Tab 1
            if(elTegangan) elTegangan.innerText = valTeg.toFixed(1);
            if(elArus) elArus.innerText = valArus.toFixed(2);
            if(elDaya) elDaya.innerText = dayaBeban.toFixed(2);
            if(elSuhu) elSuhu.innerText = valSuhu.toFixed(1);
            if(elRpm) elRpm.innerText = valRpm;

            let statusSistem = data.status_relay || "AMAN";
            if(statusSistem.toUpperCase() === "AMAN") {
                if(elStatusRelay) { 
                    elStatusRelay.className = "badge active-badge"; 
                    elStatusRelay.innerHTML = "<i class='fas fa-check-circle'></i> Mesin Siap & Aman"; 
                }
            } else {
                if(elStatusRelay) { 
                    elStatusRelay.className = "badge danger-badge"; 
                    elStatusRelay.innerHTML = "<i class='fas fa-lock'></i> Terkunci (Cut-Off)"; 
                }
            }

            // Update Grafik Real-Time
            let timeNow = new Date().toLocaleTimeString('id-ID', { hour12: false, hour: "numeric", minute: "numeric", second: "numeric" });
            const charts = [chartTegangan, chartArus, chartDaya, chartSuhu, chartRpm];
            const dataKeys = [valTeg, valArus, dayaBeban, valSuhu, valRpm]; 

            charts.forEach((chart, index) => {
                chart.data.labels.push(timeNow);
                chart.data.datasets[0].data.push(dataKeys[index] || 0);
                if(chart.data.labels.length > 12) {
                    chart.data.labels.shift();
                    chart.data.datasets[0].data.shift();
                }
                chart.update();
            });

            // Update Tab 2 (Logika Proteksi)
            if(protValTegangan) protValTegangan.innerText = valTeg.toFixed(1);
            if(protValArus) protValArus.innerText = valArus.toFixed(2);
            if(protValSuhu) protValSuhu.innerText = valSuhu.toFixed(1);

            if(valTeg > 0 && valTeg < 21.0) {
                statUiTegangan.className = "prot-badge bahaya"; statUiTegangan.innerHTML = "<i class='fas fa-exclamation-triangle'></i> Baterai Drop";
            } else {
                statUiTegangan.className = "prot-badge aman"; statUiTegangan.innerHTML = "<i class='fas fa-check-circle'></i> AMAN";
            }

            if(valArus > 20.0) {
                statUiArus.className = "prot-badge bahaya"; statUiArus.innerHTML = "<i class='fas fa-exclamation-triangle'></i> Overcurrent";
            } else {
                statUiArus.className = "prot-badge aman"; statUiArus.innerHTML = "<i class='fas fa-check-circle'></i> AMAN";
            }

            if(valSuhu > 60.0) {
                statUiSuhu.className = "prot-badge bahaya"; statUiSuhu.innerHTML = "<i class='fas fa-fire'></i> Overheat";
            } else if(valSuhu === -127 || valSuhu < -10) {
                statUiSuhu.className = "prot-badge bahaya"; statUiSuhu.innerHTML = "<i class='fas fa-plug'></i> Sensor Error";
            } else {
                statUiSuhu.className = "prot-badge aman"; statUiSuhu.innerHTML = "<i class='fas fa-check-circle'></i> AMAN";
            }

            // Update Tab 3 (Tabel Riwayat Data)
            const tbody = document.getElementById('history-tbody');
            if (tbody) {
                const tr = document.createElement('tr');
                const relayColorClass = (statusSistem.toUpperCase() === "AMAN") ? "status-on" : "status-off";

                tr.innerHTML = `
                    <td>${timeNow}</td>
                    <td>${valTeg.toFixed(1)} V</td>
                    <td>${valArus.toFixed(2)} A</td>
                    <td>${dayaBeban.toFixed(2)} W</td>
                    <td>${valSuhu.toFixed(1)} °C</td>
                    <td>${valRpm} RPM</td>
                    <td style="font-weight: bold; color: #f1c40f;">${totalEnergiWh.toFixed(2)} Wh</td>
                    <td class="${relayColorClass}">${statusSistem}</td>
                `;
                tbody.prepend(tr); 

                // Batasi jumlah tabel max 50 baris
                if (tbody.children.length > 50) tbody.removeChild(tbody.lastChild);
            }

        } else {
            if(elStatusKoneksi) elStatusKoneksi.innerHTML = "<i class='fas fa-times-circle text-danger'></i> Menunggu data Firebase...";
        }
    }, (error) => {
        console.error("Firebase Error:", error);
        if(elStatusKoneksi) elStatusKoneksi.innerHTML = "<i class='fas fa-exclamation-triangle text-danger'></i> Gagal Konek Database";
    });

    // --- 5. LOGIKA DOWNLOAD PDF ---
    const btnPdf = document.getElementById('btn-download-pdf');
    if (btnPdf) {
        btnPdf.addEventListener('click', () => {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('l', 'mm', 'a4'); // Landscape

            doc.setFontSize(18);
            doc.text("Laporan Riwayat Data - Mesin Pencacah Bhakti Farm", 14, 20);
            
            doc.setFontSize(11);
            const printTime = new Date().toLocaleString('id-ID');
            doc.text(`Dicetak pada: ${printTime}`, 14, 28);

            doc.autoTable({
                html: '#history-table',
                startY: 35, 
                theme: 'striped',
                headStyles: { fillColor: [10, 179, 156] }, 
                styles: { halign: 'center' }
            });

            doc.save(`Laporan_Pencacah_${new Date().getTime()}.pdf`);
        });
    }
});