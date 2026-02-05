
import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const username = searchParams.get('u') || 'Esprit Éveillé';
    const code = searchParams.get('c') || '------';

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#000',
            backgroundImage: 'radial-gradient(circle at 50% 50%, #111 0%, #000 100%)',
            color: '#fff',
            fontFamily: 'sans-serif',
            padding: '40px',
          }}
        >
          {/* Background pattern */}
          <div
            style={{
              position: 'absolute',
              top: '-10%',
              left: '-10%',
              width: '40%',
              height: '40%',
              background: 'rgba(255, 255, 255, 0.05)',
              filter: 'blur(100px)',
              borderRadius: '50%',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '-10%',
              right: '-10%',
              width: '40%',
              height: '40%',
              background: 'rgba(255, 255, 255, 0.05)',
              filter: 'blur(100px)',
              borderRadius: '50%',
            }}
          />

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '60px',
              padding: '60px',
              width: '90%',
              maxWidth: '800px',
              boxShadow: '0 30px 60px rgba(0,0,0,0.5)',
            }}
          >
            {/* Logo */}
            <div style={{ display: 'flex', marginBottom: '40px' }}>
              <svg width="60" height="60" viewBox="0 0 24 24" fill="white">
                <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
              </svg>
            </div>

            {/* Profile Section - Image supprimée pour une esthétique épurée */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '30px' }}>
              <div style={{ fontSize: '48px', fontWeight: '900', letterSpacing: '-0.05em' }}>@{username}</div>
              <div style={{ fontSize: '14px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.4em', opacity: 0.4, marginTop: '12px' }}>
                MAÎTRE DE L'ÉVEIL
              </div>
            </div>

            {/* Invitation Text */}
            <div style={{ fontSize: '24px', textAlign: 'center', opacity: 0.6, marginBottom: '40px', maxWidth: '500px', fontWeight: '500', lineHeight: 1.4 }}>
              "Je t'invite à rejoindre le cercle d'Exu Play pour explorer les frontières de la pensée."
            </div>

            {/* Referral Code Box */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                backgroundColor: '#fff',
                color: '#000',
                padding: '20px 60px',
                borderRadius: '30px',
              }}
            >
              <div style={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '4px' }}>
                Code d'Invitation
              </div>
              <div style={{ fontSize: '36px', fontWeight: '900', letterSpacing: '0.1em' }}>{code}</div>
            </div>
          </div>

          <div style={{ position: 'absolute', bottom: '40px', fontSize: '12px', fontWeight: '900', letterSpacing: '0.3em', opacity: 0.2 }}>
            EXU PLAY • L'ART DE LA PENSÉE
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e: any) {
    return new Response(`Failed to generate image`, { status: 500 });
  }
}
