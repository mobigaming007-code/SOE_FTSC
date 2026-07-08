const GAS_WEB_APP_URL = process.env.GAS_WEB_APP_URL;

async function proxyToGas(request: Request, method: "GET" | "POST") {
  if (!GAS_WEB_APP_URL) {
    return Response.json(
      {
        success: false,
        code: "MISSING_GAS_URL",
        message: "Thiếu biến môi trường GAS_WEB_APP_URL.",
      },
      { status: 500 }
    );
  }

  const incomingUrl = new URL(request.url);
  const targetUrl = new URL(GAS_WEB_APP_URL);

  incomingUrl.searchParams.forEach((value, key) => {
    targetUrl.searchParams.set(key, value);
  });

  const init: RequestInit = {
    method,
    redirect: "follow",
    headers: {
      "Content-Type": "text/plain",
    },
  };

  if (method === "POST") {
    const bodyText = await request.text();
    init.body = bodyText;
  }

  const gasResponse = await fetch(targetUrl.toString(), init);
  const text = await gasResponse.text();

  return new Response(text, {
    status: gasResponse.status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

export async function GET(request: Request) {
  return proxyToGas(request, "GET");
}

export async function POST(request: Request) {
  return proxyToGas(request, "POST");
}