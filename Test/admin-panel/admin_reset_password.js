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

    // ປ່ຽນມາໃຊ້ signInWithOtp ເພື່ອສົ່ງລະຫັດ 6 ຕົວເລກ
    // shouldCreateUser: false ໝາຍຄວາມວ່າຈະບໍ່ສ້າງ user ໃໝ່ຖ້າອີເມວນີ້ບໍ່ມີໃນລະບົບ
    const { data, error } = await supabase_client.auth.signInWithOtp({
        email: email,
        options: {
            shouldCreateUser: false,
        },
    });

    if (error) {
        messageArea.textContent = 'ເກີດຂໍ້ຜິດພາດ: ' + error.message;
        messageArea.style.color = 'red';
    } else {
        // ຖ້າສົ່ງ OTP ສຳເລັດ, ໃຫ້ພາໄປໜ້າຢືນຢັນ OTP ພ້ອມກັບສົ່ງອີເມວໄປນຳ
        // ບັນທຶກເວລາທີ່ສົ່ງ OTP ເພື່ອໃຊ້ໃນການຄຳນວນໂມງນັບຖອຍຫຼັງ
        sessionStorage.setItem('otp_request_timestamp', Date.now());
        window.location.href = `admin_verify_otp.html?email=${encodeURIComponent(email)}`;
    }
    sendBtn.disabled = false;
});