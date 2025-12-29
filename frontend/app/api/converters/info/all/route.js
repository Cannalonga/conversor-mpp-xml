export async function GET(request) {
  try {
    const backendUrl = 'http://localhost:3001/api/convert/info/all';
    console.log(`[CONVERTERS] Chamando: ${backendUrl}`);

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      console.error(`[CONVERTERS] Backend error: ${response.status}`);
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Backend retornou ${response.status}`
      }), { 
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await response.json();
    console.log(`[CONVERTERS] Sucesso: ${data.total} conversores`);

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (error) {
    console.error('[CONVERTERS] Erro:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Erro ao conectar ao backend',
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
