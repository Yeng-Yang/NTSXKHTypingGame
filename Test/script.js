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
async function startQuiz() {
    quizStarted = true;
    quizTimerDiv.style.display = 'block';
    navigationContainer.style.display = 'flex';

    const { data, error } = await supabase_client
        .from('questions')
        .select('*')
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
    questionBlock.id = `question-${currentQuestionIndex}`;

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
                const isChecked = userAnswers[currentQuestionIndex] === option ? 'checked' : '';
                content += `<label><input type="radio" name="q${currentQuestionIndex}" value="${option}" ${isChecked}> ${option}</label>`;
            });
            content += '</div>';
            break;
        case 'fill-in':
        case 'image-fill-in':
            const savedAnswer = userAnswers[currentQuestionIndex] || '';
            content += `<input type="text" name="q${currentQuestionIndex}" class="fill-in-input" placeholder="ປ້ອນຄຳຕອບ..." value="${savedAnswer}">`;
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
                const savedWord = userAnswers[currentQuestionIndex] ? (userAnswers[currentQuestionIndex][blankIndex] || '') : '';
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
                const savedMatch = userAnswers[currentQuestionIndex] ? (userAnswers[currentQuestionIndex][index] || null) : null;
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
                const isUsed = userAnswers[currentQuestionIndex] ? Object.values(userAnswers[currentQuestionIndex]).includes(match) : false;
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
        // ຫຼຸດເວລາລົງ 1 ວິນາທີທຸກຄັ້ງ
        distance -= 1000;

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
 * ສ້າງຟັງຊັນໃນຖານຂໍ້ມູນເພື່ອດຶງເວລາ Server
 * ທ່ານຕ້ອງ RUN ຄຳສັ່ງ SQL ນີ້ໃນ Supabase SQL Editor ພຽງຄັ້ງດຽວ:
 * CREATE OR REPLACE FUNCTION get_server_time()
 * RETURNS timestamptz AS $$
 *   SELECT now();
 * $$ LANGUAGE sql;
 */

/**
 * ເລີ່ມນັບເວລາຖອຍຫຼັງ
 * @param {string} endTimeISO - ເວລາສິ້ນສຸດໃນຮູບແບບ ISO string
 */
async function startTimer(endTimeISO) {
    if (timerInterval) clearInterval(timerInterval);

    const endTime = new Date(endTimeISO).getTime();

    // ດຶງເວລາປັດຈຸບັນຈາກ Server ເພື່ອຄວາມຖືກຕ້ອງ
    const { data: serverTime, error } = await supabase_client.rpc('get_server_time');
    if (error || !serverTime) {
        console.error("Could not fetch server time, falling back to local time.");
        // Fallback to local time if server time is unavailable
        runTimer(endTime, new Date().getTime());
    } else {
        runTimer(endTime, new Date(serverTime).getTime());
    }
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
            const selectedOption = document.querySelector(`input[name="q${currentQuestionIndex}"]:checked`);
            userAnswers[currentQuestionIndex] = selectedOption ? selectedOption.value : undefined;
            break;

        case 'fill-in':
        case 'image-fill-in':
            userAnswers[currentQuestionIndex] = quizForm.elements[`q${currentQuestionIndex}`]?.value;
            break;

        case 'drag-fill-in':
            const answers = {};
            document.querySelectorAll('.drop-zone').forEach(zone => {
                answers[zone.dataset.blankIndex] = zone.textContent;
            });
            userAnswers[currentQuestionIndex] = answers;
            break;

        case 'matching-text-text':
        case 'matching-text-image':
            const matches = {};
            document.querySelectorAll('.matching-drop-zone').forEach(zone => {
                const termIndex = zone.dataset.termIndex;
                const item = zone.querySelector('.match-item');
                if (item) {
                    matches[termIndex] = item.dataset.matchContent;
                }
            });
            userAnswers[currentQuestionIndex] = matches;
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

    let score = 0;
    const answersToSubmit = [];

    questions.forEach((q, index) => {
        let isCorrect = false;
        const answer = userAnswers[index];

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
            score++;
        }
        answersToSubmit.push({ question_id: q.id, answer: answer || '' });
    });

    const submissionData = {
        student_id: studentId,
        score: score,
        answers: answersToSubmit,
        session_id: currentSessionId
    };

    const { error } = await supabase_client.from('submissions').insert([submissionData]);

    if (error) {
        Swal.fire('ຜິດພາດ!', 'ບໍ່ສາມາດບັນທຶກຄະແນນໄດ້: ' + error.message, 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = '✔️ ສົ່ງຄຳຕອບ';
    } else {
        sessionStorage.setItem('last_score', score);
        sessionStorage.setItem('last_session_id', currentSessionId);
        window.location.href = 'final_results.html';
    }
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

    switch (status) {
        case 'OPEN':
            // ສະຖານະເປີດຮັບ, ໃຫ້ສະແດງໜ້າລໍຖ້າ
            showWaitingRoom();
            break;
        case 'IN_PROGRESS':
            // ສະຖານະກຳລັງສອບເສັງ, ໃຫ້ໂຫຼດຄຳຖາມ ແລະ ເລີ່ມຈັບເວລາ
            await startQuiz();
            startTimer(session.end_time);
            break;
        case 'RESULTS_AVAILABLE':
            // ສະຖານະປິດແລ້ວ, ໃຫ້ສະແດງໜ້າສອບເສັງປິດ
            showExamClosed();
            break;
        case 'CLOSED':
            forceLogout();
            return false; // ສົ່ງຄ່າບອກວ່າໃຫ້ຢຸດການເຮັດວຽກຕໍ່
            break;
        default:
            // ສະຖານະອື່ນໆ (ເຊັ່ນ NOT_STARTED)
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

    // ຮັບປະກັນວ່າມີ currentSessionId ກ່ອນຈະ subscribe
    if (!currentSessionId) {
        console.error("Cannot listen for state changes without a session ID.");
        return;
    }

    const channel = supabase_client.channel(`session-status-channel-${currentSessionId}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'quiz_sessions', filter: `id=eq.${currentSessionId}` }, async (payload) => {
            console.log('Realtime state change detected!', payload);
            const newStatus = payload.new.status;
            const oldStatus = payload.old.status;

            if (newStatus === 'IN_PROGRESS' && !quizStarted) {
                Toast.fire({ icon: 'info', title: 'ການສອບເສັງເລີ່ມແລ້ວ!' });
                await startQuiz();
                startTimer(payload.new.end_time);
            } else if (newStatus === 'CLOSED') {
                forceLogout();
            } else if (newStatus === 'RESULTS_AVAILABLE') {
                Toast.fire({ icon: 'info', title: 'ການສອບເສັງສິ້ນສຸດແລ້ວ, ກຳລັງສົ່ງຄຳຕອບ...' });
                await submitQuiz(true);
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
            const draggable = document.querySelector('.dragging');
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
                // If the drop zone is not the source pool and already has an item, swap them
                const existingItem = zone.querySelector('.match-item, .draggable-word');

                if (existingItem && zone.id !== 'match-source-pool') {
                    // Find the original container of the dragged item
                    const originalContainer = draggable.parentElement;
                    if (originalContainer && originalContainer.id === 'match-source-pool') {
                        originalContainer.appendChild(existingItem);
                    } // If not from source pool, it's a swap, so do nothing here
                }
                
                // Move the draggable element into the drop zone
                zone.appendChild(draggable);
            }
        });
    });
}

/**
 * ກວດສອບສະຖານະເປັນໄລຍະໆ (Fallback Mechanism)
 * ເພື່ອຮັບປະກັນວ່າຈະອອກຈາກລະບົບສະເໝີເມື່ອສະຖານະເປັນ CLOSED
 */
function startPeriodicStateCheck() {
    setInterval(async () => {
        if (!currentSessionId) return;

        const { data, error } = await supabase_client
            .from('quiz_sessions')
            .select('status')
            .eq('id', currentSessionId)
            .single();

        if (data && data.status === 'CLOSED') {
            forceLogout();
        }
    }, 15000); // ກວດສອບທຸກໆ 15 ວິນາທີ
}

// ເລີ່ມການເຮັດວຽກຂອງໜ້າສອບເສັງ
async function initializeQuizPage() {
    // 1. ກວດສອບສະຖານະປັດຈຸບັນກ່ອນ
    const shouldContinue = await handleExamState();
    if (!shouldContinue) {
        return; // ຢຸດການເຮັດວຽກຂອງຟັງຊັນນີ້ທັນທີ ຖ້າ handleExamState ສົ່ງຄ່າ false ກັບມາ
    }

    // 2. ຖ້າບໍ່ມີບັນຫາ, ຈຶ່ງເລີ່ມຟັງການປ່ຽນແປງສະຖານະ
    listenForStateChanges();
    startPeriodicStateCheck(); // ເລີ່ມກົນໄກກວດສອບສຳຮອງ

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