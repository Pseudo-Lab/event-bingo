import { Box, Grid } from "@mui/material";
import type { BoardItemProps, BoardListProp } from "../types/BoardTypes";
import BoardListItem from "./BoardListItem";

const BoardList = (itemsProp: BoardListProp) => {
  return (
    <Box my={4}>
      <Grid container spacing={2}>
        {itemsProp.items.map((item: BoardItemProps, index: number) => (
          <Grid item xs={12} key={index}>
            <BoardListItem {...item} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default BoardList;
