import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

function Disk({ color }: { color: 'black' | 'white' }) {
  return (
    <div
      style={{
        width: 46,
        height: 46,
        borderRadius: '50%',
        background:
          color === 'black'
            ? 'linear-gradient(145deg,#030712,#1f2937)'
            : 'linear-gradient(145deg,#ffffff,#d8e5de)',
        boxShadow:
          color === 'black'
            ? 'inset 0 4px 7px rgba(255,255,255,0.16), 0 4px 9px rgba(0,0,0,0.35)'
            : 'inset 0 -4px 7px rgba(0,0,0,0.12), 0 4px 9px rgba(0,0,0,0.25)',
      }}
    />
  );
}

export default function AppleIcon() {
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
            width: 134,
            height: 134,
            borderRadius: 26,
            background: '#0B4E3C',
            padding: 6,
            boxShadow: '0 9px 28px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,255,255,0.08)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 3,
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
                width: 61,
                height: 61,
                borderRadius: 18,
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
