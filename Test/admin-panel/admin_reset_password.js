const sendBtn = document.getElementById('send-reset-link-btn');
const emailInput = document.getElementById('reset-email-input');
const messageArea = document.getElementById('message-area');

sendBtn.addEventListener('click', async () => {
    const email = emailInput.value;
    if (!email) {
        messageArea.textContent = 'ກະລຸນາປ້ອນອີເມວ!';
        messageArea.style.color = 'red';
        return;
    }

    messageArea.textContent = 'ກຳລັງສົ່ງ...';
    messageArea.style.color = 'blue';
    sendBtn.disabled = true;

    // ໝາຍເຫດ: ທ່ານຕ້ອງໄປຕັ້ງຄ່າ URL ນີ້ໃນ Supabase Dashboard > Authentication > URL Configuration
    // ໃຫ້ເປັນ URL ຂອງເວັບໄຊທ໌ອອນລາຍຂອງທ່ານ. ຕົວຢ່າງ: https://your-site.com/admin_update_password.html
    // ສຳລັບການທົດລອງໃນຄອມ, ທ່ານສາມາດໃຊ້ URL ຂອງ Live Server ໄດ້.
    const { data, error } = await supabase_client.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/admin_update_password.html',
    });

    if (error) {
        messageArea.textContent = 'ເກີດຂໍ້ຜິດພາດ: ' + error.message;
        messageArea.style.color = 'red';
    } else {
        messageArea.textContent = 'ສົ່ງລິ້ງສຳເລັດ! ກະລຸນາກວດສອບອີເມວຂອງທ່ານ (ທັງໃນ Inbox ແລະ Junk/Spam).';
        messageArea.style.color = 'green';
    }
    sendBtn.disabled = false;
});