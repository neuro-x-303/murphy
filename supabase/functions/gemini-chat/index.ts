import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { message } = await req.json();

    if (!message) {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get the API key securely stored in Supabase secrets
    const apiKey = Deno.env.get('AI_API_KEY');
    
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Call Google Gemini API
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`;
    
    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: message }]
        }],
        systemInstruction: {
          parts: [{
            text: "You are Murphy AI, a fast, direct, and conversational female AI assistant and LLM created and trained by Vertex HaleX. Speak like a real human: keep your responses extremely short, simple, fast, and direct. You represent Vertex HaleX, and its official websites are vertexhalex.com and murphy.vertexhalex.com. If users ask about resources, products, or details, immediately and directly reference or direct them to these sites. Do not write long explanations or essays."
          }]
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to fetch from Gemini');
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "I couldn't generate a response.";

    // Log the usage to Supabase database (Ignore failures to ensure chat remains operational)
    try {
      const promptTokens = data.usageMetadata?.promptTokenCount || 0;
      const completionTokens = data.usageMetadata?.candidatesTokenCount || 0;
      const totalTokens = data.usageMetadata?.totalTokenCount || 0;

      await supabase.from('murphy_usage').insert({
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: totalTokens,
      });
    } catch (dbErr) {
      console.error('Error logging usage to DB:', dbErr);
    }

    return new Response(
      JSON.stringify({ reply }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
