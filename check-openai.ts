Deno.serve(async (req) => {
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  
  return new Response(
    JSON.stringify({ 
      hasKey: !!openaiKey, 
      keyLength: openaiKey ? openaiKey.length : 0,
      keyPrefix: openaiKey ? openaiKey.substring(0, 10) + "..." : "none"
    }),
    { 
      headers: { "Content-Type": "application/json" },
      status: 200 
    }
  );
});