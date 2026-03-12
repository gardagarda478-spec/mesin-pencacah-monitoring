document.addEventListener("DOMContentLoaded", function() {
    
    // Konfigurasi umum untuk semua grafik agar responsif
    // Konfigurasi umum untuk semua grafik
    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false, // PASTIKAN INI FALSE 
        plugins: { legend: { display: false } }, 
        scales: {
            y: { beginAtZero: false }, 
            x: { grid: { display: false } }
        }
    };
    };

    // --- 1. SETUP GRAFIK TEGANGAN (Warna Teal) ---
    const ctxTegangan = document.getElementById('chartTegangan').getContext('2d');
    const chartTegangan = new Chart(ctxTegangan, {
        type: 'line',
        data: {
            // Cari bagian ini di setup chartTegangan:
labels: ['10s', '20s', '30s', '40s', '50s', '60s'],
datasets: [{
    label: 'Tegangan (V)',
    data: [26.1, 26.4, 26.2, 26.5, 26.3, 26.4], // Data palsu agar grafik terbentuk
    // ... sisa kode warnanya biarkan sama
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
            // Cari bagian ini di setup chartArus:
labels: ['10s', '20s', '30s', '40s', '50s', '60s'],
datasets: [{
    label: 'Arus (A)',
    data: [12.5, 15.0, 14.2, 18.1, 13.5, 12.0], // Data palsu
    // ...
                borderColor: '#e67e22',
                backgroundColor: 'rgba(230, 126, 34, 0.1)',
                borderWidth: 2, tension: 0.4, fill: true
            }]
        },
        options: commonOptions
    });

    // --- 3. SETUP GRAFIK SUHU (Warna Merah) ---
    const ctxSuhu = document.getElementById('chartSuhu').getContext('2d');
    const chartSuhu = new Chart(ctxSuhu, {
        type: 'line',
        data: {
            // Cari bagian ini di setup chartSuhu:
labels: ['10s', '20s', '30s', '40s', '50s', '60s'],
datasets: [{
    label: 'Suhu (°C)',
    data: [35, 36.5, 38, 39.2, 39.5, 40], // Data palsu
    // ...
                borderColor: '#f06548',
                backgroundColor: 'rgba(240, 101, 72, 0.1)',
                borderWidth: 2, tension: 0.4, fill: true
            }]
        },
        options: commonOptions
    });

    // --- SETUP FIREBASE ---
    // GANTI DENGAN KONFIGURASI FIREBASE PROJECT ANDA
    const firebaseConfig = {
        apiKey: "API_KEY_ANDA",
        authDomain: "NAMA_PROJECT_ANDA.firebaseapp.com",
        databaseURL: "https://NAMA_PROJECT_ANDA-default-rtdb.firebaseio.com",
        projectId: "NAMA_PROJECT_ANDA",
    };

    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    const db = firebase.database();
    const dbRef = db.ref('PencacahRumput');

    // Elemen HTML yang akan diupdate
    const elTegangan = document.getElementById('val-tegangan');
    const elArus = document.getElementById('val-arus');
    const elSuhu = document.getElementById('val-suhu');
    const elRpm = document.getElementById('val-rpm');
    const elStatusKoneksi = document.getElementById('status-koneksi');
    const elStatusRelay = document.getElementById('status-relay');
    const elMobileStatusRelay = document.getElementById('mobile-status-relay');

    // Listener Real-Time dari Firebase
    dbRef.on('value', (snapshot) => {
        const data = snapshot.val();
        
        if (data) {
            if(elStatusKoneksi) elStatusKoneksi.innerHTML = "<i class='fas fa-wifi text-success'></i> Terhubung ke ESP32";
            
            // Update Angka
            elTegangan.innerText = data.tegangan !== undefined ? parseFloat(data.tegangan).toFixed(1) : "0.0";
            elArus.innerText = data.arus !== undefined ? parseFloat(data.arus).toFixed(2) : "0.00";
            elSuhu.innerText = data.suhu !== undefined ? parseFloat(data.suhu).toFixed(1) : "0.0";
            elRpm.innerText = data.rpm !== undefined ? data.rpm : "0";

            // Update Logika Relay
            let statusSistem = data.status_relay || "AMAN";
            if(statusSistem.toUpperCase() === "AMAN") {
                elStatusRelay.className = "badge active-badge"; elStatusRelay.innerText = "Status: AMAN";
                if (elMobileStatusRelay) { elMobileStatusRelay.className = "badge active-badge"; elMobileStatusRelay.innerHTML = "<i class='fas fa-check-circle'></i> AMAN"; }
            } else {
                elStatusRelay.className = "badge danger-badge"; elStatusRelay.innerText = "Sistem CUT-OFF!";
                if (elMobileStatusRelay) { elMobileStatusRelay.className = "badge danger-badge"; elMobileStatusRelay.innerHTML = "<i class='fas fa-exclamation-triangle'></i> CUT-OFF"; }
            }

            // Update 3 Grafik Real-Time
            let timeNow = new Date().toLocaleTimeString('id-ID', { hour12: false, hour: "numeric", minute: "numeric", second: "numeric" });
            
            // Masukkan data baru ke array chart
            chartTegangan.data.labels.push(timeNow);
            chartTegangan.data.datasets[0].data.push(data.tegangan || 0);

            chartArus.data.labels.push(timeNow);
            chartArus.data.datasets[0].data.push(data.arus || 0);

            chartSuhu.data.labels.push(timeNow);
            chartSuhu.data.datasets[0].data.push(data.suhu || 0);
            
            // Batasi agar grafik tidak terlalu panjang (max 15 titik terakhir)
            if(chartTegangan.data.labels.length > 15){
                chartTegangan.data.labels.shift(); chartTegangan.data.datasets[0].data.shift();
                chartArus.data.labels.shift(); chartArus.data.datasets[0].data.shift();
                chartSuhu.data.labels.shift(); chartSuhu.data.datasets[0].data.shift();
            }
            
            // Terapkan perubahan ke visual grafik
            chartTegangan.update();
            chartArus.update();
            chartSuhu.update();

        } else {
            if(elStatusKoneksi) elStatusKoneksi.innerHTML = "<i class='fas fa-times-circle text-danger'></i> Data Kosong";
        }
    }, (error) => {
        console.error("Firebase Error:", error);
        if(elStatusKoneksi) elStatusKoneksi.innerHTML = "<i class='fas fa-exclamation-triangle text-danger'></i> Gagal Konek Database";
    });
});