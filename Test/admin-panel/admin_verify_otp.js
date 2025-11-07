const verifyBtn = document.getElementById('verify-otp-btn');
const otpInput = document.getElementById('otp-input');
const updatePasswordBtn = document.getElementById('update-password-btn');
const newPasswordInput = document.getElementById('new-password-input');
const confirmPasswordInput = document.getElementById('confirm-password-input');
const messageArea = document.getElementById('message-area');
const otpTimer = document.getElementById('otp-timer');
const otpSection = document.getElementById('otp-section');
const passwordSection = document.getElementById('password-section');
let timerInterval;

let userEmail = '';

document.addEventListener('DOMContentLoaded', () => {
    const OTP_EXPIRATION_SECONDS = 60; // ຕ້ອງກົງກັບການຕັ້ງຄ່າໃນ Supabase Dashboard
    // ດຶງອີເມວທີ່ສົ່ງມາຈາກໜ້າກ່ອນໜ້າຜ່ານ URL
    const urlParams = new URLSearchParams(window.location.search);
    userEmail = urlParams.get('email');

    if (!userEmail) {
        messageArea.textContent = 'ບໍ່ພົບອີເມວ! ກະລຸນາກັບໄປໜ້າລືມລະຫັດຜ່ານໃໝ່.';
        messageArea.style.color = 'red';
        verifyBtn.disabled = true;
    }

    // ດຶງເວລາທີ່ສົ່ງ OTP ຈາກ sessionStorage
    const otpRequestTimestamp = sessionStorage.getItem('otp_request_timestamp');
    let initialTimeLeft = OTP_EXPIRATION_SECONDS;

    if (otpRequestTimestamp) {
        const elapsedTimeInSeconds = Math.floor((Date.now() - parseInt(otpRequestTimestamp, 10)) / 1000);
        initialTimeLeft = OTP_EXPIRATION_SECONDS - elapsedTimeInSeconds;
    }

    if (initialTimeLeft <= 0) {
        otpTimer.textContent = 'ລະຫັດ OTP ໝົດອາຍຸແລ້ວ!';
        showMessage('ລະຫັດ OTP ໝົດອາຍຸແລ້ວ. ກະລຸນາຂໍລະຫັດໃໝ່.', 'red');
        verifyBtn.disabled = true;
    } else {
        // ເລີ່ມໂມງນັບຖອຍຫຼັງ
        let timeLeft = initialTimeLeft;
        otpTimer.textContent = `ລະຫັດ OTP ຈະໝົດອາຍຸໃນ: ${timeLeft} ວິ`;
        timerInterval = setInterval(() => {
            timeLeft--;
            otpTimer.textContent = `ລະຫັດ OTP ຈະໝົດອາຍຸໃນ: ${timeLeft} ວິ`;

            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                otpTimer.textContent = 'ລະຫັດ OTP ໝົດອາຍຸແລ້ວ!';
                showMessage('ລະຫັດ OTP ໝົດອາຍຸແລ້ວ. ກະລຸນາຂໍລະຫັດໃໝ່.', 'red');
                verifyBtn.disabled = true; // ປິດການໃຊ້ງານປຸ່ມ
            }
        }, 1000);
    }
});
function validatePassword(password) {
    // ຕົວຢ່າງ: ລະຫັດຜ່ານຕ້ອງມີຢ່າງໜ້ອຍ 8 ຕົວອັກສອນ, ມີຕົວພິມໃຫຍ່, ຕົວພິມນ້ອຍ, ຕົວເລກ ແລະ ສັນຍາລັກພິເສດ
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+{}\[\]:;<>,.?~\\/-]).{8,}$/;
    return passwordRegex.test(password);
}

function showMessage(message, color) {
    messageArea.textContent = message;
    messageArea.style.color = color;
}

// ຂັ້ນຕອນທີ 1: ຢືນຢັນ OTP
verifyBtn.addEventListener('click', async () => {
    const otp = otpInput.value;
    if (!otp) {
        showMessage('ກະລຸນາປ້ອນລະຫັດ OTP!', 'red');
        return;
    }

    showMessage('ກຳລັງກວດສອບ OTP...', 'blue');
    verifyBtn.disabled = true;

    const { data, error } = await supabase_client.auth.verifyOtp({
        email: userEmail,
        token: otp,
        type: 'email'
    });

    if (error) {
        showMessage('OTP ບໍ່ຖືກຕ້ອງ ຫຼື ໝົດອາຍຸແລ້ວ. ກະລຸນາລອງໃໝ່.', 'red');
        verifyBtn.disabled = false;
    } else {
        // ຢືນຢັນ OTP ສຳເລັດ
        showMessage('', 'green'); // ລ້າງຂໍ້ຄວາມເກົ່າອອກ
        clearInterval(timerInterval); // ຢຸດໂມງນັບຖອຍຫຼັງ
        otpSection.style.display = 'none'; // ເຊື່ອງສ່ວນຂອງ OTP
        otpTimer.style.display = 'none';
        passwordSection.style.display = 'block'; // ສະແດງສ່ວນຂອງການຕັ້ງລະຫັດຜ່ານ
    }
});

// ຂັ້ນຕອນທີ 2: ອັບເດດລະຫັດຜ່ານ
updatePasswordBtn.addEventListener('click', async () => {
    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (!newPassword || !confirmPassword) {
        showMessage('ກະລຸນາປ້ອນຂໍ້ມູນໃຫ້ຄົບຖ້ວນ!', 'red');
        return;
    }
    if (newPassword !== confirmPassword) {
        showMessage('ລະຫັດຜ່ານທັງສອງຊ່ອງບໍ່ກົງກັນ!', 'red');
        return;
    }

    if (!validatePassword(newPassword)) {
        showMessage('ລະຫັດຜ່ານບໍ່ຖືກຕາມເງື່ອນໄຂ. ລະຫັດຜ່ານຕ້ອງມີຢ່າງໜ້ອຍ 8 ຕົວອັກສອນ, ມີຕົວພິມໃຫຍ່, ຕົວພິມນ້ອຍ, ຕົວເລກ ແລະ ສັນຍາລັກພິເສດ.', 'red');
        return;
    }

    showMessage('ກຳລັງບັນທຶກລະຫັດຜ່ານໃໝ່...', 'blue');

    // ເນື່ອງຈາກຂັ້ນຕອນທີ 1 ສຳເລັດ, ຕອນນີ້ເຮົາມີ session ທີ່ສາມາດອັບເດດລະຫັດຜ່ານໄດ້
    const { data: updateData, error: updateError } = await supabase_client.auth.updateUser({
        password: newPassword
    });

    if (updateError) {
        showMessage('ເກີດຂໍ້ຜິດພາດໃນການອັບເດດລະຫັດຜ່ານ: ' + updateError.message, 'red');
        updatePasswordBtn.disabled = false; // ເປີດປຸ່ມຄືນຖ້າເກີດຂໍ້ຜິດພາດ
    } else {
        showMessage('ຕັ້ງລະຫັດຜ່ານໃໝ່ສຳເລັດແລ້ວ! ກຳລັງກັບໄປໜ້າລັອກອິນ...', 'green');
        // ລ້າງ session ຫຼັງຈາກອັບເດດສຳເລັດ
        const { error: signOutError } = await supabase_client.auth.signOut();
        if (signOutError) {
            console.error('Sign out error:', signOutError);
        }
        // ປ່ຽນເສັ້ນທາງໄປໜ້າລັອກອິນຫຼັງຈາກລໍຖ້າ 2 ວິນາທີ
        setTimeout(() => {
            window.location.replace('admin_login.html');
        }, 2000);
    }
});