// ConsentDialog.tsx
import React, { useEffect, useState } from 'react';
import { DialogTitle, DialogContent, Typography } from '@mui/material';
import ReactMarkdown from 'react-markdown';

type ConsentDialogProps = {
  host: string;
};

const ConsentDialog: React.FC<ConsentDialogProps> = ({ host }) => {
  const [markdown, setMarkdown] = useState('');
  const [title, setTitle] = useState('');

  useEffect(() => {
    fetch('/templates/consent.md')
      .then((res) => res.text())
      .then((text) => {
        const interpolated = text.replace(/{host}/g, host);
        const lines = interpolated.split('\n');
        const firstLine = lines[0].trim();

        if (firstLine.startsWith('#')) {
          setTitle(firstLine.replace(/^#\s*/, ''));
          setMarkdown(lines.slice(1).join('\n').trim());
        } else {
          setTitle('[필수] 개인정보 수집 및 이용 동의서'); // fallback
          setMarkdown(interpolated);
        }
      });
  }, [host]);

  return (
    <>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>
        <ReactMarkdown
          components={{
            h1: ({ children }) => (
							<Typography variant="h6" sx={{ mt: 0, mb: 1 }}>
								{children}
							</Typography>
						),
						h5: ({ children }) => (
							<Typography variant="body1" sx={{ mt: 1, mb: 0.25, fontWeight: 600 }}>
								{children}
							</Typography>
						),
						p: ({ children }) => (
							<Typography variant="body2" paragraph={false} sx={{ my: 1, lineHeight: 1.7 }}>
								{children}
							</Typography>
						),
            strong: ({ children }) => <strong>{children}</strong>,
            br: () => <br />,
          }}
        >
          {markdown}
        </ReactMarkdown>
      </DialogContent>
    </>
  );
};

export default ConsentDialog;