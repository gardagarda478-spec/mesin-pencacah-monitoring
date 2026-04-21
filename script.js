// ========================================================
// KODE SAPU JAGAT: KHUSUS UNTUK MENGHAPUS FOLDER RIWAYAT
// ========================================================

document.addEventListener("DOMContentLoaded", function() {
    
    // 1. Konfigurasi Firebase Anda
    const firebaseConfig = {
        apiKey: "AIzaSyAcX08fd30zKGfxeW_ghomAS-ZWRP7R3JU",
        authDomain: "smart-chopper-a3f98.firebaseapp.com",
        databaseURL: "https://smart-chopper-a3f98-default-rtdb.asia-southeast1.firebasedatabase.app",
        projectId: "smart-chopper-a3f98",
        storageBucket: "smart-chopper-a3f98.firebasestorage.app",
        messagingSenderId: "657402726135",
        appId: "1:657402726135:web:2bf1ab083add1efb5bb5f2"
    };

    // 2. Inisialisasi Firebase
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    
    // 3. Targetkan Folder yang Bikin Lag
    const hapusRef = firebase.database().ref('PencacahRumput/Riwayat');

    // 4. Eksekusi Penghapusan
    console.log("Sedang mencoba menghapus folder Riwayat...");
    document.body.innerHTML = "<h2 style='text-align:center; margin-top:20vh; color:#e74c3c;'>Sedang menghapus data dari Firebase... Mohon tunggu...</h2>";

    hapusRef.remove()
        .then(() => {
            document.body.innerHTML = "<h1 style='text-align:center; margin-top:20vh; color:#0ab39c;'>🔥 BERHASIL!</h1><p style='text-align:center;'>Folder Riwayat sudah musnah dari Firebase.</p>";
            alert("🔥 BERHASIL!\n\nFolder Riwayat yang bikin lag sudah terhapus dari database.\n\nSekarang Anda bisa mengembalikan kode script.js ke versi yang asli.");
        })
        .catch((error) => {
            alert("Gagal menghapus: " + error.message);
        });
});