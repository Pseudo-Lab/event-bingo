import { Container } from "@mui/material";
import { styled } from "@mui/system";

export const GradientContainer = styled(Container)(({ theme }) => ({
	minHeight: "75vh",
	display: "flex",
	flexDirection: "column",
	justifyContent: "center",
	alignItems: "center",
	background: "linear-gradient(135deg, #FFE5EC, #E0F7FA)",
	padding: theme.spacing(4),
	textAlign: "center",
}));


export const BackgroundContainer = styled(Container)(({ theme }) => ({
	width: '100%',
	margin: 0,
	position: "relative",
	minHeight: "75vh",
	display: "flex",
	flexDirection: "column",
	justifyContent: "center",
	alignItems: "center",
	padding: theme.spacing(4),
	textAlign: "center",
	overflow: "hidden",

	"::before": {
		content: '""',
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		backgroundImage: 'url("/assets/background.jpg")',
		backgroundSize: "cover",
		backgroundPosition: "center",
		opacity: 0.9,
		zIndex: 0,
	},
}));