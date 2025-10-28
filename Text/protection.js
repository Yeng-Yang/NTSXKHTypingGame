// File: protection.js
// ໂຄດນີ້ຊ່ວຍປ້ອງກັນການເຂົ້າເຖິງ Developer Tools ຢ່າງເຂັ້ມງວດ

// 1. ປິດການຄລິກຂວາ (ແບບງຽບ)
document.addEventListener('contextmenu', event => {
    event.preventDefault();
});

// 2. ປິດຄີບອດລັດທີ່ໃຊ້ເປີດ Developer Tools
document.addEventListener('keydown', function(e) {
    // ປິດ F12
    if (e.key === 'F12' || e.keyCode === 123) {
        e.preventDefault();
    }
    // ປິດ Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
    if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C' || e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67)) {
         e.preventDefault();
    }
    // ປິດ Ctrl+U (View Source)
    if (e.ctrlKey && (e.key === 'U' || e.keyCode === 85)) {
        e.preventDefault();
    }
});

// 3. ກວດຈັບການເປີດ Developer Tools ຢ່າງຕໍ່ເນື່ອງ
const devtools = {
	isOpen: false,
	orientation: undefined,
};

const threshold = 170;

const emitEvent = (isOpen) => {
	if (isOpen) {
        // ຖ້າກວດພົບວ່າເປີດ DevTools, ໃຫ້ລຶບເນື້ອຫາທັງໝົດອອກຈາກໜ້າເວັບ
		document.body.innerHTML = '<h1 style="text-align:center; color:red; margin-top: 50px;">ກວດພົບການກະທຳທີ່ບໍ່ປອດໄພ!</h1>';
	}
};

setInterval(() => {
	const widthThreshold = window.outerWidth - window.innerWidth > threshold;
	const heightThreshold = window.outerHeight - window.innerHeight > threshold;

	if (
		!(heightThreshold && widthThreshold) &&
		((window.Firebug && window.Firebug.chrome && window.Firebug.chrome.isInitialized) || widthThreshold || heightThreshold)
	) {
		if (!devtools.isOpen) {
			emitEvent(true);
		}
		devtools.isOpen = true;
	} else {
		devtools.isOpen = false;
	}
}, 500);