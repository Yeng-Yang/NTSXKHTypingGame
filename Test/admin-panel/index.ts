import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

console.log("Function 'check-exam-status' called");

Deno.serve(async (req) => {
  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ສ້າງ Admin client ເພື່ອໃຫ້ມີສິດທິໃນການຂຽນຂໍ້ມູນ
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const now = new Date().toISOString();

    // 1. ຊອກຫາການສອບເສັງທີ່ກຳລັງດຳເນີນການ ແລະ ໝົດເວລາແລ້ວ
    const { data: expiredSessions, error: fetchError } = await supabaseAdmin
      .from('quiz_sessions')
      .select('id')
      .eq('status', 'IN_PROGRESS')
      .lt('end_time', now);

    if (fetchError) {
      throw fetchError;
    }

    if (expiredSessions.length > 0) {
      console.log(`Found ${expiredSessions.length} expired session(s). Updating status...`);
      const sessionIds = expiredSessions.map(s => s.id);

      // 2. ອັບເດດສະຖານະຂອງ session ທີ່ໝົດເວລາແລ້ວໃຫ້ເປັນ 'RESULTS_AVAILABLE'
      const { error: updateError } = await supabaseAdmin
        .from('quiz_sessions')
        .update({ status: 'RESULTS_AVAILABLE' })
        .in('id', sessionIds);

      if (updateError) throw updateError;

      return new Response(JSON.stringify({ message: `Updated ${expiredSessions.length} session(s).` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ message: 'No expired sessions found.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in check-exam-status function:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});