document.addEventListener('DOMContentLoaded', function() {
    const quizForm = document.getElementById('quiz-form');
    const submitBtn = document.getElementById('submit-btn');
    const resultContainer = document.getElementById('result-container');

    // ກວດສອບວ່ານັກຮຽນລັອກອິນເຂົ້າມາຫຼືບໍ່
    const currentStudentId = sessionStorage.getItem('current_student_id');
    if (!currentStudentId) {
        // ຖ້າຍັງບໍ່ລັອກອິນ, ໃຫ້ກັບໄປໜ້າ login
        window.location.href = 'login.html';
        return; // ຢຸດການทำงานຂອງ script
    }

    // ກວດສອບສະຖານະການສອບເສັງ
    const quizStatus = localStorage.getItem('quiz_status');
    if (quizStatus !== 'active') {
        alert('ການສອບເສັງໄດ້ສິ້ນສຸດລົງແລ້ວ!');
        window.location.href = 'login.html';
        return;
    }

    // ກວດສອບວ່າເຄີຍສົ່ງຄຳຕອບແລ້ວບໍ່
    if (sessionStorage.getItem(`submitted_${currentStudentId}`)) {
        quizForm.innerHTML = "<h1>✅ ທ່ານໄດ້ສົ່ງຄຳຕອບສຳເລັດແລ້ວ.</h1><p>ກະລຸນາລໍຖ້າການປະກາດຄະແນນຈາກ Admin.</p>";
        submitBtn.style.display = 'none';
        return;
    }

    // ດຶງຂໍ້ມູນຄຳຖາມຈາກ localStorage ທີ່ Admin ສ້າງໄວ້
    const quizData = JSON.parse(localStorage.getItem('quiz_questions') || '[]');

    if (quizData.length === 0) {
        quizForm.innerHTML = "<h1>ບໍ່ມີຄຳຖາມໃນລະບົບ. ກະລຸນາຕິດຕໍ່ Admin.</h1>";
        submitBtn.style.display = 'none';
    }

    // Function ເພື່ອສ້າງຄຳຖາມໃນໜ້າ HTML
    function buildQuiz() {
        let output = '';
        quizData.forEach((currentQuestion, questionNumber) => {
            output += `<div class="question-block" id="question${questionNumber}">`;
            output += `<div class="question-text">${questionNumber + 1}. ${currentQuestion.question}</div>`;

            if (currentQuestion.image) {
                output += `<img src="${currentQuestion.image}" alt="ຮູບປະກອບຄຳຖາມ ${questionNumber + 1}" class="question-image">`;
            }

            if (currentQuestion.type === 'multiple-choice' || currentQuestion.type === 'image-multiple-choice') {
                output += `<div class="options-container">`;
                (currentQuestion.options || []).forEach(option => {
                    output += `<label>
                                 <input type="radio" name="question${questionNumber}" value="${option}">
                                 ${option}
                               </label>`;
                });
                output += `</div>`;
            } else if (currentQuestion.type === 'fill-in' || currentQuestion.type === 'image-fill-in') {
                output += `<input type="text" name="question${questionNumber}" class="fill-in-input" placeholder="ປ້ອນຄຳຕອບຂອງທ່ານ...">`;
            }
            else if (currentQuestion.type.includes('matching')) {
                const terms = currentQuestion.pairs.map(p => p.term);
                const matches = currentQuestion.pairs.map(p => p.match);

                // Shuffle the matches column to make it a challenge
                for (let i = matches.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [matches[i], matches[j]] = [matches[j], matches[i]];
                }

                output += `<div class="matching-container">`;
                output += `<div class="matching-column">`; // Terms column
                terms.forEach((term, index) => {
                    output += `<div class="matching-item term-item" data-index="${index}">${term}</div>`;
                });
                output += `</div>`;

                output += `<div class="matching-column">`; // Matches column
                matches.forEach((match, index) => {
                    if (currentQuestion.type === 'matching-text-image') {
                        output += `<div class="matching-item match-item" draggable="true" data-original-match="${match}">
                                     <img src="${match}" alt="ຕົວເລືອກຈັບຄູ່">
                                   </div>`;
                    } else { // matching-text-text
                        output += `<div class="matching-item match-item" draggable="true" data-original-match="${match}">${match}</div>`;
                    }
                });
                output += `</div>`;

                output += `<div class="matching-column drop-zones">`; // Drop zones column
                terms.forEach((term, index) => {
                    output += `<div class="matching-drop-zone" data-term-index="${index}"></div>`;
                });
                output += `</div>`;

                output += `</div>`;
            }
            output += `</div>`;
        });
        quizForm.innerHTML = output;
    }

    // ບັນທຶກຄະແນນຂອງນັກຮຽນ
    function saveScore(studentId, score, total) {
        const scores = JSON.parse(localStorage.getItem('quiz_scores') || '[]');
        const newScore = {
            studentId: studentId,
            score: score,
            total: total,
            date: new Date().toISOString()
        };

        // ກວດສອບວ່ານັກຮຽນເຄີຍສອບເສັງແລ້ວບໍ່, ຖ້າເຄີຍໃຫ້ອັບເດດຄະແນນ
        const existingScoreIndex = scores.findIndex(s => s.studentId === studentId);
        if (existingScoreIndex > -1) {
            scores[existingScoreIndex] = newScore; // ອັບເດດຄະແນນເກົ່າ
        } else {
            scores.push(newScore); // ເພີ່ມຄະແນນໃໝ່
        }
        localStorage.setItem('quiz_scores', JSON.stringify(scores));
    }

    // Function ເພື່ອກວດຄຳຕອບ
    function checkAnswers() {
        // ປ້ອງກັນການກົດສົ່ງຊ້ຳ
        if (submitBtn.disabled) return;
        submitBtn.disabled = true;
        clearInterval(statusCheckInterval); // ຢຸດການກວດສອບສະຖານະ

        let score = 0;
        const pointsPerQuestion = quizData.length > 0 ? 10 / quizData.length : 0;

        quizData.forEach((currentQuestion, questionNumber) => {
            let isCorrect = false; // ຍ້າຍການປະກາດຕົວແປມາໄວ້ບ່ອນນີ້
            const questionBlock = document.getElementById(`question${questionNumber}`);
            const selector = `input[name=question${questionNumber}]`;
            let userAnswer;

            if (currentQuestion.type === 'multiple-choice' || currentQuestion.type === 'image-multiple-choice') {
                const selectedOption = document.querySelector(`${selector}:checked`);
                userAnswer = selectedOption ? selectedOption.value : undefined;
            } else if (currentQuestion.type === 'fill-in' || currentQuestion.type === 'image-fill-in') {
                const inputField = document.querySelector(selector);
                userAnswer = inputField.value.trim().toLowerCase();
            } else if (currentQuestion.type.includes('matching')) {
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
            }
            
            // ກວດສອບຄຳຕອບ (ປັບປຸງໃຫ້ດີຂຶ້ນ)
            const correctAnswer = currentQuestion.answer ? currentQuestion.answer.toLowerCase() : '';
            if (userAnswer) {
                // ປ່ຽນທຸກຄຳຕອບເປັນໂຕພິມນ້ອຍເພື່ອໃຫ້ກວດງ່າຍຂຶ້ນ
                const formattedUserAnswer = userAnswer.toLowerCase();
                
                if (currentQuestion.type.includes('fill-in')) {
                    // ສ້າງ array ຂອງຄຳຕອບທີ່ເປັນໄປໄດ້
                    const possibleAnswers = [correctAnswer, 'flash drive', 'ແຟລັດໄດຣຟ໌', 'hard disk'];
                    if (possibleAnswers.includes(formattedUserAnswer)) {
                        isCorrect = true;
                    }
                } else {
                    if (formattedUserAnswer === correctAnswer) {
                        isCorrect = true;
                    }
                }
            }

            // ໃສ່ສີພື້ນຫຼັງຕາມຄຳຕອບ ຖືກ ຫຼື ຜິດ
            questionBlock.classList.remove('correct', 'incorrect');
            if (isCorrect) {
                score += pointsPerQuestion;
                questionBlock.classList.add('correct');
            } else {
                questionBlock.classList.add('incorrect');
            }
        });

        const finalScore = score.toFixed(2); // ປັດเศษເປັນ 2 ຕຳແໜ່ງ

        // ບັນທຶກຄະແນນ
        saveScore(currentStudentId, finalScore, 10);

        // ໝາຍໄວ້ວ່າໄດ້ສົ່ງຄຳຕອບແລ້ວ
        sessionStorage.setItem(`submitted_${currentStudentId}`, 'true');

        // ແຈ້ງເຕືອນ ແລະ ອອກຈາກລະບົບ
        alert('✅ ສົ່ງຄຳຕອບສຳເລັດແລ້ວ!');
        sessionStorage.removeItem('current_student_id'); // ລ້າງຂໍ້ມູນການລັອກອິນ
        window.location.href = 'login.html'; // ກັບໄປໜ້າລັອກອິນ

    }

    // --- Student-side Status Check ---
    function checkQuizStatus() {
        const currentStatus = localStorage.getItem('quiz_status');
        if (currentStatus === 'finished') {
            alert('Admin ໄດ້ສັ່ງຢຸດການສອບເສັງ! ລະບົບຈະສົ່ງຄຳຕອບຂອງທ່ານອັດຕະໂນມັດ.');
            checkAnswers();
        }
    }

    const statusCheckInterval = setInterval(checkQuizStatus, 2000); // ກວດສອບທຸກໆ 2 ວິນາທີ
    // --- End of Status Check ---

    // ເລີ່ມສ້າງບົດກວດກາຖ້າມີຄຳຖາມ
    if (quizData.length > 0) buildQuiz();

    // --- Drag and Drop Logic for Matching Questions ---
    let draggedItem = null;

    quizForm.addEventListener('dragstart', e => {
        if (e.target.classList.contains('match-item')) {
            draggedItem = e.target;
            setTimeout(() => {
                e.target.style.display = 'none';
            }, 0);
        }
    });

    quizForm.addEventListener('dragend', e => {
        if (draggedItem) {
            setTimeout(() => {
                draggedItem.style.display = 'flex'; // or 'block'
                draggedItem = null;
            }, 0);
        }
    });

    quizForm.addEventListener('dragover', e => {
        e.preventDefault();
    });

    quizForm.addEventListener('drop', e => {
        e.preventDefault();
        if (e.target.classList.contains('matching-drop-zone')) {
            // If the drop zone already has an item, don't drop another one
            if (e.target.children.length === 0) {
                e.target.appendChild(draggedItem);
            }
        }
    });
    // --- End of Drag and Drop Logic ---


    // ເພີ່ມ Event Listener ໃຫ້ກັບປຸ່ມສົ່ງຄຳຕອບ
    submitBtn.addEventListener('click', checkAnswers);
});
