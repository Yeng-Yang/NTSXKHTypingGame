document.addEventListener('DOMContentLoaded', function() {
    const quizForm = document.getElementById('quiz-form');
    const submitBtn = document.getElementById('submit-btn');

    // ເພີ່ມ CSS ແບບໄດນາມິກສຳລັບຄຳຖາມປະເພດໃໝ່
    const style = document.createElement('style');
    style.innerHTML = `
        /* Drag Fill-in Styles */
        .drag-fill-in-container { display: flex; flex-direction: column; align-items: flex-start; gap: 25px; margin-top: 15px; }
        .drag-fill-in-sentence { font-size: 1.2em; line-height: 2; }
        .drag-fill-in-drop-zone { 
            display: inline-flex; align-items: baseline; justify-content: center;
            min-width: 130px; height: 30px; border: 2px dashed #007bff; 
            border-radius: 8px; vertical-align: middle; background-color: #f0f8ff; 
            transition: background-color 0.2s, border-color 0.2s;
            padding: 0 5px; margin: 0 3px;
        }
        .drag-options-container { display: flex; flex-wrap: wrap; gap: 12px; justify-content: flex-start; padding: 15px; border: 1px solid #ddd; border-radius: 8px; background-color: #f9f9f9; width: 100%; }
        .drag-option { padding: 5px 15px; background-color: #fff; border: 1px solid #ced4da; border-radius: 8px; cursor: grab; user-select: none; box-shadow: 0 2px 4px rgba(0,0,0,0.05); transition: transform 0.2s, box-shadow 0.2s; }
        .drag-option:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
        .drag-option:active { cursor: grabbing; background-color: #e9ecef; }
        .drag-fill-in-drop-zone .drag-option {
            padding: 2px 8px; box-shadow: none;
        }`;
    document.head.appendChild(style);

    // ກວດສອບວ່ານັກຮຽນລັອກອິນເຂົ້າມາຫຼືບໍ່
    const currentStudentId = sessionStorage.getItem('current_student_id');
    if (!currentStudentId) {
        // ຖ້າຍັງບໍ່ລັອກອິນ, ໃຫ້ກັບໄປໜ້າ login
        window.location.href = 'login.html';
        return; // ຢຸດການทำงานຂອງ script
    }

    // Timer elements
    const timerDisplay = document.getElementById('quiz-timer');
    let timerInterval;
    let quizData = [];

    // ຟັງຊັນໃນການໂຫຼດຄຳຖາມຈາກ Supabase
    async function fetchQuestions() {
        const { data, error } = await supabase_client
            .from('questions')
            .select('*');

        if (error) {
            console.error('Error fetching questions:', error);
            quizForm.innerHTML = "<h1>ເກີດຂໍ້ຜິດພາດໃນການໂຫຼດຄຳຖາມ.</h1>";
            submitBtn.style.display = 'none';
            return [];
        }
        return data;
    }

    // ສັບປ່ຽນລຳດັບຂອງ Array (ສຳລັບສັບປ່ຽນຄຳຖາມ ແລະ ຕົວເລືອກ)
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    // ຟັງຊັນໃນການສ້າງບົດກວດກາໃນໜ້າ HTML
    function buildQuiz() {
        if (quizData.length === 0) {
            quizForm.innerHTML = "<h1>ບໍ່ມີຄຳຖາມໃນລະບົບ. ກະລຸນາຕິດຕໍ່ Admin.</h1>";
            submitBtn.style.display = 'none';
            return;
        }

        shuffleArray(quizData); // ສັບປ່ຽນລຳດັບຄຳຖາມ

        let output = '';
        quizData.forEach((currentQuestion, questionNumber) => {
            output += `<div class="question-block" id="question${questionNumber}">`;
            // ຖ້າເປັນຄຳຖາມລາກຄຳຕອບ, ຈະບໍ່ສະແດງຫົວຂໍ້ຄຳຖາມຢູ່ບ່ອນນີ້
            if (currentQuestion.type !== 'drag-fill-in') {
                output += `<div class="question-text">${questionNumber + 1}. ${currentQuestion.question}</div>`;
            }
            
            if (currentQuestion.image_url) {
                output += `<img src="${currentQuestion.image_url}" alt="ຮູບປະກອບຄຳຖາມ" class="question-image">`;
            }

            // ຮອງຮັບຄຳຖາມທຸກປະເພດ
            if (currentQuestion.type === 'multiple-choice' || currentQuestion.type === 'image-multiple-choice') {
                output += `<div class="options-container">`;
                const shuffledOptions = [...(currentQuestion.options || [])];
                shuffleArray(shuffledOptions); // ສັບປ່ຽນລຳດັບຕົວເລືອກ

                shuffledOptions.forEach(option => {
                    output += `<label>
                                 <input type="radio" name="question${questionNumber}" value="${option}">
                                 ${option}
                               </label>`;
                });
                output += `</div>`;
            } else if (currentQuestion.type === 'fill-in' || currentQuestion.type === 'image-fill-in') {
                output += `<input type="text" name="question${questionNumber}" class="fill-in-input" placeholder="ປ້ອນຄຳຕອບ...">`;
            } else if (currentQuestion.type && currentQuestion.type.includes('matching')) {
                const terms = currentQuestion.pairs.map(p => p.term);
                const matches = currentQuestion.pairs.map(p => p.match);

                shuffleArray(matches); // ສັບປ່ຽນລຳດັບຄຳຕອບເພື່ອໃຫ້ຈັບຄູ່

                output += `<div class="matching-container">`;
                output += `<div class="matching-column">`; // ຖັນຄຳສັບ
                terms.forEach((term, index) => {
                    output += `<div class="matching-item term-item" data-index="${index}">${term}</div>`;
                });
                output += `</div>`;

                output += `<div class="matching-column">`; // ຖັນຄຳຕອບ (ລາກໄດ້)
                matches.forEach((match) => {
                    if (currentQuestion.type === 'matching-text-image') {
                        output += `<div class="matching-item match-item" draggable="true" data-original-match="${match}">
                                     <img src="${match}" alt="ຕົວເລືອກຈັບຄູ່">
                                   </div>`;
                    } else { // matching-text-text
                        output += `<div class="matching-item match-item" draggable="true" data-original-match="${match}">${match}</div>`;
                    }
                });
                output += `</div>`;

                output += `<div class="matching-column drop-zones">`; // ຖັນບ່ອນວາງ
                terms.forEach((term, index) => {
                    output += `<div class="matching-drop-zone" data-term-index="${index}"></div>`;
                });
                output += `</div>`;

                output += `</div>`;
            } else if (currentQuestion.type === 'drag-fill-in') {
                const correctAnswers = Array.isArray(currentQuestion.answer) ? currentQuestion.answer : [currentQuestion.answer];
                const distractors = currentQuestion.options || [];
                const allWords = [...correctAnswers, ...distractors];
                shuffleArray(allWords);

                let blankIndex = 0;
                const sentenceHTML = currentQuestion.question.replace(/__BLANK__/g, () => {
                    return `<div class="drag-fill-in-drop-zone" data-question-number="${questionNumber}" data-blank-index="${blankIndex++}"></div>`;
                });

                let wordsHTML = '';
                allWords.forEach((word) => {
                    if (word) {
                        wordsHTML += `<div class="drag-option" draggable="true" data-word="${word}">${word}</div>`;
                    }
                });

                output += `<div class="drag-fill-in-container">`;
                output += `<div class="drag-fill-in-sentence">${questionNumber + 1}. ${sentenceHTML}</div>`;
                output += `<div class="drag-options-container">${wordsHTML}</div>`;
                output += `</div>`;
            }
            output += `</div>`;
        });
        quizForm.innerHTML = output;
    }

    // ຟັງຊັນບັນທຶກຄະແນນ
    async function saveScore(studentId, score) {
        // ດຶງ ID ຂອງ session ລ່າສຸດ
        const { data: sessionData, error: sessionError } = await supabase_client.from('quiz_sessions').select('id').order('created_at', { ascending: false }).limit(1).single();
        if (sessionError || !sessionData) {
            console.error('Could not get current session ID to save score.');
            return;
        }
        const { error } = await supabase_client
            .from('submissions')
            .insert({ student_id: studentId, score: score, session_id: sessionData.id }); 

        if (error) {
            console.error('Error saving score:', error);
        }
    }

    // ຟັງຊັນກວດຄຳຕອບ
    async function checkAnswers() {
        if (submitBtn.disabled) return;
        // ກວດສອບວ່າເຄີຍສົ່ງແລ້ວບໍ່ ອີກຄັ້ງກ່ອນສົ່ງ
        const { data: sessionData } = await supabase_client.from('quiz_sessions').select('id').order('created_at', { ascending: false }).limit(1).single();
        const { data: existingSubmission } = await supabase_client
            .from('submissions')
            .select('id')
            .eq('student_id', currentStudentId)
            .eq('session_id', sessionData.id)
            .single();

        if (existingSubmission) { // ຖ້າພົບການສົ່ງໃນ session ນີ້ແລ້ວ
            alert('ທ່ານໄດ້ສົ່ງບົດກວດກາໄປແລ້ວ.');
            window.location.href = 'final_results.html';
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'ກຳລັງປະມວນຜົນ...';

        const baseScore = 5; // ຄະແນນເລີ່ມຕົ້ນ
        const variableScore = 5; // ຄະແນນສ່ວນທີ່ເຫຼືອ (10 - 5 = 5)
        let earnedScore = 0; // ຄະແນນທີ່ໄດ້ຈາກການຕອບຖືກ
        const pointsPerQuestion = quizData.length > 0 ? variableScore / quizData.length : 0;

        quizData.forEach((currentQuestion, questionNumber) => {
            let isCorrect = false;
            const questionBlock = document.getElementById(`question${questionNumber}`);
            const selector = `input[name=question${questionNumber}]`;
            let userAnswer;

            if (currentQuestion.type === 'multiple-choice' || currentQuestion.type === 'image-multiple-choice') {
                const selectedOption = document.querySelector(`${selector}:checked`);
                userAnswer = selectedOption ? selectedOption.value : undefined;
                if (userAnswer && userAnswer.toLowerCase() === String(currentQuestion.answer).toLowerCase()) {
                    isCorrect = true;
                }
            } else if (currentQuestion.type === 'fill-in' || currentQuestion.type === 'image-fill-in') {
                const inputField = document.querySelector(selector);
                userAnswer = inputField.value.trim().toLowerCase();
                if (userAnswer && userAnswer === String(currentQuestion.answer).toLowerCase()) {
                    isCorrect = true;
                }
            } else if (currentQuestion.type && currentQuestion.type.includes('matching')) {
                const dropZones = questionBlock.querySelectorAll('.matching-drop-zone');
                let correctPairs = 0;
                dropZones.forEach(zone => {
                    const droppedItem = zone.querySelector('.match-item');
                    if (droppedItem) {
                        const termIndex = parseInt(zone.dataset.termIndex, 10);
                        const originalTerm = currentQuestion.pairs[termIndex].term;
                        const originalMatchForTerm = currentQuestion.pairs.find(p => p.term === originalTerm).match;
                        
                        if (droppedItem.dataset.originalMatch === originalMatchForTerm) {
                            correctPairs++;
                        }
                    }
                });
                isCorrect = (correctPairs === currentQuestion.pairs.length);
            } else if (currentQuestion.type === 'drag-fill-in') {
                const dropZones = questionBlock.querySelectorAll('.drag-fill-in-drop-zone');
                let correctBlanks = 0;
                const correctAnswers = Array.isArray(currentQuestion.answer) ? currentQuestion.answer : [currentQuestion.answer];

                dropZones.forEach(zone => {
                    const blankIndex = parseInt(zone.dataset.blankIndex, 10);
                    const droppedItem = zone.querySelector('.drag-option');
                    if (droppedItem) {
                        const droppedWord = droppedItem.dataset.word;
                        if (droppedWord === correctAnswers[blankIndex]) {
                            correctBlanks++;
                        }
                    }
                });
                isCorrect = (correctBlanks === correctAnswers.length && correctAnswers.length > 0);
            }
            
            if (isCorrect) {
                earnedScore += pointsPerQuestion;
                questionBlock.classList.add('correct');
            } else {
                questionBlock.classList.add('incorrect');
            }
        });

        const finalScore = (baseScore + earnedScore).toFixed(2);
        await saveScore(currentStudentId, finalScore);

        // ສົ່ງໄປໜ້າສະແດງຜົນຄະແນນ
        window.location.href = 'final_results.html';
    }

    // --- Timer Logic ---
    function startTimer(endTime) {
        clearInterval(timerInterval); // Clear any existing timer

        timerInterval = setInterval(() => {
            const now = new Date().getTime();
            const distance = new Date(endTime).getTime() - now;

            if (distance < 0) {
                clearInterval(timerInterval);
                timerDisplay.textContent = "ໝົດເວລາ!";
                timerDisplay.style.backgroundColor = '#dc3545';
                alert('ໝົດເວລາ! ລະບົບຈະສົ່ງຄຳຕອບຂອງທ່ານໂດຍອັດຕະໂນມັດ.');
                checkAnswers(); // ບັງຄັບສົ່ງຄຳຕອບ
                return;
            }

            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);

            timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

            // ປ່ຽນສີເມື່ອໃກ້ຈະໝົດເວລາ
            if (distance < 5 * 60000) { // 5 ນາທີສຸດທ້າຍ
                timerDisplay.style.backgroundColor = '#ffc107'; // ສີເຫຼືອງ
            }
        }, 1000);
    }

    // ຟັງຊັນກວດສອບສະຖານະການສອບເສັງ
    async function checkExamStatus() {
        // ປັບປຸງ: ດຶງຂໍ້ມູນຈາກ session ລ່າສຸດສະເໝີ
        const { data, error } = await supabase_client
            .from('quiz_sessions')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error || !data) return null;
        if (data.status === 'CLOSED') {
            checkAnswers(); // ຖ້າ Admin ກົດຢຸດ, ໃຫ້ສົ່ງຄຳຕອບທັນທີ
        }
        return data;
    }
    // ເພີ່ມ Logic ສຳລັບການລາກ-ວາງ (Drag and Drop)
    let draggedItem = null;
    quizForm.addEventListener('dragstart', e => {
        if (e.target.classList.contains('match-item') || e.target.classList.contains('drag-option')) {
            draggedItem = e.target;
            setTimeout(() => e.target.style.opacity = '0.5', 0);
        }
    });
    quizForm.addEventListener('dragend', () => {
        if (draggedItem) {
            setTimeout(() => {
                draggedItem.style.opacity = '1';
                draggedItem = null;
            }, 0);
        }
    });
    quizForm.addEventListener('dragover', e => e.preventDefault());
    quizForm.addEventListener('drop', e => {
        e.preventDefault();
        if (!draggedItem) return;

        const dropTarget = e.target.closest('.matching-drop-zone, .drag-fill-in-drop-zone, .drag-options-container');
        if (dropTarget) {
            // ຖ້າບ່ອນວາງມີ item ຢູ່ແລ້ວ, ໃຫ້ສົ່ງກັບຄືນ
            if (dropTarget.children.length > 0 && !dropTarget.classList.contains('drag-options-container')) {
                const oldItem = dropTarget.firstElementChild;
                const originalContainer = draggedItem.closest('.question-block').querySelector('.matching-column:nth-child(2), .drag-options-container');
                if (originalContainer) originalContainer.appendChild(oldItem);
            }
            dropTarget.appendChild(draggedItem);
        }
    });

    submitBtn.addEventListener('click', checkAnswers);

    // ຟັງຊັນຫຼັກໃນການເລີ່ມຕົ້ນ
    async function main() {
        // 1. ດຶງ session ລ່າສຸດ ແລະ ກວດສອບວ່າເຄີຍສົ່ງຄຳຕອບໃນ session ນີ້ແລ້ວບໍ່
        const { data: sessionData } = await supabase_client.from('quiz_sessions').select('id').order('created_at', { ascending: false }).limit(1).single();
        if (!sessionData) {
            alert('ບໍ່ພົບ session ການສອບເສັງ. ກະລຸນາຕິດຕໍ່ Admin.');
            window.location.href = 'login.html';
            return;
        }
        const { data: submission } = await supabase_client
            .from('submissions')
            .select('id')
            .eq('student_id', currentStudentId)
            .eq('session_id', sessionData.id) // ກວດສອບສະເພາະ session ປັດຈຸບັນ
            .single();        
        if (submission) {
            alert('ທ່ານໄດ້ສົ່ງບົດກວດກາແລ້ວ. ລະບົບຈະພາໄປໜ້າສະແດງຄະແນນ.');
            window.location.href = 'final_results.html';
            return;
        }

        // 2. ກວດສອບສະຖານະການສອບເສັງ
        async function handleExamState() {
            const examStatus = await checkExamStatus();

            if (!examStatus || examStatus.status === 'NOT_STARTED' || examStatus.status === 'CLOSED') {
                alert('ການສອບເສັງຍັງບໍ່ທັນເປີດ ຫຼື ໄດ້ປິດລົງແລ້ວ.');
                window.location.href = 'login.html';
            } else if (examStatus.status === 'OPEN') {
                // ຖ້າເປີດຮັບແລ້ວ ແຕ່ຍັງບໍ່ທັນເລີ່ມ, ໃຫ້ສະແດງໜ້າລໍຖ້າ
                quizForm.innerHTML = '<h1>⏳ ກະລຸນາລໍຖ້າ... ການສອບເສັງກຳລັງຈະເລີ່ມຂຶ້ນ.</h1>';
                submitBtn.style.display = 'none';
                timerDisplay.textContent = "ລໍຖ້າ";
            } else if (examStatus.status === 'IN_PROGRESS') {
                // ຖ້າເລີ່ມແລ້ວ, ໃຫ້ສ້າງບົດກວດກາ ແລະ ເລີ່ມຈັບເວລາ
                clearInterval(examStateInterval); // ຢຸດການກວດສອບເມື່ອເລີ່ມແລ້ວ
                startTimer(examStatus.end_time);
                quizData = await fetchQuestions();
                buildQuiz();
                submitBtn.style.display = 'block';
            }
        }

        // ກວດສອບສະຖານະທຸກໆ 5 ວິນາທີ ຈົນກວ່າການສອບເສັງຈະເລີ່ມ
        const examStateInterval = setInterval(handleExamState, 5000);
        handleExamState(); // ເອີ້ນໃຊ້ຄັ້ງທຳອິດທັນທີ

        quizData = await fetchQuestions();
        buildQuiz();
    }

    main();
});