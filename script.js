document.addEventListener("DOMContentLoaded", function() {
    
    // Konfigurasi umum untuk semua grafik
    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false, // Ini wajib false agar tinggi grafik pas dengan kotak CSS
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
            // Data Dummy
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
            // Data Dummy
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

    // --- 3. SETUP GRAFIK SUHU (Warna Merah) ---
    const ctxSuhu = document.getElementById('chartSuhu').getContext('2d');
    const chartSuhu = new Chart(ctxSuhu, {
        type: 'line',
        data: {
            // Data Dummy
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

    // --- SETUP FIREBASE ---
    // Jangan lupa ganti config ini nanti jika ESP32 sudah online
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
    const elSuhu = document.getElementById('val-suhu');
    const elRpm = document.getElementById('val-rpm');
    const elStatusKoneksi = document.getElementById('status-koneksi');
    const elStatusRelay = document.getElementById('status-relay');

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
                if(elStatusRelay) { elStatusRelay.className = "badge active-badge"; elStatusRelay.innerText = "Status: AMAN"; }
            } else {
                if(elStatusRelay) { elStatusRelay.className = "badge danger-badge"; elStatusRelay.innerText = "Sistem CUT-OFF!"; }
            }

            // Update 3 Grafik Real-Time
            let timeNow = new Date().toLocaleTimeString('id-ID', { hour12: false, hour: "numeric", minute: "numeric", second: "numeric" });
            
            // Masukkan data asli dari ESP32 ke array chart
            chartTegangan.data.labels.push(timeNow);
            chartTegangan.data.datasets[0].data.push(data.tegangan || 0);

            chartArus.data.labels.push(timeNow);
            chartArus.data.datasets[0].data.push(data.arus || 0);

            chartSuhu.data.labels.push(timeNow);
            chartSuhu.data.datasets[0].data.push(data.suhu || 0);
            
            // Batasi agar grafik tidak kepanjangan (max 12 titik terakhir)
            if(chartTegangan.data.labels.length > 12){
                chartTegangan.data.labels.shift(); chartTegangan.data.datasets[0].data.shift();
                chartArus.data.labels.shift(); chartArus.data.datasets[0].data.shift();
                chartSuhu.data.labels.shift(); chartSuhu.data.datasets[0].data.shift();
            }
            
            // Terapkan perubahan ke visual grafik
            chartTegangan.update();
            chartArus.update();
            chartSuhu.update();

        } else {
            // Jika Firebase tidak ada data, biarkan dummy data tetap tampil
            if(elStatusKoneksi) elStatusKoneksi.innerHTML = "<i class='fas fa-times-circle text-danger'></i> Menunggu koneksi Firebase...";
        }
    }, (error) => {
        console.error("Firebase Error:", error);
        if(elStatusKoneksi) elStatusKoneksi.innerHTML = "<i class='fas fa-exclamation-triangle text-danger'></i> Gagal Konek Database";
    });
});