type VisualizerArtworkProps = {
  label?: string;
};

/** Decorative preview artwork for the M0 shell; it is not connected to audio input. */
export function VisualizerArtwork({ label = 'Decorative AudioCanvas visualizer preview' }: VisualizerArtworkProps) {
  return (
    <div aria-label={label} className="visualizer-artwork" role="img">
      <div aria-hidden="true" className="visualizer-artwork__grain" />
      <svg aria-hidden="true" className="visualizer-artwork__svg" fill="none" viewBox="0 0 620 620">
        <defs>
          <linearGradient id="orbitGradient" x1="70" x2="550" y1="100" y2="520" gradientUnits="userSpaceOnUse">
            <stop stopColor="#00F5FF" />
            <stop offset="0.52" stopColor="#786DFF" />
            <stop offset="1" stopColor="#FF2BD6" />
          </linearGradient>
          <radialGradient id="coreGradient" cx="0" cy="0" r="1" gradientTransform="matrix(0 200 -200 0 310 310)" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FF2BD6" stopOpacity=".5" />
            <stop offset=".58" stopColor="#00F5FF" stopOpacity=".1" />
            <stop offset="1" stopColor="#0A0A12" stopOpacity="0" />
          </radialGradient>
          <filter id="softGlow" height="180%" width="180%" x="-40%" y="-40%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        <circle cx="310" cy="310" r="222" fill="url(#coreGradient)" />
        <g className="artwork-orbit artwork-orbit--one" stroke="url(#orbitGradient)" strokeOpacity=".74">
          <circle cx="310" cy="310" r="204" strokeDasharray="1 9" strokeWidth="2" />
          <circle cx="310" cy="310" r="178" strokeDasharray="54 11 7 11" strokeWidth="1.5" />
          <circle cx="310" cy="310" r="146" strokeOpacity=".45" />
        </g>
        <g className="artwork-orbit artwork-orbit--two" stroke="#00F5FF" strokeOpacity=".52">
          <ellipse cx="310" cy="310" rx="226" ry="95" transform="rotate(-38 310 310)" />
          <ellipse cx="310" cy="310" rx="228" ry="104" transform="rotate(42 310 310)" stroke="#FF2BD6" strokeOpacity=".54" />
        </g>
        <g filter="url(#softGlow)" stroke="url(#orbitGradient)" strokeLinecap="round" strokeWidth="2.2">
          {Array.from({ length: 72 }, (_, index) => {
            const angle = (Math.PI * 2 * index) / 72;
            const irregularity = 7 + ((index * 17) % 29);
            const innerRadius = 155;
            const outerRadius = innerRadius + irregularity + (index % 5) * 3;
            const x1 = 310 + Math.cos(angle) * innerRadius;
            const y1 = 310 + Math.sin(angle) * innerRadius;
            const x2 = 310 + Math.cos(angle) * outerRadius;
            const y2 = 310 + Math.sin(angle) * outerRadius;
            return <line key={index} x1={x1} y1={y1} x2={x2} y2={y2} opacity={0.55 + (index % 4) * 0.12} />;
          })}
        </g>
        <circle cx="310" cy="310" r="92" stroke="#E5FBFF" strokeOpacity=".38" />
        <circle cx="310" cy="310" r="72" stroke="#00F5FF" strokeOpacity=".62" strokeWidth="1.5" />
        <circle cx="310" cy="310" r="42" fill="#0C1425" stroke="#FF2BD6" strokeOpacity=".8" strokeWidth="1.5" />
        <circle cx="310" cy="310" r="9" fill="#F2F2FA" />
        <circle cx="310" cy="310" r="21" stroke="#00F5FF" strokeOpacity=".6" />
      </svg>
      <div aria-hidden="true" className="visualizer-artwork__caption">
        <span className="live-dot" />
        <span>VISUAL PREVIEW</span>
        <span className="mono">SEED · 04242</span>
      </div>
    </div>
  );
}
