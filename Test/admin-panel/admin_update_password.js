const updateBtn = document.getElementById('update-password-btn');
const newPasswordInput = document.getElementById('new-password-input');
const confirmPasswordInput = document.getElementById('confirm-password-input');
const messageArea = document.getElementById('message-area');

// ຟັງຊັນນີ້ຈະຖືກເອີ້ນເມື່ອຜູ້ໃຊ້ຖືກ redirect ກັບມາຈາກອີເມວ
supabase_client.auth.onAuthStateChange(async (event, session) => {
    // ເຫດການນີ້ຈະເກີດຂຶ້ນເມື່ອຜູ້ໃຊ້ລັອກອິນສຳເລັດຫຼັງຈາກກົດລິ້ງໃນອີເມວ
    if (event === 'SIGNED_IN') {
        messageArea.textContent = 'ຢືນຢັນອີເມວສຳເລັດ. ກະລຸນາຕັ້ງລະຫັດຜ່ານໃໝ່.';
        messageArea.style.color = 'green';
    }
});

updateBtn.addEventListener('click', async () => {
    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (!newPassword || !confirmPassword) {
        messageArea.textContent = 'ກະລຸນາປ້ອນລະຫັດຜ່ານທັງສອງຊ່ອງ!';
        messageArea.style.color = 'red';
        return;
    }
    if (newPassword !== confirmPassword) {
        messageArea.textContent = 'ລະຫັດຜ່ານທັງສອງຊ່ອງບໍ່ກົງກັນ!';
        messageArea.style.color = 'red';
        return;
    }

    const { data, error } = await supabase_client.auth.updateUser({
        password: newPassword
    });

    if (error) {
        messageArea.textContent = 'ເກີດຂໍ້ຜິດພາດ: ' + error.message;
        messageArea.style.color = 'red';
    } else {
        messageArea.textContent = 'ອັບເດດລະຫັດຜ່ານສຳເລັດແລ້ວ! ກະລຸນາກັບໄປໜ້າລັອກອິນ.';
        messageArea.style.color = 'green';
    }
});