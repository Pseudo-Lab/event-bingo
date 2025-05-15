export const animations = {
  drawLine: `
    @keyframes drawLine {
      to {
        stroke-dashoffset: 0;
      }
    }
  `,
  fall: `
    @keyframes fall {
      0% { transform: translateY(0) rotate(0deg); opacity: 1; }
      100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
    }
  `,
  pulse: `
    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.7); transform: scale(1); }
      50% { box-shadow: 0 0 0 8px rgba(76, 175, 80, 0); transform: scale(1.025); }
      100% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0); transform: scale(1); }
    }
  `,
  fadeBg: `
    @keyframes fadeBg {
      0% { background-color: #FFF59D; }
      100% { background-color: #4CAF50; }
    }
  `
} as const; 