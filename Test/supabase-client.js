const SUPABASE_URL = 'https://qwkuagtnjglwlqzllsua.supabase.co'; // ປ່ຽນເປັນ URL ຂອງທ່ານ
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3a3VhZ3Ruamdsd2xxemxsc3VhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2MTY1NTcsImV4cCI6MjA3NzE5MjU1N30.kahrc06k11xctCuyycHtTTfrz_I2DZkp8NdRccvikNU'; // ປ່ຽນເປັນ Key ຂອງທ່ານ

// ສ້າງ Supabase client (ແກ້ໄຂການປະກາດຕົວແປ)
const supabase_client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
