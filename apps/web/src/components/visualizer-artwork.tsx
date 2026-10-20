export function VisualizerArtwork() {
  return (
    <svg className="visualizer-artwork" viewBox="0 0 640 640" role="img" aria-label="Static neon radial visualizer artwork preview">
      <defs>
        <radialGradient id="ac-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f9f4ff" />
          <stop offset="12%" stopColor="#00f5ff" />
          <stop offset="40%" stopColor="#7b2cff" stopOpacity=".8" />
          <stop offset="70%" stopColor="#ff2bd6" stopOpacity=".3" />
          <stop offset="100%" stopColor="#0a0a12" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ac-ring" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00f5ff" />
          <stop offset="50%" stopColor="#a16dff" />
          <stop offset="100%" stopColor="#ff2bd6" />
        </linearGradient>
      </defs>
      <circle cx="320" cy="320" r="268" fill="url(#ac-core)" />
      {Array.from({ length: 7 }, (_, index) => (
        <circle key={index} cx="320" cy="320" r={68 + index * 27} fill="none" stroke="url(#ac-ring)" strokeWidth={index % 2 ? 1.5 : 2.5} opacity={0.6 - index * 0.055} />
      ))}
      {Array.from({ length: 80 }, (_, index) => {
        const angle = (Math.PI * 2 * index) / 80;
        const inner = 112 + (index % 5) * 7;
        const outer = inner + 20 + ((index * 37) % 76);
        const x1 = 320 + Math.cos(angle) * inner;
        const y1 = 320 + Math.sin(angle) * inner;
        const x2 = 320 + Math.cos(angle) * outer;
        const y2 = 320 + Math.sin(angle) * outer;
        return <line key={index} x1={x1} y1={y1} x2={x2} y2={y2} stroke={index % 3 ? '#00f5ff' : '#ff2bd6'} strokeWidth={index % 4 ? 2 : 4} strokeLinecap="round" opacity={0.45 + (index % 5) * 0.1} />;
      })}
      <circle cx="320" cy="320" r="68" fill="#0a0a12" stroke="#00f5ff" strokeWidth="2" />
      <circle cx="320" cy="320" r="53" fill="none" stroke="#ff2bd6" strokeWidth="1" opacity=".8" />
      <path d="M306 287 L306 353 L356 320 Z" fill="#f2f2fa" opacity=".9" />
    </svg>
  );
}
