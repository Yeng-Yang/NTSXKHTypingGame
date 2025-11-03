document.addEventListener('DOMContentLoaded', async () => {
    const rankedSummaryContainer = document.getElementById('ranked-summary-container');
    const studentId = sessionStorage.getItem('current_student_id');
    const sessionId = sessionStorage.getItem('current_session_id');
    const classLevel = sessionStorage.getItem('current_class_level'); // ດຶງຊັ້ນຮຽນຈາກ sessionStorage

    if (!studentId || !sessionId || !classLevel) {
        window.location.replace('login.html'); // ຖ້າບໍ່ມີຂໍ້ມູນຄົບ, ກັບໄປໜ້າ login
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

    // ຟັງຊັນ: ດຶງຂໍ້ມູນ ແລະ ສະແດງຜົນການຈັດອັນດັບ
    async function renderRankingTable() {
        const container = document.getElementById('ranked-summary-content');
        container.innerHTML = '<p>ກຳລັງໂຫຼດຂໍ້ມູນການຈັດອັນດັບ...</p>';
        
        // ປັບປຸງ: ດຶງຂໍ້ມູນນັກຮຽນໂດຍກັ່ນຕອງຕາມຊັ້ນຮຽນຂອງຜູ້ໃຊ້ສະເໝີ
        const { data: rankedData, error: studentsError } = await supabase_client
            .from('students')
            .select('id, name, score')
            .eq('class_level', classLevel) // ກັ່ນຕອງສະເພາະນັກຮຽນໃນຊັ້ນດຽວກັນກັບຜູ້ໃຊ້
            .order('score', { ascending: false, nullsFirst: false });

        if (studentsError) {
            container.innerHTML = '<p style="color: red;">ເກີດຂໍ້ຜິດພາດໃນການໂຫຼດຂໍ້ມູນການຈັດອັນດັບ.</p>';
            return;
        }

        const top3 = rankedData.filter(s => s.score !== null).slice(0, 3);
        const rank1 = top3[0];
        const rank2 = top3[1];
        const rank3 = top3[2];

        // ປັບປຸງ: ເອົາຊື່ອອກຈາກແທ່ນລາງວັນ
        let podiumHtml = '<div class="podium-container">';
        podiumHtml += rank2 ? `<div class="podium-spot rank-2-spot"><h3>🥈 ອັນດັບ 2</h3><p>ID: ${rank2.id}</p><p class="score">${rank2.score}</p></div>` : '<div></div>';
        podiumHtml += rank1 ? `<div class="podium-spot rank-1-spot"><h3>🥇 ອັນດັບ 1</h3><p>ID: ${rank1.id}</p><p class="score">${rank1.score}</p></div>` : '<div></div>';
        podiumHtml += rank3 ? `<div class="podium-spot rank-3-spot"><h3>🥉 ອັນດັບ 3</h3><p>ID: ${rank3.id}</p><p class="score">${rank3.score}</p></div>` : '<div></div>';
        podiumHtml += '</div>';
        podiumHtml += '<div class="podium-quote"><p>"ຂໍຊົມເຊີຍ ຂໍໃຫ້ທຸກຄົນຈົ່ງຕັ້ງໃຈຮໍ່າຮຽນ"</p></div>';

        // ເພີ່ມ: ຊອກຫາຂໍ້ມູນຂອງນັກຮຽນປັດຈຸບັນ ແລະ ສ້າງສ່ວນສະແດງຜົນ
        const currentUserData = rankedData.find(s => s.id === studentId);
        if (currentUserData) {
            const currentUserRankIndex = rankedData.findIndex(s => s.id === studentId);
            const currentUserRankDisplay = currentUserRankIndex !== -1 ? currentUserRankIndex + 1 : 'N/A';
            podiumHtml += `
                <div class="current-student-summary">
                    <span>${currentUserData.name} (ID: ${currentUserData.id})</span>
                    <span>ຄະແນນ: <strong class="score-value">${currentUserData.score ?? 'N/A'}</strong></span>
                    <span>ອັນດັບຂອງທ່ານ: <strong class="score-value">${currentUserRankDisplay}</strong></span>
                </div>
            `;
        }

        // ກວດສອບອັນດັບຂອງນັກຮຽນທີ່ກຳລັງເບິ່ງຢູ່
        const currentUserRank = rankedData.findIndex(s => s.id === studentId);
        if (currentUserRank >= 0 && currentUserRank < 3) {
            // ຖ້າໄດ້ອັນດັບ 1, 2, ຫຼື 3 ໃຫ້ສະແດງ Confetti
            setTimeout(() => {
                const duration = 5 * 1000;
                const animationEnd = Date.now() + duration;
                const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

                function randomInRange(min, max) {
                    return Math.random() * (max - min) + min;
                }

                const interval = setInterval(function() {
                    const timeLeft = animationEnd - Date.now();
                    if (timeLeft <= 0) return clearInterval(interval);
                    const particleCount = 50 * (timeLeft / duration);
                    confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
                    confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
                }, 250);
            }, 500); // หน่วงเวลาเล็กน้อยเพื่อให้หน้าเว็บโหลดเสร็จก่อน
        }

        // ປັບປຸງ: ສະແດງນັກຮຽນທຸກຄົນໃນຕາຕະລາງຄືນ
        let tableHtml = '<h4>ຕາຕະລາງຈັດອັນດັບ</h4><table id="scores-table"><thead><tr><th>ອັນດັບ</th><th>ຊື່ ນັກຮຽນ</th><th>ID ນັກຮຽນ</th><th>ຄະແນນ</th></tr></thead><tbody>';
        rankedData.forEach((data, index) => {
            const isCurrentUser = data.id === studentId;
            let rankClass = 'rank-other';
            if (data.score !== null) {
                const rank = index;
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

    /**
     * ຟັງຊັນ: ສະແດງບົດກວດກາຄືນພ້ອມຄຳຕອບທີ່ຖືກຕ້ອງ
     */
    async function renderQuizReview() {
        const reviewContainer = document.getElementById('quiz-review-content');
        const reviewMainContainer = document.getElementById('quiz-review-container');
        reviewContainer.innerHTML = '<p>ກຳລັງໂຫຼດຂໍ້ມູນຄຳຕອບ...</p>';

        // 1. ດຶງຄຳຖາມທັງໝົດ
        // ປັບປຸງ: ດຶງຄຳຖາມຕາມ target_class_level ຂອງ session
        const { data: sessionData, error: sessionError } = await supabase_client.from('quiz_sessions').select('target_class_level').eq('id', sessionId).single();

        if (sessionError || !sessionData?.target_class_level) {
            reviewContainer.innerHTML = '<p style="color: red;">ບໍ່ສາມາດກຳນົດຊັ້ນຮຽນຂອງຫ້ອງສອບເສັງໄດ້.</p>';
            return;
        }

        let questionsQuery = supabase_client
            .from('questions')
            .select('*');

        const targetClassLevel = sessionData.target_class_level;

        if (targetClassLevel !== 'all') {
            questionsQuery = questionsQuery.eq('class_level', targetClassLevel); // ກັ່ນຕອງຕາມຊັ້ນຮຽນຂອງຫ້ອງເສັງ
        } else {
            questionsQuery = questionsQuery.eq('class_level', classLevel); // ຖ້າຫ້ອງເປັນ 'all', ໃຫ້ກັ່ນຕອງຕາມຊັ້ນຮຽນຂອງນັກຮຽນ
        }
        const { data: questions, error: questionsError } = await questionsQuery
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

            const userAnswer = userAnswers[q.id]; // ປັບປຸງ: ໃຊ້ q.id ເພື່ອດຶງຄຳຕອບທີ່ຖືກຕ້ອງ
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
                    if (!userAnswer) {
                        content += `<p class="unanswered-message"><i>ທ່ານຍັງບໍ່ຕອບຄຳຖາມນີ້</i></p>`;
                    }
                    break;

                case 'fill-in':
                case 'image-fill-in':
                    isCorrect = userAnswer && userAnswer.toString().trim().toLowerCase() === q.answer.toString().trim().toLowerCase();
                    content += `<p>ຄຳຕອບຂອງທ່ານ: <span class="${isCorrect ? 'correct-answer' : 'incorrect-answer'}">${userAnswer || '<i>ທ່ານຍັງບໍ່ຕອບຄຳຖາມນີ້</i>'}</span></p>`;
                    if (!isCorrect) {
                        content += `<p>ຄຳຕອບທີ່ຖືກຕ້ອງ: <span class="correct-answer">${q.answer}</span></p>`;
                    }
                    break;
                
                case 'drag-fill-in':
                    let correctBlanks = 0;
                    const totalBlanks = q.answer.length;
                    let blankIndex = 0;

                    const questionWithReview = q.question.replace(/__BLANK__/g, () => {
                        const userWord = userAnswer ? (userAnswer[blankIndex] || '<i>(ວ່າງ)</i>') : '<i>(ບໍ່ໄດ້ຕອບ)</i>';
                        const correctWord = q.answer[blankIndex];
                        const isBlankCorrect = userWord.trim().toLowerCase() === correctWord.trim().toLowerCase();
                        
                        if (isBlankCorrect) correctBlanks++;

                        let blankHTML = `<span class="review-blank ${isBlankCorrect ? 'correct-answer' : 'incorrect-answer'}">${userWord}</span>`;
                        if (!isBlankCorrect) {
                            blankHTML += ` <span class="correct-answer-inline">(${correctWord})</span>`;
                        }
                        blankIndex++;
                        return blankHTML;
                    });

                    isCorrect = correctBlanks === totalBlanks;
                    content += `<div class="drag-fill-review">${questionWithReview}</div>`;
                    if (!userAnswer || Object.keys(userAnswer).length === 0) {
                        content += `<p class="unanswered-message"><i>ທ່ານຍັງບໍ່ຕອບຄຳຖາມນີ້</i></p>`;
                        // ເພີ່ມ: ສະແດງຄຳຕອບທີ່ຖືກຕ້ອງທັງໝົດຖ້າບໍ່ໄດ້ຕອບ
                        let correctSentence = q.question;
                        q.answer.forEach(correctWord => {
                            correctSentence = correctSentence.replace('__BLANK__', ` <span class="correct-answer">${correctWord}</span> `);
                        });
                        content += `
                            <p style="margin-top:10px;"><strong>ຄຳຕອບທີ່ຖືກຕ້ອງ:</strong></p>
                            <div class="drag-fill-review">${correctSentence}</div>
                        `;
                    }
                    break;

                case 'matching-text-text':
                case 'matching-text-image':
                    let correctMatches = 0;
                    const totalPairs = q.pairs.length;
                    let matchingReviewHTML = '<div class="matching-review-container">';

                    q.pairs.forEach((pair, pairIndex) => {
                        const userMatch = userAnswer ? (userAnswer[pairIndex] || null) : null;
                        const isMatchCorrect = userMatch === pair.match;

                        if (isMatchCorrect) correctMatches++;

                        const userMatchContent = userMatch ? (q.type === 'matching-text-image' ? `<img src="${userMatch}" class="review-match-img">` : userMatch) : '<i>(ບໍ່ໄດ້ຈັບຄູ່)</i>';
                        const correctMatchContent = q.type === 'matching-text-image' ? `<img src="${pair.match}" class="review-match-img">` : pair.match;

                        matchingReviewHTML += `
                            <div class="matching-review-row">
                                <div class="review-term-item">${pair.term}</div>
                                <div class="review-answer-wrapper">
                                    <div class="review-user-answer ${isMatchCorrect ? 'correct-answer' : 'incorrect-answer'}">
                                        ${userMatchContent}
                                    </div>
                                    ${!isMatchCorrect ? `
                                    <div class="review-correct-answer correct-answer">
                                        ${correctMatchContent}
                                    </div>` : ''}
                                </div>
                            </div>
                        `;
                    });

                    matchingReviewHTML += '</div>';
                    isCorrect = correctMatches === totalPairs;
                    content += matchingReviewHTML;
                    if (!userAnswer || Object.keys(userAnswer).length === 0) {
                        content += `<p class="unanswered-message"><i>ທ່ານຍັງບໍ່ຕອບຄຳຖາມນີ້</i></p>`;
                        // ເພີ່ມ: ສະແດງຄູ່ທີ່ຖືກຕ້ອງທັງໝົດຖ້າບໍ່ໄດ້ຕອບ
                        let correctPairsHTML = '<div class="matching-review-container" style="margin-top: 10px;">';
                        correctPairsHTML += `<p><strong>ຄູ່ທີ່ຖືກຕ້ອງ:</strong></p>`;
                        q.pairs.forEach(pair => {
                            const correctMatchContent = q.type === 'matching-text-image' ? `<img src="${pair.match}" class="review-match-img">` : pair.match;
                            correctPairsHTML += `
                                <div class="matching-review-row">
                                    <div class="review-term-item">${pair.term}</div>
                                    <div class="review-answer-wrapper"><div class="review-user-answer correct-answer">${correctMatchContent}</div></div>
                                </div>
                            `;
                        });
                        correctPairsHTML += '</div>';
                        content += correctPairsHTML;
                    }
                    break;

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
    let lastKnownStatus = null; // ເພີ່ມຕົວແປເພື່ອເກັບສະຖານະຫຼ້າສຸດ
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

    /**
     * ປັບປຸງ: ສະແດງໜ້າຈໍລໍຖ້າພ້ອມຂໍ້ມູນນັກຮຽນປັດຈຸບັນ
     */
    async function renderWaitingScreen() {
        const container = document.getElementById('ranked-summary-content');
        container.innerHTML = ''; // ລ້າງເນື້ອຫາເກົ່າ

        // ດຶງຂໍ້ມູນສະເພາະນັກຮຽນປັດຈຸບັນ
        const { data: currentUserData, error } = await supabase_client
            .from('students')
            .select('id, name, score')
            .eq('id', studentId)
            .single();

        // ສ້າງ HTML ສ່ວນຫົວ ແລະ ຂໍ້ມູນນັກຮຽນ (ຖ້າມີ)
        const waitingHTML = `
            <div class="waiting-animation-container">
                <h2 style="text-align: left; min-height: 1.5em;">
                    <span class="hourglass-anim">⏳</span> <span id="typing-text"></span><span class="typing-caret">|</span>
                </h2>
            </div>
            ${currentUserData ? `
            <div class="current-student-summary" style="margin-top: 20px;">
                <span>${currentUserData.name} (ID: ${currentUserData.id})</span>
                <span>ຄະແນນຂອງທ່ານ: <strong class="score-value">${currentUserData.score ?? 'N/A'}</strong></span>
            </div>` : ''}
        `;
        container.innerHTML = waitingHTML;
        const typingElement = document.getElementById('typing-text');
        animateTyping(typingElement, "ກະລຸນາລໍຖ້າ ອາຈານປະກາດຄະແນນ...");
    }

    async function checkAndRender() {
        const { data: sessionData, error } = await supabase_client
            .from('quiz_sessions')
            .select('status, exam_month, exam_year, target_class_level')
            .eq('id', sessionId)
            .single();

        if (error) {
            console.error("Error checking session status:", error);
            rankedSummaryContainer.style.display = 'block';
            const container = document.getElementById('ranked-summary-content');
            container.innerHTML = '<p style="color: red;">ເກີດຂໍ້ຜິດພາດໃນການກວດສອບສະຖານະ.</p>';
            return;
        }

        // ສະແດງລາຍລະອຽດຫ້ອງສອບເສັງ (ຊັ້ນຮຽນ, ເດືອນ, ປີ)
        const examDetailsElement = document.getElementById('exam-details');
        if (sessionData && sessionData.target_class_level && sessionData.exam_month && sessionData.exam_year) {
            // ປັບປຸງ: ຖ້າຫ້ອງເປັນ 'all', ໃຫ້ສະແດງຊັ້ນຮຽນຂອງນັກຮຽນແທນ
            const displayClass = sessionData.target_class_level === 'all' ? classLevel : sessionData.target_class_level;
            examDetailsElement.textContent = `ຊັ້ນ ${displayClass} | ປະຈຳເດືອນ ${sessionData.exam_month}, ປີ ${sessionData.exam_year}`;
        }

        // ກວດສອບວ່າສະຖານະປ່ຽນແປງບໍ່ ກ່ອນຈະ render ໃໝ່
        if (sessionData && sessionData.status === lastKnownStatus) {
            // console.log(`Status unchanged (${lastKnownStatus}), skipping re-render.`);
            return; // ຖ້າສະຖານະຄືເກົ່າ, ບໍ່ຕ້ອງເຮັດຫຍັງ
        }
        lastKnownStatus = sessionData ? sessionData.status : null; // ອັບເດດສະຖານະຫຼ້າສຸດ

        if (sessionData && sessionData.status === 'CLOSED') {
            forceLogout();
            return; // ຢຸດການເຮັດວຽກຕໍ່
        }

        // ເງື່ອນໄຂໃໝ່: ສະແດງຜົນການຈັດອັນດັບສະເພາະເມື່ອອາຈານປະກາດຄະແນນ (RESULTS_AVAILABLE) ເທົ່ານັ້ນ
        if (sessionData && sessionData.status === 'RESULTS_AVAILABLE') {
            rankedSummaryContainer.style.display = 'block';
            document.getElementById('quiz-review-container').style.display = 'block'; // ສະແດງບົດກວດກາ
            renderRankingTable();
            renderQuizReview(); // ເອີ້ນຟັງຊັນສະແດງຄຳຕອບ
        } else {
            rankedSummaryContainer.style.display = 'block';
            document.getElementById('quiz-review-container').style.display = 'none'; // ເຊື່ອງບົດກວດກາໄວ້ກ່ອນ
            renderWaitingScreen(); // ປ່ຽນມາໃຊ້ຟັງຊັນໃໝ່ເພື່ອສະແດງລາຍຊື່ນັກຮຽນໃນຫ້ອງ
        }
    }

    await checkAndRender();

    /**
     * ກວດສອບສະຖານະເປັນໄລຍະໆ (Fallback Mechanism)
     * ເພື່ອຮັບປະກັນວ່າຈະອອກຈາກລະບົບສະເໝີເມື່ອສະຖານະເປັນ CLOSED
     */
    function startPeriodicStateCheck() {
        let intervalTime = 3000; // ເລີ່ມຕົ້ນດ້ວຍການກວດສອບທຸກໆ 3 ວິນາທີ
        let periodicCheckInterval;

        const check = async () => {
            if (!sessionId) return;

            const { data: session, error } = await supabase_client
                .from('quiz_sessions')
                .select('status')
                .eq('id', sessionId)
                .single();
            
            if (session && session.status === 'CLOSED') {
                forceLogout();
                clearInterval(periodicCheckInterval); // ຢຸດການກວດສອບເມື່ອອອກຈາກລະບົບ
                return;
            }

            // ຖ້າປະກາດຄະແນນແລ້ວ, ໃຫ້ປ່ຽນໄປກວດສອບທຸກໆ 15 ວິນາທີ
            if (session && session.status === 'RESULTS_AVAILABLE' && intervalTime !== 15000) {
                console.log("ປະກາດຄະແນນແລ້ວ, ປ່ຽນການກວດສອບເປັນທຸກໆ 15 ວິນາທີ.");
                intervalTime = 15000;
                clearInterval(periodicCheckInterval);
                periodicCheckInterval = setInterval(check, intervalTime);
            }
            
            await checkAndRender();
        };

        periodicCheckInterval = setInterval(check, intervalTime);
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
        .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, (payload) => {
            // ເມື່ອມີການປ່ຽນແປງຂໍ້ມູນໃນຕາຕະລາງ students (ເຊັ່ນ: ຄະແນນຖືກອັບເດດ), ໃຫ້ໂຫຼດຂໍ້ມູນຄືນໃໝ່
            // ເພື່ອໃຫ້ແນ່ໃຈວ່າຄະແນນ ແລະ ອັນດັບທີ່ສະແດງຜົນຖືກຕ້ອງສະເໝີ
            if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT' || payload.eventType === 'DELETE') {
                console.log('ກວດພົບການປ່ຽນແປງໃນຕາຕະລາງ students, ກຳລັງໂຫຼດຂໍ້ມູນຄືນໃໝ່...', payload);
                checkAndRender();
            }
        })
        .subscribe();
        
    startPeriodicStateCheck(); // ເລີ່ມກົນໄກກວດສອບສຳຮອງ
});
