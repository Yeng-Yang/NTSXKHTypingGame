const loginBtn = document.getElementById('admin-login-submit-btn');
const emailInput = document.getElementById('admin-email');
const passwordInput = document.getElementById('admin-password');
const errorMessage = document.getElementById('error-message');

loginBtn.addEventListener('click', async () => {
    const email = emailInput.value;
    const password = passwordInput.value;

    if (!email || !password) {
        errorMessage.textContent = 'ກະລຸນາປ້ອນອີເມວ ແລະ ລະຫັດຜ່ານ!';
        return;
    }

    errorMessage.textContent = 'ກຳລັງກວດສອບ...';

    // ໃຊ້ Supabase Auth ເພື່ອລັອກອິນ
    const { data, error } = await supabase_client.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (error) {
        errorMessage.textContent = 'ອີເມວ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ!';
    } else {
        // ບໍ່ຕ້ອງໃຊ້ sessionStorage ອີກຕໍ່ໄປ, Supabase ຈະຈັດການ session ເອງ
        window.location.href = 'admin.html';
    }
});

// ເພີ່ມຟັງຊັນກົດ Enter ເພື່ອເຂົ້າສູ່ລະບົບ
emailInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault(); // ປ້ອງກັນການສົ່ງຟອມແບບປົກກະຕິ
        loginBtn.click();
    }
});

passwordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault(); // ປ້ອງກັນການສົ່ງຟອມແບບປົກກະຕິ
        loginBtn.click();
    }
});