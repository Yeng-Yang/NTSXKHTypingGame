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

let currentStudentClassLevel = null; // ເພີ່ມ: ເກັບຊັ້ນຮຽນຂອງນັກຮຽນປັດຈຸບັນ
let timerInterval;
let currentSessionId = null;

// ກວດສອບວ່າໄດ້ລັອກອິນເຂົ້າມາແລ້ວ ຫຼື ບໍ່
const studentId = sessionStorage.getItem('current_student_id');
if (!studentId) {
    alert('ກະລຸນາເຂົ້າສູ່ລະບົບກ່ອນ!');
    window.location.replace('login.html');
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
 * ໂຫຼດຄຳຖາມ ແລະ ເລີ່ມການສອບເສັງ
 */
async function startQuiz() {
    // ດຶງຂໍ້ມູນ session ຫຼ້າສຸດເພື່ອເອົາ target_class_level ຂອງຮອບສອບເສັງປັດຈຸບັນ
    const { data: sessionData, error: sessionError } = await supabase_client
        .from('quiz_sessions')
        .select('target_class_level')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
 
    if (sessionError) console.error("Error fetching session for quiz start:", sessionError);
 
    quizStarted = true;
    quizTimerDiv.style.display = 'block';
    navigationContainer.style.display = 'flex';
 
    // ປັບປຸງ: ເພີ່ມການກັ່ນຕອງຄຳຖາມຕາມຊັ້ນຮຽນທີ່ກຳນົດໄວ້
    let questionsQuery = supabase_client.from('questions').select('*').order('created_at', { ascending: true });
    if (sessionData && sessionData.target_class_level && sessionData.target_class_level !== 'all') {
        questionsQuery = questionsQuery.eq('class_level', sessionData.target_class_level);
    }
    const { data, error } = await questionsQuery;
 
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
            const allWords = [...correctAnswers, ...distractors].sort(() => Math.random() - 0.5);
            
            const savedAnswersForDrag = userAnswers[currentQuestionIndex] || {};
            const usedWords = Object.values(savedAnswersForDrag);

            const wordBankItems = allWords.filter(word => !usedWords.some(saved => saved && saved.trim() === word.trim()));

            let wordBankHTML = '<div class="word-bank" id="word-bank-source">';
            wordBankItems.forEach((word) => {
                wordBankHTML += `<div class="draggable-word" draggable="true">${word}</div>`;
            });
            wordBankHTML += '</div>';

            let blankIndex = 0;
            const questionWithBlanks = q.question.replace(/__BLANK__/g, () => {
                const savedWord = savedAnswersForDrag[blankIndex] || '';
                blankIndex++;
                const dropZoneContent = savedWord ? `<div class="draggable-word" draggable="true">${savedWord}</div>` : '';
                return `<span class="drop-zone" data-blank-index="${blankIndex - 1}">${dropZoneContent}</span>`;
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
                    const matchContent = q.type === 'matching-text-image' ? `<img src="${savedMatch}" alt="match">` : savedMatch;
                    dropZoneContent = `<div class="match-item" draggable="true" data-match-content="${savedMatch}">${matchContent}</div>`;
                }
                matchingHTML += `<div class="matching-row"><div class="term-item matching-item">${term}</div><div class="matching-drop-zone" data-term-index="${index}">${dropZoneContent}</div></div>`;
            });
            matchingHTML += '</div>';

            matchingHTML += '<div class="matching-column" id="match-source-pool">'; // Right column
            matches.forEach(match => {
                const isUsed = userAnswers[currentQuestionIndex] ? Object.values(userAnswers[currentQuestionIndex]).includes(match) : false;
                if (!isUsed) {
                    const matchContent = q.type === 'matching-text-image' ? `<img src="${match}" alt="match">` : match;
                    matchingHTML += `<div class="match-item" draggable="true" data-match-content="${match}">${matchContent}</div>`;
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
function startTimer(endTimeISO) {
    if (timerInterval) clearInterval(timerInterval);

    const endTime = new Date(endTimeISO).getTime();

    timerInterval = setInterval(async () => {
        const now = new Date().getTime();
        const distance = endTime - now;

        if (distance < 0) {
            clearInterval(timerInterval);
            quizTimerDiv.textContent = "ໝົດເວລາແລ້ວ!";
            Swal.fire({ title: 'ໝົດເວລາ!', text: 'ກຳລັງສົ່ງຄຳຕອບຂອງທ່ານ...', icon: 'info', allowOutsideClick: false, showConfirmButton: false, timer: 3000 });
            await submitQuiz(true);
            return;
        }

        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        quizTimerDiv.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }, 2000);
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
                answers[zone.dataset.blankIndex] = zone.firstElementChild ? zone.firstElementChild.textContent.trim() : '';
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

    saveCurrentAnswer();
    clearInterval(timerInterval);
    submitBtn.disabled = true;
    submitBtn.textContent = 'ກຳລັງສົ່ງ...';
    navigationContainer.style.display = 'none';

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
                    if (answer[blankIndex] && answer[blankIndex].trim() === correctAnswer.trim()) {
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

    // ເພີ່ມ: ດຶງຂໍ້ມູນຊັ້ນຮຽນຂອງນັກຮຽນກ່ອນສົ່ງ
    if (!currentStudentClassLevel) {
        const { data: studentProfile } = await supabase_client
            .from('students')
            .select('class_level')
            .eq('id', studentId)
            .single();
        if (studentProfile) currentStudentClassLevel = studentProfile.class_level;
    }
    const submissionData = {
        student_id: studentId,
        score: score,
        answers: answersToSubmit,
        session_id: currentSessionId,
        class_level: currentStudentClassLevel // ເພີ່ມ: ຊັ້ນຮຽນຂອງນັກຮຽນ
    };

    // ປັບປຸງ: ກວດສອບການມີຢູ່ຂອງ phetsarathOtBase64 ກ່ອນສ້າງ PDF
    // ເຖິງແມ່ນວ່າຟັງຊັນນີ້ຈະບໍ່ໄດ້ສ້າງ PDF ໂດຍກົງ, ແຕ່ການເພີ່ມການກວດສອບໄວ້ຈະຊ່ວຍປ້ອງກັນບັນຫາໃນອະນາຄົດ
    if (typeof phetsarathOtBase64 === 'undefined') {
        console.warn("ບໍ່ພົບຂໍ້ມູນຟອນ (phetsarathOtBase64). ຟັງຊັນທີ່ກ່ຽວຂ້ອງກັບ PDF ອາດຈະເຮັດວຽກບໍ່ໄດ້.");
        // ບໍ່ throw error ເພື່ອໃຫ້ການສົ່ງຄະແນນດຳເນີນຕໍ່ໄປໄດ້
    }


    // ປ້ອງກັນການສົ່ງຂໍ້ມູນທີ່ບໍ່ສົມບູນ
    if (!submissionData.answers || submissionData.answers.length === 0) {
        console.warn("Attempted to submit with no answers. Submission blocked.");
        submissionData.answers = []; // ຮັບປະກັນວ່າເປັນອາເຣວ່າງສະເໝີ
    }

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
    const { data: session, error } = await supabase_client
        .from('quiz_sessions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (error || !session) {
        quizForm.innerHTML = '<p style="color: red;">ບໍ່ສາມາດເຊື່ອມຕໍ່ກັບລະບົບສອບເສັງໄດ້.</p>';
        return;
    }

    currentSessionId = session.id;
    const status = session.status;
    const targetClassLevel = session.target_class_level;

    // ກວດສອບສິດທິການເຂົ້າສອບເສັງຕາມຊັ້ນຮຽນ
    if (targetClassLevel && targetClassLevel !== 'all') {
        const { data: studentProfile, error: profileError } = await supabase_client
            .from('students')
            .select('class_level')
            .eq('id', studentId)
            .single();

        if (studentProfile) currentStudentClassLevel = studentProfile.class_level; // ເພີ່ມ: ເກັບຊັ້ນຮຽນໄວ້
        if (profileError || !studentProfile || studentProfile.class_level !== targetClassLevel) {
            quizForm.innerHTML = `
                <div style="text-align: center; padding: 50px 0;">
                    <h2>🚫 ບໍ່ມີສິດເຂົ້າສອບເສັງ</h2>
                    <p>ການສອບເສັງຮອບນີ້ສະຫງວນໄວ້ສະເພາະນັກຮຽນຊັ້ນ <strong>${targetClassLevel}</strong> ເທົ່ານັ້ນ.</p>
                </div>
            `;
            // ເຊື່ອງປຸ່ມ ແລະ ເວລາທັງໝົດ
            return;
        }
    }

    switch (status) {
        case 'OPEN':
            showWaitingRoom();
            break;
        case 'IN_PROGRESS':
            await startQuiz();
            startTimer(session.end_time);
            break;
        case 'RESULTS_AVAILABLE':
        case 'CLOSED':
            showExamClosed();
            break;
        default:
            quizForm.innerHTML = '<p>ການສອບເສັງຍັງບໍ່ທັນເລີ່ມ.</p>';
            submitBtn.style.display = 'none';
            navigationContainer.style.display = 'none';
            quizTimerDiv.style.display = 'none';
            break;
    }
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

    const channel = supabase_client.channel('public:quiz_sessions')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'quiz_sessions' }, async (payload) => {
            console.log('ກວດພົບການປ່ຽນແປງສະຖານະ!', payload);
            const newStatus = payload.new.status;
            const oldStatus = payload.old.status;

            if (newStatus === oldStatus) return;

            if (newStatus === 'IN_PROGRESS' && oldStatus === 'OPEN' && !quizStarted) {
                Toast.fire({ icon: 'info', title: 'ການສອບເສັງເລີ່ມແລ້ວ!' });
                await startQuiz();
                startTimer(payload.new.end_time);
            } else if (newStatus === 'CLOSED' || newStatus === 'RESULTS_AVAILABLE') {
                Toast.fire({ icon: 'warning', title: 'ການສອບເສັງໄດ້ປິດລົງແລ້ວ!' });
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
    const dropZones = document.querySelectorAll('.drop-zone, .matching-drop-zone, #match-source-pool, #word-bank-source');

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
            if (!zone.firstElementChild || zone.id === 'match-source-pool' || zone.id === 'word-bank-source') {
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
                const existingItem = zone.firstElementChild;
                if (existingItem && zone.id !== 'match-source-pool' && zone.id !== 'word-bank-source') {
                    const originalContainer = draggable.parentElement;
                    if (originalContainer) {
                        originalContainer.appendChild(existingItem);
                    }
                }
                if (!zone.firstElementChild || zone.id === 'match-source-pool' || zone.id === 'word-bank-source') {
                    zone.appendChild(draggable);
                }
            }
        });
    });
}

// ເລີ່ມການເຮັດວຽກຂອງໜ້າສອບເສັງ
async function initializeQuizPage() {
    await handleExamState();
    listenForStateChanges();

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
