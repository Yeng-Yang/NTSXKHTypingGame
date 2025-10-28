const loginBtn = document.getElementById('login-btn');
const studentIdInput = document.getElementById('student-id-input');
const errorMessage = document.getElementById('error-message');

loginBtn.addEventListener('click', async () => {
    const studentId = studentIdInput.value.trim();
    if (!studentId) {
        errorMessage.textContent = 'ກະລຸນາປ້ອນລະຫັດນັກຮຽນ!';
        return;
    }

    // ກວດສອບສະຖານະການສອບເສັງ
    const { data: examStatus, error: statusError } = await supabase_client
        .from('quiz_sessions')
        .select('status, end_time') // ດຶງສະຖານະ ແລະ ເວລາສິ້ນສຸດຈາກ session ລ່າສຸດ
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (statusError || !examStatus || examStatus.status === 'NOT_STARTED') {
        errorMessage.textContent = 'ການສອບເສັງຍັງບໍ່ທັນເປີດ!';
        return;
    }

    if (examStatus.status === 'CLOSED') {
        // ເພີ່ມ: ກວດສອບວ່າປິດໄປດົນກວ່າ 5 ນາທີແລ້ວບໍ່
        const endTime = new Date(examStatus.end_time).getTime();
        const now = new Date().getTime();
        const fiveMinutes = 5 * 60 * 1000;

        if (now - endTime > fiveMinutes) {
            errorMessage.textContent = 'ການສອບເສັງໄດ້ປິດລົງດົນເກີນໄປແລ້ວ. ບໍ່ສາມາດເຂົ້າສູ່ລະບົບໄດ້.';
            return;
        }
    }

    // ກວດສອບ ID ກັບ Supabase
    const { data, error } = await supabase_client
        .from('students')
        .select('id')
        .eq('id', studentId)
        .single(); // .single() ຈະສົ່ງຄືນ object ດຽວ ຫຼື null

    if (data) { // ຖ້າພົບ ID ໃນຖານຂໍ້ມູນ
        sessionStorage.setItem('current_student_id', studentId);
        window.location.href = 'index.html';
    } else {
        errorMessage.textContent = 'ບໍ່ພົບລະຫັດນັກຮຽນນີ້ໃນລະບົບ. ກະລຸນາກວດສອບຄືນ!';
    }
});

// ເພີ່ມຟັງຊັນກົດ Enter ເພື່ອເຂົ້າສູ່ລະບົບ
studentIdInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault(); // ປ້ອງກັນການສົ່ງຟອມແບບປົກກະຕິ
        loginBtn.click();
    }
});

// ເພີ່ມ: ຟັງການປ່ຽນແປງສະຖານະການສອບເສັງແບບ Realtime
const examSessionChannel = supabase_client.channel('public:quiz_sessions')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'quiz_sessions' }, payload => {
        const newStatus = payload.new.status;
        // ຖ້າສະຖານະປ່ຽນເປັນ OPEN ແລະ ນັກຮຽນໄດ້ປ້ອນ ID ໄວ້ແລ້ວ
        if ((newStatus === 'OPEN' || newStatus === 'IN_PROGRESS') && studentIdInput.value.trim()) {
            errorMessage.textContent = 'ລະບົບເປີດແລ້ວ! ກຳລັງພະຍາຍາມເຂົ້າສູ່ລະບົບ...';
            errorMessage.style.color = 'green';
            // ສັ່ງຄລິກປຸ່ມລັອກອິນໂດຍອັດຕະໂນມັດ
            loginBtn.click();
        }
    })
    .subscribe();