document.addEventListener('DOMContentLoaded', async () => {
    const rankedSummaryContainer = document.getElementById('ranked-summary-container');
    const logoutTimerContainer = document.getElementById('logout-timer-container');
    const studentId = sessionStorage.getItem('current_student_id');
    if (!studentId) {
        window.location.href = 'login.html';
        return;
    }

    // 1. ດຶງຄະແນນ ແລະ session_id ຈາກການສົ່ງລ່າສຸດຂອງນັກຮຽນຄົນນີ້
    const { data: latestSubmission, error: submissionError } = await supabase_client
        .from('submissions')
        .select('score, session_id')
        .eq('student_id', studentId)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .single();

    document.getElementById('student-info').textContent = `ລະຫັດນັກຮຽນ: ${studentId}`;
    document.getElementById('score-display').textContent = latestSubmission ? latestSubmission.score : 'ບໍ່ພົບຄະແນນ';

    // Function to start the 5-minute logout timer
    function startLogoutTimer() {
        logoutTimerContainer.style.display = 'block';
        const timerDisplay = document.getElementById('logout-timer');

        // ກວດສອບວ່າເຄີຍຕັ້ງເວລາໝົດອາຍຸໄວ້ແລ້ວບໍ່
        let expiryTime = sessionStorage.getItem('logoutExpiry');
        if (!expiryTime) {
            // ຖ້າຍັງບໍ່ມີ, ໃຫ້ຕັ້ງເວລາໝົດອາຍຸໃໝ່ (5 ນາທີນັບຈາກນີ້)
            expiryTime = new Date().getTime() + 5 * 60 * 1000;
            sessionStorage.setItem('logoutExpiry', expiryTime);
        } else {
            // ຖ້າມີແລ້ວ, ໃຫ້ແປງຈາກ String ກັບມາເປັນ Number
            expiryTime = parseInt(expiryTime, 10);
        }

        // ຄຳນວນເວລາທີ່ເຫຼືອຈາກເວລາໝົດອາຍຸ
        let duration = Math.round((expiryTime - new Date().getTime()) / 1000);

        const interval = setInterval(() => {
            const minutes = Math.floor(duration / 60);
            const seconds = duration % 60;

            timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

            if (--duration < 0) {
                clearInterval(interval);
                // Time's up, log out the user
                Swal.fire({
                    title: 'ໝົດເວລາເບິ່ງຄະແນນ',
                    text: 'ກຳລັງອອກຈາກລະບົບ...',
                    icon: 'info',
                    timer: 2000,
                    showConfirmButton: false,
                    allowOutsideClick: false
                }).then(() => {
                    sessionStorage.clear(); // Clear all session data
                    window.location.replace('login.html');
                });
            }
        }, 1000);
    }

    // Function to fetch and render the ranking table
    async function renderRankingTable(sessionId, studentId) {
        const container = document.getElementById('ranked-summary-content');
        container.innerHTML = '<p>ກຳລັງໂຫຼດຂໍ້ມູນການຈັດອັນດັບ...</p>';

        // 1. ດຶງຂໍ້ມູນນັກຮຽນທັງໝົດ
        const { data: students, error: studentsError } = await supabase_client
            .from('students')
            .select('id, name');

        if (studentsError) {
            container.innerHTML = '<p style="color: red;">ເກີດຂໍ້ຜິດພາດໃນການໂຫຼດຂໍ້ມູນນັກຮຽນ.</p>';
            return;
        }

        // 2. ດຶງຂໍ້ມູນການສົ່ງຄຳຕອບທັງໝົດ
        const { data: submissions, error: submissionsError } = await supabase_client
            .from('submissions')
            .select('student_id, score, submitted_at');

        if (submissionsError) {
            container.innerHTML = '<p style="color: red;">ເກີດຂໍ້ຜິດພາດໃນການໂຫຼດຂໍ້ມູນຄະແນນ.</p>';
            return;
        }

        // 3. ຊອກຫາຄະແນນຫຼ້າສຸດຂອງນັກຮຽນແຕ່ລະຄົນ
        const latestScores = new Map();
        submissions.forEach(sub => {
            const existing = latestScores.get(sub.student_id);
            if (!existing || new Date(sub.submitted_at) > new Date(existing.submitted_at)) {
                latestScores.set(sub.student_id, sub.score);
            }
        });

        // 4. ສ້າງຂໍ້ມູນລວມ ແລະ ຈັດອັນດັບ
        const rankedData = students.map(student => ({
            ...student,
            score: latestScores.get(student.id) ?? null
        })).sort((a, b) => (b.score ?? -1) - (a.score ?? -1));

        // 5. ສ້າງ Podium ແລະ ຕາຕະລາງ
        const top3 = rankedData.filter(s => s.score !== null).slice(0, 3);
        const rank1 = top3[0], rank2 = top3[1], rank3 = top3[2];

        let podiumHtml = '<div class="podium-container">';
        podiumHtml += rank2 ? `<div class="podium-spot rank-2-spot"><h3>🥈 ອັນດັບ 2</h3><p>${rank2.name}</p><p>ID: ${rank2.id}</p><p class="score">${rank2.score}</p></div>` : '<div></div>';
        podiumHtml += rank1 ? `<div class="podium-spot rank-1-spot"><h3>🥇 ອັນດັບ 1</h3><p>${rank1.name}</p><p>ID: ${rank1.id}</p><p class="score">${rank1.score}</p></div>` : '<div><p>ຍັງບໍ່ມີຂໍ້ມູນຄະແນນ</p></div>';
        podiumHtml += rank3 ? `<div class="podium-spot rank-3-spot"><h3>🥉 ອັນດັບ 3</h3><p>${rank3.name}</p><p>ID: ${rank3.id}</p><p class="score">${rank3.score}</p></div>` : '<div></div>';
        podiumHtml += '</div>';

        let tableHtml = '<h4>ລາຍລະອຽດທຸກອັນດັບ</h4><table id="scores-table"><thead><tr><th>ອັນດັບ</th><th>ຊື່ ນັກຮຽນ</th><th>ID ນັກຮຽນ</th><th>ຄະແນນ</th></tr></thead><tbody>';
        rankedData.forEach((data, index) => {
            const isCurrentUser = data.id === studentId;
            let rankClass = '';
            if (data.score !== null) {
                const rank = rankedData.filter(s => s.score !== null).findIndex(s => s.id === data.id);
                if (rank === 0) rankClass = 'rank-1';
                else if (rank === 1) rankClass = 'rank-2';
                else if (rank === 2) rankClass = 'rank-3';
            }
            if (isCurrentUser) {
                rankClass += ' current-student-row';
            }
            tableHtml += `<tr class="${rankClass.trim()}"><td>${data.score !== null ? (index + 1) : '-'}</td><td>${data.name}</td><td>${data.id}</td><td>${data.score ?? 'ຍັງບໍ່ມີ'}</td></tr>`;
        });
        tableHtml += '</tbody></table>';
        container.innerHTML = podiumHtml + tableHtml;
    }

    // Function to check status and decide what to render
    async function checkAndRender(sessionId, studentId) {
        const { data: sessionStatus, error } = await supabase_client
            .from('quiz_sessions')
            .select('status')
            .eq('id', sessionId)
            .single();

        if (sessionStatus && sessionStatus.status === 'CLOSED') {
            rankedSummaryContainer.style.display = 'block'; // ສະແດງ container
            startLogoutTimer(); // ເລີ່ມນັບເວລາ 5 ນາທີ
            renderRankingTable(sessionId, studentId);
        } else {
            rankedSummaryContainer.innerHTML = '<h2>⏳ ກະລຸນາລໍຖ້າ...</h2><p>ຈະສະແດງອັນດັບລວມຫຼັງຈາກການສອບເສັງສິ້ນສຸດລົງ.</p>';
        }
    }

    if (latestSubmission && latestSubmission.session_id) {
        const sessionId = latestSubmission.session_id;
        // Initial check when page loads
        await checkAndRender(sessionId, studentId);

        // Subscribe to realtime updates for the session status
        const channel = supabase_client.channel(`public:quiz_sessions:id=eq.${sessionId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'quiz_sessions', filter: `id=eq.${sessionId}` }, payload => {
                if (payload.new.status === 'CLOSED') {
                    // ກວດສອບກ່ອນວ່າໄດ້ເລີ່ມນັບເວລາແລ້ວ ຫຼື ບໍ່
                    if (logoutTimerContainer.style.display !== 'block') {
                        Swal.fire({ icon: 'success', title: 'ການສອບເສັງສິ້ນສຸດແລ້ວ!', text: 'ກຳລັງສະແດງຜົນການຈັດອັນດັບ...' });
                        rankedSummaryContainer.style.display = 'block'; // ສະແດງ container
                        startLogoutTimer(); // ເລີ່ມນັບເວລາ 5 ນາທີ
                        renderRankingTable(sessionId, studentId);
                    }
                }
            })
            .subscribe();
    }
});