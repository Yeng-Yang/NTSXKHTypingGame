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

        const top3 = rankedData.filter(s => s.score !== null).slice(0, 3);
        const rank1 = top3[0];
        const rank2 = top3[1];
        const rank3 = top3[2];

        let podiumHtml = '<div class="podium-container">';
        podiumHtml += rank2 ? `<div class="podium-spot rank-2-spot"><h3>🥈 ອັນດັບ 2</h3><p>${rank2.name}</p><p>ID: ${rank2.id}</p><p class="score">${rank2.score}</p></div>` : '<div></div>';
        podiumHtml += rank1 ? `<div class="podium-spot rank-1-spot"><h3>🥇 ອັນດັບ 1</h3><p>${rank1.name}</p><p>ID: ${rank1.id}</p><p class="score">${rank1.score}</p></div>` : '<div></div>';
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

    /**
     * ຟັງຊັນ: ສະແດງບົດກວດກາຄືນພ້ອມຄຳຕອບທີ່ຖືກຕ້ອງ
     */
    async function renderQuizReview() {
        const reviewContainer = document.getElementById('quiz-review-content');
        const reviewMainContainer = document.getElementById('quiz-review-container');
        reviewContainer.innerHTML = '<p>ກຳລັງໂຫຼດຂໍ້ມູນຄຳຕອບ...</p>';

        // 1. ດຶງຄຳຖາມທັງໝົດ
        const { data: questions, error: questionsError } = await supabase_client
            .from('questions')
            .select('*')
            .order('created_at', { ascending: true });

        if (questionsError) {
            reviewContainer.innerHTML = '<p style="color: red;">ເກີດຂໍ້ຜິດພາດໃນການໂຫຼດຄຳຖາມ.</p>';
            return;
        }

        // 2. ດຶງຄຳຕອບຂອງນັກຮຽນ
        const { data: submission, error: submissionError } = await supabase_client
            .from('submissions')
            .select('answers')
            .eq('student_id', studentId)
            .eq('session_id', sessionId)
            .single();

        if (submissionError || !submission || !submission.answers) {
            reviewContainer.innerHTML = '<p>ບໍ່ພົບຂໍ້ມູນຄຳຕອບຂອງທ່ານ.</p>';
            return;
        }

        reviewMainContainer.style.display = 'block';
        reviewContainer.innerHTML = ''; // ລ້າງຂໍ້ຄວາມ "ກຳລັງໂຫຼດ..."

        const userAnswers = submission.answers;

        questions.forEach((q, index) => {
            const questionBlock = document.createElement('div');
            questionBlock.className = 'question-block review-block'; // ເພີ່ມ class ເພື່ອ style

            let content = `<div class="question-text">${index + 1}. ${q.question}</div>`;
            if (q.image_url) {
                content += `<img src="${q.image_url}" alt="Question Image" class="question-image">`;
            }

            const userAnswer = userAnswers[index];
            let isCorrect = false;

            // ກວດສອບຄຳຕອບ ແລະ ສ້າງ HTML
            switch (q.type) {
                case 'multiple-choice':
                case 'image-multiple-choice':
                    isCorrect = userAnswer === q.answer;
                    content += '<div class="options-container">';
                    q.options.forEach(option => {
                        let className = '';
                        if (option === q.answer) {
                            className = 'correct-answer'; // ຄຳຕອບທີ່ຖືກ
                        }
                        if (option === userAnswer && !isCorrect) {
                            className = 'incorrect-answer'; // ຄຳຕອບທີ່ຜູ້ໃຊ້ເລືອກ (ຜິດ)
                        }
                        content += `<div class="review-option ${className}">${option}</div>`;
                    });
                    content += '</div>';
                    break;

                case 'fill-in':
                case 'image-fill-in':
                    isCorrect = userAnswer && userAnswer.toString().trim().toLowerCase() === q.answer.toString().trim().toLowerCase();
                    content += `<p>ຄຳຕອບຂອງທ່ານ: <span class="${isCorrect ? 'correct-answer' : 'incorrect-answer'}">${userAnswer || '<i>(ບໍ່ໄດ້ຕອບ)</i>'}</span></p>`;
                    if (!isCorrect) {
                        content += `<p>ຄຳຕອບທີ່ຖືກຕ້ອງ: <span class="correct-answer">${q.answer}</span></p>`;
                    }
                    break;
                
                // ສາມາດເພີ່ມການສະແດງຜົນສຳລັບຄຳຖາມປະເພດອື່ນໆໄດ້ທີ່ນີ້ (matching, drag-fill-in)

                default:
                     content += `<p><i>(ບໍ່ຮອງຮັບການສະແດງຜົນຄຳຕອບສຳລັບຄຳຖາມປະເພດນີ້)</i></p>`;
                     break;
            }

            // ເພີ່ມໄອຄອນຖືກ/ຜິດ ໃສ່ຫົວຂໍ້ຄຳຖາມ
            if (isCorrect) {
                questionBlock.classList.add('correct-question');
            } else {
                questionBlock.classList.add('incorrect-question');
            }

            questionBlock.innerHTML = content;
            reviewContainer.appendChild(questionBlock);
        });
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

        // ເງື່ອນໄຂໃໝ່: ສະແດງຜົນການຈັດອັນດັບສະເພາະເມື່ອອາຈານປະກາດຄະແນນ (RESULTS_AVAILABLE) ເທົ່ານັ້ນ
        if (sessionStatus && sessionStatus.status === 'RESULTS_AVAILABLE') {
            rankedSummaryContainer.style.display = 'block';
            renderRankingTable();
            renderQuizReview(); // ເອີ້ນຟັງຊັນສະແດງຄຳຕອບ
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
