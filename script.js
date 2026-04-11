document.addEventListener("DOMContentLoaded", function() {
    
    // --- FUNGSI TAMPILAN TANGGAL & WAKTU REAL-TIME ---
    function updateDateTime() {
        const now = new Date();
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit',
            hour12: false
        };
        const formattedDateTime = now.toLocaleDateString('id-ID', options);
        
        const elDateTime = document.getElementById('live-datetime');
        if (elDateTime) {
            // Mengganti tanda koma default dari toLocaleDateString menjadi format yang lebih rapi
            elDateTime.innerHTML = `<i class="far fa-clock"></i> ${formattedDateTime.replace(',', ' -')}`;
        }
    }
    
    // Panggil fungsi jam segera, lalu perbarui setiap 1 detik
    updateDateTime();
    setInterval(updateDateTime, 1000);

    // --- KONFIGURASI UMUM GRAFIK ---
    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false, // Wajib false agar menyesuaikan tinggi CSS
        plugins: { legend: { display: false } }, 
        scales: {
            y: { beginAtZero: false }, 
            x: { grid: { display: false } }
        }
    };

    // --- 1. SETUP GRAFIK TEGANGAN (Warna Teal) ---
    const ctxTegangan = document.getElementById('chartTegangan').getContext('2d');
    const chartTegangan = new Chart(ctxTegangan, {
        type: 'line',
        data: {
            labels: ['0s', '5s', '10s', '15s', '20s', '25s', '30s', '35s'],
            datasets: [{
                label: 'Tegangan (V)',
                data: [26.0, 26.2, 26.4, 26.1, 26.3, 26.5, 26.2, 26.4], 
                borderColor: '#0ab39c',
                backgroundColor: 'rgba(10, 179, 156, 0.1)',
                borderWidth: 2, tension: 0.4, fill: true
            }]
        },
        options: commonOptions
    });

    // --- 2. SETUP GRAFIK ARUS (Warna Orange) ---
    const ctxArus = document.getElementById('chartArus').getContext('2d');
    const chartArus = new Chart(ctxArus, {
        type: 'line',
        data: {
            labels: ['0s', '5s', '10s', '15s', '20s', '25s', '30s', '35s'],
            datasets: [{
                label: 'Arus (A)',
                data: [12.0, 14.5, 15.2, 13.8, 16.0, 15.5, 14.2, 13.0],
                borderColor: '#e67e22',
                backgroundColor: 'rgba(230, 126, 34, 0.1)',
                borderWidth: 2, tension: 0.4, fill: true
            }]
        },
        options: commonOptions
    });

    // --- 3. SETUP GRAFIK DAYA (Warna Hijau) ---
    const ctxDaya = document.getElementById('chartDaya').getContext('2d');
    const chartDaya = new Chart(ctxDaya, {
        type: 'line',
        data: {
            labels: ['0s', '5s', '10s', '15s', '20s', '25s', '30s', '35s'],
            datasets: [{
                label: 'Daya Beban (W)',
                data: [312, 379, 401, 360, 420, 410, 372, 343],
                borderColor: '#10B981', 
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderWidth: 2, tension: 0.4, fill: true
            }]
        },
        options: commonOptions
    });

    // --- 4. SETUP GRAFIK SUHU (Warna Merah) ---
    const ctxSuhu = document.getElementById('chartSuhu').getContext('2d');
    const chartSuhu = new Chart(ctxSuhu, {
        type: 'line',
        data: {
            labels: ['0s', '5s', '10s', '15s', '20s', '25s', '30s', '35s'],
            datasets: [{
                label: 'Suhu (°C)',
                data: [35.0, 35.5, 36.2, 37.0, 37.5, 38.0, 38.2, 38.5],
                borderColor: '#f06548',
                backgroundColor: 'rgba(240, 101, 72, 0.1)',
                borderWidth: 2, tension: 0.4, fill: true
            }]
        },
        options: commonOptions
    });

    // --- 5. SETUP GRAFIK RPM (Warna Biru/Ungu) ---
    const ctxRpm = document.getElementById('chartRpm').getContext('2d');
    const chartRpm = new Chart(ctxRpm, {
        type: 'line',
        data: {
            labels: ['0s', '5s', '10s', '15s', '20s', '25s', '30s', '35s'],
            datasets: [{
                label: 'Kecepatan (RPM)',
                data: [0, 0, 0, 0, 0, 0, 0, 0],
                borderColor: '#4b38b3',
                backgroundColor: 'rgba(75, 56, 179, 0.1)',
                borderWidth: 2, tension: 0.4, fill: true
            }]
        },
        options: commonOptions
    });

    // --- SETUP FIREBASE ---
    const firebaseConfig = {
        apiKey: "AIzaSyAcX08fd30zKGfxeW_ghomAS-ZWRP7R3JU",
        authDomain: "smart-chopper-a3f98.firebaseapp.com",
        databaseURL: "https://smart-chopper-a3f98-default-rtdb.asia-southeast1.firebasedatabase.app",
        projectId: "smart-chopper-a3f98",
        storageBucket: "smart-chopper-a3f98.firebasestorage.app",
        messagingSenderId: "657402726135",
        appId: "1:657402726135:web:2bf1ab083add1efb5bb5f2"
    };

    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    const db = firebase.database();
    const dbRef = db.ref('PencacahRumput');

    // Elemen HTML yang akan diupdate
    const elTegangan = document.getElementById('val-tegangan');
    const elArus = document.getElementById('val-arus');
    const elDaya = document.getElementById('val-daya');
    const elSuhu = document.getElementById('val-suhu');
    const elRpm = document.getElementById('val-rpm');
    const elStatusKoneksi = document.getElementById('status-koneksi');
    const elStatusRelay = document.getElementById('status-relay');

    // Listener Real-Time dari Firebase
    dbRef.on('value', (snapshot) => {
        const data = snapshot.val();
        
        if (data) {
            if(elStatusKoneksi) elStatusKoneksi.innerHTML = "<i class='fas fa-wifi text-success'></i> Terhubung ke ESP32";
            
            // --- LOGIKA PERHITUNGAN DAYA SEMENTARA ---
            const nilaiTegangan = data.tegangan !== undefined ? parseFloat(data.tegangan) : 0;
            const nilaiArus = data.arus !== undefined ? parseFloat(data.arus) : 0;
            const dayaBeban = nilaiTegangan * nilaiArus; 
            
            // Update Angka di HTML
            if(elTegangan) elTegangan.innerText = nilaiTegangan.toFixed(1);
            if(elArus) elArus.innerText = nilaiArus.toFixed(2);
            if(elDaya) elDaya.innerText = dayaBeban.toFixed(2);
            if(elSuhu) elSuhu.innerText = data.suhu !== undefined ? parseFloat(data.suhu).toFixed(1) : "0.0";
            if(elRpm) elRpm.innerText = data.rpm !== undefined ? data.rpm : "0";

            // Update Logika Relay
            let statusSistem = data.status_relay || "AMAN";
            if(statusSistem.toUpperCase() === "AMAN") {
                if(elStatusRelay) { elStatusRelay.className = "badge active-badge"; elStatusRelay.innerText = "Status: AMAN"; }
            } else {
                if(elStatusRelay) { elStatusRelay.className = "badge danger-badge"; elStatusRelay.innerText = "Sistem CUT-OFF!"; }
            }

            // Update 5 Grafik Real-Time
            let timeNow = new Date().toLocaleTimeString('id-ID', { hour12: false, hour: "numeric", minute: "numeric", second: "numeric" });
            
            // Urutan array disamakan dengan urutan grafik di HTML: Tegangan, Arus, Daya, Suhu, RPM
            const charts = [chartTegangan, chartArus, chartDaya, chartSuhu, chartRpm];
            const dataKeys = [nilaiTegangan, nilaiArus, dayaBeban, data.suhu, data.rpm]; 

            charts.forEach((chart, index) => {
                chart.data.labels.push(timeNow);
                chart.data.datasets[0].data.push(dataKeys[index] || 0);

                // Batasi agar grafik tidak kepanjangan (max 12 titik terakhir)
                if(chart.data.labels.length > 12) {
                    chart.data.labels.shift();
                    chart.data.datasets[0].data.shift();
                }
                chart.update();
            });

        } else {
            if(elStatusKoneksi) elStatusKoneksi.innerHTML = "<i class='fas fa-times-circle text-danger'></i> Menunggu koneksi Firebase...";
        }
    }, (error) => {
        console.error("Firebase Error:", error);
        if(elStatusKoneksi) elStatusKoneksi.innerHTML = "<i class='fas fa-exclamation-triangle text-danger'></i> Gagal Konek Database";
    });
});