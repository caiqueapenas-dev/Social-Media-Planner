import { NextResponse } from "next/server";

export async function GET() {
  return new NextResponse(
    `
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(
      (registration) => {
        console.log('SW registered: ', registration);
      },
      (error) => {
        console.log('SW registration failed: ', error);
      }
    );
  });
}
    `,
    {
      headers: {
        "Content-Type": "application/javascript",
      },
    }
  );
}

