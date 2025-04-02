import { Typography, Button } from "@mui/material";
import DiscordIcon from "../../components/common/DiscordIcon";

const DiscordLoginButton = () => {
  const discordLogin = async () => {
    const url: string = import.meta.env.VITE_DISCORD_OAUTH2_URL;
    const id: string = import.meta.env.VITE_DISCORD_CLIENT_ID;
    const secret: string = import.meta.env.VITE_DISCORD_CLIENT_SECRET;
    window.location.href = url;
    console.log(url);

    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");

    if (code) {
      const data = {
        client_id: id,
        client_secret: secret,
        grant_type: "authorization_code",
        code: code,
        redirect_uri: "http://localhost:8000/oauth/redirect",
        scope: "identify, email",
      };

      const response = await fetch("https://discord.com/api/oauth2/token", {
        method: "POST",
        body: JSON.stringify(data),
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      const responseData = await response.json();

      console.log(responseData.access_token); // Here is your access token
    }
  };

  return (
    <Button
      sx={{
        bg: "white",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)",
      }}
      onClick={discordLogin}
    >
      <DiscordIcon className="h-6 w-6 mr-3" />
      <Typography marginLeft={1} textTransform={"none"}>
        Login with Discord
      </Typography>
    </Button>
  );
};

export default DiscordLoginButton;
