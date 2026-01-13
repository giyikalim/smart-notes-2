// app/api/elasticsearch/[...path]/route.ts
import { NextRequest, NextResponse } from "next/server";

const ELASTICSEARCH_URL = process.env.ELASTICSEARCH_URL!;
const ELASTICSEARCH_API_KEY = process.env.NGINX_ELASTICSEARCH_API_KEY!;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  return handleRequest(request, resolvedParams, "GET");
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  return handleRequest(request, resolvedParams, "POST");
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  return handleRequest(request, resolvedParams, "PUT");
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  return handleRequest(request, resolvedParams, "DELETE");
}

async function handleRequest(
  request: NextRequest,
  params: { path: string[] },
  method: string
) {
  try {
    const path = params.path.join("/");
    const searchParams = request.nextUrl.search; // keeps the ?query=string

    let body: string | undefined;
    if (method === "POST" || method === "PUT") {
      try {
        body = JSON.stringify(await request.json());
      } catch {
        body = undefined;
      }
    }

    const response = await fetch(
      `${ELASTICSEARCH_URL}/${path}${searchParams}`,
      {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": ELASTICSEARCH_API_KEY,
        },
        body,
      }
    );

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error("Elasticsearch proxy error:", error);
    return NextResponse.json(
      { error: error.message || "Elasticsearch error" },
      { status: 500 }
    );
  }
}
