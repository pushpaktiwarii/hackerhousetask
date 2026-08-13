import { Metadata } from 'next';

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://goa-postcard.vercel.app';
  const imageUrl = `${appUrl}/api/og/${params.id}`;

  return {
    title: 'Postcard from HACKER HOUSE Goa 2026',
    description: 'Passport stamped ✅ Postcard sent from HACKER HOUSE गोवा 🏝️ 28–31 Oct — #FrameInGoa',
    openGraph: {
      title: 'Postcard from HACKER HOUSE Goa 2026',
      description: 'Passport stamped ✅ Postcard sent from HACKER HOUSE गोवा 🏝️ 28–31 Oct — #FrameInGoa',
      images: [{ url: imageUrl, width: 1200, height: 630 }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Postcard from HACKER HOUSE Goa 2026',
      description: 'Passport stamped ✅ Postcard sent from HACKER HOUSE गोवा 🏝️ 28–31 Oct — #FrameInGoa',
      images: [imageUrl],
    },
  };
}

export default function SharePage({ params }: Props) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://goa-postcard.vercel.app';
  // The actual blob URL is stored in OG metadata; we derive it here for display
  const blobBase = process.env.BLOB_BASE_URL || '';
  const imageUrl = blobBase ? `${blobBase}/shares/${params.id}.png` : `${appUrl}/api/og/${params.id}`;

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#0A6B3C',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
        fontFamily: '"DM Serif Display", serif',
      }}
    >
      <h1
        style={{
          color: '#FBF7EC',
          fontSize: 'clamp(20px, 4vw, 32px)',
          marginBottom: '24px',
          textAlign: 'center',
          letterSpacing: '0.02em',
        }}
      >
        HACKER HOUSE <span style={{ color: '#EC1E79' }}>गोवा</span> · 2026
      </h1>

      {/* Card preview */}
      <div
        style={{
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          borderRadius: '8px',
          overflow: 'hidden',
          maxWidth: '600px',
          width: '100%',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt="Postcard from Goa"
          style={{ width: '100%', height: 'auto', display: 'block' }}
        />
      </div>

      <a
        href={appUrl}
        style={{
          marginTop: '32px',
          background: '#FBF7EC',
          color: '#0A6B3C',
          padding: '14px 32px',
          borderRadius: '4px',
          textDecoration: 'none',
          fontFamily: '"Courier Prime", monospace',
          fontWeight: 'bold',
          fontSize: '16px',
          letterSpacing: '0.05em',
          transition: 'all 0.2s',
        }}
      >
        Send your own postcard →
      </a>

      <p
        style={{
          color: 'rgba(251,247,236,0.6)',
          fontSize: '13px',
          marginTop: '16px',
          fontFamily: '"Courier Prime", monospace',
        }}
      >
        #FrameInGoa · 28–31 OCT 2026 · GOA, INDIA
      </p>
    </main>
  );
}
