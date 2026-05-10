import { ImageResponse } from 'next/og';

export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

function Disk({ color }: { color: 'black' | 'white' }) {
  return (
    <div
      style={{
        width: 132,
        height: 132,
        borderRadius: '50%',
        background:
          color === 'black'
            ? 'linear-gradient(145deg,#030712,#1f2937)'
            : 'linear-gradient(145deg,#ffffff,#d8e5de)',
        boxShadow:
          color === 'black'
            ? 'inset 0 10px 18px rgba(255,255,255,0.16), 0 10px 24px rgba(0,0,0,0.35)'
            : 'inset 0 -10px 18px rgba(0,0,0,0.12), 0 10px 24px rgba(0,0,0,0.25)',
      }}
    />
  );
}

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#133429',
        }}
      >
        <div
          style={{
            width: 380,
            height: 380,
            borderRadius: 76,
            background: '#0B4E3C',
            padding: 18,
            boxShadow: '0 24px 80px rgba(0,0,0,0.38), inset 0 2px 0 rgba(255,255,255,0.08)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          {[
            <Disk key="w1" color="white" />,
            <Disk key="b1" color="black" />,
            <Disk key="b2" color="black" />,
            <Disk key="w2" color="white" />,
          ].map((disk, i) => (
            <div
              key={i}
              style={{
                width: 172,
                height: 172,
                borderRadius: 48,
                background: '#1E6B53',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {disk}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
