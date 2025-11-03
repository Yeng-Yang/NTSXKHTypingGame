// File: script.js
// ຄວບຄຸມໜ້າສອບເສັງຂອງນັກຮຽນ

const quizForm = document.getElementById('quiz-form');
const submitBtn = document.getElementById('submit-btn');
const resultContainer = document.getElementById('result-container');
const quizTimerDiv = document.getElementById('quiz-timer');
const quizContainer = document.querySelector('.quiz-container');
const quizProgressDiv = document.getElementById('quiz-progress');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const navigationContainer = document.getElementById('navigation-container');

let questions = [];
let currentQuestionIndex = 0;
let userAnswers = {}; // ເກັບຄຳຕອບຊົ່ວຄາວ
let quizStarted = false;

let timerInterval;
let currentSessionId = null;
let lastKnownStatus = null; // ເພີ່ມຕົວແປເພື່ອເກັບສະຖານະຫຼ້າສຸດ
const celebrationSound = new Audio('https://cdn.pixabay.com/audio/2022/03/15/audio_16a892c10a.mp3'); // ສຽງ Tada Fanfare

// ກວດສອບວ່າໄດ້ລັອກອິນເຂົ້າມາແລ້ວ ຫຼື ບໍ່
const studentId = sessionStorage.getItem('current_student_id');
if (!studentId) {
    alert('ກະລຸນາເຂົ້າສູ່ລະບົບກ່ອນ!');
    window.location.replace('login.html');
}

/**
 * ຟັງຊັນບັງຄັບອອກຈາກລະບົບ
 */
function forceLogout() {
    clearInterval(timerInterval); // ຢຸດການນັບເວລາທັນທີ
    Swal.fire({
        title: 'ຫ້ອງສອບເສັງປິດແລ້ວ',
        text: 'ລະບົບໄດ້ປິດການສອບເສັງຢ່າງສົມບູນ. ກໍາລັງອອກຈາກລະບົບ...',
        icon: 'info',
        timer: 3000,
        showConfirmButton: false,
        allowOutsideClick: false
    }).then(() => {
        sessionStorage.clear();
        window.location.replace('login.html');
    });
}

/**
 * ສະແດງໜ້າລໍຖ້າ
 */
function showWaitingRoom() {
    quizForm.innerHTML = `
        <div style="text-align: center; padding: 50px 0;">
            <h2>⏳ ກະລຸນາລໍຖ້າ...</h2>
            <p>ອາຈານກຳລັງຈະເລີ່ມການສອບເສັງໃນໄວໆນີ້.</p>
        </div>
    `;
    submitBtn.style.display = 'none';
    quizTimerDiv.style.display = 'none';
    navigationContainer.style.display = 'none';
}

/**
 * ສະແດງໜ້າສອບເສັງປິດ
 */
function showExamClosed() {
    quizForm.innerHTML = `
        <div style="text-align: center; padding: 50px 0;">
            <h2>🛑 ການສອບເສັງໄດ້ປິດລົງແລ້ວ</h2>
            <p>ກຳລັງພາທ່ານໄປໜ້າສະແດງຜົນຄະແນນ...</p>
        </div>
    `;
    submitBtn.style.display = 'none';
    quizTimerDiv.style.display = 'none';
    navigationContainer.style.display = 'none';
    setTimeout(() => {
        window.location.href = 'final_results.html';
    }, 3000);
}

/**
 * ສ້າງຟັງຊັນໃນຖານຂໍ້ມູນເພື່ອດຶງເວລາ Server
 * ທ່ານຕ້ອງ RUN ຄຳສັ່ງ SQL ນີ້ໃນ Supabase SQL Editor ພຽງຄັ້ງດຽວ:
 * CREATE OR REPLACE FUNCTION get_server_time()
 * RETURNS timestamptz AS $$
 *   SELECT now();
 * $$ LANGUAGE sql;
 */

/**
 * ໂຫຼດຄຳຖາມ ແລະ ເລີ່ມການສອບເສັງ
 */
async function startQuiz(targetClassLevel) {
    if (!targetClassLevel) {
        console.error("Target class level is required to start the quiz.");
        quizForm.innerHTML = '<p style="color: red;">ບໍ່ສາມາດກຳນົດຊັ້ນຮຽນຂອງຫ້ອງສອບເສັງໄດ້.</p>';
        return;
    }

    quizStarted = true;
    quizTimerDiv.style.display = 'block';
    navigationContainer.style.display = 'flex';

    // ປັບປຸງ: ດຶງຄຳຖາມຕາມຊັ້ນຮຽນຂອງຫ້ອງເສັງ, ແຕ່ຖ້າຫ້ອງເສັງເປັນ 'all' ໃຫ້ດຶງຕາມຊັ້ນຮຽນຂອງນັກຮຽນແທນ
    let query = supabase_client
        .from('questions')
        .select('*');

    const studentClassLevel = sessionStorage.getItem('current_class_level');

    if (targetClassLevel !== 'all') {
        query = query.eq('class_level', targetClassLevel); // ເພີ່ມການກັ່ນຕອງຕາມຊັ້ນຮຽນຖ້າບໍ່ແມ່ນ 'all'
    } else if (studentClassLevel) {
        query = query.eq('class_level', studentClassLevel); // ຖ້າຫ້ອງເປັນ 'all', ໃຫ້ກັ່ນຕອງຕາມຊັ້ນຮຽນຂອງນັກຮຽນ
    }

    const { data, error } = await query
        .order('created_at', { ascending: true });

    if (error) {
        quizForm.innerHTML = '<p style="color: red;">ເກີດຂໍ້ຜິດພາດໃນການໂຫຼດຄຳຖາມ.</p>';
        return;
    }
    questions = data;
    renderCurrentQuestion();
}

/**
 * ສະແດງຄຳຖາມປັດຈຸບັນ
 */
function renderCurrentQuestion() {
    if (questions.length === 0) return;

    quizForm.innerHTML = '';
    quizProgressDiv.textContent = `ຄຳຖາມທີ ${currentQuestionIndex + 1} / ${questions.length}`;

    const q = questions[currentQuestionIndex];
    const questionBlock = document.createElement('div');
    questionBlock.className = 'question-block';
    questionBlock.id = `question-${q.id}`; // ໃຊ້ ID ຂອງຄຳຖາມ

    let content = `<div class="question-text">${currentQuestionIndex + 1}. ${q.question}</div>`;
    if (q.image_url) {
        content += `<img src="${q.image_url}" alt="Question Image" class="question-image">`;
    }

    // ສ້າງ HTML ຕາມປະເພດຄຳຖາມ
    switch (q.type) {
        case 'multiple-choice':
        case 'image-multiple-choice':
            content += '<div class="options-container">';
            q.options.forEach(option => {
                const isChecked = userAnswers[q.id] === option ? 'checked' : '';
                content += `<label><input type="radio" name="q${q.id}" value="${option}" ${isChecked}> ${option}</label>`;
            });
            content += '</div>';
            break;
        case 'fill-in':
        case 'image-fill-in':
            const savedAnswer = userAnswers[q.id] || '';
            content += `<input type="text" name="q${q.id}" class="fill-in-input" placeholder="ປ້ອນຄຳຕອບ..." value="${savedAnswer}">`;
            break;

        case 'drag-fill-in':
            const correctAnswers = q.answer || [];
            const distractors = q.options || [];
            const wordBankItems = [...correctAnswers, ...distractors].sort(() => Math.random() - 0.5);

            let wordBankHTML = '<div class="word-bank">';
            wordBankItems.forEach((word) => {
                wordBankHTML += `<div class="draggable-word" draggable="true">${word}</div>`;
            });
            wordBankHTML += '</div>';

            let blankIndex = 0;
            const questionWithBlanks = q.question.replace(/__BLANK__/g, () => {
                const savedWord = userAnswers[q.id] ? (userAnswers[q.id][blankIndex] || '') : '';
                blankIndex++;
                return `<span class="drop-zone" data-blank-index="${blankIndex - 1}">${savedWord}</span>`;
            });

            content += `<div class="drag-fill-container">${questionWithBlanks}</div>${wordBankHTML}`;
            break;

        case 'matching-text-text':
        case 'matching-text-image':
            const terms = q.pairs.map(p => p.term);
            const matches = q.pairs.map(p => p.match).sort(() => Math.random() - 0.5);

            let matchingHTML = '<div class="matching-container">';
            matchingHTML += '<div class="matching-column">'; // Left column
            terms.forEach((term, index) => {
                const savedMatch = userAnswers[q.id] ? (userAnswers[q.id][index] || null) : null;
                let dropZoneContent = '';
                if (savedMatch) {
                    const content = q.type === 'matching-text-image' ? `<img src="${savedMatch}" alt="match">` : savedMatch;
                    dropZoneContent = `<div class="match-item" draggable="true" data-match-content="${savedMatch}">${content}</div>`;
                }
                matchingHTML += `<div class="matching-row"><div class="term-item matching-item">${term}</div><div class="matching-drop-zone" data-term-index="${index}">${dropZoneContent}</div></div>`;
            });
            matchingHTML += '</div>';

            matchingHTML += '<div class="matching-column" id="match-source-pool">'; // Right column
            matches.forEach(match => {
                const isUsed = userAnswers[q.id] ? Object.values(userAnswers[q.id]).includes(match) : false;
                if (!isUsed) {
                    const content = q.type === 'matching-text-image' ? `<img src="${match}" alt="match">` : match;
                    matchingHTML += `<div class="match-item" draggable="true" data-match-content="${match}">${content}</div>`;
                }
            });
            matchingHTML += '</div></div>';
            content += matchingHTML;
            break;
    }
    questionBlock.innerHTML = content;
    quizForm.appendChild(questionBlock);

    initializeDragAndDrop();
    updateNavigationButtons();
}

function updateNavigationButtons() {
    prevBtn.disabled = currentQuestionIndex === 0;
    nextBtn.style.display = currentQuestionIndex < questions.length - 1 ? 'block' : 'none';
    submitBtn.style.display = currentQuestionIndex === questions.length - 1 ? 'block' : 'none';
}

/**
 * ເລີ່ມນັບເວລາຖອຍຫຼັງ
 * @param {string} endTimeISO - ເວລາສິ້ນສຸດໃນຮູບແບບ ISO string
 */
function runTimer(endTime, startTime) {
    let distance = endTime - startTime;

    timerInterval = setInterval(() => {
        const now = new Date().getTime();
        const distance = endTime - now;

        if (distance < 0) {
            clearInterval(timerInterval);
            quizTimerDiv.textContent = "ໝົດເວລາ!";
            quizTimerDiv.style.backgroundColor = '#dc3545'; // ປ່ຽນເປັນສີແດງ

            // ເພີ່ມ Style ລະເບີດແຕກ ແລະ ສຽງ
            celebrationSound.play();
            confetti({
                particleCount: 200,
                spread: 180,
                origin: { y: 0.6 }
            });

            // ສະແດງຂໍ້ຄວາມວ່າກຳລັງສົ່ງ
            Swal.fire({
                title: 'ໝົດເວລາ!',
                text: 'ກຳລັງສົ່ງຄຳຕອບຂອງທ່ານໂດຍອັດຕະໂນມັດ...',
                icon: 'warning',
                allowOutsideClick: false,
                showConfirmButton: false,
                timer: 3000 // ສະແດງຄ້າງໄວ້ 3 ວິນາທີ
            });

            submitQuiz(true); // ບັງຄັບສົ່ງເມື່ອໝົດເວລາ
            return;
        }

        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        quizTimerDiv.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }, 1000);
}

/**
 * ເລີ່ມນັບເວລາຖອຍຫຼັງ
 * @param {string} adminEndTimeISO - ເວລາສິ້ນສຸດທີ່ກຳນົດໂດຍອາຈານໃນຮູບແບບ ISO string
 */
async function startTimer(endTimeISO) {
    if (timerInterval) clearInterval(timerInterval);

    const adminEndTime = new Date(endTimeISO).getTime();

    // ດຶງເວລາປັດຈຸບັນຈາກ Server ເພື່ອຄວາມຖືກຕ້ອງ
    const { data: serverTimeData, error: serverTimeError } = await supabase_client.rpc('get_server_time');
    let currentTime;
    if (serverTimeError || !serverTimeData) {
        console.error("Could not fetch server time, falling back to local time.");
        // Fallback to local time if server time is unavailable
        currentTime = new Date().getTime();
    } else {
        currentTime = new Date(serverTimeData).getTime();
    }

    // ກຳນົດເວລາສູງສຸດ 45 ນາທີ (2700000 ມິນລິວິນາທີ) ຈາກເວລາປັດຈຸບັນທີ່ນັກຮຽນເລີ່ມ
    const fixedDurationMs = 45 * 60 * 1000;
    const clientCalculatedEndTime = currentTime + fixedDurationMs;

    // ເວລາສິ້ນສຸດທີ່ມີຜົນບັງຄັບໃຊ້ແມ່ນເວລາທີ່ສັ້ນທີ່ສຸດລະຫວ່າງເວລາສິ້ນສຸດຂອງອາຈານ ແລະ ເວລາສິ້ນສຸດທີ່ຄິດໄລ່ຈາກ 45 ນາທີ
    const effectiveEndTime = Math.min(adminEndTime, clientCalculatedEndTime);

    runTimer(effectiveEndTime, currentTime);
}

/**
 * ບັນທຶກຄຳຕອບຂອງຄຳຖາມປັດຈຸບັນ
 */
function saveCurrentAnswer() {
    const q = questions[currentQuestionIndex];
    if (!q) return;

    switch (q.type) {
        case 'multiple-choice':
        case 'image-multiple-choice':
            const selectedOption = document.querySelector(`input[name="q${q.id}"]:checked`);
            userAnswers[q.id] = selectedOption ? selectedOption.value : undefined;
            break;

        case 'fill-in':
        case 'image-fill-in':
            userAnswers[q.id] = quizForm.elements[`q${q.id}`]?.value;
            break;

        case 'drag-fill-in':
            const answers = {};
            const dragFillBlock = document.getElementById(`question-${q.id}`);
            dragFillBlock.querySelectorAll('.drop-zone').forEach(zone => {
                const wordInside = zone.querySelector('.draggable-word');
                answers[zone.dataset.blankIndex] = wordInside ? wordInside.textContent : '';
            });
            userAnswers[q.id] = answers;
            break;

        case 'matching-text-text':
        case 'matching-text-image':
            const matches = {};
            const matchingBlock = document.getElementById(`question-${q.id}`);
            matchingBlock.querySelectorAll('.matching-drop-zone').forEach(zone => {
                const termIndex = zone.dataset.termIndex;
                const item = zone.querySelector('.match-item');
                if (item) {
                    matches[termIndex] = item.dataset.matchContent;
                }
            });
            userAnswers[q.id] = matches;
            break;
    }
}

function goToNextQuestion() {
    if (currentQuestionIndex < questions.length - 1) {
        saveCurrentAnswer();
        currentQuestionIndex++;
        renderCurrentQuestion();
    }
}

function goToPrevQuestion() {
    if (currentQuestionIndex > 0) {
        saveCurrentAnswer();
        currentQuestionIndex--;
        renderCurrentQuestion();
    }
}


/**
 * ສົ່ງຄຳຕອບ
 * @param {boolean} isAutoSubmit - ກວດສອບວ່າເປັນການສົ່ງອັດຕະໂນມັດ ຫຼື ບໍ່
 */
async function submitQuiz(isAutoSubmit = false) {
    if (!isAutoSubmit) {
        const result = await Swal.fire({
            title: 'ຢືນຢັນການສົ່ງຄຳຕອບ',
            text: "ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການສົ່ງຄຳຕອບ?",
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'ແມ່ນ, ສົ່ງເລີຍ',
            cancelButtonText: 'ຍົກເລີກ'
        });
        if (!result.isConfirmed) return;
    }

    saveCurrentAnswer(); // ບັນທຶກຄຳຕອບຂອງຂໍ້ສຸດທ້າຍ
    clearInterval(timerInterval);
    submitBtn.disabled = true;
    submitBtn.textContent = 'ກຳລັງສົ່ງ...';
    navigationContainer.style.display = 'none';
    quizForm.style.pointerEvents = 'none'; // ປິດການໂຕ້ຕອບກັບຟອມທັງໝົດ

    let rawScore = 0; // ໃຊ້ເພື່ອເກັບຄະແນນດິບ (ຈຳນວນຄຳຕອບທີ່ຖືກຕ້ອງ)

    questions.forEach((q) => {
        let isCorrect = false;
        const answer = userAnswers[q.id];

        if (q.type.includes('matching')) {
            let correctMatches = 0;
            if (answer) {
                q.pairs.forEach((pair, pairIndex) => {
                    if (answer[pairIndex] === pair.match) {
                        correctMatches++;
                    }
                });
            }
            if (correctMatches === q.pairs.length) isCorrect = true;
        } else if (q.type === 'drag-fill-in') {
            let correctBlanks = 0;
            if (answer) {
                q.answer.forEach((correctAnswer, blankIndex) => {
                    if (answer[blankIndex] && answer[blankIndex].trim().toLowerCase() === correctAnswer.trim().toLowerCase()) {
                        correctBlanks++;
                    }
                });
            }
            if (correctBlanks === q.answer.length) isCorrect = true;
        } else {
            if (answer && answer.toString().trim().toLowerCase() === q.answer.toString().trim().toLowerCase()) {
                isCorrect = true;
            }
        }

        if (isCorrect) {
            rawScore++; // ເພີ່ມຄະແນນດິບ
        }
    });

    // --- ເລີ່ມຕົ້ນການປັບຄະແນນໃຫ້ຢູ່ໃນລະຫວ່າງ 5 ຫາ 10 ---
    const totalQuestions = questions.length;
    let finalScore;

    if (totalQuestions === 0) {
        finalScore = 5; // ຖ້າບໍ່ມີຄຳຖາມ, ໃຫ້ຄະແນນຕ່ຳສຸດ
    } else if (rawScore === totalQuestions) {
        finalScore = 10; // ຕອບຖືກໝົດ, ໄດ້ 10
    } else if (rawScore === 0) {
        finalScore = 5; // ຕອບຜິດໝົດ, ໄດ້ 5
    } else {
        // ສູດຄຳນວນຄະແນນລະຫວ່າງ 6-9 ສຳລັບຄຳຕອບທີ່ຖືກບາງສ່ວນ
        // ປ້ອງກັນການຫານດ້ວຍສູນ ເມື່ອຈຳນວນຄຳຖາມທັງໝົດມີໜ້ອຍ
        if (totalQuestions < 3) {
            // ກໍລະນີມີ 1 ຫຼື 2 ຄຳຖາມ ແລະ ຕອບຖືກ 1 ຂໍ້, ໃຫ້ຄະແນນກາງໆ
            finalScore = 7;
        } else {
            // ສູດປັບຂະໜາດຄະແນນດິບ (ຈາກ 1 ຫາ totalQuestions-1) ໄປຫາຊ່ວງຄະແນນ (6 ຫາ 9)
            // (rawScore - 1) / (totalQuestions - 2) ຄິດໄລ່ອັດຕາສ່ວນຄະແນນທີ່ໄດ້ໃນຊ່ວງທີ່ເປັນໄປໄດ້
            // ຄູນ 3 (ຊ່ວງຄະແນນໃໝ່, 9-6=3) ແລະ ບວກ 6 (ຄະແນນຕ່ຳສຸດໃໝ່)
            const scaledScore = 6 + ((rawScore - 1) / (totalQuestions - 2)) * 3;
            finalScore = Math.round(scaledScore);

            // ຮັບປະກັນວ່າຄະແນນຈະຢູ່ໃນຊ່ວງ 6-9 ສະເໝີ
            if (finalScore < 6) finalScore = 6;
            if (finalScore > 9) finalScore = 9;
        }
    }
    // --- ສິ້ນສຸດການປັບຄະແນນ ---

    const studentClassLevel = sessionStorage.getItem('current_class_level');
    const submissionData = {
        student_id: studentId,
        score: finalScore, // ໃຊ້ຄະແນນທີ່ຖືກປັບແລ້ວ
        session_id: currentSessionId,
        answers: userAnswers, // ເພີ່ມຄຳຕອບຂອງນັກຮຽນ
        class_level: studentClassLevel // ເພີ່ມຊັ້ນຮຽນຂອງນັກຮຽນ
    };

    // 1. ບັນທຶກຂໍ້ມູນການສົ່ງຄຳຕອບ
    const { error: submissionError } = await supabase_client.from('submissions').insert([submissionData]);

    if (submissionError) {
        Swal.fire('ຜິດພາດ!', 'ບໍ່ສາມາດບັນທຶກຂໍ້ມູນການສົ່ງໄດ້: ' + submissionError.message, 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = '✔️ ສົ່ງຄຳຕອບ';
        return; // ຢຸດການເຮັດວຽກຖ້າບັນທຶກ submission ບໍ່ສຳເລັດ
    }

    // 2. ອັບເດດຄະແນນໃນຕາຕະລາງ students
    const { error: studentUpdateError } = await supabase_client
        .from('students')
        .update({ score: finalScore })
        .eq('id', studentId);

    if (studentUpdateError) {
        console.error('ເກີດຂໍ້ຜິດພາດໃນການອັບເດດຄະແນນນັກຮຽນ:', studentUpdateError.message);
    }

    // 3. ຖ້າທຸກຢ່າງສຳເລັດ, ໄປໜ້າຜົນຄະແນນ
    sessionStorage.setItem('last_score', finalScore);
    sessionStorage.setItem('last_session_id', currentSessionId);
    window.location.href = 'final_results.html';
}

submitBtn.addEventListener('click', (e) => {
    e.preventDefault();
    submitQuiz(false);
});
prevBtn.addEventListener('click', goToPrevQuestion);
nextBtn.addEventListener('click', goToNextQuestion);

/**
 * ຟັງຊັນຫຼັກທີ່ກວດສອບສະຖານະ ແລະ ຄວບຄຸມໜ້າເວັບ
 */
async function handleExamState() {
    const sessionIdFromStorage = sessionStorage.getItem('current_session_id'); 
    if (!sessionIdFromStorage) {
        // ຖ້າບໍ່ມີ session ID, ໝາຍຄວາມວ່າບໍ່ໄດ້ຜ່ານການ login ຢ່າງຖືກຕ້ອງ, ສົ່ງກັບໄປໜ້າ login
        console.log("No session ID found, redirecting to login.");
        window.location.replace('login.html');
        return;
    }

    const { data: session, error } = await supabase_client
        .from('quiz_sessions')
        .select('*')
        .eq('id', sessionIdFromStorage)
        .limit(1)
        .single();

    if (error || !session) {
        quizForm.innerHTML = '<p style="color: red;">ບໍ່ສາມາດເຊື່ອມຕໍ່ກັບລະບົບສອບເສັງໄດ້.</p>';
        return false; // ສົ່ງຄ່າບອກວ່າເກີດຂໍ້ຜິດພາດ
    }

    currentSessionId = session.id;
    const status = session.status;

    // ກວດສອບວ່າສະຖານະປ່ຽນແປງບໍ່ ກ່ອນຈະ render ໃໝ່
    if (status === lastKnownStatus) {
        return true; // ຖ້າສະຖານະຄືເກົ່າ, ບໍ່ຕ້ອງເຮັດຫຍັງ, ແຕ່ໃຫ້ polling ເຮັດວຽກຕໍ່
    }
    console.log(`Status changed from '${lastKnownStatus}' to '${status}'. Refreshing UI.`);
    lastKnownStatus = status; // ອັບເດດສະຖານະຫຼ້າສຸດ

    switch (status) {
        case 'OPEN':
            showWaitingRoom();
            break;
        case 'IN_PROGRESS':
            await startQuiz(session.target_class_level);
            await startTimer(session.end_time);
            break;
        case 'RESULTS_AVAILABLE':
            showExamClosed();
            break;
        case 'CLOSED':
            forceLogout();
            return false; // ສົ່ງຄ່າບອກວ່າໃຫ້ຢຸດການເຮັດວຽກຕໍ່
            break;
        default:
            quizForm.innerHTML = '<p>ການສອບເສັງຍັງບໍ່ທັນເລີ່ມ.</p>';
            submitBtn.style.display = 'none';
            navigationContainer.style.display = 'none';
            quizTimerDiv.style.display = 'none';
            break;
    }

    return true; // ສົ່ງຄ່າບອກວ່າໃຫ້ເຮັດວຽກຕໍ່ໄດ້
}

/**
 * ຟັງການປ່ຽນແປງສະຖານະຈາກ Realtime
 */
function listenForStateChanges() {
    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
    });

    if (!currentSessionId) {
        console.error("Cannot listen for state changes without a session ID.");
        return;
    }

    const channel = supabase_client.channel(`session-status-channel-${currentSessionId}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'quiz_sessions', filter: `id=eq.${currentSessionId}` }, async (payload) => {
            console.log('Realtime state change detected!', payload);
            const newStatus = payload.new.status;

            if (newStatus === 'IN_PROGRESS' && !quizStarted) {
                Toast.fire({ icon: 'info', title: 'ການສອບເສັງເລີ່ມແລ້ວ!' });
                await startQuiz(payload.new.target_class_level);
                await startTimer(payload.new.end_time);
            } else if (newStatus === 'CLOSED') {
                forceLogout();
            } else if (newStatus === 'RESULTS_AVAILABLE') {
                if (quizStarted) {
                    Toast.fire({ icon: 'info', title: 'ການສອບເສັງສິ້ນສຸດແລ້ວ, ກຳລັງສົ່ງຄຳຕອບ...' });
                    await submitQuiz(true);
                } else {
                    console.log("Session ended while in waiting room. Submitting default score.");
                    const submissionData = {
                        student_id: studentId,
                        score: 5,
                        session_id: currentSessionId,
                        answers: {}
                    };
                    await supabase_client.from('submissions').insert([submissionData]);
                    await supabase_client
                        .from('students')
                        .update({ score: 5 })
                        .eq('id', studentId);
                    
                    window.location.href = 'final_results.html';
                }
            }
        })
        .subscribe((status, err) => {
            if (err) {
                console.error("ເກີດຂໍ້ຜິດພາດໃນການເຊື່ອມຕໍ່ Realtime:", err);
            }
        });
}

/**
 * ເພີ່ມການເຮັດວຽກຂອງ Drag and Drop
 */
function initializeDragAndDrop() {
    const draggables = document.querySelectorAll('.draggable-word, .match-item');
    const dropZones = document.querySelectorAll('.drop-zone, .matching-drop-zone, #match-source-pool');

    draggables.forEach(draggable => {
        draggable.addEventListener('dragstart', () => {
            draggable.classList.add('dragging');
        });
        draggable.addEventListener('dragend', () => {
            draggable.classList.remove('dragging');
        });
    });

    dropZones.forEach(zone => {
        zone.addEventListener('dragover', e => {
            e.preventDefault();
            // Allow drop only if the zone is empty or it's the source pool
            if (!zone.querySelector('.match-item, .draggable-word') || zone.id === 'match-source-pool') {
                zone.classList.add('over');
            }
        });
        zone.addEventListener('dragleave', () => {
            zone.classList.remove('over');
        });
        zone.addEventListener('drop', e => {
            e.preventDefault();
            zone.classList.remove('over');
            
            const draggable = document.querySelector('.dragging');
            if (draggable) {
                const originalContainer = draggable.parentElement;
                const itemInZone = zone.querySelector('.draggable-word, .match-item');

                if (itemInZone) {
                    originalContainer.appendChild(itemInZone);
                    zone.appendChild(draggable);
                } 
                else {
                    zone.appendChild(draggable);
                }
            }
        });
    });
}

/**
 * ກວດສອບສະຖານະເປັນໄລຍະໆ (Fallback Mechanism)
 */
function startPeriodicStateCheck() {
    const periodicCheckInterval = setInterval(async () => {
        if (!currentSessionId) {
            clearInterval(periodicCheckInterval);
            return;
        }

        const shouldContinue = await handleExamState();
        if (!shouldContinue) {
            clearInterval(periodicCheckInterval);
        }
    }, 3000);
}

// ເລີ່ມການເຮັດວຽກຂອງໜ້າສອບເສັງ
async function initializeQuizPage() {
    const shouldContinue = await handleExamState();
    if (!shouldContinue) {
        return;
    }

    listenForStateChanges();
    startPeriodicStateCheck();

    // ກວດສອບວ່າເຄີຍສົ່ງຄຳຕອບໃນ session ນີ້ແລ້ວບໍ່
    const { data: existingSubmission, error } = await supabase_client
        .from('submissions')
        .select('id')
        .eq('student_id', studentId)
        .eq('session_id', currentSessionId)
        .single();

    if (existingSubmission) {
        Swal.fire({
            title: 'ແຈ້ງເຕືອນ',
            text: 'ທ່ານໄດ້ສົ່ງຄຳຕອບສຳລັບຮອບນີ້ແລ້ວ.',
            icon: 'info',
            confirmButtonText: 'ເບິ່ງຄະແນນ'
        }).then(() => {
            window.location.href = 'final_results.html';
        });
    }
}

// ເອີ້ນໃຊ້ຟັງຊັນຫຼັກ
initializeQuizPage();
