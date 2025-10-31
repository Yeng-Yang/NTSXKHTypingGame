const loginBtn = document.getElementById('login-btn');
const studentIdInput = document.getElementById('student-id-input');
const errorMessage = document.getElementById('error-message');

loginBtn.addEventListener('click', async () => {
    const studentId = studentIdInput.value.trim();
    errorMessage.textContent = ''; // ລ້າງຂໍ້ຄວາມຜິດພາດເກົ່າອອກກ່ອນ

    if (!studentId) {
        Swal.fire({
            icon: 'warning',
            title: 'ຂໍ້ມູນບໍ່ຄົບຖ້ວນ',
            text: 'ກະລຸນາປ້ອນລະຫັດນັກຮຽນຂອງທ່ານ!',
        });
        return;
    }

    // 1. ກວດສອບວ່າ ID ນັກຮຽນມີໃນລະບົບບໍ່
    const { data: student, error: studentError } = await supabase_client
        .from('students')
        .select('id, class_level') // ດຶງຊັ້ນຮຽນຂອງນັກຮຽນນຳ
        .eq('id', studentId)
        .single();

    if (studentError || !student) {
        Swal.fire({
            icon: 'error',
            title: 'ລະຫັດນັກຮຽນບໍ່ຖືກຕ້ອງ',
            text: 'ບໍ່ພົບລະຫັດນັກຮຽນນີ້ໃນລະບົບ. ກະລຸນາກວດສອບຄືນ!',
        });
        return;
    }

    // 2. ກວດຫາຫ້ອງສອບເສັງທີ່ກຳລັງເປີດຮັບ (OPEN) ຫຼື ກຳລັງດຳເນີນ (IN_PROGRESS)
    // ເພີ່ມເງື່ອນໄຂ: ຕ້ອງເປັນຫ້ອງສອບເສັງຂອງຊັ້ນຮຽນນັກຮຽນຄົນນັ້ນ
    const { data: activeSession, error: sessionError } = await supabase_client
        .from('quiz_sessions')
        .select('id, status, target_class_level')
        .in('status', ['OPEN', 'IN_PROGRESS'])
        .eq('target_class_level', student.class_level) // ກວດສອບຊັ້ນຮຽນໃຫ້ກົງກັນ
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (sessionError || !activeSession) {
        // ກວດສອບເພີ່ມເຕີມເພື່ອໃຫ້ຂໍ້ຄວາມແຈ້ງເຕືອນຊັດເຈນຂຶ້ນ
        const { data: latestSession, error: latestSessionError } = await supabase_client
            .from('quiz_sessions')
            .select('status')
            .eq('target_class_level', student.class_level) // ກວດສອບຫ້ອງຫຼ້າສຸດຂອງຊັ້ນຮຽນນີ້
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
            Swal.fire({
                icon: 'info',
                title: 'ຍັງບໍ່ເຖິງເວລາ',
                text: `ບໍ່ມີຫ້ອງສອບເສັງສຳລັບຊັ້ນຮຽນ '${student.class_level}' ທີ່ເປີດຮັບໃນຂະນະນີ້. ກະລຸນາລໍຖ້າ...`,
                timer: 5000
            });
        }
        return;
    }

    // 3. ຖ້າພົບຫ້ອງທີ່ເປີດ, ໃຫ້ໄປຕາມສະຖານະຂອງຫ້ອງນັ້ນ
    sessionStorage.setItem('current_student_id', student.id);
    sessionStorage.setItem('current_session_id', activeSession.id);
    sessionStorage.setItem('current_class_level', student.class_level); // ເກັບຊັ້ນຮຽນໄວ້ໃນ sessionStorage

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