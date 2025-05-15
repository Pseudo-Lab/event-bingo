import { Box } from '@mui/material';

const ConfettiEffect = () => (
  <Box sx={{
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: 9999
  }}>
    {Array.from({ length: 50 }).map((_, i) => {
      const size = Math.random() * 10 + 5;
      const left = Math.random() * 100;
      const duration = Math.random() * 3 + 2;
      const delay = Math.random() * 0.5;
      const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ff8000', '#8000ff'];
      return (
        <Box
          key={i}
          sx={{
            position: 'absolute',
            top: '-20px',
            left: `${left}%`,
            width: `${size}px`,
            height: `${size}px`,
            bgcolor: colors[Math.floor(Math.random() * colors.length)],
            borderRadius: '50%',
            animation: `fall ${duration}s linear ${delay}s forwards`
          }}
        />
      );
    })}
    <style>{`
      @keyframes fall {
        0% { transform: translateY(0) rotate(0deg); opacity: 1; }
        100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
      }
    `}</style>
  </Box>
);

export default ConfettiEffect;
