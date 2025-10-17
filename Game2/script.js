const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- UI Elements ---
const startScreen = document.getElementById('start-screen');
const gameScreen = document.getElementById('game-screen');
const scoreEl = document.getElementById('score');
const healthEl = document.getElementById('health');
const gameOverScreen = document.getElementById('game-over-screen');
const leaderboardEl = document.getElementById('leaderboard');
const restartButton = document.getElementById('restart-button');
const startGameButton = document.getElementById('start-game-button');

// --- ການຕັ້ງຄ່າເກມ ---
canvas.width = 600;
canvas.height = 600; // ປັບຄວາມສູງຂອງຈໍເກມລົງ

const LAO_ALPHABET = "ກຂຄງຈສຊຍດຕຖທນບປຜຝພຟມຢຣລວຫອຮ".split('');
const ENG_ALPHABET = "abcdefghijklmnopqrstuvwxyz".split('');
let activeAlphabet = LAO_ALPHABET; // ຕັ້ງຄ່າເລີ່ມຕົ້ນເປັນພາສາລາວ

// --- ການຕັ້ງຄ່າສຽງ ---
const sounds = {
    start: new Audio('sounds/start.wav'),
    shoot: new Audio('sounds/shoot.wav'),
    explosion: new Audio('sounds/explosion.wav'),
    gameOver: new Audio('sounds/game_over.wav'),
    hit: new Audio('sounds/hit.wav'),
    backgroundMusic: new Audio('sounds/background.mp3') // ເພີ່ມສຽງດົນຕີປະກອບ
};

// --- ລະບົບແປພາສາ ---
const translations = {
    lo: {
        selectLanguage: "ເລືອກພາສາ:",
        startButton: "ເລີ່ມເກມ",
        title: "ເກມພິມຍິງຕົວອັກສອນ",
        scoreLabel: "ຄະແນນ",
        healthLabel: "ພະລັງຊີວິດ",
        gameOverTitle: "ການແຂ່ງຂັນສິ້ນສຸດ!",
        restartButton: "ຫຼິ້ນໃໝ່",
        playerName: "ທ່ານ",
        scoreUnit: "ຄະແນນ"
    },
    en: {
        selectLanguage: "Select Language:",
        startButton: "Start Game",
        title: "Typing Shooter Game",
        scoreLabel: "Score",
        healthLabel: "Health",
        gameOverTitle: "Game Over!",
        restartButton: "Restart",
        playerName: "You",
        scoreUnit: "Points"
    }
};
let currentLang = 'lo';

function setLanguage(lang) {
    currentLang = lang;
    document.querySelectorAll('[data-lang]').forEach(el => {
        const key = el.getAttribute('data-lang');
        if (translations[lang][key]) {
            el.textContent = translations[lang][key];
        }
    });
}

let players, enemies, bullets, enemyBullets, explosions;
let isGameOver;
let humanPlayer; // ເກັບຜູ້ຫຼິ້ນທີ່ເປັນຄົນ
let musicStarted = false; // ເພີ່ມຕົວປ່ຽນເພື່ອຕິດຕາມວ່າດົນຕີເລີ່ມຫຼິ້ນແລ້ວບໍ່

function setupGame() {
    // --- ຕັ້ງຄ່າສະຖານະຂອງເກມ ---
    humanPlayer = {
        x: canvas.width / 2,
        y: canvas.height - 50,
        width: 50,
        height: 30,
        color: '#58a6ff',
        isDestroyed: false,
        isAI: false,
        score: 0,
        health: 20,
    };

    players = [humanPlayer];

    enemies = [];
    bullets = [];
    enemyBullets = [];
    explosions = [];
    isGameOver = false;

    // --- ອັບເດດໜ້າຈໍສະແດງຜົນ ---
    scoreEl.textContent = humanPlayer.score;
    healthEl.textContent = humanPlayer.health;
    gameOverScreen.classList.add('hidden');
    musicStarted = false; // ຣີເຊັດສະຖານະດົນຕີເມື່ອເລີ່ມເກມໃໝ່
    // ເລີ່ມເກມດ້ວຍສັດຕູຊຸດທຳອິດ
    spawnWave();
}

// --- ການສ້າງສັດຕູເປັນຊຸດ (Wave) ---
function spawnWave() {
    const waveSize = 3; // ຈຳນວນສັດຕູໃນແຕ່ລະຊຸດ
    const screenThird = canvas.width / waveSize;

    for (let i = 0; i < waveSize; i++) {
        const x = (screenThird * i) + (Math.random() * (screenThird - 40)) + 20;
        const letter = activeAlphabet[Math.floor(Math.random() * activeAlphabet.length)];
        const speed = 0.5;

        enemies.push({
            x: x, y: -30, letter: letter, speed: speed,
            size: 30, color: '#f0f6fc'
        });
    }
}

// --- ການຍິງລູກປືນຂອງສັດຕູ ---
function enemyShoot(enemy, targetPlayer) {
    enemyBullets.push({
        x: enemy.x,
        y: enemy.y,
        speed: 5, // ປັບຄວາມໄວລູກປືນສັດຕູ
        size: 8,
        color: '#f85149', // ສີແດງ
        target: targetPlayer, // **ສຳຄັນ: ກຳນົດເປົ້າໝາຍຄືຜູ້ຫຼິ້ນ**
        velocityX: 0,
        velocityY: 0
    });
}

// --- ການສ້າງເອັບເຟັກລະເບີດ ---
function createExplosion(x, y, color) {
    const particleCount = 20; // ຈຳນວນອະນຸພາກ
    for (let i = 0; i < particleCount; i++) {
        explosions.push({
            x: x,
            y: y,
            speedX: (Math.random() - 0.5) * (Math.random() * 5), // ຄວາມໄວແນວນອນ
            speedY: (Math.random() - 0.5) * (Math.random() * 5), // ຄວາມໄວແນວຕັ້ງ
            size: Math.random() * 3 + 1,
            color: color,
            life: 50 // ອາຍຸຂອງອະນຸພາກ (ກຳນົດວ່າຈະສະແດງດົນປານໃດ)
        });
    }
}

// --- ການກວດສອບການชนກັນ ---
function checkCollision(obj1, obj2) {
    return obj1.x < obj2.x + obj2.width &&
           obj1.x + obj1.width > obj2.x &&
           obj1.y < obj2.y + obj2.height &&
           obj1.y + obj1.height > obj2.y;
}

// --- ການແຕ້ມພາບ ---
function draw() {
    // ລ້າງ canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // ແຕ້ມຍົນຂອງຜູ້ຫຼິ້ນທຸກຄົນ
    players.forEach(player => {
        if (!player.isDestroyed) {
            ctx.fillStyle = player.color;
            ctx.beginPath();
            ctx.moveTo(player.x, player.y);
            ctx.lineTo(player.x - player.width / 2, player.y + player.height);
            ctx.lineTo(player.x + player.width / 2, player.y + player.height);
            ctx.closePath();
            ctx.fill();
        }
    });

    // ແຕ້ມ ແລະ ອັບເດດລູກປືນຂອງເຮົາ
    bullets.forEach((bullet, index) => {
        // ຖ້າລູກປືນມີເປົ້າໝາຍ, ໃຫ້ມັນໄລ່ຕາມ
        if (bullet.target && enemies.includes(bullet.target)) {
            const angle = Math.atan2(bullet.target.y - bullet.y, bullet.target.x - bullet.x);
            bullet.velocityX = Math.cos(angle) * bullet.speed;
            bullet.velocityY = Math.sin(angle) * bullet.speed;
        }

        // ອັບເດດຕຳແໜ່ງຂອງລູກປືນ
        bullet.x += bullet.velocityX;
        bullet.y += bullet.velocityY;

        ctx.fillStyle = bullet.color;
        ctx.fillRect(bullet.x - bullet.size / 2, bullet.y - bullet.size, bullet.size, bullet.size * 2);

        // ລຶບລູກປືນເມື່ອອອກຈາກຈໍ
        if (bullet.y < 0 || (bullet.target && !enemies.includes(bullet.target))) {
            bullets.splice(index, 1);
        }
    });

    // ແຕ້ມ ແລະ ອັບເດດລູກປືນຂອງສັດຕູ
    enemyBullets.forEach((bullet, index) => {
        // ໃຫ້ລູກປືນສັດຕູໄລ່ຕາມຜູ້ຫຼິ້ນ
        if (bullet.target && !bullet.target.isDestroyed) {
            const angle = Math.atan2(bullet.target.y - bullet.y, bullet.target.x - bullet.x);
            bullet.velocityX = Math.cos(angle) * bullet.speed;
            bullet.velocityY = Math.sin(angle) * bullet.speed;
        }
        bullet.x += bullet.velocityX;
        bullet.y += bullet.velocityY;

        ctx.fillStyle = bullet.color;
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.size / 2, 0, Math.PI * 2);
        ctx.fill();

        // ກວດສອບວ່າລູກປືນສັດຕູຖືກຜູ້ຫຼິ້ນຄົນໃດ
        if (bullet.target && !bullet.target.isDestroyed) {
            const playerHitbox = { x: bullet.target.x - bullet.target.width / 2, y: bullet.target.y, width: bullet.target.width, height: bullet.target.height };
            const bulletHitbox = { x: bullet.x - bullet.size / 2, y: bullet.y - bullet.size / 2, width: bullet.size, height: bullet.size };
            if (checkCollision(playerHitbox, bulletHitbox)) {
                enemyBullets.splice(index, 1);
                playSound(sounds.hit);
                bullet.target.health--;
                if (!bullet.target.isAI) { // ອັບເດດ HUD ສະເພາະຜູ້ຫຼິ້ນຄົນ
                    healthEl.textContent = bullet.target.health;
                }
                if (bullet.target.health <= 0) {
                    bullet.target.health = 0;
                    bullet.target.isDestroyed = true;
                    createExplosion(bullet.target.x, bullet.target.y + bullet.target.height / 2, bullet.target.color);
                    checkAllPlayersDead();
                }
            }
        }

        // ລຶບລູກປືນເມື່ອອອກຈາກຈໍ
        if (bullet.y > canvas.height) {
            enemyBullets.splice(index, 1);
        }
    });

    // ແຕ້ມ ແລະ ອັບເດດການລະເບີດ
    explosions.forEach((particle, index) => {
        particle.x += particle.speedX;
        particle.y += particle.speedY;
        particle.life--;

        if (particle.life <= 0) {
            explosions.splice(index, 1);
        } else {
            ctx.fillStyle = particle.color;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
        }
    });
    // ແຕ້ມ ແລະ ອັບເດດສັດຕູ
    enemies.forEach((enemy, enemyIndex) => {
        enemy.y += enemy.speed;
        ctx.fillStyle = enemy.color;
        ctx.font = `${enemy.size}px 'Phetsarath OT'`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(enemy.letter, enemy.x, enemy.y);

        // ກວດສອບການชนກັນລະຫວ່າງລູກປືນຂອງເຮົາ ແລະ ສັດຕູ
        bullets.forEach((bullet, bulletIndex) => {
            const enemyHitbox = { x: enemy.x - enemy.size / 2, y: enemy.y - enemy.size / 2, width: enemy.size, height: enemy.size };
            const bulletHitbox = { x: bullet.x - bullet.size / 2, y: bullet.y, width: bullet.size, height: bullet.size * 2 };
            
            if (checkCollision(enemyHitbox, bulletHitbox)) {
                // ສ້າງການລະເບີດຢູ່ຕຳແໜ່ງຂອງສັດຕູ
                playSound(sounds.explosion);
                createExplosion(enemy.x, enemy.y, enemy.color);
                // ເມື່ອชนກັນ, ລຶບທັງສອງອອກ
                if (bullet.owner) {
                    bullet.owner.score += 10;
                    if (!bullet.owner.isAI) {
                        scoreEl.textContent = bullet.owner.score;
                    }
                }
                enemies.splice(enemyIndex, 1);
                bullets.splice(bulletIndex, 1);
            }
        });

        // ຖ້າສັດຕູໄປຮອດລຸ່ມສຸດ, ເກມຈົບ
        if (enemy.y > canvas.height) {
            endGame();
        }
    });
}

// --- ຟັງຊັນຫຼິ້ນສຽງ ---
function playSound(sound) {
    if (sound) {
        sound.currentTime = 0; // ເລີ່ມສຽງໃໝ່ທຸກຄັ້ງ
        sound.play().catch(error => {
            // ປ້ອງກັນ error ຖ້າ browser ບໍ່ອະນຸຍາດໃຫ້ຫຼິ້ນສຽງ
            console.warn("Audio play was prevented:", error);
        });
    }
}

// --- ກວດສອບວ່າຜູ້ຫຼິ້ນທຸກຄົນຕາຍແລ້ວບໍ່ ---
function checkAllPlayersDead() {
    const allDead = players.every(p => p.isDestroyed);
    if (allDead && !isGameOver) {
        setTimeout(endGame, 1000);
    }
}

// --- Game Loop ---
function update(timestamp) {
    if (isGameOver) return;

    // ຖ້າສັດຕູທັງໝົດຖືກທຳລາຍ, ໃຫ້ສ້າງຊຸດໃໝ່
    if (enemies.length === 0) {
        spawnWave();
    }

    draw();
    requestAnimationFrame(update);
}

// --- ການຄວບຄຸມດ້ວຍການພິມ ---
window.addEventListener('keydown', (e) => {
    if (isGameOver || humanPlayer.isDestroyed) return;

    const key = e.key.toLowerCase();
    let targetFound = false;

    // ຫາສັດຕູໂຕທີ່ໃກ້ທີ່ສຸດທີ່ມີຕົວອັກສອນກົງກັນ
    let closestEnemy = null;
    let minDistance = Infinity;

    enemies.forEach(enemy => {
        if (enemy.letter === key) {
            targetFound = true;
            if (enemy.y < minDistance) {
                minDistance = enemy.y;
                closestEnemy = enemy;
            }
        }
    });

    if (closestEnemy) {
        playSound(sounds.shoot);
        // ສ້າງລູກປືນ ແລະ ກຳນົດເປົ້າໝາຍໃຫ້ມັນ
        bullets.push({
            x: humanPlayer.x,
            y: humanPlayer.y,
            speed: 15, // ປັບຄວາມໄວລູກປືນໄດ້ທີ່ນີ້
            size: 5,
            color: '#3fb950',
            target: closestEnemy, // **ສຳຄັນ: ເກັບເປົ້າໝາຍໄວ້**
            owner: humanPlayer, // **ສຳຄັນ: ເກັບວ່າໃຜເປັນເຈົ້າຂອງລູກປືນ**
            velocityX: 0, // ຈະຖືກຄຳນວນໃນ draw() loop
            velocityY: 0  // ຈະຖືກຄຳນວນໃນ draw() loop
        });
    } else if (key.length === 1 && activeAlphabet.includes(key)) {
        // ຖ້າພິມຜິດ (ຕົວອັກສອນມີໃນພາສາລາວ ແຕ່ບໍ່ມີສັດຕູ)
        // ໃຫ້ສັດຕູໂຕທຳອິດໃນໜ້າຈໍຍິງໃສ່ເຮົາ
        if (enemies.length > 0) {
            enemyShoot(enemies[0], humanPlayer);
        }
    }
});

// --- ການຈົບເກມ ແລະ ເລີ່ມໃໝ່ ---
function endGame() {
    if (isGameOver) return; // ປ້ອງກັນການເອີ້ນຊ້ຳ
    isGameOver = true;
    playSound(sounds.gameOver);
    sounds.backgroundMusic.pause(); // ຢຸດດົນຕີປະກອບ
    sounds.backgroundMusic.currentTime = 0; // ຕັ້ງເວລາດົນຕີກັບไปที่ 0

    // ຈັດອັນດັບຜູ້ຫຼິ້ນ
    players.sort((a, b) => b.score - a.score);

    // ສ້າງ HTML ສຳລັບກະດານຈັດອັນດັບ
    leaderboardEl.innerHTML = ''; // ລ້າງຂໍ້ມູນເກົ່າ
    humanPlayer.name = translations[currentLang].playerName; // ຕັ້ງຊື່ຜູ້ຫຼິ້ນຕາມພາສາ
    players.forEach((player, index) => {
        const rank = index + 1;
        const entry = document.createElement('div');
        entry.className = `leaderboard-entry rank-${rank}`;
        entry.innerHTML = `<span class="rank">#${rank}</span><span class="name">${player.name}</span><span class="score">${player.score} ${translations[currentLang].scoreUnit}</span>`;
        leaderboardEl.appendChild(entry);
    });

    gameOverScreen.classList.remove('hidden');
}

restartButton.addEventListener('click', () => {
    setupGame();
    // ເລີ່ມດົນຕີໃໝ່
    sounds.backgroundMusic.currentTime = 0;
    sounds.backgroundMusic.play();
    requestAnimationFrame(update);
});

// --- ການຄວບຄຸມໜ້າຈໍເລີ່ມຕົ້ນ ---
document.querySelectorAll('[data-lang-select]').forEach(button => {
    button.addEventListener('click', () => {
        // ປ່ຽນພາສາ ແລະ ຕົວອັກສອນ
        const lang = button.getAttribute('data-lang-select');
        activeAlphabet = (lang === 'lo') ? LAO_ALPHABET : ENG_ALPHABET;
        setLanguage(lang);

        // ອັບເດດສະໄຕລ໌ປຸ່ມທີ່ຖືກເລືອກ
        document.querySelector('[data-lang-select].active').classList.remove('active');
        button.classList.add('active');
    });
});

startGameButton.addEventListener('click', () => {
    // 1. ຫຼິ້ນສຽງເລີ່ມເກມ
    playSound(sounds.start);

    // 2. ຊ່ອນໜ້າຈໍເລີ່ມຕົ້ນ ແລະ ສະແດງໜ້າຈໍເກມ
    startScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');

    // 3. ຕັ້ງຄ່າເກມ
    setupGame();

    // 4. ເລີ່ມຫຼິ້ນດົນຕີປະກອບ
    if (!musicStarted) {
        sounds.backgroundMusic.loop = true;
        sounds.backgroundMusic.volume = 0.3;
        sounds.backgroundMusic.play().catch(e => console.warn("Background music could not be started."));
        musicStarted = true;
    }

    // 5. ເລີ່ມ Game Loop
    requestAnimationFrame(update);
});

// ຕັ້ງຄ່າພາສາເລີ່ມຕົ້ນຂອງ UI
setLanguage(currentLang);
