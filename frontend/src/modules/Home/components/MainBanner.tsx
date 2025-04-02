import React, { useState, useEffect } from "react";
import {
  Paper,
  Slide,
  Box,
  CircularProgress,
} from "@mui/material";

const bannerImages = [
  "https://eventusstorage.blob.core.windows.net/evs/Image/pseudolab/85206/ProjectInfo/Cover/4a2630ed993d431e888a2f4425fce087.png",
  "https://eventusstorage.blob.core.windows.net/evs/Image/pseudolab/85206/ProjectInfo/9bb4a470523d48d999805f4bbd277acf.png",
  "https://eventusstorage.blob.core.windows.net/evs/Image/pseudolab/85206/ProjectInfo/1bbe024b5e63425fa0ec4f179a1dec46.png",
];

const MainBanner = () => {
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [imageHeight, setImageHeight] = useState(500);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentBannerIndex(
        (prevIndex) => (prevIndex + 1) % bannerImages.length
      );
      setLoading(true);
    }, 5000); // 5초마다 배너 변경 (단위: 밀리초)

    return () => clearInterval(intervalId); // 컴포넌트가 언마운트되면 interval 정리
  }, []);

  const handleImageLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    setLoading(false);
    setImageHeight((event.target as HTMLImageElement).clientHeight);
  };

  return (
    <Paper
      elevation={bannerImages.length}
      style={{
        position: "relative",
        overflow: "hidden",
        height: `${imageHeight}px`,
      }}
    >
      {bannerImages.map((image, index) => (
        <Slide
          key={index}
          direction="left"
          in={index === currentBannerIndex}
          mountOnEnter
          unmountOnExit
        >
          <Box
            component="div"
            sx={{
              width: "100%",
              height: "100%",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              position: "relative",
            }}
          >
            {loading && (
              <CircularProgress
                size={50}
                thickness={5}
                sx={{
                  color: "#fff",
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                }}
              />
            )}
            <img
              src={image}
              alt={`Banner ${index + 1}`}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                opacity: index === currentBannerIndex ? 0.7 : 1,
              }}
              onLoad={handleImageLoad}
            />
            <Box
              sx={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                textAlign: "center",
                color: "#fff",
                width: "80%", // 가운데 정렬을 위해 추가
              }}
            >
              {/* <Typography variant="h4">Main Banner</Typography>
              <Typography variant="body1">
                This is a sample description.
              </Typography>
              <Button variant="contained" color="primary" sx={{ mt: 2 }}>
                Learn More
              </Button> */}
            </Box>
          </Box>
        </Slide>
      ))}
    </Paper>
  );
};

export default MainBanner;
