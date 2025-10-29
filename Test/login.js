const loginBtn = document.getElementById('login-btn');
const studentIdInput = document.getElementById('student-id-input');
const errorMessage = document.getElementById('error-message');

loginBtn.addEventListener('click', async () => {
    const studentId = studentIdInput.value.trim();
    if (!studentId) {
        errorMessage.textContent = 'ກະລຸນາປ້ອນລະຫັດນັກຮຽນ!';
        return;
    }

    // 1. ກວດສອບວ່າ ID ນັກຮຽນມີໃນລະບົບບໍ່
    const { data: student, error: studentError } = await supabase_client
        .from('students')
        .select('id')
        .eq('id', studentId)
        .single();

    if (studentError || !student) {
        errorMessage.textContent = 'ບໍ່ພົບລະຫັດນັກຮຽນນີ້ໃນລະບົບ. ກະລຸນາກວດສອບຄືນ!';
        return;
    }

    // 2. ກວດຫາຫ້ອງສອບເສັງທີ່ກຳລັງເປີດຮັບ (OPEN) ຫຼື ກຳລັງດຳເນີນ (IN_PROGRESS)
    const { data: activeSession, error: sessionError } = await supabase_client
        .from('quiz_sessions')
        .select('id, status')
        .in('status', ['OPEN', 'IN_PROGRESS']) // ອະນຸຍາດໃຫ້ເຂົ້າສະເພາະຫ້ອງທີ່ເປີດຮັບ ຫຼື ກຳລັງສອບເສັງ
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (sessionError || !activeSession) {
        // ກວດສອບເພີ່ມເຕີມເພື່ອໃຫ້ຂໍ້ຄວາມແຈ້ງເຕືອນຊັດເຈນຂຶ້ນ
        const { data: latestSession, error: latestSessionError } = await supabase_client
            .from('quiz_sessions')
            .select('status')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
 
        if (latestSession && (latestSession.status === 'CLOSED' || latestSession.status === 'RESULTS_AVAILABLE')) {
            // ຖ້າຫ້ອງລ່າສຸດປິດໄປແລ້ວ
            Swal.fire({
                title: 'ບໍ່ສາມາດເຂົ້າລະບົບໄດ້',
                text: 'ການສອບເສັງໄດ້ສິ້ນສຸດລົງແລ້ວ.',
                icon: 'info',
                timer: 5000, // 5 ວິນາທີ
                showConfirmButton: false,
                timerProgressBar: true
            });
        } else { 
            // ຖ້າບໍ່ມີຫ້ອງໃດໆເລີຍ ຫຼື ຍັງບໍ່ທັນເລີ່ມ
            errorMessage.textContent = 'ບໍ່ມີຫ້ອງສອບເສັງທີ່ເປີດຮັບໃນຂະນະນີ້. ກະລຸນາລໍຖ້າ...';
        }
        return;
    }

    // 3. ຖ້າພົບຫ້ອງທີ່ເປີດ, ໃຫ້ໄປຕາມສະຖານະຂອງຫ້ອງນັ້ນ
    sessionStorage.setItem('current_student_id', student.id);
    sessionStorage.setItem('current_session_id', activeSession.id);

    // ປັບປຸງ: ກວດສອບວ່ານັກຮຽນໄດ້ສົ່ງຄຳຕອບໃນ session ນີ້ແລ້ວບໍ່
    if (activeSession.status === 'IN_PROGRESS') { // ບໍ່ຈຳເປັນຕ້ອງກວດ RESULTS_AVAILABLE ແລ້ວ
        const { data: existingSubmission, error: submissionCheckError } = await supabase_client
            .from('submissions')
            .select('id')
            .eq('student_id', student.id)
            .eq('session_id', activeSession.id)
            .single();

        if (existingSubmission) {
            // ຖ້າສົ່ງແລ້ວ, ໃຫ້ໄປໜ້າຜົນຄະແນນເລີຍ
            window.location.href = 'final_results.html';
            return;
        }
    }

    if (activeSession.status === 'OPEN') {
        // ຖ້າຫ້ອງເປີດຮັບ, ໃຫ້ໄປທີ່ຫ້ອງລໍຖ້າ
        window.location.href = 'index.html';
    } else if (activeSession.status === 'IN_PROGRESS') {
        // ຖ້າຫ້ອງກຳລັງສອບເສັງ, ໃຫ້ໄປທີ່ໜ້າສອບເສັງເລີຍ
        window.location.href = 'index.html'; // ປັບປຸງ: ປ່ຽນເປັນ index.html
    }
});

// ເພີ່ມຟັງຊັນກົດ Enter ເພື່ອເຂົ້າສູ່ລະບົບ
studentIdInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault(); // ປ້ອງກັນການສົ່ງຟອມແບບປົກກະຕິ
        loginBtn.click();
    }
});