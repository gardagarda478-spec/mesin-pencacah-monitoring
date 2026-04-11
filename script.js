document.addEventListener("DOMContentLoaded", function() {
    
    // --- 1. LOGIKA NAVIGASI TAB (MENU KIRI) ---
    const menuItems = document.querySelectorAll('.menu-item');
    const tabContents = document.querySelectorAll('.tab-content');

    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Hapus class 'active' dari semua menu dan tab
            menuItems.forEach(m => m.classList.remove('active'));
            tabContents.forEach(t => t.classList.remove('active'));
            
            // Tambahkan class 'active' ke menu yang diklik dan tab yang dituju
            item.classList.add('active');
            const targetId = item.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');
        });
    });

    // --- 2. FUNGSI TAMPILAN TANGGAL & WAKTU ---
    function updateDateTime() {
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
        const formattedDateTime = now.toLocaleDateString('id-ID', options);
        const elDateTime = document.getElementById('live-datetime');
        if (elDateTime) elDateTime.innerHTML = `<i class="far fa-clock"></i> ${formattedDateTime.replace(',', ' -')}`;
    }
    updateDateTime();
    setInterval(updateDateTime, 1000);

    // --- 3. KONFIGURASI UMUM GRAFIK ---
    const commonOptions = {
        responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, 
        scales: { y: { beginAtZero: false }, x: { grid: { display: false } } }
    };

    // Inisialisasi 5 Grafik
    const chartTegangan = new Chart(document.getElementById('chartTegangan').getContext('2d'), { type: 'line', data: { labels: [], datasets: [{ label: 'Tegangan (V)', data: [], borderColor: '#0ab39c', backgroundColor: 'rgba(10, 179, 156, 0.1)', borderWidth: 2, tension: 0.4, fill: true }] }, options: commonOptions });
    const chartArus = new Chart(document.getElementById('chartArus').getContext('2d'), { type: 'line', data: { labels: [], datasets: [{ label: 'Arus (A)', data: [], borderColor: '#e67e22', backgroundColor: 'rgba(230, 126, 34, 0.1)', borderWidth: 2, tension: 0.4, fill: true }] }, options: commonOptions });
    const chartDaya = new Chart(document.getElementById('chartDaya').getContext('2d'), { type: 'line', data: { labels: [], datasets: [{ label: 'Daya (W)', data: [], borderColor: '#10B981', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderWidth: 2, tension: 0.4, fill: true }] }, options: commonOptions });
    const chartSuhu = new Chart(document.getElementById('chartSuhu').getContext('2d'), { type: 'line', data: { labels: [], datasets: [{ label: 'Suhu (°C)', data: [], borderColor: '#f06548', backgroundColor: 'rgba(240, 101, 72, 0.1)', borderWidth: 2, tension: 0.4, fill: true }] }, options: commonOptions });
    const chartRpm = new Chart(document.getElementById('chartRpm').getContext('2d'), { type: 'line', data: { labels: [], datasets: [{ label: 'RPM', data: [], borderColor: '#4b38b3', backgroundColor: 'rgba(75, 56, 179, 0.1)', borderWidth: 2, tension: 0.4, fill: true }] }, options: commonOptions });

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
    const db = firebase.database();
    const dbRef = db.ref('PencacahRumput');

    // Elemen HTML Dashboard Utama
    const elTegangan = document.getElementById('val-tegangan');
    const elArus = document.getElementById('val-arus');
    const elDaya = document.getElementById('val-daya');
    const elSuhu = document.getElementById('val-suhu');
    const elRpm = document.getElementById('val-rpm');
    const elStatusKoneksi = document.getElementById('status-koneksi');
    const elStatusRelay = document.getElementById('status-relay');

    // Elemen HTML Tab Proteksi
    const protValTegangan = document.getElementById('prot-val-tegangan');
    const protValArus = document.getElementById('prot-val-arus');
    const protValSuhu = document.getElementById('prot-val-suhu');
    const statUiTegangan = document.getElementById('stat-ui-tegangan');
    const statUiArus = document.getElementById('stat-ui-arus');
    const statUiSuhu = document.getElementById('stat-ui-suhu');

    // Listener Real-Time dari Firebase
    dbRef.on('value', (snapshot) => {
        const data = snapshot.val();
        
        if (data) {
            if(elStatusKoneksi) elStatusKoneksi.innerHTML = "<i class='fas fa-wifi text-success'></i> Terhubung ke ESP32";
            
            // Ekstrak Nilai Float
            const valTeg = data.tegangan !== undefined ? parseFloat(data.tegangan) : 0;
            const valArus = data.arus !== undefined ? parseFloat(data.arus) : 0;
            const valSuhu = data.suhu !== undefined ? parseFloat(data.suhu) : 0;
            const valRpm = data.rpm !== undefined ? data.rpm : 0;
            const dayaBeban = valTeg * valArus; 
            
            // --- UPDATE TAB 1: DASHBOARD UTAMA ---
            if(elTegangan) elTegangan.innerText = valTeg.toFixed(1);
            if(elArus) elArus.innerText = valArus.toFixed(2);
            if(elDaya) elDaya.innerText = dayaBeban.toFixed(2);
            if(elSuhu) elSuhu.innerText = valSuhu.toFixed(1);
            if(elRpm) elRpm.innerText = valRpm;

            let statusSistem = data.status_relay || "AMAN";
            if(statusSistem.toUpperCase() === "AMAN") {
                if(elStatusRelay) { elStatusRelay.className = "badge active-badge"; elStatusRelay.innerText = "Status: AMAN"; }
            } else {
                if(elStatusRelay) { elStatusRelay.className = "badge danger-badge"; elStatusRelay.innerText = "Sistem CUT-OFF!"; }
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

            // --- UPDATE TAB 2: LOGIKA STATUS PROTEKSI ---
            if(protValTegangan) protValTegangan.innerText = valTeg.toFixed(1);
            if(protValArus) protValArus.innerText = valArus.toFixed(2);
            if(protValSuhu) protValSuhu.innerText = valSuhu.toFixed(1);

            // Evaluasi Tegangan (< 21 Bahaya) *Hanya jika sistem mendeteksi tegangan masuk
            if(valTeg > 0 && valTeg < 21.0) {
                statUiTegangan.className = "prot-badge bahaya";
                statUiTegangan.innerHTML = "<i class='fas fa-exclamation-triangle'></i> Baterai Drop";
            } else {
                statUiTegangan.className = "prot-badge aman";
                statUiTegangan.innerHTML = "<i class='fas fa-check-circle'></i> AMAN";
            }

            // Evaluasi Arus (> 20 Bahaya)
            if(valArus > 20.0) {
                statUiArus.className = "prot-badge bahaya";
                statUiArus.innerHTML = "<i class='fas fa-exclamation-triangle'></i> Overcurrent";
            } else {
                statUiArus.className = "prot-badge aman";
                statUiArus.innerHTML = "<i class='fas fa-check-circle'></i> AMAN";
            }

            // Evaluasi Suhu (> 60 atau -127 Bahaya)
            if(valSuhu > 60.0) {
                statUiSuhu.className = "prot-badge bahaya";
                statUiSuhu.innerHTML = "<i class='fas fa-fire'></i> Overheat";
            } else if(valSuhu === -127 || valSuhu < -10) {
                statUiSuhu.className = "prot-badge bahaya";
                statUiSuhu.innerHTML = "<i class='fas fa-plug'></i> Sensor Error";
            } else {
                statUiSuhu.className = "prot-badge aman";
                statUiSuhu.innerHTML = "<i class='fas fa-check-circle'></i> AMAN";
            }

        } else {
            if(elStatusKoneksi) elStatusKoneksi.innerHTML = "<i class='fas fa-times-circle text-danger'></i> Menunggu data Firebase...";
        }
    }, (error) => {
        console.error("Firebase Error:", error);
        if(elStatusKoneksi) elStatusKoneksi.innerHTML = "<i class='fas fa-exclamation-triangle text-danger'></i> Gagal Konek Database";
    });
});