// File: admin_auth.js

// ຟັງຊັນນີ້ຈະຖືກเรียกใช้ทันทีใน admin.html
// ເພື່ອກວດສອບວ່າ Admin ໄດ້ລັອກອິນຜ່ານ Supabase ແລ້ວ ຫຼື ບໍ່
async function checkAdminAuth() {
    const { data: { session } } = await supabase_client.auth.getSession();

    // ຖ້າບໍ່ມີ session (ຍັງບໍ່ໄດ້ລັອກອິນ) ຫຼື session ໝົດອາຍຸ
    if (!session) {
        alert('ກະລຸນາເຂົ້າສູ່ລະບົບ Admin ກ່ອນ!');
        window.location.replace('admin_login.html'); // ໃຊ້ replace ເພື່ອບໍ່ໃຫ້ກົດ back ກັບມາໄດ້
        return;
    }

    // ກວດສອບ Role ຂອງຜູ້ໃຊ້
    const { data: profile, error } = await supabase_client
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

    // ຖ້າບໍ່ແມ່ນ Admin ຫຼື ບໍ່ພົບ Profile, ໃຫ້ໄລ່ອອກ
    if (error || !profile || profile.role !== 'admin') {
        alert('ທ່ານບໍ່ມີສິດທິໃນການເຂົ້າເຖິງໜ້ານີ້!');
        await supabase_client.auth.signOut(); // ລັອກເອົ້າຜູ້ໃຊ້ທີ່ບໍ່ກ່ຽວຂ້ອງອອກ
        window.location.replace('admin_login.html');
    }
}