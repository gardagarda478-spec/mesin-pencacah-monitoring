document.addEventListener("DOMContentLoaded", function() {
    
    // --- 1. SETUP GRAFIK CHART.JS ---
    const ctxTrend = document.getElementById('trendChart').getContext('2d');
    const trendChart = new Chart(ctxTrend, {
        type: 'line',
        data: {
            labels: ['0s'], // Label awal
            datasets: [
                {
                    label: 'Suhu (°C)',
                    data: [0], // Data awal
                    borderColor: '#f06548', // Merah
                    backgroundColor: 'rgba(240, 101, 72, 0.05)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Tegangan (V)',
                    data: [0], // Data awal
                    borderColor: '#0ab39c', // Teal
                    backgroundColor: 'rgba(10, 179, 156, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, // Penting agar grafik bisa menyesuaikan tinggi di mobile
            plugins: { legend: { position: 'top', align: 'end' } },
            scales: {
                y: { beginAtZero: true },
                x: { grid: { display: false } }
            }
        }
    });

    // --- 2. SETUP FIREBASE ---
    // GANTI DENGAN KONFIGURASI FIREBASE PROJECT ANDA
    const firebaseConfig = {
        apiKey: "API_KEY_ANDA",
        authDomain: "NAMA_PROJECT_ANDA.firebaseapp.com",
        databaseURL: "https://NAMA_PROJECT_ANDA-default-rtdb.firebaseio.com",
        projectId: "NAMA_PROJECT_ANDA",
    };

    // Inisialisasi Firebase
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    const db = firebase.database();
    
    // Asumsi data dari ESP32 dikirim ke path/node "PencacahRumput"
    const dbRef = db.ref('PencacahRumput');

    // Elemen HTML yang akan diupdate
    const elTegangan = document.getElementById('val-tegangan');
    const elArus = document.getElementById('val-arus');
    const elSuhu = document.getElementById('val-suhu');
    const elRpm = document.getElementById('val-rpm');
    const elStatusKoneksi = document.getElementById('status-koneksi');
    const elStatusRelay = document.getElementById('status-relay'); // Desktop
    const elMobileStatusRelay = document.getElementById('mobile-status-relay'); // Mobile

    // Mendengarkan perubahan data secara Real-Time dari Firebase
    dbRef.on('value', (snapshot) => {
        const data = snapshot.val();
        
        if (data) {
            // Update Text Koneksi di Sidebar
            if(elStatusKoneksi) {
                elStatusKoneksi.innerHTML = "<i class='fas fa-wifi text-success'></i> Terhubung ke ESP32";
            }
            
            // Update Angka Parameter (dengan validasi jika data belum ada)
            elTegangan.innerText = data.tegangan !== undefined ? parseFloat(data.tegangan).toFixed(1) : "0.0";
            elArus.innerText = data.arus !== undefined ? parseFloat(data.arus).toFixed(2) : "0.00";
            elSuhu.innerText = data.suhu !== undefined ? parseFloat(data.suhu).toFixed(1) : "0.0";
            elRpm.innerText = data.rpm !== undefined ? data.rpm : "0";

            // Update Logika Status Relay (AMAN atau CUT-OFF)
            let statusSistem = data.status_relay || "AMAN";
            
            if(statusSistem.toUpperCase() === "AMAN") {
                // Tampilan Desktop
                elStatusRelay.className = "badge active-badge";
                elStatusRelay.innerText = "Status: AMAN";
                
                // Tampilan Mobile
                if (elMobileStatusRelay) {
                    elMobileStatusRelay.className = "badge active-badge";
                    elMobileStatusRelay.innerHTML = "<i class='fas fa-check-circle'></i> AMAN";
                }
            } else {
                // Tampilan Desktop
                elStatusRelay.className = "badge danger-badge";
                elStatusRelay.innerText = "Sistem CUT-OFF!";
                
                // Tampilan Mobile
                if (elMobileStatusRelay) {
                    elMobileStatusRelay.className = "badge danger-badge";
                    elMobileStatusRelay.innerHTML = "<i class='fas fa-exclamation-triangle'></i> CUT-OFF";
                }
            }

            // Update Grafik Real-Time
            let timeNow = new Date().toLocaleTimeString('id-ID', { hour12: false, hour: "numeric", minute: "numeric", second: "numeric" });
            
            // Tambah data baru ke dalam array grafik
            trendChart.data.labels.push(timeNow);
            trendChart.data.datasets[0].data.push(data.suhu || 0);
            trendChart.data.datasets[1].data.push(data.tegangan || 0);
            
            // Batasi jumlah titik grafik agar tidak menumpuk (misal max 15 titik terakhir)
            if(trendChart.data.labels.length > 15){
                trendChart.data.labels.shift();
                trendChart.data.datasets[0].data.shift();
                trendChart.data.datasets[1].data.shift();
            }
            trendChart.update();

        } else {
            if(elStatusKoneksi) elStatusKoneksi.innerHTML = "<i class='fas fa-times-circle text-danger'></i> Data Kosong / ESP Mati";
        }
    }, (error) => {
        console.error("Firebase Error:", error);
        if(elStatusKoneksi) elStatusKoneksi.innerHTML = "<i class='fas fa-exclamation-triangle text-danger'></i> Gagal Konek Database";
    });
});