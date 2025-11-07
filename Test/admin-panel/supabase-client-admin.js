// File: supabase-client-admin.js
// ໃຊ້ສະເພາະໃນ Admin Panel (Desktop App) ເທົ່ານັ້ນ! ຫ້າມອັບໂຫຼດຂຶ້ນອອນລາຍ!

const SUPABASE_URL = 'https://qwkuagtnjglwlqzllsua.supabase.co';
// !!! ສໍາຄັນ: ໄປທີ່ Supabase Dashboard > Project Settings > API > Project API keys
// ແລະ ຄັດລອກກະແຈ "service_role" ມາໃສ່ບ່ອນນີ້
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3a3VhZ3Ruamdsd2xxemxsc3VhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTYxNjU1NywiZXhwIjoyMDc3MTkyNTU3fQ.RW22a_vISc_OVpi2RAN28FN78l-LB_9VMbfHy5lnJyA'; // <--- ໃສ່ SERVICE_ROLE KEY ທີ່ແທ້ຈິງຂອງທ່ານຢູ່ບ່ອນນີ້

const supabase_client = supabase.createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);