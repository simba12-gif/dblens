import Link from "next/link";

export default function UploadPage() {
  return (
    <main className="min-h-screen bg-hei-se flex items-center justify-center">
      <div className="text-center">
        <h1 className="font-pixel text-2xl text-siesta-tan mb-4">
          UPLOAD SCHEMA
        </h1>
        <p className="text-grayzone mb-8">
          Schema upload interface — coming next in MVP1 build-out.
        </p>
        <Link
          href="/"
          className="text-stellar-strawberry hover:underline text-sm"
        >
          ← Back to Home
        </Link>
      </div>
    </main>
  );
}
