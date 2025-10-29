document.addEventListener('DOMContentLoaded', async () => {
    const rankedSummaryContainer = document.getElementById('ranked-summary-container');
    const studentId = sessionStorage.getItem('current_student_id');
    const sessionId = sessionStorage.getItem('current_session_id');

    if (!studentId || !sessionId) {
        window.location.replace('login.html');
        return;
    }

    /**
     * ຟັງຊັນບັງຄັບອອກຈາກລະບົບ
     */
    function forceLogout() {
        Swal.fire({
            title: 'ລະບົບປິດແລ້ວ',
            text: 'ອາຈານໄດ້ປິດລະບົບການສອບເສັງແລ້ວ. ກໍາລັງອອກຈາກລະບົບ...',
            icon: 'info',
            timer: 3000,
            showConfirmButton: false,
            allowOutsideClick: false
        }).then(() => {
            sessionStorage.clear();
            window.location.replace('login.html');
        });
    }

    // 1. ດຶງຄະແນນຫຼ້າສຸດຂອງນັກຮຽນຈາກຕາຕະລາງ students ໂດຍກົງ
    const { data: studentData, error: studentError } = await supabase_client
        .from('students')
        .select('score')
        .eq('id', studentId)
        .limit(1)
        .single();

    document.getElementById('student-info').textContent = `ລະຫັດນັກຮຽນ: ${studentId}`;
    document.getElementById('score-display').textContent = studentData ? (studentData.score ?? 'ຍັງບໍ່ມີ') : 'ບໍ່ພົບຄະແນນ';

    // ຟັງຊັນ: ດຶງຂໍ້ມູນ ແລະ ສະແດງຜົນການຈັດອັນດັບ
    async function renderRankingTable() {
        const container = document.getElementById('ranked-summary-content');
        container.innerHTML = '<p>ກຳລັງໂຫຼດຂໍ້ມູນການຈັດອັນດັບ...</p>';

        const { data: rankedData, error: studentsError } = await supabase_client
            .from('students')
            .select('id, name, score')
            .order('score', { ascending: false, nullsFirst: false });

        if (studentsError) {
            container.innerHTML = '<p style="color: red;">ເກີດຂໍ້ຜິດພາດໃນການໂຫຼດຂໍ້ມູນການຈັດອັນດັບ.</p>';
            return;
        }

        const hasAnyScore = rankedData.some(student => student.score !== null && student.score > 0);

        if (!hasAnyScore) {
            container.innerHTML = '<p style="text-align: center; font-size: 1.1em; color: #666;">ຍັງບໍ່ມີຂໍ້ມູນຄະແນນພຽງພໍເພື່ອຈັດອັນດັບ.</p>';
            return;
        }

        const top3 = rankedData.filter(s => s.score !== null).slice(0, 3);
        const rank1 = top3[0];
        const rank2 = top3[1];
        const rank3 = top3[2];

        let podiumHtml = '<div class="podium-container">';
        podiumHtml += rank2 ? `<div class="podium-spot rank-2-spot"><h3>🥈 ອັນດັບ 2</h3><p>${rank2.name}</p><p>ID: ${rank2.id}</p><p class="score">${rank2.score}</p></div>` : '<div></div>';
        podiumHtml += rank1 ? `<div class="podium-spot rank-1-spot"><h3>🥇 ອັນດັບ 1</h3><p>${rank1.name}</p><p>ID: ${rank1.id}</p><p class="score">${rank1.score}</p></div>` : '<div><p>ຍັງບໍ່ມີຂໍ້ມູນຄະແນນ</p></div>';
        podiumHtml += rank3 ? `<div class="podium-spot rank-3-spot"><h3>🥉 ອັນດັບ 3</h3><p>${rank3.name}</p><p>ID: ${rank3.id}</p><p class="score">${rank3.score}</p></div>` : '<div></div>';
        podiumHtml += '</div>';

        let tableHtml = '<h4>ອັນດັບອື່ນໆ</h4><table id="scores-table"><thead><tr><th>ອັນດັບ</th><th>ຊື່ ນັກຮຽນ</th><th>ID ນັກຮຽນ</th><th>ຄະແນນ</th></tr></thead><tbody>';
        rankedData.forEach((data, index) => {
            const isCurrentUser = data.id === studentId;
            let rankClass = 'rank-other';
            if (data.score !== null) {
                const rank = rankedData.filter(s => s.score !== null).findIndex(s => s.id === data.id);
                if (rank === 0) rankClass = 'rank-1';
                else if (rank === 1) rankClass = 'rank-2';
                else if (rank === 2) rankClass = 'rank-3';
            } else {
                rankClass = '';
            }

            if (isCurrentUser) {
                rankClass += ' current-student-row';
            }
            tableHtml += `<tr class="${rankClass.trim()}"><td>${data.score !== null ? (index + 1) : '-'}</td><td>${data.name}</td><td>${data.id}</td><td>${data.score ?? 'ຍັງບໍ່ມີ'}</td></tr>`;
        });
        tableHtml += '</tbody></table>';
        container.innerHTML = podiumHtml + tableHtml;
    }

    let typingInterval;
    function animateTyping(element, text) {
        if (typingInterval) clearInterval(typingInterval);

        let i = 0;
        let isDeleting = false;

        typingInterval = setInterval(() => {
            if (isDeleting) {
                element.textContent = '';
                i = 0;
                isDeleting = false;
            } else {
                if (i < text.length) {
                    element.textContent = text.substring(0, i + 1);
                    i++;
                } else {
                    setTimeout(() => {
                        isDeleting = true;
                    }, 2000);
                }
            }
        }, 80);
    }

    async function checkAndRender() {
        const { data: sessionStatus, error } = await supabase_client
            .from('quiz_sessions')
            .select('status')
            .eq('id', sessionId)
            .single();

        if (error) {
            console.error("Error checking session status:", error);
            rankedSummaryContainer.style.display = 'block';
            const container = document.getElementById('ranked-summary-content');
            container.innerHTML = '<p style="color: red;">ເກີດຂໍ້ຜິດພາດໃນການກວດສອບສະຖານະ.</p>';
            return;
        }

        if (sessionStatus && sessionStatus.status === 'CLOSED') {
            forceLogout();
            return; // ຢຸດການເຮັດວຽກຕໍ່
        }

        if (sessionStatus && sessionStatus.status === 'RESULTS_AVAILABLE') {
            rankedSummaryContainer.style.display = 'block';
            renderRankingTable();
        } else {
            rankedSummaryContainer.style.display = 'block';
            const container = document.getElementById('ranked-summary-content');
            container.innerHTML = `
                <div class="waiting-animation-container">
                    <h2 style="text-align: left; min-height: 1.5em;"><span class="hourglass-anim">⏳</span> <span id="typing-text"></span><span class="typing-caret">|</span></h2>
                </div>`;
            const typingElement = document.getElementById('typing-text');
            animateTyping(typingElement, "ກະລຸນາລໍຖ້າ ອາຈານປະກາດຄະແນນ...");
        }
    }

    await checkAndRender();

    /**
     * ກວດສອບສະຖານະເປັນໄລຍະໆ (Fallback Mechanism)
     * ເພື່ອຮັບປະກັນວ່າຈະອອກຈາກລະບົບສະເໝີເມື່ອສະຖານະເປັນ CLOSED
     */
    function startPeriodicStateCheck() {
        setInterval(async () => {
            if (!sessionId) return;

            const { data, error } = await supabase_client
                .from('quiz_sessions')
                .select('status')
                .eq('id', sessionId)
                .single();

            if (data && data.status === 'CLOSED') {
                forceLogout();
            }
        }, 15000); // ກວດສອບທຸກໆ 15 ວິນາທີ
    }

    const sessionChannel = supabase_client.channel(`session-status-channel-${sessionId}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'quiz_sessions', filter: `id=eq.${sessionId}` }, payload => {
            const newStatus = payload.new.status;
            const oldStatus = payload.old ? payload.old.status : '';

            if (newStatus === 'RESULTS_AVAILABLE' && oldStatus !== 'RESULTS_AVAILABLE') {
                Swal.fire({ icon: 'success', title: 'ປະກາດຄະແນນ!', text: 'ກຳລັງສະແດງຜົນການຈັດອັນດັບ...' });
            }

            if (newStatus === 'CLOSED') {
                forceLogout();
                return;
            }
            
            checkAndRender();
        })
        .subscribe();

    const studentScoresChannel = supabase_client.channel('student-scores-channel')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'students' }, (payload) => {
            console.log('ກວດພົບການອັບເດດຄະແນນນັກຮຽນ:', payload);
            
            if (rankedSummaryContainer.style.display === 'block') {
                renderRankingTable();
            }
            
            if (payload.new.id === studentId) {
                document.getElementById('score-display').textContent = payload.new.score ?? 'ຍັງບໍ່ມີ';
            }
        })
        .subscribe();
        
    startPeriodicStateCheck(); // ເລີ່ມກົນໄກກວດສອບສຳຮອງ
});
