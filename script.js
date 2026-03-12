document.addEventListener("DOMContentLoaded", function() {
    
    // --- 1. SETUP GRAFIK (CHART.JS) ala Desain Figma ---
    const ctxTrend = document.getElementById('trendChart').getContext('2d');
    const trendChart = new Chart(ctxTrend, {
        type: 'line',
        data: {
            labels: ['10s', '20s', '30s', '40s', '50s', '60s', '70s', '80s'],
            datasets: [
                {
                    label: 'Suhu (°C)',
                    data: [35, 36, 36.5, 37, 38, 38.2, 39, 39.5],
                    borderColor: '#f06548', // Merah/Orange
                    backgroundColor: 'rgba(240, 101, 72, 0.05)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Tegangan (V)',
                    data: [26.4, 26.3, 26.4, 26.2, 26.1, 26.0, 26.1, 26.0],
                    borderColor: '#0ab39c', // Teal (Warna Utama)
                    backgroundColor: 'rgba(10, 179, 156, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            plugins: { legend: { position: 'top', align: 'end' } },
            scales: {
                y: { beginAtZero: false },
                x: { grid: { display: false } }
            }
        }
    });

    // --- 2. SETUP FIREBASE REALTIME DATABASE ---
    // GANTI DENGAN KONFIGURASI FIREBASE PROJECT ANDA
    const firebaseConfig = {
        apiKey: "API_KEY_ANDA",
        authDomain: "PROJECT_ANDA.firebaseapp.com",
        databaseURL: "https://PROJECT_ANDA-default-rtdb.firebaseio.com",
        projectId: "PROJECT_ANDA",
    };

    // Inisialisasi Firebase
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    const db = firebase.database();
    const dbRef = db.ref('PencacahRumput');

    // Elemen HTML
    const elTegangan = document.getElementById('val-tegangan');
    const elArus = document.getElementById('val-arus');
    const elSuhu = document.getElementById('val-suhu');
    const elRpm = document.getElementById('val-rpm');
    const elStatusKoneksi = document.getElementById('status-koneksi');
    const elStatusRelay = document.getElementById('status-relay');

    // Listen data dari Firebase
    dbRef.on('value', (snapshot) => {
        const data = snapshot.val();
        
        if (data) {
            // Update Text Koneksi
            elStatusKoneksi.innerHTML = "<i class='fas fa-wifi text-success'></i> Terhubung";
            
            // Update Angka di Card Atas
            elTegangan.innerText = data.tegangan !== undefined ? data.tegangan.toFixed(1) : "0.0";
            elArus.innerText = data.arus !== undefined ? data.arus.toFixed(1) : "0.0";
            elSuhu.innerText = data.suhu !== undefined ? data.suhu.toFixed(1) : "0.0";
            elRpm.innerText = data.rpm !== undefined ? data.rpm : "0";

            // Update Status Relay
            let status = data.status_relay || "AMAN";
            if(status === "AMAN") {
                elStatusRelay.className = "badge active-badge";
                elStatusRelay.innerText = "Status: AMAN";
            } else {
                elStatusRelay.className = "badge danger-badge";
                elStatusRelay.innerText = "Sistem CUT-OFF!";
            }

            /* OPSIONAL: Update Grafik secara Real-Time.
               Ini akan menggeser data grafik ke kiri setiap ada data baru dari ESP32.
            */
            let timeNow = new Date().getSeconds() + "s";
            trendChart.data.labels.push(timeNow);
            trendChart.data.datasets[0].data.push(data.suhu);
            trendChart.data.datasets[1].data.push(data.tegangan);
            
            // Agar grafik tidak kepanjangan, hapus data paling kiri jika lebih dari 10 titik
            if(trendChart.data.labels.length > 10){
                trendChart.data.labels.shift();
                trendChart.data.datasets[0].data.shift();
                trendChart.data.datasets[1].data.shift();
            }
            trendChart.update();

        } else {
            elStatusKoneksi.innerHTML = "<i class='fas fa-times-circle text-danger'></i> Data Kosong";
        }
    }, (error) => {
        console.error("Firebase Error:", error);
        elStatusKoneksi.innerHTML = "<i class='fas fa-exclamation-triangle text-danger'></i> Gagal Konek";
    });
});